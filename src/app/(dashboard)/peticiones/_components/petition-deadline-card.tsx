// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCalendarDay } from '@/lib/dates';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Prórroga del plazo (Art. 14, Ley 1755 de 2015). */
export function PetitionDeadlineCard({ w }: { w: PetitionsWorkspace }) {
  const {
    formData,
    setExtendDialogOpen,
    canApprove,
    isLocked,
  } = w;
  return (
    <>
      {/* Post-plan (2026-09-03) — "extensión de plazo legal" (Art.
      14, Ley 1755 de 2015). Antes de esto, el plazo real de una
      petición ni siquiera se mostraba en el editor (solo en la
      tabla del tablero) — cualquier usuario ve la fecha real y si
      ya fue extendida; solo el despacho (`canApprove`) puede
      extenderla, y solo una vez, mismo criterio que aprobar/
      rechazar. */}
      {formData.id && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Calendar size={15} className="text-primary" />
              Plazo legal
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-slate-500">
              Fecha límite:{' '}
              <span className="font-bold text-slate-700">
                {/* Fase 3 del análisis de punta a punta (2026-10-28, GOB-07): el
                mismo día que la tabla y que el servidor. */}
                {formData.deadlineAt ? formatCalendarDay(formData.deadlineAt) : 'N/A'}
              </span>
            </p>

            {formData.deadlineExtendedAt ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-5 text-amber-900">
                <p className="mb-1 font-bold uppercase tracking-wide">
                  Plazo extendido (Art. 14, Ley 1755/2015)
                </p>
                <p>{formData.deadlineExtensionReason}</p>
              </div>
            ) : (
              // Una firmada ya no se prorroga (el servidor responde 400).
              canApprove && !isLocked && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setExtendDialogOpen(true)}
                  className="w-full border-amber-200 text-xs text-amber-700 hover:bg-amber-50"
                >
                  Extender plazo (doble del término)
                </Button>
              )
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
