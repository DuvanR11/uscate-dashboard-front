// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Diálogo para rechazar con motivo. */
export function PetitionRejectDialog({ w }: { w: PetitionsWorkspace }) {
  const {
    isSaving,
    rejectDialogOpen,
    setRejectDialogOpen,
    rejectReason,
    setRejectReason,
    handleReject,
  } = w;
  return (
    <>
      {/* Plan "Cadena de Firma", Fase 5 (2026-09-03) — reemplaza el
      `window.prompt()` provisional de la Fase 3. */}
      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) setRejectReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rechazar y devolver al abogado</DialogTitle>
            <DialogDescription>
              Explica qué hay que corregir. El abogado verá este motivo tal
              cual al reabrir la petición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="reject-reason">Motivo del rechazo</Label>
            <Textarea
              id="reject-reason"
              rows={4}
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Ej: Falta citar el artículo correcto de la Ley 1755 y precisar la fecha de los hechos."
              className="text-sm"
            />
            <p
              className={`text-xs ${
                rejectReason.trim().length > 0 && rejectReason.trim().length < 10
                  ? 'text-red-600'
                  : 'text-slate-400'
              }`}
            >
              {rejectReason.trim().length}/10 caracteres mínimos
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectDialogOpen(false)}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleReject}
              disabled={isSaving || rejectReason.trim().length < 10}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {isSaving ? (
                <Loader2 className="mr-2 animate-spin" size={14} />
              ) : null}
              Confirmar rechazo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
