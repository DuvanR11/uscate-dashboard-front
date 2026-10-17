// Pantalla de Peticiones dividida (2026-10-17): código MOVIDO tal cual desde
// peticiones/page.tsx.
'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { PetitionsWorkspace } from './use-petitions-workspace';

/** Diálogo para prorrogar el plazo con motivo. */
export function PetitionExtendDialog({ w }: { w: PetitionsWorkspace }) {
  const {
    extendDialogOpen,
    setExtendDialogOpen,
    extendReason,
    setExtendReason,
    isExtending,
    handleExtendDeadline,
  } = w;
  return (
    <>
      {/* Post-plan (2026-09-03) — "extensión de plazo legal" (Art. 14, Ley
      1755 de 2015): mismo patrón de diálogo real que el rechazo. */}
      <Dialog
        open={extendDialogOpen}
        onOpenChange={(open) => {
          setExtendDialogOpen(open);
          if (!open) setExtendReason('');
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Extender el plazo legal</DialogTitle>
            <DialogDescription>
              El Art. 14 de la Ley 1755 de 2015 permite duplicar el plazo
              con un motivo real justificado, notificado antes de que
              venza el plazo original. Esta extensión solo se puede
              aplicar una vez por petición.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="extend-reason">Motivo de la extensión</Label>
            <Textarea
              id="extend-reason"
              rows={4}
              value={extendReason}
              onChange={(e) => setExtendReason(e.target.value)}
              placeholder="Ej: Se requiere información adicional real de la entidad consultada para resolver de fondo."
              className="text-sm"
            />
            <p
              className={`text-xs ${
                extendReason.trim().length > 0 && extendReason.trim().length < 10
                  ? 'text-red-600'
                  : 'text-slate-400'
              }`}
            >
              {extendReason.trim().length}/10 caracteres mínimos
            </p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setExtendDialogOpen(false)}
              disabled={isExtending}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleExtendDeadline}
              disabled={isExtending || extendReason.trim().length < 10}
              className="bg-amber-600 text-white hover:bg-amber-700"
            >
              {isExtending ? (
                <Loader2 className="mr-2 animate-spin" size={14} />
              ) : null}
              Confirmar extensión
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
