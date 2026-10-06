'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { BarChart3, CheckCircle2, Loader2, Unplug } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  extractErrorMessage,
  getSocialMeta,
  removeSocialMeta,
  saveSocialMeta,
  type PlatformOrganization,
  type SocialMetaStatus,
} from '@/lib/api/platform';
import { confirmDialog } from '@/components/ui/confirm-dialog';

// Estadísticas de redes (2026-09-28): el operador conecta la página de
// Facebook de UNA organización; su Instagram Business vinculado lo detecta
// Meta al validar. El token queda cifrado y nunca vuelve del servidor.
export function SocialMetaDialog({
  organization,
  onChanged,
}: {
  organization: PlatformOrganization;
  onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<SocialMetaStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState<'save' | 'remove' | null>(null);
  const [pageId, setPageId] = useState('');
  const [accessToken, setAccessToken] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getSocialMeta(organization.id);
      setStatus(result);
      setPageId(result.pageId ?? '');
      setAccessToken('');
    } catch (error) {
      toast.error('No se pudo consultar la página conectada', { description: extractErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  }, [organization.id]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const canSave = /^\d{5,25}$/.test(pageId.trim()) && accessToken.trim().length > 0;

  const handleSave = async () => {
    setBusy('save');
    try {
      const result = await saveSocialMeta(organization.id, { pageId: pageId.trim(), accessToken: accessToken.trim() });
      setStatus(result);
      setAccessToken('');
      toast.success('Página conectada', {
        description: [result.pageName, result.instagramUsername ? `@${result.instagramUsername}` : null].filter(Boolean).join(' · '),
      });
      onChanged();
    } catch (error) {
      toast.error('Meta no aceptó la página', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    if (!await confirmDialog(`¿Desconectar la página de ${organization.name}? No podrá analizar sus publicaciones de Facebook e Instagram.`)) return;
    setBusy('remove');
    try {
      await removeSocialMeta(organization.id);
      setStatus({ configured: false });
      setPageId('');
      toast.success('Página desconectada');
      onChanged();
    } catch (error) {
      toast.error('No se pudo desconectar', { description: extractErrorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const connected = organization.socialMeta;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[11px] text-slate-500 hover:text-slate-800"
          title="Página de Facebook (e Instagram vinculado) para Estadísticas de redes"
        >
          <BarChart3 className={`h-3.5 w-3.5 ${connected ? 'text-emerald-600' : 'text-slate-400'}`} />
          {connected ? `Redes: ${connected.pageName}` : 'Conectar página de Facebook'}
        </button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Página de Facebook — {organization.name}</DialogTitle>
          <DialogDescription>
            Para Estadísticas de redes. El token debe tener permiso para leer las publicaciones y comentarios de la página
            (y de su Instagram Business, si lo tiene vinculado).
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
                  <p className="font-medium">{status.pageName ?? 'Página conectada'}</p>
                  <p className="text-xs">
                    {status.instagramUsername ? `Instagram @${status.instagramUsername} · ` : 'Sin Instagram vinculado · '}
                    token terminado en …{status.tokenLast4}
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="fb-page-id">ID de la página de Facebook</Label>
              <Input id="fb-page-id" inputMode="numeric" value={pageId} onChange={(e) => setPageId(e.target.value)} placeholder="Ej: 104567891234567" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="fb-token">Token de acceso de la página</Label>
              <Input
                id="fb-token"
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
                placeholder={status?.configured ? 'Escríbelo de nuevo solo para cambiarlo' : 'Token permanente de usuario del sistema'}
              />
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
