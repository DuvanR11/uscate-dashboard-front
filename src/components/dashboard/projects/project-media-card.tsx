'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { isAxiosError } from 'axios';
import { toast } from 'sonner';
import { BellOff, ExternalLink, Loader2, Newspaper, Pencil, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TermList } from '@/components/dashboard/monitoring/term-list';
import { MediumBadge, ReachBadge } from '@/components/dashboard/monitoring/reach-badge';
import { usePermission } from '@/hooks/use-permission';
import { extractErrorMessage, requestFailureMessage } from '@/lib/api-error';
import type { KeywordPriority } from '@/lib/api/monitoring';
import type { SetupPreview } from '@/lib/api/monitoring-setup';
import {
  projectMediaApi,
  type ProjectMediaOverview,
  type ProjectNews,
  type ProjectTerms,
} from '@/lib/api/project-media';

const PRIORITY_LABEL: Record<KeywordPriority, string> = {
  HIGH: 'Alta: avisa enseguida',
  MEDIUM: 'Media',
  LOW: 'Baja: solo en el resumen',
};

const SENTIMENT: Record<string, { label: string; dot: string }> = {
  POSITIVO: { label: 'Positivo', dot: 'bg-emerald-500' },
  NEUTRAL: { label: 'Neutral', dot: 'bg-slate-400' },
  NEGATIVO: { label: 'Negativo', dot: 'bg-red-500' },
};

const DAY_FORMAT = new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });

const count = (n: number, word: string) => `${n} ${n === 1 ? word : `${word}s`}`;
// Menos de esto en 7 días: la búsqueda casi no trae noticias.
const FEW_NEWS = 3;

const errorText = (error: unknown, fallback: string) =>
  extractErrorMessage(error) || requestFailureMessage(error) || fallback;

/**
 * «En medios» en la ficha de un proyecto del Radar (Monitoreo de medios, Fase
 * 5, 2026-11-09): seguirlo en la prensa y ver sus noticias. Solo aparece si
 * la persona puede leer Monitoreo; para seguirlo, escribir en Monitoreo.
 */
export function ProjectMediaCard({ projectId }: { projectId: string }) {
  const canRead = usePermission('MONITOREO_PREDICTIVO', 'canRead');
  const canWrite = usePermission('MONITOREO_PREDICTIVO', 'canWrite');
  const [data, setData] = useState<ProjectMediaOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [editing, setEditing] = useState(false);
  const [stopping, setStopping] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await projectMediaApi.overview(projectId));
      setFailed(false);
    } catch (error) {
      // 404: el proyecto no es de una corporación que se ve; no se muestra nada.
      if (!(isAxiosError(error) && error.response?.status === 404)) setFailed(true);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    if (canRead) void load();
  }, [canRead, load]);

  if (!canRead) return null;

  async function stop() {
    const ok = await confirmDialog({
      title: '¿Dejar de seguir este proyecto en medios?',
      description: 'Ya no llegarán noticias nuevas suyas. Las que ya llegaron se quedan.',
      confirmLabel: 'Dejar de seguir',
      destructive: true,
    });
    if (!ok) return;
    setStopping(true);
    try {
      await projectMediaApi.unfollow(projectId);
      toast.success('Dejaste de seguir el proyecto en medios.');
      await load();
    } catch (error) {
      toast.error(errorText(error, 'No se pudo dejar de seguir el proyecto.'));
    } finally {
      setStopping(false);
    }
  }

  const following = data?.following;
  const active = !!following?.isActive;

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm" aria-labelledby="project-media-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Newspaper className="h-5 w-5" />
          </div>
          <div>
            <h2 id="project-media-title" className="text-base font-bold uppercase tracking-wide text-foreground">
              En medios
            </h2>
            {active && following && (
              <p className="text-xs text-slate-500">
                Sigues «{following.name}» · prioridad {PRIORITY_LABEL[following.priority].split(':')[0].toLowerCase()}
              </p>
            )}
          </div>
        </div>
        {data && canWrite && active && (
          <div className="flex flex-wrap gap-2" data-html2canvas-ignore="true">
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil className="mr-1 h-3.5 w-3.5" /> Ajustar términos
            </Button>
            <Button variant="ghost" size="sm" onClick={stop} disabled={stopping}>
              <BellOff className="mr-1 h-3.5 w-3.5" /> Dejar de seguir
            </Button>
          </div>
        )}
      </div>

      <div className="p-5 sm:p-6">
        {loading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Cargando…
          </p>
        ) : failed ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-red-700">No se pudieron cargar las noticias del proyecto.</p>
            <Button variant="outline" size="sm" onClick={() => void load()}>
              <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reintentar
            </Button>
          </div>
        ) : !data ? null : active ? (
          <FollowingView data={data} />
        ) : (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-slate-700">
              {following
                ? 'Dejaste de seguir este proyecto en medios. Sus noticias de antes siguen en Hoy.'
                : 'Sigue este proyecto en la prensa: Zyron arma la búsqueda con el nombre con que lo conocen los medios, te avisa cuando sale una noticia y la deja aquí y en Hoy.'}
            </p>
            {data.limit.max !== null && (
              <p className="text-xs text-slate-500">
                Sigues {data.limit.used} de {data.limit.max} proyectos que permite tu plan. No gastan etiquetas.
              </p>
            )}
            {canWrite ? (
              <Button onClick={() => setEditing(true)} data-html2canvas-ignore="true">
                <Sparkles className="mr-1.5 h-4 w-4" /> {following ? 'Seguir de nuevo' : 'Seguir en medios'}
              </Button>
            ) : (
              <p className="text-xs text-slate-500">Pídele a quien administra el monitoreo que lo siga.</p>
            )}
          </div>
        )}
      </div>

      {editing && (
        <FollowDialog
          projectId={projectId}
          current={data}
          onClose={() => setEditing(false)}
          onSaved={async () => {
            setEditing(false);
            await load();
          }}
        />
      )}
    </section>
  );
}

