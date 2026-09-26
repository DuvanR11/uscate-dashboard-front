'use client';

import { useEffect, useState } from 'react';
import { Loader2, ScrollText } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { acceptLegal, listPendingLegal, type LegalDocument } from '@/lib/api/billing';
import { extractErrorMessage } from '@/lib/api/platform';

/**
 * Modal bloqueante de aceptación de documentos legales (términos, encargado
 * del tratamiento, política de privacidad). Solo aparece para ADMIN /
 * SUPER_ADMIN de una organización con documentos VIGENTES sin aceptar — el
 * backend decide (`GET /legal/pending` devuelve `[]` para cualquier otro
 * caso, incluida una sesión de soporte). La aceptación guarda usuario,
 * versión, fecha, IP y navegador como evidencia.
 */
export function LegalAcceptanceGate() {
  const impersonation = useAuthStore((s) => s.impersonation);
  const [pending, setPending] = useState<LegalDocument[]>([]);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (impersonation) return;
    listPendingLegal()
      .then(setPending)
      .catch(() => setPending([]));
  }, [impersonation]);

  if (impersonation || pending.length === 0) return null;

  const allChecked = pending.every((d) => checked.has(d.id));

  const toggle = (id: string, value: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (value) next.add(id);
      else next.delete(id);
      return next;
    });

  const handleAccept = async () => {
    setSaving(true);
    try {
      const result = await acceptLegal(pending.map((d) => d.id));
      setPending(result.pending);
      toast.success('Aceptación registrada');
    } catch (error) {
      toast.error('No se pudo registrar la aceptación', {
        description: extractErrorMessage(error) ?? 'Recarga la página e inténtalo de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    // Sin cierre posible (ni X, ni clic fuera, ni Escape): hasta aceptar,
    // no se usa la plataforma. Cerrar sesión sigue disponible desde el header.
    <Dialog open onOpenChange={() => undefined}>
      <DialogContent
        className="max-h-[90vh] max-w-2xl overflow-y-auto [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScrollText className="h-5 w-5" /> Antes de continuar
          </DialogTitle>
          <DialogDescription>
            Como administrador de tu organización debes revisar y aceptar estos documentos para usar la plataforma.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {pending.map((doc) => (
            <div key={doc.id} className="space-y-2">
              <p className="text-sm font-semibold text-slate-800">
                {doc.title} <span className="font-normal text-slate-400">· versión {doc.version}</span>
              </p>
              <div className="max-h-48 overflow-y-auto whitespace-pre-wrap rounded-md border bg-slate-50 p-3 text-xs leading-relaxed text-slate-700">
                {doc.content}
              </div>
              <label className="flex items-center gap-2 text-sm">
                <Checkbox checked={checked.has(doc.id)} onCheckedChange={(v) => toggle(doc.id, v === true)} />
                He leído y acepto este documento
              </label>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button onClick={handleAccept} disabled={!allChecked || saving}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Aceptar y continuar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
