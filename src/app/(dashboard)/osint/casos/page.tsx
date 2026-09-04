'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Fingerprint, Loader2, Plus } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { listCases, createCase, extractErrorMessage, type InvestigationCase, type CaseStatus } from '@/lib/api/osint';

const STATUS_LABEL: Record<CaseStatus, string> = { OPEN: 'Abierto', CLOSED: 'Cerrado', ARCHIVED: 'Archivado' };
const STATUS_VARIANT: Record<CaseStatus, 'default' | 'secondary' | 'outline'> = {
  OPEN: 'default',
  CLOSED: 'secondary',
  ARCHIVED: 'outline',
};

export default function OsintCasesPage() {
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<CaseStatus | '__all__'>('__all__');
  const [loading, setLoading] = useState(true);

  const load = async (opts?: { page?: number; status?: CaseStatus | '__all__' }) => {
    setLoading(true);
    try {
      const p = opts?.page ?? page;
      const s = opts?.status ?? status;
      const result = await listCases({ page: p, status: s === '__all__' ? undefined : s });
      setCases(result.data);
      setTotal(result.total);
      setPage(result.page);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron cargar los casos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load({ page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
            <Fingerprint className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-primary tracking-tight">Casos de investigación</h1>
            <p className="text-slate-500 text-sm">
              {total} caso{total !== 1 ? 's' : ''} — evidencia, entidades, relaciones, indicadores y monitores por caso.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select
            value={status}
            onValueChange={(v) => {
              setStatus(v as CaseStatus | '__all__');
              load({ page: 1, status: v as CaseStatus | '__all__' });
            }}
          >
            <SelectTrigger className="w-[160px] bg-slate-50"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Todos los estados</SelectItem>
              <SelectItem value="OPEN">Abierto</SelectItem>
              <SelectItem value="CLOSED">Cerrado</SelectItem>
              <SelectItem value="ARCHIVED">Archivado</SelectItem>
            </SelectContent>
          </Select>
          <NewCaseDialog onCreated={() => load({ page: 1 })} />
        </div>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          {loading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-slate-400" /></div>
          ) : cases.length === 0 ? (
            <div className="p-10 text-center text-slate-500 text-sm">Ningún caso todavía.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Sujetos</TableHead>
                  <TableHead>Evidencia</TableHead>
                  <TableHead>Creado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cases.map((c) => (
                  <TableRow key={c.id} className="cursor-pointer hover:bg-slate-50">
                    <TableCell>
                      <Link href={`/osint/casos/${c.id}`} className="font-bold text-primary hover:underline">
                        {c.title}
                      </Link>
                      {c.description && <p className="text-xs text-slate-400 truncate max-w-md">{c.description}</p>}
                    </TableCell>
                    <TableCell><Badge variant={STATUS_VARIANT[c.status]}>{STATUS_LABEL[c.status]}</Badge></TableCell>
                    <TableCell>{c._count?.subjects ?? 0}</TableCell>
                    <TableCell>{c._count?.evidence ?? 0}</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {new Date(c.createdAt).toLocaleDateString('es-CO')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {total > cases.length && !loading && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => load({ page: page - 1 })}>
            Anterior
          </Button>
          <Button variant="outline" size="sm" onClick={() => load({ page: page + 1 })}>
            Siguiente
          </Button>
        </div>
      )}
    </div>
  );
}

function NewCaseDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '' });

  const handleSubmit = async () => {
    if (form.title.trim().length < 2) {
      toast.error('El título debe tener al menos 2 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const created = await createCase({ title: form.title.trim(), description: form.description.trim() || undefined });
      toast.success(`Caso "${created.title}" creado`);
      setForm({ title: '', description: '' });
      setOpen(false);
      onCreated();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo crear el caso');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-secondary text-primary hover:bg-secondary/90 font-bold">
          <Plus className="mr-2 h-4 w-4" /> Nuevo caso
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo caso de investigación</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="case-title">Título</Label>
            <Input
              id="case-title"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="Ej. Contratación sospechosa — Municipio X"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="case-description">Descripción (opcional)</Label>
            <Textarea
              id="case-description"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Contexto del caso, hipótesis a verificar..."
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear caso'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
