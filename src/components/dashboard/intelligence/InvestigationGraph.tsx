'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import api from '@/lib/api';
import { useBrandColors } from '@/hooks/use-brand-colors';
import GraphCanvas from '@/components/dashboard/osint/graph/GraphCanvas';
import type { GraphViewEdge, GraphViewNode } from '@/components/dashboard/osint/graph/graph-view.types';

type Props = {
  graph: {
    nodes: any[];
    links: any[];
  };
  timeline?: {
    events: any[];
  };
  onExpand?: (newInvestigation: any) => void;
};

// Colores por tipo de nodo del grafo — ROOT es el único de marca (el nodo
// "centro" de la investigación); el resto son hues fijos por categoría de
// entidad (empresa/persona/contrato/etc.), no configurables.
const STATIC_NODE_COLORS: Record<string, string> = {
  COMPANY: '#2563eb',
  PERSON: '#7c3aed',
  PUBLIC_ENTITY: '#f59e0b',
  CONTRACT: '#16a34a',
  PROCESS: '#22c55e',
  NEWS: '#dc2626',
  LOCATION: '#0891b2',
  EVENT: '#ea580c',
  // Plan "Pilar OSINT" (2026-09-02), Fase A — búsqueda web general.
  WEB_RESULT: '#0d9488',
  // Plan "OSINT Profesional" (2026-09-02), Fase 3 — WHOIS/DNS + sanciones
  // internacionales.
  DOMAIN_RECORD: '#0e7490',
  SANCTION: '#b91c1c',
};

