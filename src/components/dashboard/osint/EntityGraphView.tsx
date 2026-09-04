'use client';

import { useMemo, useState } from 'react';
import { Route as RouteIcon, Loader2, Waypoints } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useBrandColors } from '@/hooks/use-brand-colors';
import GraphCanvas from '@/components/dashboard/osint/graph/GraphCanvas';
import type { GraphViewEdge, GraphViewNode } from '@/components/dashboard/osint/graph/graph-view.types';
import {
  getEntityNeighborhood,
  findEntityPath,
  getEntityRisk,
  extractErrorMessage,
  ENTITY_TYPE_LABELS,
  RELATIONSHIP_TYPES,
  type Entity,
  type EntityRelationship,
  type EntityRiskSummary,
  type EntityRiskResult,
} from '@/lib/api/osint';

const RISK_LEVEL_LABEL: Record<string, string> = {
  LOW: 'Bajo',
  MEDIUM: 'Medio',
  HIGH: 'Alto',
  CRITICAL: 'Crítico',
};

const RISK_LEVEL_VARIANT: Record<string, 'outline' | 'secondary' | 'destructive'> = {
  LOW: 'outline',
  MEDIUM: 'secondary',
  HIGH: 'destructive',
  CRITICAL: 'destructive',
};

type KnownEntity = { id: string; canonicalName: string; type: string };

type Props = {
  /** Entidades ya conocidas por este caso (descubiertas vía su Evidencia) — el único universo real navegable hoy, no hay `GET /osint/entities` de búsqueda libre. */
  knownEntities: KnownEntity[];
  /** Plan "OSINT Profesional" (2026-09-02), Fase 4 — namespace real de los marcadores/notas de este grafo en localStorage. */
  caseId: string;
};

// Colores fijos por Entity.type — mismo criterio que `InvestigationGraph.tsx`
// (STATIC_NODE_COLORS). Plan "OSINT Profesional" (2026-09-02), Fase 1 —
// sumó los 8 tipos de ATRIBUTO nuevos, con un mismo tono base (grises/
// azulados) que los distingue de los 3 tipos de IDENTIDAD (más saturados)
// de un vistazo: un atributo es un dato de apoyo, no el sujeto central de
// una investigación.
const NODE_COLORS: Record<string, string> = {
  PERSON: '#7c3aed',
  COMPANY: '#2563eb',
  PUBLIC_ENTITY: '#f59e0b',
  DOMAIN: '#0e7490',
  EMAIL: '#0891b2',
  PHONE: '#0d9488',
  ADDRESS: '#65a30d',
  VEHICLE: '#a16207',
  BANK_ACCOUNT: '#be185d',
  SOCIAL_PROFILE: '#7c2d92',
  ALIAS: '#57534e',
};

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  RELATIONSHIP_TYPES.map((t) => [t.value, t.label]),
);

/** Nunca mostrar un documento de identidad completo en pantalla (misma restricción del pedido que aplica a logs). */
function maskDocumentNumber(doc: string | null | undefined): string {
  if (!doc) return '—';
  const last4 = doc.slice(-4);
  return `${'•'.repeat(Math.max(0, doc.length - 4))}${last4}`;
}

