// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Asignación de abogado. */
export function PetitionLawyerCard({ w }: { w: PetitionsWorkspace }) {
  const {
    lawyers,
    assigningLawyerId,
    setAssigningLawyerId,
    isAssigning,
    formData,
    canApprove,
    resolveLawyerName,
    handleAssignLawyer,
  } = w;
  return (
    <>
      {/* Post-plan (2026-09-03) — "asignación de abogados con UI
      real": cierra el ciclo abierto desde la Fase 2
      (`assignLawyer()` existía en el backend, ningún botón lo
      usaba). Solo el despacho (`canApprove`) asigna — mismo
      criterio que aprobar/rechazar. Cualquier usuario ve a QUIÉN
      está asignada, aunque no pueda cambiarlo. */}
      {formData.id && (
        <Card className="border-0 shadow-sm">
          <CardHeader className="py-3">
            <CardTitle className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-slate-500">
              <User size={15} className="text-primary" />
              Asignación
            </CardTitle>
          </CardHeader>

          <CardContent className="space-y-3 pt-0">
            <p className="text-xs text-slate-500">
              {formData.assignedLawyerId ? (
                <>
                  Asignada a{' '}
                  <span className="font-bold text-slate-700">
                    {resolveLawyerName(formData.assignedLawyerId) || 'un abogado'}
                  </span>
                </>
              ) : (
                'Sin asignar todavía.'
              )}
            </p>

            {canApprove && (
              <div className="flex gap-2">
                <Select
                  value={assigningLawyerId}
                  onValueChange={setAssigningLawyerId}
                >
                  <SelectTrigger className="h-9 flex-1 text-xs">
                    <SelectValue placeholder="Elegir abogado..." />
                  </SelectTrigger>
                  <SelectContent>
                    {lawyers.map((lawyer) => (
                      <SelectItem key={lawyer.id} value={lawyer.id} className="text-xs">
                        {lawyer.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  size="sm"
                  onClick={handleAssignLawyer}
                  disabled={
                    isAssigning ||
                    !assigningLawyerId ||
                    assigningLawyerId === formData.assignedLawyerId
                  }
                  className="text-xs"
                >
                  {isAssigning ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    'Asignar'
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}
