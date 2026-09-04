'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Plus, UploadCloud } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  createEvidence,
  ingestDocument,
  extractErrorMessage,
  OSINT_SOURCE_KEYS,
  type Evidence,
  type EvidenceType,
} from '@/lib/api/osint';

const CONFIDENCE_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  VERIFIED_FACT: 'default',
  REPORTED_FACT: 'secondary',
  PROBABLE_MATCH: 'secondary',
  POSSIBLE_MATCH: 'outline',
  ANALYST_HYPOTHESIS: 'outline',
  CONTRADICTED: 'destructive',
};

const EVIDENCE_TYPE_LABEL: Record<EvidenceType, string> = {
  DATASET_RECORD: 'Registro de dataset',
  DOCUMENT: 'Documento',
  NEWS_ARTICLE: 'Artículo de prensa',
  WEB_PAGE: 'Página web',
  MANUAL_NOTE: 'Nota manual del analista',
};

export default function EvidenceTab({
  caseId,
  evidence,
  onCreated,
  id,
}: {
  caseId: string;
  evidence: Evidence[];
  onCreated: (evidence: Evidence) => void;
  id?: string;
}) {
  return (
    <Card className="border-0 shadow-sm" id={id}>
      <CardContent className="p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <p className="text-sm text-slate-500">{evidence.length} pieza(s) de evidencia registrada(s)</p>
          <div className="flex gap-2">
            <IngestDocumentDialog caseId={caseId} onCreated={onCreated} />
            <NewEvidenceDialog caseId={caseId} onCreated={onCreated} />
          </div>
        </div>

        {evidence.length === 0 ? (
          <p className="p-10 text-center text-sm text-slate-500">Sin evidencia registrada todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fuente</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Confianza</TableHead>
                  <TableHead>Entidad</TableHead>
                  <TableHead>Título / extracto</TableHead>
                  <TableHead>Fecha</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {evidence.map((e) => (
                  <TableRow key={e.id} id={`evidence-${e.id}`}>
                    <TableCell className="font-medium">{e.source.name}</TableCell>
                    <TableCell className="text-xs">{EVIDENCE_TYPE_LABEL[e.evidenceType]}</TableCell>
                    <TableCell>
                      <Badge variant={CONFIDENCE_VARIANT[e.confidence] ?? 'outline'} className="text-[10px]">
                        {e.confidence}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{e.entity?.canonicalName ?? '—'}</TableCell>
                    <TableCell className="max-w-xs">
                      <p className="font-medium text-sm truncate">{e.title || '—'}</p>
                      {e.excerpt && <p className="text-xs text-slate-400 truncate">{e.excerpt}</p>}
                    </TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {e.publishedAt ? new Date(e.publishedAt).toLocaleDateString('es-CO') : '—'}
                    </TableCell>
                    <TableCell>
                      {e.url && (
                        <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-blue-600">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewEvidenceDialog({ caseId, onCreated }: { caseId: string; onCreated: (e: Evidence) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState<PickedEntity | null>(null);
  const [form, setForm] = useState({
    sourceKey: 'SECOP',
    evidenceType: 'DATASET_RECORD' as EvidenceType,
    title: '',
    url: '',
    excerpt: '',
    confidenceOverride: 'ANALYST_HYPOTHESIS' as 'ANALYST_HYPOTHESIS' | 'CONTRADICTED',
  });

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const created = await createEvidence({
        caseId,
        sourceKey: form.sourceKey,
        evidenceType: form.evidenceType,
        entityId: entity?.id,
        title: form.title.trim() || undefined,
        url: form.url.trim() || undefined,
        excerpt: form.excerpt.trim() || undefined,
        confidenceOverride: form.evidenceType === 'MANUAL_NOTE' ? form.confidenceOverride : undefined,
      });
      onCreated(created);
      toast.success('Evidencia registrada');
      setOpen(false);
      setEntity(null);
      setForm({ sourceKey: 'SECOP', evidenceType: 'DATASET_RECORD', title: '', url: '', excerpt: '', confidenceOverride: 'ANALYST_HYPOTHESIS' });
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo registrar la evidencia');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="bg-primary text-white"><Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar evidencia</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Registrar evidencia</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Fuente</Label>
              <Select value={form.sourceKey} onValueChange={(v) => setForm((f) => ({ ...f, sourceKey: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OSINT_SOURCE_KEYS.map((s) => (
                    <SelectItem key={s.key} value={s.key}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Tipo de evidencia</Label>
              <Select
                value={form.evidenceType}
                onValueChange={(v) => setForm((f) => ({ ...f, evidenceType: v as EvidenceType }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DATASET_RECORD">Registro de dataset</SelectItem>
                  <SelectItem value="NEWS_ARTICLE">Artículo de prensa</SelectItem>
                  <SelectItem value="WEB_PAGE">Página web</SelectItem>
                  <SelectItem value="DOCUMENT">Documento</SelectItem>
                  <SelectItem value="MANUAL_NOTE">Nota manual del analista</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {form.evidenceType === 'MANUAL_NOTE' && (
            <div className="space-y-1.5">
              <Label>Naturaleza de la nota</Label>
              <Select
                value={form.confidenceOverride}
                onValueChange={(v) => setForm((f) => ({ ...f, confidenceOverride: v as 'ANALYST_HYPOTHESIS' | 'CONTRADICTED' }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ANALYST_HYPOTHESIS">Hipótesis del analista (sin fuente verificable)</SelectItem>
                  <SelectItem value="CONTRADICTED">Contradice evidencia previa</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <EntityPickerInline caseId={caseId} label="Entidad a la que refiere (opcional)" value={entity} onChange={setEntity} />

          <div className="space-y-1.5">
            <Label>Título (opcional)</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>URL de la fuente (opcional)</Label>
            <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Extracto / notas (opcional)</Label>
            <Textarea rows={3} value={form.excerpt} onChange={(e) => setForm((f) => ({ ...f, excerpt: e.target.value }))} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Registrar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IngestDocumentDialog({ caseId, onCreated }: { caseId: string; onCreated: (e: Evidence) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [entity, setEntity] = useState<PickedEntity | null>(null);
  const [form, setForm] = useState({ url: '', title: '' });

  const handleSubmit = async () => {
    if (!form.url.trim()) {
      toast.error('La URL es obligatoria.');
      return;
    }
    setSaving(true);
    try {
      const result = await ingestDocument({
        caseId,
        url: form.url.trim(),
        title: form.title.trim() || undefined,
        entityId: entity?.id,
      });
      onCreated(result.evidence);
      toast.success('Documento descargado, escaneado e ingerido correctamente');
      setOpen(false);
      setEntity(null);
      setForm({ url: '', title: '' });
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo ingerir el documento');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><UploadCloud className="mr-1.5 h-3.5 w-3.5" /> Ingerir documento (URL)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Ingerir documento desde una URL</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-xs text-slate-400">
            Se descarga server-side (protegido contra SSRF), se escanea con antivirus real y solo si
            está limpio se guarda y se extrae su texto como evidencia.
          </p>
          <div className="space-y-1.5">
            <Label>URL del documento</Label>
            <Input value={form.url} onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))} placeholder="https://..." />
          </div>
          <div className="space-y-1.5">
            <Label>Título (opcional)</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <EntityPickerInline caseId={caseId} label="Entidad a la que refiere (opcional)" value={entity} onChange={setEntity} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Ingerir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
