'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { extractErrorMessage } from '@/lib/api-error';
import {
  getRequestCodeSettings,
  updateRequestCodeSettings,
  type RequestCodeSettings,
} from '@/lib/api/requests';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// La misma regla del servidor: de 2 a 6 letras o cifras (las tildes se quitan
// al guardar).
const VALID_PREFIX = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ0-9]{2,6}$/;

/**
 * Decisiones del 2026-10-29 (CRM-24): la sigla con la que empiezan los
 * códigos de solicitud de la organización. Cambia solo los códigos NUEVOS:
 * los que ya tiene el ciudadano no cambian.
 */
export function RequestCodeSettingsDialog({ open, onOpenChange }: Props) {
  const [settings, setSettings] = useState<RequestCodeSettings | null>(null);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSettings(null);
    getRequestCodeSettings()
      .then((data) => {
        setSettings(data);
        setValue(data.prefix ?? '');
      })
      .catch((error) => {
        toast.error(extractErrorMessage(error) ?? 'No se pudo cargar la sigla de los códigos.');
        onOpenChange(false);
      });
  }, [open, onOpenChange]);

  const save = async (prefix: string | null) => {
    if (prefix !== null && !VALID_PREFIX.test(prefix)) {
      return toast.error('La sigla lleva de 2 a 6 letras o cifras, sin espacios ni signos.');
    }
    setSaving(true);
    try {
      const data = await updateRequestCodeSettings(prefix);
      setSettings(data);
      setValue(data.prefix ?? '');
      toast.success(
        data.prefix
          ? `Los códigos nuevos empiezan por ${data.prefix}`
          : 'Los códigos nuevos vuelven a la sigla automática',
      );
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudo guardar la sigla.');
    } finally {
      setSaving(false);
    }
  };

  const trimmed = value.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Sigla de los códigos</DialogTitle>
          <DialogDescription>
            Es lo primero del código que recibe el ciudadano para consultar su solicitud. Cambia solo
            los códigos nuevos: los que ya se entregaron siguen igual.
          </DialogDescription>
        </DialogHeader>

        {!settings ? (
          <div className="flex justify-center py-8 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="request-code-prefix">Sigla</Label>
              <Input
                id="request-code-prefix"
                maxLength={6}
                placeholder={settings.automatic ?? 'Ej. VD26'}
                value={value}
                onChange={(event) => setValue(event.target.value)}
              />
              <p className="text-xs text-slate-500">
                De 2 a 6 letras o cifras.{' '}
                {settings.automatic
                  ? `Si la dejas vacía se usa la automática, ${settings.automatic}, que sale del nombre de la organización.`
                  : 'Si la dejas vacía se usa la que sale del nombre de la organización.'}
              </p>
            </div>
            {settings.example && (
              <p className="text-sm text-slate-600">
                Próximo código interno con la sigla guardada:{' '}
                <span className="font-mono font-semibold">{settings.example}</span>
              </p>
            )}
          </div>
        )}

        <DialogFooter className="gap-2">
          {settings?.prefix && (
            <Button variant="ghost" onClick={() => save(null)} disabled={saving}>
              Volver a la automática
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={() => save(trimmed === '' ? null : trimmed)} disabled={saving || !settings}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