// Plan "OSINT Profesional" (2026-09-02), Fase 4 — grafo profesional
// unificado: el dibujado (layouts, búsqueda, marcadores, export CSV/
// GraphML) ahora vive en `GraphCanvas`, compartido con
// `InvestigationGraph.tsx` (buscador ad-hoc) — este componente solo se
// ocupa de SUS datos propios (vecindario/camino sobre Entity/
// EntityRelationship reales) y su panel de detalle específico
// (documento enmascarado, relaciones con confianza real).
export default function EntityGraphView({ knownEntities, caseId }: Props) {
  const brand = useBrandColors();
  const [mode, setMode] = useState<'neighborhood' | 'path'>('neighborhood');
  const [entityId, setEntityId] = useState(knownEntities[0]?.id ?? '');
  const [targetEntityId, setTargetEntityId] = useState(knownEntities[1]?.id ?? '');
  const [depth, setDepth] = useState(2);
  const [loading, setLoading] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [result, setResult] = useState<{ nodes: Entity[]; edges: EntityRelationship[] } | null>(null);
  const [risks, setRisks] = useState<Record<string, EntityRiskSummary>>({});
  const [truncated, setTruncated] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [riskDetail, setRiskDetail] = useState<EntityRiskResult | null>(null);
  const [loadingRiskDetail, setLoadingRiskDetail] = useState(false);

  const load = async () => {
    if (!entityId) return;
    setLoading(true);
    setNotFound(false);
    setSelectedNodeId(null);
    setRiskDetail(null);

    try {
      if (mode === 'neighborhood') {
        const res = await getEntityNeighborhood(entityId, { depth });
        setResult({ nodes: res.nodes, edges: res.edges });
        setRisks(res.risks);
        setTruncated(res.truncated);
      } else {
        if (!targetEntityId || targetEntityId === entityId) {
          toast.error('Elige una entidad destino distinta de la de origen.');
          return;
        }
        const res = await findEntityPath(entityId, targetEntityId, { maxDepth: depth * 2 });
        setResult({ nodes: res.nodes, edges: res.edges });
        setRisks(res.risks);
        setTruncated(false);
        setNotFound(!res.found);
      }
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo construir el grafo');
    } finally {
      setLoading(false);
    }
  };

  const loadRiskDetail = async (id: string) => {
    setLoadingRiskDetail(true);
    try {
      setRiskDetail(await getEntityRisk(id));
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cargar el detalle de riesgo');
    } finally {
      setLoadingRiskDetail(false);
    }
  };

  const viewNodes: GraphViewNode[] = useMemo(
    () =>
      (result?.nodes || []).map((n) => ({
        id: n.id,
        label: n.canonicalName,
        type: n.type,
        risk: risks[n.id]?.score,
        raw: n,
      })),
    [result, risks],
  );
  const viewEdges: GraphViewEdge[] = useMemo(
    () =>
      (result?.edges || []).map((e) => ({
        id: e.id,
        source: e.sourceEntityId,
        target: e.targetEntityId,
        label: RELATIONSHIP_TYPE_LABELS[e.relationshipType] || e.relationshipType,
        confidence: e.confidence,
        raw: e,
      })),
    [result],
  );

  const selectedNode = (result?.nodes || []).find((n) => n.id === selectedNodeId) || null;

  const relatedEdges =
    result?.edges.filter((e) => e.sourceEntityId === selectedNodeId || e.targetEntityId === selectedNodeId) || [];

  if (knownEntities.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center text-slate-500 text-sm">
          Este caso todavía no tiene entidades vinculadas — agrega evidencia con una
          entidad asociada (pestaña Evidencia) para poder explorar su grafo.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex rounded-lg border border-slate-200 overflow-hidden">
            <button
              onClick={() => setMode('neighborhood')}
              className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${
                mode === 'neighborhood' ? 'bg-primary text-white' : 'bg-white text-slate-500'
              }`}
            >
              <Waypoints size={14} /> Vecindario
            </button>
            <button
              onClick={() => setMode('path')}
              className={`px-3 py-2 text-xs font-bold flex items-center gap-1.5 ${
                mode === 'path' ? 'bg-primary text-white' : 'bg-white text-slate-500'
              }`}
            >
              <RouteIcon size={14} /> Camino más corto
            </button>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">
              {mode === 'neighborhood' ? 'Entidad' : 'Desde'}
            </label>
            <Select value={entityId} onValueChange={setEntityId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {knownEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.canonicalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {mode === 'path' && (
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-400 uppercase">Hasta</label>
              <Select value={targetEntityId} onValueChange={setTargetEntityId}>
                <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {knownEntities.filter((e) => e.id !== entityId).map((e) => (
                    <SelectItem key={e.id} value={e.id}>{e.canonicalName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-400 uppercase">
              {mode === 'neighborhood' ? 'Profundidad (1-3)' : 'Profundidad máx. (1-3)'}
            </label>
            <Select value={String(depth)} onValueChange={(v) => setDepth(Number(v))}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">1</SelectItem>
                <SelectItem value="2">2</SelectItem>
                <SelectItem value="3">3</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button onClick={load} disabled={loading || !entityId} className="bg-primary text-white">
            {loading ? <Loader2 size={16} className="animate-spin" /> : 'Explorar'}
          </Button>

          {truncated && (
            <Badge variant="outline" className="text-yellow-600 border-yellow-300">
              Resultado truncado por el tope de nodos
            </Badge>
          )}
          {notFound && (
            <Badge variant="outline" className="text-slate-500">
              No existe un camino documentado entre esas 2 entidades dentro de la profundidad elegida
            </Badge>
          )}
        </CardContent>
      </Card>

      {result && (
        <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <GraphCanvas
                nodes={viewNodes}
                edges={viewEdges}
                nodeColor={(type) => NODE_COLORS[type] || brand.primary}
                rootColor={brand.primary}
                rootId={entityId}
                selectedNodeId={selectedNodeId}
                onNodeClick={(node) => {
                  setSelectedNodeId(node.id);
                  setRiskDetail(null);
                }}
                storageKey={`osint-bookmarks:case:${caseId}`}
                exportFileBaseName={`caso-${caseId}-grafo`}
              />
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm h-fit">
            <CardHeader>
              <CardTitle className="text-base text-primary">Detalle del nodo</CardTitle>
            </CardHeader>
            <CardContent>
              {!selectedNode ? (
                <p className="text-sm text-slate-500">Selecciona un nodo del grafo.</p>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold">Nombre</p>
                    <p className="font-black text-primary">{selectedNode.canonicalName}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-bold">Tipo</p>
                      <p>{ENTITY_TYPE_LABELS[selectedNode.type] || selectedNode.type}</p>
                    </div>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <p className="text-xs text-slate-400 font-bold">Documento</p>
                      <p className="font-mono">{maskDocumentNumber(selectedNode.documentNumber)}</p>
                    </div>
                  </div>

                  {/* Plan "OSINT Profesional" (2026-09-02), Fase 5 — riesgo
                      real ponderado por confianza de la evidencia. */}
                  {risks[selectedNode.id] && (
                    <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-slate-400 font-bold">Riesgo</p>
                        <div className="flex items-center gap-1.5">
                          <Badge variant={RISK_LEVEL_VARIANT[risks[selectedNode.id].level]}>
                            {RISK_LEVEL_LABEL[risks[selectedNode.id].level] || risks[selectedNode.id].level}
                          </Badge>
                          <span className="text-xs font-mono text-slate-500">
                            {risks[selectedNode.id].score.toFixed(1)}/10
                          </span>
                        </div>
                      </div>
                      {!riskDetail ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-7 text-[11px]"
                          disabled={loadingRiskDetail}
                          onClick={() => loadRiskDetail(selectedNode.id)}
                        >
                          {loadingRiskDetail ? <Loader2 size={12} className="animate-spin" /> : 'Ver factores reales'}
                        </Button>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-xs text-slate-500">{riskDetail.summary}</p>
                          {riskDetail.factors.map((f, i) => (
                            <div key={i} className="text-[11px] bg-white border rounded p-1.5">
                              <strong>{f.category}</strong> ({f.score.toFixed(1)}) — {f.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <p className="text-xs text-slate-400 uppercase font-bold mb-2">
                      Relaciones en este grafo ({relatedEdges.length})
                    </p>
                    <div className="space-y-2 max-h-[300px] overflow-y-auto">
                      {relatedEdges.length === 0 ? (
                        <p className="text-xs text-slate-400">Sin relaciones directas en este resultado.</p>
                      ) : (
                        relatedEdges.map((edge) => (
                          <div key={edge.id} className="text-xs bg-slate-50 p-2 rounded border">
                            <strong>{RELATIONSHIP_TYPE_LABELS[edge.relationshipType] || edge.relationshipType}</strong>
                            <Badge variant="outline" className="ml-2 text-[10px]">{edge.confidence}</Badge>
                            <br />
                            {edge.sourceEntityId} → {edge.targetEntityId}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
