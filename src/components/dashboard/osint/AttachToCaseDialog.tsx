'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Link2, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  listCases,
  createEvidenceBulkFromSearch,
  extractErrorMessage,
  type InvestigationCase,
} from '@/lib/api/osint';

// Plan "Pilar OSINT" (2026-09-02), Fase D — puente real entre el buscador
// ad-hoc (`/inteligencia/expedientes`) y la gestión de casos
// (`/osint/casos`): hasta ahora, si un investigador encontraba algo real
// acá, la única forma de llevarlo a un caso era transcribirlo a mano con
// "Nota manual". Este diálogo lo convierte en Evidence real con un clic —
// tope de 100 registros por vez, el mismo límite real que exige el
// backend (`CreateEvidenceBulkDto`).
export default function AttachToCaseDialog({
  sourceKey,
  sourceLabel,
  records,
}: {
  sourceKey: string;
  sourceLabel: string;
  records: Record<string, unknown>[];
}) {
  const [open, setOpen] = useState(false);
  const [cases, setCases] = useState<InvestigationCase[]>([]);
  const [caseId, setCaseId] = useState('');
  const [loadingCases, setLoadingCases] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoadingCases(true);
    listCases({ pageSize: 100 })
      .then((res) => setCases(res.data))
      .catch((err) => toast.error(extractErrorMessage(err) || 'No se pudieron cargar los casos'))
      .finally(() => setLoadingCases(false));
  }, [open]);

  const limitedRecords = records.slice(0, 100);
  const truncated = records.length > limitedRecords.length;

  const handleConfirm = async () => {
    if (!caseId) {
      toast.error('Elegí un caso primero');
      return;
    }
    setSaving(true);
    try {
      const created = await createEvidenceBulkFromSearch({
        caseId,
        sourceKey,
        records: limitedRecords,
      });
      toast.success(`${created.length} registro(s) real(es) agregado(s) como evidencia`);
      setOpen(false);
      setCaseId('');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo agregar la evidencia');
    } finally {
      setSaving(false);
    }
  };

  if (!records.length) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1.5">
          <Link2 size={13} /> Agregar a un caso ({records.length})
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agregar {sourceLabel} a un caso</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-slate-500">
          Se registrarán {limitedRecords.length} registro(s) de {sourceLabel} como evidencia real del caso
          elegido{truncated ? ` (de ${records.length} encontrados — tope de 100 por vez)` : ''}.
        </p>

        <Select value={caseId} onValueChange={setCaseId}>
          <SelectTrigger>
            <SelectValue placeholder={loadingCases ? 'Cargando casos…' : 'Elegí un caso'} />
          </SelectTrigger>
          <SelectContent>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.title}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {!loadingCases && cases.length === 0 && (
          <p className="text-xs text-amber-600">
            Todavía no tenés ningún caso —{' '}
            <a href="/osint/casos" className="underline" target="_blank" rel="noopener noreferrer">
              creá uno en Casos
            </a>{' '}
            y volvé a intentarlo.
          </p>
        )}

        <DialogFooter>
          <Button onClick={handleConfirm} disabled={saving || !caseId}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : null}
            Agregar como evidencia
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
