'use client';

import { useCallback, useEffect, useState } from 'react';
import axios from 'axios';
import { toast } from 'sonner';
import { ExternalLink, Loader2 } from 'lucide-react';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getProspectSocialContacts, saveProspectSocialContact, SOCIAL_LABELS, SOCIAL_PLATFORMS, type SocialPlatform, type SocialSource, type SocialContactsView } from '@/lib/api/prospect-social';

type Draft = { url: string; source: SocialSource | ''; version: number };
type Drafts = Record<SocialPlatform, Draft>;
const emptyDrafts = (): Drafts => Object.fromEntries(SOCIAL_PLATFORMS.map(platform => [platform, { url: '', source: '', version: 0 }])) as Drafts;
const actions = { CREATED: 'Enlace agregado', UPDATED: 'Enlace actualizado', REMOVED: 'Enlace retirado', PRIVACY_CLEARED: 'Retirado por tratamiento de datos o eliminación del contacto' };
const errorText = (error: unknown) => axios.isAxiosError(error) && typeof error.response?.data?.message === 'string' ? error.response.data.message : 'No se pudo completar la operación. Intenta de nuevo.';

export function SocialContactsCard({ prospectId }: { prospectId: string }) {
  const canRead = usePermission('PROSPECTOS');
  const canWrite = usePermission('PROSPECTOS', 'canWrite');
  const actorId = useAuthStore(state => state.user?.id);
  const [view, setView] = useState<SocialContactsView | null>(null);
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<SocialPlatform | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async (savedPlatform?: SocialPlatform) => {
    const result = await getProspectSocialContacts(prospectId);
    const next = emptyDrafts();
    for (const contact of result.contacts) next[contact.platform] = { url: contact.url || '', source: contact.source || '', version: contact.version };
    setView(result); setDrafts(previous => savedPlatform ? { ...previous, [savedPlatform]: next[savedPlatform] } : next); setError(null);
  }, [prospectId]);

  useEffect(() => {
    if (!canRead) return;
    let active = true;
    setLoading(true); setView(null); setError(null);
    getProspectSocialContacts(prospectId).then(result => {
      if (!active) return;
      const next = emptyDrafts();
      for (const contact of result.contacts) next[contact.platform] = { url: contact.url || '', source: contact.source || '', version: contact.version };
      setView(result); setDrafts(next);
    }).catch(error => { if (active) setError(errorText(error)); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [prospectId, canRead]);

  const save = async (platform: SocialPlatform, remove = false) => {
    const draft = drafts[platform];
    const url = remove ? null : draft.url.trim() || null;
    if (url && !draft.source) { toast.error('Selecciona el origen del enlace.'); return; }
    setBusy(platform);
    try {
      await saveProspectSocialContact(prospectId, platform, { url, ...(url ? { source: draft.source as SocialSource } : {}), expectedVersion: draft.version });
      await load(platform); toast.success(url ? 'Enlace guardado' : 'Enlace retirado');
    } catch (error) { toast.error(errorText(error)); }
    finally { setBusy(null); }
  };

  if (!canRead) return null;
  return <Card>
    <CardHeader><CardTitle>Redes sociales del contacto</CardTitle><p className="text-sm text-muted-foreground">Enlaces opcionales proporcionados por la persona o registrados por tu equipo.</p></CardHeader>
    <CardContent className="space-y-5">
      {loading ? <p className="flex items-center gap-2"><Loader2 className="size-4 animate-spin" />Cargando enlaces…</p> : error ? <div role="alert" className="space-y-2"><p>{error}</p><Button variant="outline" onClick={() => { setLoading(true); load().catch(e => setError(errorText(e))).finally(() => setLoading(false)); }}>Reintentar</Button></div> : view && <>
        {SOCIAL_PLATFORMS.map(platform => {
          const draft = drafts[platform];
          const current = view.contacts.find(contact => contact.platform === platform);
          const inputId = `social-${prospectId}-${platform}`;
          return <div key={platform} className="space-y-2 border-b pb-4 last:border-0">
            <div className="flex items-center justify-between gap-2">{canWrite ? <Label htmlFor={inputId}>{SOCIAL_LABELS[platform]}</Label> : <span className="font-medium">{SOCIAL_LABELS[platform]}</span>}{current?.url && <a href={current.url} target="_blank" rel="noopener noreferrer" referrerPolicy="no-referrer" className="inline-flex items-center gap-1 text-sm text-primary">Abrir perfil <ExternalLink className="size-3" /><span className="sr-only"> en {SOCIAL_LABELS[platform]}</span></a>}</div>
            {canWrite ? <div className="flex flex-col gap-2 sm:flex-row">
              <Input id={inputId} type="url" autoComplete="off" placeholder="https://…" maxLength={500} value={draft.url} disabled={busy !== null} className="min-w-0 flex-1" onChange={event => setDrafts(previous => ({ ...previous, [platform]: { ...previous[platform], url: event.target.value } }))} />
              <select aria-label={`Origen del enlace de ${SOCIAL_LABELS[platform]}`} value={draft.source} disabled={busy !== null} className="h-9 rounded-md border bg-background px-2 text-sm" onChange={event => setDrafts(previous => ({ ...previous, [platform]: { ...previous[platform], source: event.target.value as SocialSource | '' } }))}>
                <option value="">Selecciona origen</option><option value="CONTACT_DECLARED">Proporcionado por la persona</option><option value="TEAM_PROVIDED">Registrado por el equipo</option>
              </select>
              <Button size="sm" disabled={busy !== null || !draft.url.trim()} onClick={() => save(platform)}>{busy === platform ? 'Guardando…' : 'Guardar'}<span className="sr-only"> {SOCIAL_LABELS[platform]}</span></Button>
              {current?.url && <Button size="sm" variant="outline" disabled={busy !== null} onClick={() => save(platform, true)}>Retirar<span className="sr-only"> {SOCIAL_LABELS[platform]}</span></Button>}
            </div> : <p className="break-all text-sm text-muted-foreground">{current?.url || 'Sin enlace registrado'}</p>}
          </div>;
        })}
        <Button variant="outline" disabled={busy !== null} onClick={() => { setLoading(true); load().catch(e => setError(errorText(e))).finally(() => setLoading(false)); }}>Recargar enlaces</Button>
        {canWrite && <p className="text-xs text-muted-foreground">Recargar reemplaza los cambios que todavía no hayas guardado.</p>}
        <details className="text-sm"><summary className="cursor-pointer font-medium">Historial de cambios</summary><p className="mt-2 text-muted-foreground">Últimos {view.historyLimit} cambios. Los enlaces retirados no se conservan en este historial.</p>{view.history.length ? <ul className="mt-3 space-y-2">{view.history.map(event => <li key={event.id} className="border-b pb-2"><p>{SOCIAL_LABELS[event.platform]} · {actions[event.action]}</p><p className="text-xs text-muted-foreground">{new Date(event.createdAt).toLocaleString('es-CO')} · {event.actorId === null ? 'Sistema' : event.actorId === actorId ? 'Tú' : 'Miembro del equipo'} · Versión {event.version}</p></li>)}</ul> : <p className="mt-2 text-muted-foreground">Todavía no hay cambios.</p>}</details>
      </>}
    </CardContent>
  </Card>;
}
