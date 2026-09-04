'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import {
  updateCase,
  addSubject,
  removeSubject,
  extractErrorMessage,
  type InvestigationCaseDetail,
  type CaseStatus,
  type SubjectType,
} from '@/lib/api/osint';

const STATUS_LABEL: Record<CaseStatus, string> = { OPEN: 'Abierto', CLOSED: 'Cerrado', ARCHIVED: 'Archivado' };

export default function SummaryTab({
  investigationCase,
  onUpdated,
  onDeleted,
}: {
  investigationCase: InvestigationCaseDetail;
  onUpdated: (updated: InvestigationCaseDetail) => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    title: investigationCase.title,
    description: investigationCase.description ?? '',
    status: investigationCase.status,
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await updateCase(investigationCase.id, form);
      onUpdated({ ...investigationCase, ...updated });
      toast.success('Caso actualizado');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo actualizar el caso');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveSubject = async (subjectId: string) => {
    if (!window.confirm('¿Quitar este sujeto del caso?')) return;
    try {
      await removeSubject(investigationCase.id, subjectId);
      onUpdated({
        ...investigationCase,
        subjects: investigationCase.subjects.filter((s) => s.id !== subjectId),
      });
      toast.success('Sujeto eliminado');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar el sujeto');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm">
        <CardHeader><CardTitle className="text-base text-primary">Datos del caso</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="space-y-1.5">
            <Label>Descripción</Label>
            <Textarea
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Estado</Label>
            <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v as CaseStatus }))}>
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(STATUS_LABEL) as CaseStatus[]).map((s) => (
                  <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex justify-between pt-2">
            <Button
              variant="destructive"
              onClick={() => {
                if (window.confirm(`¿Eliminar el caso "${investigationCase.title}"? Esta acción no se puede deshacer.`)) {
                  onDeleted();
                }
              }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Eliminar caso
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Guardar cambios'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-primary">Sujetos ({investigationCase.subjects.length})</CardTitle>
          <NewSubjectDialog
            caseId={investigationCase.id}
            onCreated={(subject) => onUpdated({ ...investigationCase, subjects: [subject, ...investigationCase.subjects] })}
          />
        </CardHeader>
        <CardContent className="p-0">
          {investigationCase.subjects.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">
              Sin sujetos registrados — agrega a quién investiga este caso.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {investigationCase.subjects.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.displayName}</TableCell>
                    <TableCell>{s.type === 'PERSON' ? 'Persona' : 'Empresa'}</TableCell>
                    <TableCell className="font-mono text-xs">{s.documentNumber || '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveSubject(s.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewSubjectDialog({
  caseId,
  onCreated,
}: {
  caseId: string;
  onCreated: (subject: InvestigationCaseDetail['subjects'][number]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ type: 'PERSON' as SubjectType, displayName: '', documentNumber: '' });

  const handleSubmit = async () => {
    if (form.displayName.trim().length < 2) {
      toast.error('El nombre debe tener al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const subject = await addSubject(caseId, {
        type: form.type,
        displayName: form.displayName.trim(),
        documentNumber: form.documentNumber.trim() || undefined,
      });
      onCreated(subject);
      toast.success('Sujeto agregado');
      setForm({ type: 'PERSON', displayName: '', documentNumber: '' });
      setOpen(false);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo agregar el sujeto');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1.5 h-3.5 w-3.5" /> Agregar</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo sujeto</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v) => setForm((f) => ({ ...f, type: v as SubjectType }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PERSON">Persona</SelectItem>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Documento (opcional)</Label>
              <Input
                value={form.documentNumber}
                onChange={(e) => setForm((f) => ({ ...f, documentNumber: e.target.value }))}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Nombre</Label>
            <Input
              value={form.displayName}
              onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Agregar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