// Plan "OSINT Profesional" (2026-09-02), Fase 4 — grafo profesional
// unificado: el dibujado (layouts, búsqueda, marcadores, export CSV/
// GraphML) ahora vive en `GraphCanvas`, compartido con `EntityGraphView.tsx`
// (grafo de casos) — este componente solo se ocupa de SUS datos propios
// (el resultado ad-hoc de 12 fuentes), los filtros por tipo de nodo, y el
// panel de detalle con timeline/expandir, que son específicos del
// buscador ad-hoc y no tienen sentido en el grafo de casos.
export default function InvestigationGraph({
  graph,
  timeline,
  onExpand,
}: Props) {
  const brand = useBrandColors();
  const nodeColors: Record<string, string> = STATIC_NODE_COLORS;
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expanding, setExpanding] = useState(false);

  const [filters, setFilters] = useState({
    CONTRACT: true,
    PROCESS: true,
    NEWS: true,
    PUBLIC_ENTITY: true,
    COMPANY: true,
    PERSON: true,
    LOCATION: true,
    EVENT: true,
    ROOT: true,
    WEB_RESULT: true,
    DOMAIN_RECORD: true,
    SANCTION: true,
  });

  const visibleNodeIds = useMemo(() => {
    return new Set(
      graph.nodes
        .filter((n) => filters[n.type as keyof typeof filters] !== false)
        .map((n) => n.id),
    );
  }, [graph.nodes, filters]);

  const filteredNodes = useMemo(
    () => graph.nodes.filter((n) => visibleNodeIds.has(n.id)),
    [graph.nodes, visibleNodeIds],
  );
  const filteredLinks = useMemo(
    () => graph.links.filter((l) => visibleNodeIds.has(l.source) && visibleNodeIds.has(l.target)),
    [graph.links, visibleNodeIds],
  );

  const viewNodes: GraphViewNode[] = useMemo(
    () => filteredNodes.map((n) => ({ id: n.id, label: n.label, type: n.type, risk: n.risk, raw: n })),
    [filteredNodes],
  );
  const viewEdges: GraphViewEdge[] = useMemo(
    () =>
      filteredLinks.map((l, idx) => ({
        id: `edge-${idx}`,
        source: l.source,
        target: l.target,
        label: l.type,
        weight: l.weight,
        raw: l,
      })),
    [filteredLinks],
  );

  const rootNode = graph.nodes.find((n) => n.type === 'ROOT');
  const selectedNode = graph.nodes.find((n) => n.id === selectedNodeId) || null;

  const relatedTimeline =
    timeline?.events?.filter((event) => {
      if (!selectedNode) return false;

      const raw = JSON.stringify(event).toUpperCase();
      return raw.includes(String(selectedNode.label || '').toUpperCase());
    }) || [];

  const relatedLinks =
    graph.links.filter(
      (l) => l.source === selectedNode?.id || l.target === selectedNode?.id,
    ) || [];

  const expandNode = async () => {
    if (!selectedNode?.label) return;

    setExpanding(true);

    try {
      const res = await api.get(
        `/investigation/search?q=${encodeURIComponent(selectedNode.label)}`,
      );

      onExpand?.(res.data);
    } finally {
      setExpanding(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base text-primary">
            Grafo investigativo
          </CardTitle>

          <div className="flex flex-wrap gap-2 pt-2">
            {Object.keys(filters).map((key) => (
              <button
                key={key}
                onClick={() =>
                  setFilters((prev) => ({
                    ...prev,
                    [key]: !prev[key as keyof typeof filters],
                  }))
                }
                className={`text-[11px] px-2 py-1 rounded border font-bold ${
                  filters[key as keyof typeof filters]
                    ? 'bg-primary text-white'
                    : 'bg-white text-slate-400'
                }`}
              >
                {filters[key as keyof typeof filters] ? '✓ ' : ''}
                {key}
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent>
          <GraphCanvas
            nodes={viewNodes}
            edges={viewEdges}
            nodeColor={(type) => nodeColors[type] || '#64748b'}
            rootColor={brand.primary}
            rootId={rootNode?.id}
            selectedNodeId={selectedNodeId}
            onNodeClick={(node) => setSelectedNodeId(node.id)}
            storageKey={`osint-bookmarks:adhoc:${rootNode?.id || 'sin-root'}`}
            exportFileBaseName="investigacion-adhoc"
          />
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm h-fit">
        <CardHeader>
          <CardTitle className="text-base text-primary">
            Detalle del nodo
          </CardTitle>
        </CardHeader>

        <CardContent>
          {!selectedNode ? (
            <p className="text-sm text-slate-500">
              Selecciona un nodo del grafo.
            </p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs text-slate-400 uppercase font-bold">
                  Nombre
                </p>
                <p className="font-black text-primary">
                  {selectedNode.label}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Tipo</p>
                  <p>{selectedNode.type}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Fuente</p>
                  <p>{selectedNode.source}</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">Riesgo</p>
                  <p>{selectedNode.risk ?? 0}/10</p>
                </div>

                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-400 font-bold">
                    Relaciones
                  </p>
                  <p>{relatedLinks.length}</p>
                </div>
              </div>

              <Button
                onClick={expandNode}
                disabled={expanding}
                className="w-full bg-primary text-white"
              >
                {expanding ? 'Expandiendo...' : 'Expandir investigación'}
              </Button>

              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-2">
                  Relaciones
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {relatedLinks.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Sin relaciones directas.
                    </p>
                  ) : (
                    relatedLinks.slice(0, 10).map((link, idx) => (
                      <div
                        key={idx}
                        className="text-xs bg-slate-50 p-2 rounded border"
                      >
                        <strong>{link.type}</strong>
                        <br />
                        {link.source} → {link.target}
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs text-slate-400 uppercase font-bold mb-2">
                  Timeline relacionado
                </p>

                <div className="space-y-2 max-h-[180px] overflow-y-auto">
                  {relatedTimeline.length === 0 ? (
                    <p className="text-xs text-slate-400">
                      Sin eventos relacionados.
                    </p>
                  ) : (
                    relatedTimeline.slice(0, 8).map((ev) => (
                      <div
                        key={ev.id}
                        className="text-xs bg-slate-50 p-2 rounded border"
                      >
                        <strong>{ev.title}</strong>
                        <p className="text-slate-400">
                          {new Date(ev.date).toLocaleDateString('es-CO')}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {selectedNode.properties && (
                <details className="text-xs">
                  <summary className="cursor-pointer font-bold text-slate-500">
                    Ver propiedades
                  </summary>
                  <pre className="mt-2 bg-slate-950 text-slate-100 p-3 rounded overflow-auto max-h-[220px]">
                    {JSON.stringify(selectedNode.properties, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
