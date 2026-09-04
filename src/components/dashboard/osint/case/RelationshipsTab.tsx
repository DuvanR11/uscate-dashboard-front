'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Plus, Sparkles, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import EntityPickerInline, { type PickedEntity } from '@/components/dashboard/osint/EntityPickerInline';
import ExpandEntityDialog from '@/components/dashboard/osint/ExpandEntityDialog';
import {
  createRelationship,
  listRelationshipsForEntity,
  getRelatedCases,
  listRelationshipCandidates,
  reviewRelationshipCandidate,
  extractErrorMessage,
  RELATIONSHIP_TYPES,
  type Evidence,
  type EntityRelationship,
  type RelationshipType,
  type RelatedCase,
  type RelationshipCandidate,
} from '@/lib/api/osint';

export default function RelationshipsTab({
  caseId,
  knownEntities,
  evidence,
}: {
  caseId: string;
  knownEntities: PickedEntity[];
  evidence: Evidence[];
}) {
  const [selectedEntityId, setSelectedEntityId] = useState(knownEntities[0]?.id ?? '');
  const [relationships, setRelationships] = useState<EntityRelationship[]>([]);
  const [loading, setLoading] = useState(false);
  // Plan "Pilar OSINT" (2026-09-02), Fase C — otros casos reales donde esta
  // misma entidad ya tiene evidencia, para no depender de que el
  // investigador se acuerde de haberla visto antes en otro expediente.
  const [otherCases, setOtherCases] = useState<RelatedCase[]>([]);
  // Plan "OSINT Profesional" (2026-09-02), Fase 2 — cola de revisión real
  // de vínculos propuestos automáticamente al "ampliar" una entidad. Se
  // muestra a nivel de CASO (no solo de la entidad seleccionada arriba):
  // un candidato propuesto puede tener como origen o destino a cualquier
  // entidad conocida del caso.
  const [candidates, setCandidates] = useState<RelationshipCandidate[]>([]);
  const [reviewingId, setReviewingId] = useState<string | null>(null);

  const load = async (entityId: string) => {
    if (!entityId) return;
    setLoading(true);
    try {
      const [rels, cases] = await Promise.all([
        listRelationshipsForEntity(entityId),
        getRelatedCases(entityId),
      ]);
      setRelationships(rels);
      setOtherCases(cases.filter((c) => c.id !== caseId));
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron cargar las relaciones');
    } finally {
      setLoading(false);
    }
  };

  const loadCandidates = async () => {
    try {
      const data = await listRelationshipCandidates({ caseId, status: 'PENDING' });
      setCandidates(data);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron cargar los candidatos propuestos');
    }
  };

  useEffect(() => {
    if (selectedEntityId) load(selectedEntityId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEntityId]);

  useEffect(() => {
    loadCandidates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleReviewCandidate = async (id: string, decision: 'APPROVE' | 'REJECT') => {
    setReviewingId(id);
    try {
      await reviewRelationshipCandidate(id, decision);
      toast.success(decision === 'APPROVE' ? 'Vínculo aprobado y registrado como relación real' : 'Candidato rechazado');
      setCandidates((prev) => prev.filter((c) => c.id !== id));
      if (decision === 'APPROVE' && selectedEntityId) load(selectedEntityId);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo revisar el candidato');
    } finally {
      setReviewingId(null);
    }
  };

  if (knownEntities.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="p-8 text-center text-slate-500 text-sm">
          Este caso todavía no tiene entidades vinculadas — agrega evidencia con una entidad
          asociada (pestaña Evidencia) para poder documentar relaciones entre ellas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="p-0">
        <div className="flex flex-wrap items-end justify-between gap-3 p-4 border-b">
          <div className="space-y-1.5">
            <Label className="text-[11px] font-bold text-slate-400 uppercase">Ver relaciones de</Label>
            <Select value={selectedEntityId} onValueChange={setSelectedEntityId}>
              <SelectTrigger className="w-[240px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {knownEntities.map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.canonicalName}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {otherCases.length > 0 && (
              <Badge variant="outline" className="text-[11px]" title={otherCases.map((c) => c.title).join(', ')}>
                También en {otherCases.length} otro{otherCases.length > 1 ? 's' : ''} caso{otherCases.length > 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            {selectedEntityId && (
              <ExpandEntityDialog
                caseId={caseId}
                entityId={selectedEntityId}
                entityName={knownEntities.find((e) => e.id === selectedEntityId)?.canonicalName || ''}
                onExpanded={() => {
                  load(selectedEntityId);
                  loadCandidates();
                }}
              />
            )}
            <NewRelationshipDialog
              caseId={caseId}
              knownEntities={knownEntities}
              evidence={evidence}
              onCreated={() => load(selectedEntityId)}
            />
          </div>
        </div>

        {candidates.length > 0 && (
          <div className="border-b p-4 space-y-2 bg-amber-50/50">
            <p className="text-[11px] font-bold text-amber-700 uppercase flex items-center gap-1.5">
              <Sparkles size={12} /> Vínculos propuestos para revisar ({candidates.length})
            </p>
            {candidates.map((c) => (
              <div key={c.id} className="flex flex-wrap items-center justify-between gap-2 bg-white border border-amber-200 rounded-lg p-2.5 text-xs">
                <div className="space-y-0.5">
                  <div>
                    <strong>{c.sourceEntity.canonicalName}</strong>
                    {' — '}
                    {RELATIONSHIP_TYPES.find((t) => t.value === c.relationshipType)?.label || c.relationshipType}
                    {' — '}
                    <strong>{c.targetEntity.canonicalName}</strong>
                  </div>
                  <p className="text-slate-500">{c.reason}</p>
                </div>
                <div className="flex gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-emerald-600 border-emerald-200 h-7 px-2"
                    disabled={reviewingId === c.id}
                    onClick={() => handleReviewCandidate(c.id, 'APPROVE')}
                  >
                    {reviewingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="text-red-500 border-red-200 h-7 px-2"
                    disabled={reviewingId === c.id}
                    onClick={() => handleReviewCandidate(c.id, 'REJECT')}
                  >
                    <XCircle size={12} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>
        ) : relationships.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">Sin relaciones documentadas para esta entidad.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Origen</TableHead>
                <TableHead>Relación</TableHead>
                <TableHead>Destino</TableHead>
                <TableHead>Confianza</TableHead>
                <TableHead>Evidencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.sourceEntity.canonicalName}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {RELATIONSHIP_TYPES.find((t) => t.value === r.relationshipType)?.label || r.relationshipType}
                    </Badge>
                  </TableCell>
                  <TableCell className="font-medium">{r.targetEntity.canonicalName}</TableCell>
                  <TableCell className="text-xs">{r.confidence}</TableCell>
                  <TableCell className="text-xs text-slate-400">{r.evidence?.title || r.evidenceId}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function NewRelationshipDialog({
  caseId,
  knownEntities,
  evidence,
  onCreated,
}: {
  caseId: string;
  knownEntities: PickedEntity[];
  evidence: Evidence[];
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [source, setSource] = useState<PickedEntity | null>(null);
  const [target, setTarget] = useState<PickedEntity | null>(null);
  const [relationshipType, setRelationshipType] = useState<RelationshipType>('EMPLOYEE_OF');
  const [evidenceId, setEvidenceId] = useState('');

  const handleSubmit = async () => {
    if (!source || !target) {
      toast.error('Elige la entidad de origen y la de destino.');
      return;
    }
    if (source.id === target.id) {
      toast.error('Origen y destino no pueden ser la misma entidad.');
      return;
    }
    if (!evidenceId) {
      toast.error('Toda relación necesita una evidencia real que la respalde.');
      return;
    }
    setSaving(true);
    try {
      await createRelationship({
        sourceEntityId: source.id,
        targetEntityId: target.id,
        relationshipType,
        evidenceId,
      });
      toast.success('Relación registrada');
      setOpen(false);
      setSource(null);
      setTarget(null);
      setEvidenceId('');
      onCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo registrar la relación');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-white"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva relación</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Nueva relación entre entidades</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <EntityPickerInline caseId={caseId} label="Origen" value={source} onChange={setSource} knownEntities={knownEntities} />
          <div className="space-y-1.5">
            <Label>Tipo de relación</Label>
            <Select value={relationshipType} onValueChange={(v) => setRelationshipType(v as RelationshipType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {RELATIONSHIP_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <EntityPickerInline caseId={caseId} label="Destino" value={target} onChange={setTarget} knownEntities={knownEntities} />
          <div className="space-y-1.5">
            <Label>Evidencia que respalda esta relación</Label>
            <Select value={evidenceId} onValueChange={setEvidenceId}>
              <SelectTrigger><SelectValue placeholder="Elige una evidencia de este caso..." /></SelectTrigger>
              <SelectContent>
                {evidence.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.source.name} — {e.title || e.excerpt?.slice(0, 40) || e.id.slice(0, 8)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar relación'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

