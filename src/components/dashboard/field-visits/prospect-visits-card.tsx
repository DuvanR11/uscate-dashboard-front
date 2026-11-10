'use client';

// Plan hacia la versión estable, Fase 3c (2026-11-10): las visitas puerta a
// puerta de un contacto, en su ficha. No aparece mientras el servidor las
// tenga apagadas.
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, DoorOpen, Loader2, MapPin, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { apiErrorMessage } from '@/lib/api-error';
import {
  VISIT_RESULT_TONE,
  fieldVisitsApi,
  useFieldVisitsEnabled,
  visitTime,
  type ProspectVisits,
} from '@/lib/api/field-visits';
import { VisitDialog, type VisitTarget } from './visit-dialog';

interface Props {
  prospect: VisitTarget;
  canWrite: boolean;
}

export function ProspectVisitsCard({ prospect, canWrite }: Props) {
  const enabled = useFieldVisitsEnabled();
  const [data, setData] = useState<ProspectVisits | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(() => {
    fieldVisitsApi
      .forProspect(prospect.id)
      .then((value) => {
        setData(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, [prospect.id]);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (!enabled) return null;

  const remove = async (id: string) => {
    const confirmed = await confirmDialog({
      title: '¿Quitar esta visita?',
      description: 'Deja de contar en la cobertura y en el puntaje del contacto.',
      confirmLabel: 'Quitar visita',
    });
    if (!confirmed) return;
    setRemoving(id);
    try {
      await fieldVisitsApi.remove(id);
      toast.success('Visita quitada.');
      load();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo quitar la visita.');
    } finally {
      setRemoving(null);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 pb-3">
        <CardTitle className="flex items-center gap-2 text-base text-foreground">
          <DoorOpen className="h-5 w-5 text-primary" /> Visitas puerta a puerta
        </CardTitle>
        {canWrite && (
          <Button size="sm" onClick={() => setOpen(true)}>
            Registrar visita
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {data?.doNotReturn && (
          <p className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            En la última visita pidió que no volvieran. Respétalo antes de tocar de nuevo.
          </p>
        )}
        {failed && <p className="text-sm text-red-700">No se pudo cargar el historial de visitas.</p>}
        {!data && !failed && <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando visitas" />}
        {data && data.visits.length === 0 && (
          <p className="text-sm text-muted-foreground">Todavía nadie ha registrado una visita a este contacto.</p>
        )}
        {data && data.visits.length > 0 && (
          <ul className="divide-y">
            {data.visits.map((visit) => (
              <li key={visit.id} className="flex items-start justify-between gap-3 py-3 text-sm">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className={`border-transparent ${VISIT_RESULT_TONE[visit.result]}`}>
                      {visit.resultLabel}
                    </Badge>
                    <span className="text-muted-foreground">
                      {visitTime(visit.visitedAt)}
                      {visit.visitor ? ` · ${visit.visitor.fullName}` : ''}
                    </span>
                  </div>
                  {visit.note && <p className="whitespace-pre-line text-slate-700">{visit.note}</p>}
                  {visit.location && (
                    <a
                      href={`https://www.google.com/maps?q=${visit.location.latitude},${visit.location.longitude}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <MapPin className="h-3 w-3" /> Dónde se registró
                      {visit.location.accuracyMeters != null && ` (± ${Math.round(visit.location.accuracyMeters)} m)`}
                    </a>
                  )}
                </div>
                {visit.canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 shrink-0 text-slate-500"
                    aria-label="Quitar esta visita"
                    disabled={removing === visit.id}
                    onClick={() => remove(visit.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
      <VisitDialog open={open} onOpenChange={setOpen} prospect={prospect} onSaved={load} />
    </Card>
  );
}
