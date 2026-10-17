// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { HISTORY_ACTION_LABELS } from './petition-model';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Historial del ciclo de vida. */
export function PetitionHistoryCard({ w }: { w: PetitionsWorkspace }) {
  const {
    formData,
    history,
  } = w;
  return (
    <>
      {/* Plan "Cadena de Firma", Fase 4 (2026-09-03), llevado a esta
      pantalla en la Fase 5 al retirarse "Redactor IA" (hallazgo P1
      real #10: "sin historial de versiones ni de acciones —
      imposible reconstruir qué pasó con un documento oficial si
      algo sale mal"). */}
      {formData.id && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <Clock size={15} className="text-primary" />
              Historial
            </CardTitle>
          </CardHeader>

          <CardContent className="pt-0">
            {history.length === 0 ? (
              <p className="text-xs text-slate-400">
                Sin eventos registrados todavía.
              </p>
            ) : (
              <ol className="space-y-3">
                {history.map((entry) => (
                  <li
                    key={entry.id}
                    className="border-l-2 border-slate-200 pl-3"
                  >
                    <p className="text-xs font-bold text-primary">
                      {HISTORY_ACTION_LABELS[entry.action] || entry.action}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      {entry.user?.fullName || 'Sistema'} ·{' '}
                      {new Date(entry.createdAt).toLocaleString('es-CO')}
                    </p>
                    {entry.detail && (
                      <p className="mt-1 text-[11px] italic text-slate-600">
                        “{entry.detail}”
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
