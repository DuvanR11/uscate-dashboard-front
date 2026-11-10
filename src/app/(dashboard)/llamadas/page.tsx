'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): listas de llamadas.
// Se arman con los mismos filtros de las difusiones (solo contactos con
// autorización y celular, fuera de la lista de exclusión y sin quienes
// pidieron no llamar) y se reparten por partes iguales entre quienes pueden
// llamar. El Coordinador arma y reparte con su equipo.
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, PhoneCall, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { confirmDialog } from '@/components/ui/confirm-dialog';
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
import { MultiPick } from '@/components/dashboard/campaigns/audience-picker';
import { usePermission } from '@/hooks/use-permission';
import { apiErrorMessage } from '@/lib/api-error';
import type { CampaignAudience } from '@/lib/api/campaign-audience';
import { visitTime } from '@/lib/api/field-visits';
import {
  CALL_OUTCOME_TONE,
  callListsApi,
  surveysApi,
  useSurveysEnabled,
  type AvailableSurvey,
  type CallListDetail,
  type CallListOptions,
  type CallListSummary,
} from '@/lib/api/surveys';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

function NewListDialog({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [options, setOptions] = useState<CallListOptions | null>(null);
  const [surveys, setSurveys] = useState<AvailableSurvey[]>([]);
  const [failed, setFailed] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [audience, setAudience] = useState<CampaignAudience>({});
  const [surveyId, setSurveyId] = useState('');
  const [assignees, setAssignees] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ eligible: number; truncated: boolean; max: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName('');
    setAudience({});
    setSurveyId('');
    setAssignees([]);
    setFailed(null);
    Promise.all([callListsApi.options(), surveysApi.available('CALL')])
      .then(([o, s]) => {
        setOptions(o);
        setSurveys(s);
      })
      .catch((e) => setFailed(apiErrorMessage(e) ?? 'No se pudieron cargar los filtros.'));
  }, [open]);

  const key = JSON.stringify(audience);
  useEffect(() => {
    if (!open || !options) return;
    let alive = true;
    setPreview(null);
    const timer = setTimeout(() => {
      callListsApi
        .preview(audience)
        .then((p) => alive && setPreview(p))
        .catch(() => alive && setPreview(null));
    }, 300);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options, key]);

  const ready = name.trim().length >= 3 && assignees.length > 0 && !!preview && preview.eligible > 0;

  const save = async () => {
    if (!ready) return;
    setSaving(true);
    try {
      await callListsApi.create({
        name: name.trim(),
        audience,
        assigneeIds: assignees,
        ...(surveyId ? { surveyId } : {}),
      });
      toast.success('Lista creada y repartida.');
      onCreated();
      onClose();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo crear la lista.');
    } finally {
      setSaving(false);
    }
  };

  const perPerson = preview && assignees.length > 0 ? Math.ceil(preview.eligible / assignees.length) : 0;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && !saving && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PhoneCall className="h-5 w-5 text-primary" /> Nueva lista de llamadas
          </DialogTitle>
          <DialogDescription>
            Entran los contactos con autorización de datos y celular, que no estén en la lista de exclusión ni
            hayan pedido no llamar.
          </DialogDescription>
        </DialogHeader>

        {failed ? (
          <p className="text-sm text-red-700">{failed}</p>
        ) : !options ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando" />
        ) : (
          <div className="space-y-4 py-1">
            <div className="space-y-2">
              <Label htmlFor="call-list-name">Nombre</Label>
              <Input
                id="call-list-name"
                maxLength={120}
                placeholder="Indecisos de Chapinero, sábado"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">A quiénes llamar</p>
              <div className="grid gap-2 sm:grid-cols-2">
                <MultiPick
                  label="Zonas"
                  items={options.zones.map((z) => ({ id: z.id, label: z.name }))}
                  selected={audience.localityIds ?? []}
                  onChange={(ids) => setAudience({ ...audience, localityIds: ids as number[] })}
                />
                <MultiPick
                  label="Líderes"
                  items={options.leaders.map((l) => ({ id: l.id, label: l.fullName }))}
                  selected={audience.leaderIds ?? []}
                  onChange={(ids) => setAudience({ ...audience, leaderIds: ids as string[] })}
                />
                <MultiPick
                  label="Etiquetas"
                  items={options.tags.map((t) => ({ id: t.id, label: t.name }))}
                  selected={audience.tagIds ?? []}
                  onChange={(ids) => setAudience({ ...audience, tagIds: ids as number[] })}
                />
                <MultiPick
                  label="Segmentos"
                  items={options.segments.map((s) => ({ id: s.id, label: s.name }))}
                  selected={audience.segmentIds ?? []}
                  onChange={(ids) => setAudience({ ...audience, segmentIds: ids as number[] })}
                />
              </div>
              <p className="text-xs text-slate-600" aria-live="polite">
                {!preview ? (
                  <span className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-3 w-3 animate-spin" /> Contando…
                  </span>
                ) : (
                  <>
                    Entran <span className="font-bold text-slate-800">{number(preview.eligible)}</span>{' '}
                    {preview.eligible === 1 ? 'contacto' : 'contactos'}.
                    {preview.truncated && ` Una lista tiene máximo ${number(preview.max)}: afina los filtros.`}
                  </>
                )}
              </p>
            </div>
            <div className="space-y-2">
              <p className="text-sm font-medium">Entre quiénes se reparte</p>
              <MultiPick
                label="Personas"
                items={options.callers.map((c) => ({ id: c.id, label: `${c.fullName}${c.role ? ` · ${c.role}` : ''}` }))}
                selected={assignees}
                onChange={(ids) => setAssignees(ids as string[])}
              />
              {options.callers.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Nadie de tu equipo puede llamar todavía: necesita el módulo «Encuestas y llamadas».
                </p>
              ) : (
                assignees.length > 0 &&
                preview && (
                  <p className="text-xs text-slate-600">
                    Por partes iguales: unas {number(perPerson)} llamadas por persona.
                  </p>
                )
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="call-list-survey">Encuesta al llamar (opcional)</Label>
              <select
                id="call-list-survey"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={surveyId}
                onChange={(e) => setSurveyId(e.target.value)}
              >
                <option value="">Sin encuesta</option>
                {surveys.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.title}
                  </option>
                ))}
              </select>
              {surveys.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay encuestas activas que se apliquen al llamar.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear y repartir
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ListDetailDialog({
  listId,
  canWrite,
  onClose,
  onChanged,
}: {
  listId: string | null;
  canWrite: boolean;
  onClose: () => void;
  onChanged: () => void;
}) {
  const [detail, setDetail] = useState<CallListDetail | null>(null);
  const [callers, setCallers] = useState<CallListOptions['callers']>([]);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    if (!listId) return;
    callListsApi
      .detail(listId)
      .then(setDetail)
      .catch((e) => toast.error(apiErrorMessage(e) ?? 'No se pudo cargar la lista.'));
  }, [listId]);

  useEffect(() => {
    setDetail(null);
    setFrom('');
    setTo('');
    load();
    if (listId && canWrite)
      callListsApi
        .options()
        .then((o) => setCallers(o.callers))
        .catch(() => setCallers([]));
  }, [listId, canWrite, load]);

  if (!listId) return null;

  const reassign = async () => {
    if (!from || !to || from === to) return;
    setBusy(true);
    try {
      const { moved } = await callListsApi.reassign(listId, from, to);
      toast.success(moved === 1 ? 'Se pasó 1 llamada.' : `Se pasaron ${number(moved)} llamadas.`);
      load();
      onChanged();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudieron pasar las llamadas.');
    } finally {
      setBusy(false);
    }
  };

  const close = async () => {
    const confirmed = await confirmDialog({
      title: '¿Cerrar esta lista?',
      description: 'Lo pendiente deja de aparecer en «Mis llamadas». Lo ya registrado se conserva.',
      confirmLabel: 'Cerrar lista',
    });
    if (!confirmed) return;
    setBusy(true);
    try {
      setDetail(await callListsApi.close(listId));
      toast.success('Lista cerrada.');
      onChanged();
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo cerrar la lista.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open onOpenChange={(next) => !next && !busy && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{detail?.name ?? 'Lista de llamadas'}</DialogTitle>
          <DialogDescription>
            {detail
              ? `${number(detail.total)} contactos${detail.survey ? ` · Encuesta: ${detail.survey.title}` : ''}`
              : 'Cargando…'}
          </DialogDescription>
        </DialogHeader>
        {!detail ? (
          <Loader2 className="h-5 w-5 animate-spin text-slate-400" aria-label="Cargando" />
        ) : (
          <div className="space-y-4 py-1">
            <table className="w-full text-sm">
              <caption className="sr-only">Avance por persona</caption>
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-3 font-semibold">Persona</th>
                  <th className="py-2 pr-3 text-right font-semibold">Hechas</th>
                  <th className="py-2 text-right font-semibold">Pendientes</th>
                </tr>
              </thead>
              <tbody>
                {detail.assignees.map((a) => (
                  <tr key={a.id} className="border-b last:border-0">
                    <td className="py-2 pr-3">{a.fullName}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{number(a.done)}</td>
                    <td className="py-2 text-right tabular-nums">{number(a.pending)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detail.outcomes.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {detail.outcomes.map((o) => (
                  <Badge key={o.outcome} variant="outline" className={`border-transparent ${CALL_OUTCOME_TONE[o.outcome]}`}>
                    {o.label}: {number(o.count)}
                  </Badge>
                ))}
              </div>
            )}
            {canWrite && detail.status === 'ACTIVE' && (
              <div className="space-y-2 rounded-lg border bg-muted/30 p-3">
                <p className="text-sm font-medium">Pasar lo pendiente de una persona a otra</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  <select
                    aria-label="De quién"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={from}
                    onChange={(e) => setFrom(e.target.value)}
                  >
                    <option value="">De…</option>
                    {detail.assignees
                      .filter((a) => a.pending > 0)
                      .map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.fullName} ({number(a.pending)})
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label="A quién"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={to}
                    onChange={(e) => setTo(e.target.value)}
                  >
                    <option value="">A…</option>
                    {callers
                      .filter((c) => c.id !== from)
                      .map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.fullName}
                        </option>
                      ))}
                  </select>
                </div>
                <Button size="sm" variant="outline" disabled={!from || !to || busy} onClick={reassign}>
                  Pasar llamadas
                </Button>
              </div>
            )}
          </div>
        )}
        <DialogFooter>
          {canWrite && detail?.status === 'ACTIVE' && (
            <Button variant="outline" className="text-red-700" disabled={busy} onClick={close}>
              Cerrar lista
            </Button>
          )}
          <Button onClick={onClose} disabled={busy}>
            Listo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CallListsPage() {
  const enabled = useSurveysEnabled();
  const canWrite = usePermission('ENCUESTAS_ADMIN', 'canWrite');
  const [lists, setLists] = useState<CallListSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);

  const load = useCallback(() => {
    callListsApi
      .list()
      .then((value) => {
        setLists(value);
        setFailed(false);
      })
      .catch(() => setFailed(true));
  }, []);

  useEffect(() => {
    if (enabled) load();
  }, [enabled, load]);

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las listas de llamadas todavía no están activas en Zyron.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 border-b border-border/40 pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            <PhoneCall className="h-7 w-7 text-primary" /> Listas de llamadas
          </h1>
          <p className="text-muted-foreground">
            Arma una lista con tus contactos y repártela. Cada persona ve sus llamadas en «Mis llamadas».
          </p>
        </div>
        {canWrite && (
          <Button className="h-11" onClick={() => setCreating(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nueva lista
          </Button>
        )}
      </div>

      {failed && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          No se pudieron cargar las listas.{' '}
          <button className="font-semibold underline" onClick={load}>
            Reintentar
          </button>
        </p>
      )}
      {!lists && !failed && <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Cargando" />}
      {lists && lists.length === 0 && (
        <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
          Todavía no hay listas de llamadas.
        </p>
      )}
      {lists && lists.length > 0 && (
        <ul className="space-y-3">
          {lists.map((list) => (
            <li key={list.id}>
              <Card>
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="font-semibold text-slate-800">{list.name}</p>
                    <p className="text-xs text-slate-500">
                      {visitTime(list.createdAt)}
                      {list.createdBy ? ` · ${list.createdBy.fullName}` : ''}
                      {list.survey ? ` · Encuesta: ${list.survey.title}` : ''}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-40 rounded-full bg-slate-100" aria-hidden>
                        <div
                          className="h-2 rounded-full bg-primary"
                          style={{ width: `${list.total ? (list.done / list.total) * 100 : 0}%` }}
                        />
                      </div>
                      <span className="text-xs tabular-nums text-slate-600">
                        {number(list.done)} de {number(list.total)} hechas
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {list.status === 'CLOSED' && (
                      <Badge variant="outline" className="border-transparent bg-zinc-200 text-zinc-700">
                        Cerrada
                      </Badge>
                    )}
                    <Button size="sm" variant="outline" onClick={() => setOpenId(list.id)}>
                      Ver avance
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}

      <NewListDialog open={creating} onClose={() => setCreating(false)} onCreated={load} />
      <ListDetailDialog listId={openId} canWrite={canWrite} onClose={() => setOpenId(null)} onChanged={load} />
    </div>
  );
}
