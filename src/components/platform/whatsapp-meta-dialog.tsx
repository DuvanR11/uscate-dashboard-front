'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, MessageCircle, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  extractErrorMessage,
  getWhatsappMeta,
  removeWhatsappMeta,
  saveWhatsappMeta,
  type PlatformOrganization,
  type WhatsappMetaStatus,
} from '@/lib/api/platform';
import { confirmDialog } from '@/components/ui/confirm-dialog';

// Fase B "Operar clientes reales" (2026-09-28): el operador conecta el
// número de WhatsApp Business (Meta Cloud API) de UNA organización. El
// backend valida contra Meta antes de guardar y nunca devuelve el token.
export function WhatsappMetaDialog({
  organization,
  onChanged,
}: {
  organization: PlatformOrganization;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<WhatsappMetaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [phoneNumberId, setPhoneNumberId] = useState('');
  const [businessAccountId, setBusinessAccountId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getWhatsappMeta(organization.id);
      setStatus(result);
      setPhoneNumberId(result.phoneNumberId ?? '');
      setBusinessAccountId(result.businessAccountId ?? '');
      setAccessToken('');
    } catch (error) {
      toast.error('No se pudo consultar el WhatsApp oficial', { description: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const canSave = /^\d{5,25}$/.test(phoneNumberId.trim()) && /^\d{5,25}$/.test(businessAccountId.trim()) && accessToken.trim().length > 0;

  const handleSave = async () => {
    setBusy('save');
    try {
      const result = await saveWhatsappMeta(organization.id, {
        phoneNumberId: phoneNumberId.trim(),
        businessAccountId: businessAccountId.trim(),
        accessToken: accessToken.trim(),
      });
      setStatus(result);
      setAccessToken('');
      toast.success('Número conectado', { description: result.displayPhoneNumber ?? undefined });
      onChanged();
    } catch (error) {
      toast.error('Meta no aceptó las credenciales', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    if (!await confirmDialog(`¿Desconectar el WhatsApp oficial de ${organization.name}? Sus campañas por Meta dejarán de salir.`)) return;
    setBusy('remove');
    try {
      await removeWhatsappMeta(organization.id);
      setStatus({ configured: false });
      setPhoneNumberId('');
      setBusinessAccountId('');
      toast.success('Número desconectado');
      onChanged();
    } catch (error) {
      toast.error('No se pudo desconectar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const connected = organization.whatsappMeta;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800"
          title="WhatsApp oficial (Meta Cloud API) con el número propio de la organización"
        >
          <MessageCircle className={`h-3.5 w-3.5 ${connected ? 'text-emerald-600' : 'text-slate-400'}`} />
          {connected ? `WhatsApp oficial: ${connected.displayPhoneNumber}` : 'Conectar WhatsApp oficial'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>WhatsApp oficial — {organization.name}</DialogTitle>
          <DialogDescription>
            Datos de la app de Meta del cliente (WhatsApp Manager → Configuración de la API). Se validan con Meta antes de
            guardarse y el token queda cifrado.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          </div>
        ) : (
          <div className="space-y-4 text-sm">
            {status?.configured && (
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-emerald-900 ring-1 ring-emerald-200">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                <div>
                  <p className="font-medium">
                    Conectado {status.displayPhoneNumber ? `· ${status.displayPhoneNumber}` : ''}
                  </p>
                  <p className="text-xs">
                    {status.verifiedName ? `${status.verifiedName} · ` : ''}token terminado en …{status.tokenLast4}
                    {status.verifiedAt ? ` · validado el ${new Date(status.verifiedAt).toLocaleDateString('es-CO')}` : ''}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="wa-phone-id">Phone Number ID</Label>
              <Input id="wa-phone-id" inputMode="numeric" value={phoneNumberId} onChange={(e) => setPhoneNumberId(e.target.value)} placeholder="Ej: 109876543210987" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-waba-id">WhatsApp Business Account ID</Label>
              <Input id="wa-waba-id" inputMode="numeric" value={businessAccountId} onChange={(e) => setBusinessAccountId(e.target.value)} placeholder="Ej: 123456789012345" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="wa-token">Token de acceso permanente</Label>
              <Input
                id="wa-token"
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={status?.configured ? 'Escríbelo de nuevo solo para cambiarlo' : 'Token de un usuario del sistema'}
              />
              <p className="text-xs text-slate-500">
                Usa un token de usuario del sistema (no vence). Los tokens temporales de prueba caducan en 24 horas.
              </p>
            </div>

            <div className="flex flex-wrap justify-between gap-2 pt-2">
              {status?.configured ? (
                <Button variant="outline" onClick={handleRemove} disabled={busy !== null}>
                  {busy === 'remove' ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <Unplug className="mr-1.5 h-4 w-4" />}
                  Desconectar
                </Button>
              ) : (
                <span />
              )}
              <Button onClick={handleSave} disabled={!canSave || busy !== null}>
                {busy === 'save' && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
                {status?.configured ? 'Validar y actualizar' : 'Validar y conectar'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
