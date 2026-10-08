'use client';

import { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, Building2, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

import api from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';

// Datos del despacho con los que el servidor redacta, firma y membreta los
// derechos de petición (`GET/PUT /petitions/office-profile`). Antes estaban
// escritos a mano con los del primer cliente; ahora cada organización escribe
// los suyos y, mientras falten, el servidor no genera ningún documento.
export interface PetitionOffice {
  holderName: string;
  officeTitle: string;
  city: string;
  officeLocation: string;
  notificationEmail: string;
  contactName: string | null;
  contactPhone: string | null;
  invokesOppositionStatute: boolean;
}

interface OfficeResponse {
  profile: PetitionOffice | null;
  missing: string[];
}

const EMPTY: PetitionOffice = {
  holderName: '',
  officeTitle: '',
  city: '',
  officeLocation: '',
  notificationEmail: '',
  contactName: '',
  contactPhone: '',
  invokesOppositionStatute: false,
};

const messageOf = (error: unknown): string | undefined => {
  if (!error || typeof error !== 'object' || !('response' in error)) return undefined;
  const message = (error as { response?: { data?: { message?: string | string[] } } }).response?.data?.message;
  return Array.isArray(message) ? message.join(' ') : message;
};

export function PetitionOfficeProfile({
  canEdit,
  onChange,
}: {
  /** Quien tiene permiso de escritura en Derechos de petición. */
  canEdit: boolean;
  /** Avisa a la pantalla los datos vigentes (para la vista previa de la firma). */
  onChange?: (office: PetitionOffice | null) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [missing, setMissing] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<PetitionOffice>(EMPTY);

  const apply = useCallback(
    (data: OfficeResponse) => {
      setMissing(data.missing ?? []);
      setForm(data.profile ? { ...EMPTY, ...data.profile, contactName: data.profile.contactName ?? '', contactPhone: data.profile.contactPhone ?? '' } : EMPTY);
      onChange?.(data.profile);
      setLoaded(true);
    },
    [onChange],
  );

  useEffect(() => {
    let cancelled = false;
    api
      .get<OfficeResponse>('/petitions/office-profile')
      .then(({ data }) => {
        if (!cancelled) apply(data);
      })
      // Sin respuesta no se muestra el aviso: el servidor igual lo exige al generar.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [apply]);

  const set = <K extends keyof PetitionOffice>(key: K, value: PetitionOffice[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.put<OfficeResponse>('/petitions/office-profile', {
        ...form,
        contactName: form.contactName || undefined,
        contactPhone: form.contactPhone || undefined,
      });
      apply(data);
      setOpen(false);
      toast.success('Datos del despacho guardados');
    } catch (error) {
      toast.error(messageOf(error) || 'No se pudieron guardar los datos del despacho.');
    } finally {
      setSaving(false);
    }
  };

  const incomplete = loaded && missing.length > 0;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(true)}
        className={incomplete ? 'border-amber-400 text-amber-800' : 'border-slate-300 text-slate-700'}
      >
        <Building2 size={16} className="mr-2" />
        Datos del despacho
      </Button>

      {incomplete && (
        <div
          role="alert"
          className="order-last flex w-full basis-full items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900"
        >
          <AlertTriangle size={18} className="mt-0.5 shrink-0" />
          <div>
            <p className="font-semibold">Faltan los datos del despacho</p>
            <p>
              Sin ellos no se pueden redactar ni descargar derechos de petición. Falta: {missing.join(', ')}.{' '}
              {canEdit ? (
                <button type="button" className="font-semibold underline" onClick={() => setOpen(true)}>
                  Completarlos ahora
                </button>
              ) : (
                'Pídele a quien administra las peticiones que los complete.'
              )}
            </p>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Datos del despacho</DialogTitle>
            <DialogDescription>
              Con estos datos se redacta, se firma y se membreta cada derecho de petición de tu organización.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={save} className="space-y-4">
            <fieldset disabled={!canEdit || saving} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="office-holder">Titular del despacho</Label>
                  <Input id="office-holder" required maxLength={120} value={form.holderName} onChange={(e) => set('holderName', e.target.value)} placeholder="Nombre completo" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="office-title">Cargo</Label>
                  <Input id="office-title" required maxLength={160} value={form.officeTitle} onChange={(e) => set('officeTitle', e.target.value)} placeholder="Ej: Concejal de Neiva" />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="office-city">Ciudad desde la que se firma</Label>
                  <Input id="office-city" required maxLength={80} value={form.city} onChange={(e) => set('city', e.target.value)} placeholder="Ej: Neiva" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="office-email">Correo de notificaciones</Label>
                  <Input id="office-email" type="email" required maxLength={160} value={form.notificationEmail} onChange={(e) => set('notificationEmail', e.target.value)} placeholder="despacho@ejemplo.gov.co" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="office-location">Sede</Label>
                <Textarea id="office-location" required maxLength={400} rows={3} value={form.officeLocation} onChange={(e) => set('officeLocation', e.target.value)} placeholder={'Una línea por renglón. Ej:\nConcejo Municipal de Neiva\nCarrera 5 # 9-74'} />
                <p className="text-xs text-slate-500">Aparece bajo la firma y en el pie de cada página.</p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="office-contact">Persona de contacto (opcional)</Label>
                  <Input id="office-contact" maxLength={120} value={form.contactName ?? ''} onChange={(e) => set('contactName', e.target.value)} placeholder="Para dudas sobre el documento" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="office-phone">Celular del contacto (opcional)</Label>
                  <Input id="office-phone" maxLength={40} value={form.contactPhone ?? ''} onChange={(e) => set('contactPhone', e.target.value)} />
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
                <Switch id="office-statute" checked={form.invokesOppositionStatute} onCheckedChange={(checked) => set('invokesOppositionStatute', checked)} className="mt-0.5" />
                <div>
                  <Label htmlFor="office-statute" className="block cursor-pointer">Invocar el Estatuto de la Oposición</Label>
                  <p className="text-xs text-slate-500">
                    Pide trámite preferencial con el artículo 16 de la Ley 1909 de 2018. Actívalo solo si tu partido está declarado en oposición.
                  </p>
                </div>
              </div>
            </fieldset>

            {!canEdit && (
              <p className="text-xs text-slate-500">Solo quien tiene permiso de edición en Derechos de petición puede cambiar estos datos.</p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cerrar
              </Button>
              {canEdit && (
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 size={16} className="mr-2 animate-spin" />}
                  Guardar
                </Button>
              )}
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
