'use client';

import { useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { expandEntity, extractErrorMessage, EXPANSION_SOURCE_KEYS } from '@/lib/api/osint';

/**
 * Plan "OSINT Profesional", Fase 2 ("Ampliar" una entidad puntual contra las
 * fuentes reales) — extraído a componente compartido en la Fase C2 del plan
 * "Pilar OSINT" (2026-09-02, decisión de producto confirmada con el
 * usuario: un botón EXPLÍCITO, nunca automático al resolver un sujeto) para
 * poder ofrecerlo también justo donde se resuelve una entidad
 * (`EntityPickerInline`), no solo desde la pestaña de Relaciones — mismo
 * mecanismo, un segundo punto de entrada real.
 */
export default function ExpandEntityDialog({
  caseId,
  entityId,
  entityName,
  onExpanded,
  trigger,
}: {
  caseId: string;
  entityId: string;
  entityName: string;
  onExpanded: () => void;
  /** Botón/disparador propio (ej. un ícono compacto dentro de otro componente). Por defecto: "Ampliar entidad". */
  trigger?: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [expanding, setExpanding] = useState(false);
  const [selectedSources, setSelectedSources] = useState<string[]>(
    EXPANSION_SOURCE_KEYS.map((s) => s.key),
  );

  const toggleSource = (key: string) => {
    setSelectedSources((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const handleExpand = async () => {
    if (selectedSources.length === 0) {
      toast.error('Elegí al menos una fuente.');
      return;
    }
    setExpanding(true);
    try {
      const result = await expandEntity(entityId, { caseId, sourceKeys: selectedSources });
      const errorCount = Object.keys(result.sourceErrors).length;
      toast.success(
        `${result.evidenceCreated.length} evidencia(s) agregada(s), ` +
          `${result.relationshipCandidatesCreated.length} vínculo(s) propuesto(s) para revisar` +
          (errorCount ? ` — ${errorCount} fuente(s) fallaron` : ''),
      );
      setOpen(false);
      onExpanded();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo ampliar la entidad');
    } finally {
      setExpanding(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline" className="gap-1.5">
            <Sparkles size={13} /> Ampliar entidad
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ampliar &ldquo;{entityName}&rdquo;</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-slate-500">
          Corre las fuentes elegidas usando el nombre de esta entidad puntual (no una búsqueda de
          texto libre) y agrega cada registro real como evidencia. Cuando un registro nombra una
          segunda parte (ej. un contrato SECOP con proveedor + entidad contratante), propone un
          vínculo para tu revisión — nunca lo confirma solo.
        </p>
        <div className="grid grid-cols-2 gap-2 py-2">
          {EXPANSION_SOURCE_KEYS.map((s) => (
            <label key={s.key} className="flex items-center gap-2 text-sm cursor-pointer">
              <Checkbox
                checked={selectedSources.includes(s.key)}
                onCheckedChange={() => toggleSource(s.key)}
              />
              {s.label}
            </label>
          ))}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={expanding}>Cancelar</Button>
          <Button onClick={handleExpand} disabled={expanding}>
            {expanding ? <Loader2 size={14} className="animate-spin" /> : 'Ampliar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