function FollowingView({ data }: { data: ProjectMediaOverview }) {
  const { summary, news, following } = data;
  const toned = summary.tone.POSITIVO + summary.tone.NEUTRAL + summary.tone.NEGATIVO;
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Esta semana" value={summary.week} />
        <Stat label={`Últimos ${summary.days} días`} value={summary.total} />
        <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">Tono</p>
          {toned === 0 ? (
            <p className="mt-1 text-sm text-slate-500">Sin clasificar todavía</p>
          ) : (
            <p className="mt-1 text-sm text-slate-700">
              {count(summary.tone.NEGATIVO, 'negativa')} · {count(summary.tone.POSITIVO, 'positiva')} ·{' '}
              {count(summary.tone.NEUTRAL, 'neutra')}
            </p>
          )}
        </div>
      </div>

      {news.length === 0 ? (
        <p className="text-sm text-slate-500">
          Todavía no llegan noticias. La primera lectura tarda unos minutos; si en unos días no llega nada, ajusta los
          términos.
        </p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {news.map((item) => (
            <NewsRow key={item.newsKey} item={item} />
          ))}
        </ul>
      )}

      {following && (
        <Link
          href={`/inteligencia/hoy?etiqueta=${following.keywordId}&periodo=30d`}
          className="inline-flex text-sm font-medium text-primary underline"
          data-html2canvas-ignore="true"
        >
          Ver todas en Hoy
        </Link>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-primary">{value === 1 ? '1 noticia' : `${value} noticias`}</p>
    </div>
  );
}

function NewsRow({ item }: { item: ProjectNews }) {
  const sentiment = item.sentiment ? SENTIMENT[item.sentiment] : null;
  const date = item.publishedAt ?? item.fetchedAt;
  return (
    <li className="py-3">
      {item.url ? (
        <a
          href={item.url}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-start gap-1 text-sm font-semibold text-slate-800 hover:underline"
        >
          <span className="line-clamp-2">{item.title}</span>
          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden />
        </a>
      ) : (
        <p className="text-sm font-semibold text-slate-800">{item.title}</p>
      )}
      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-500">
        <span>{item.outlet}</span>
        <MediumBadge medium={item.medium} />
        <ReachBadge reach={item.reach} />
        <span aria-hidden>·</span>
        <span>{DAY_FORMAT.format(new Date(date))}</span>
        {sentiment && (
          <span className="inline-flex items-center gap-1">
            <span className={`h-2 w-2 rounded-full ${sentiment.dot}`} aria-hidden />
            {sentiment.label}
          </span>
        )}
      </p>
    </li>
  );
}

type Draft = ProjectTerms & { priority: KeywordPriority };

function FollowDialog({
  projectId,
  current,
  onClose,
  onSaved,
}: {
  projectId: string;
  current: ProjectMediaOverview | null;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [query, setQuery] = useState('');
  const [ai, setAi] = useState(false);
  const [preview, setPreview] = useState<SetupPreview | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [stale, setStale] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editing = !!current?.following?.isActive;

  useEffect(() => {
    let cancelled = false;
    projectMediaApi
      .propose(projectId)
      .then((result) => {
        if (cancelled) return;
        setDraft({
          name: result.proposal.name,
          includes: result.proposal.includes,
          excludes: result.proposal.excludes,
          priority: current?.following?.priority ?? 'MEDIUM',
        });
        setQuery(result.proposal.query);
        setAi(result.ai);
        setPreview(result.preview);
      })
      .catch((e: unknown) => {
        if (!cancelled) setError(errorText(e, 'No se pudo armar la propuesta para este proyecto.'));
      });
    return () => {
      cancelled = true;
    };
  }, [projectId, current?.following?.priority]);

  function change(next: Partial<Draft>, affectsPreview = true) {
    setDraft((d) => (d ? { ...d, ...next } : d));
    if (affectsPreview) setStale(true);
  }

  async function recount() {
    if (!draft) return;
    setPreviewing(true);
    try {
      setPreview(await projectMediaApi.preview(projectId, draft));
      setStale(false);
    } catch (e) {
      toast.error(errorText(e, 'Google News no respondió. Inténtalo de nuevo.'));
    } finally {
      setPreviewing(false);
    }
  }

  async function save() {
    if (!draft) return;
    setSaving(true);
    try {
      await projectMediaApi.follow(projectId, draft);
      toast.success(
        editing ? 'Listo: guardaste los términos.' : 'Listo: sigues el proyecto en medios. La primera lectura tarda unos minutos.',
      );
      await onSaved();
    } catch (e) {
      toast.error(errorText(e, 'No se pudo seguir el proyecto.'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{editing ? 'Ajustar los términos del proyecto' : 'Seguir el proyecto en medios'}</DialogTitle>
          <DialogDescription>
            Zyron busca el proyecto en Google News para todos los que lo siguen. Tus términos deciden qué noticias te
            llegan, también desde los medios que elegiste.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p className="text-sm text-red-700">{error}</p>
        ) : !draft ? (
          <p className="flex items-center gap-2 py-6 text-sm text-slate-600" aria-live="polite">
            <Loader2 className="h-4 w-4 animate-spin" /> Buscando cómo lo nombra la prensa…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-1.5">
                <Label htmlFor="project-media-name">Nombre en la prensa</Label>
                <Input
                  id="project-media-name"
                  value={draft.name}
                  maxLength={60}
                  onChange={(e) => change({ name: e.target.value })}
                />
                {ai && !editing && <p className="text-xs text-slate-500">Lo propuso la IA a partir de la ficha.</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="project-media-priority">Prioridad</Label>
                <Select value={draft.priority} onValueChange={(v) => change({ priority: v as KeywordPriority }, false)}>
                  <SelectTrigger id="project-media-priority" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['HIGH', 'MEDIUM', 'LOW'] as KeywordPriority[]).map((p) => (
                      <SelectItem key={p} value={p}>
                        {PRIORITY_LABEL[p]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <TermList
                id="project-media-includes"
                label="Incluir"
                tone="include"
                terms={draft.includes}
                onChange={(includes) => change({ includes })}
              />
              <TermList
                id="project-media-excludes"
                label="Excluir"
                tone="exclude"
                terms={draft.excludes}
                onChange={(excludes) => change({ excludes })}
              />
            </div>

            <details className="text-sm">
              <summary className="cursor-pointer text-xs font-medium text-slate-600">Búsqueda en Google News</summary>
              <p className="mt-2 break-words rounded-md bg-slate-50 px-3 py-2 font-mono text-xs text-slate-700">{query}</p>
              <p className="mt-1 text-xs text-slate-500">Es la misma para todos los que siguen el proyecto.</p>
            </details>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
              {previewing ? (
                <p className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="h-4 w-4 animate-spin" /> Revisando Google News de los últimos 7 días…
                </p>
              ) : preview ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="text-sm text-slate-800">
                      En los últimos 7 días habrían llegado{' '}
                      <strong className="text-base">
                        {preview.matched === 1 ? '1 noticia' : `${preview.matched} noticias`}
                      </strong>
                      .
                      {preview.matched === 0 && (
                        <span className="block text-xs text-slate-500">
                          Puede que la prensa no haya hablado del proyecto esta semana. Igual te avisamos cuando lo
                          haga.
                        </span>
                      )}
                      {preview.matched > 0 && preview.matched < FEW_NEWS && (
                        <span className="block text-xs text-amber-700">
                          Esta búsqueda casi no trae noticias. Puede que la prensa lo nombre de otra forma: agrégala en
                          «Incluir».
                        </span>
                      )}
                    </p>
                    {stale && (
                      <Button type="button" variant="outline" size="sm" onClick={recount}>
                        <RefreshCw className="mr-1 h-3.5 w-3.5" /> Volver a contar
                      </Button>
                    )}
                  </div>
                  {preview.sample.length > 0 && (
                    <ul className="space-y-1.5 border-t border-slate-200 pt-2">
                      {preview.sample.map((item) => (
                        <li key={item.url} className="text-xs">
                          <a
                            href={item.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-start gap-1 font-medium text-slate-700 hover:underline"
                          >
                            <span className="line-clamp-2">{item.title}</span>
                            <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                          </a>
                          <span className="block text-slate-500">
                            {[item.outlet, item.publishedAt ? DAY_FORMAT.format(new Date(item.publishedAt)) : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm text-slate-600">Google News no respondió para contar.</p>
                  <Button type="button" variant="outline" size="sm" onClick={recount}>
                    <RefreshCw className="mr-1 h-3.5 w-3.5" /> Contar
                  </Button>
                </div>
              )}
            </div>

            {current && current.limit.max !== null && !editing && (
              <p className="text-xs text-slate-500">
                Sigues {current.limit.used} de {current.limit.max} proyectos que permite tu plan. No gastan etiquetas.
              </p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!draft || saving || draft.name.trim().length < 2}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {editing ? 'Guardar términos' : 'Seguir en medios'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
