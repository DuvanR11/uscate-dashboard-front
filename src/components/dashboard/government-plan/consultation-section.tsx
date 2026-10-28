'use client';

import { useCallback, useEffect, useState } from 'react';
import { Check, Copy, Eye, EyeOff, Loader2, Megaphone } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { usePermission } from '@/hooks/use-permission';
import {
  getConsultation,
  getConsultationResponses,
  hideConsultationResponse,
  saveConsultation,
  type ConsultationAdmin,
  type ConsultationResponseItem,
} from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';

/**
 * Plan de gobierno, Fase 6 "Consulta ciudadana" (2026-10-15). La campaña abre
 * una consulta pública y anónima (`/<enlace>/consulta-ciudadana`), comparte el
 * enlace y ve qué temas prioriza la gente. Los resultados entran al
 * diagnóstico, a la redacción con IA y al documento final. Ocultar una
 * respuesta la saca de los resultados (moderación).
 */

const THEME_NAMES: Record<string, string> = {
  SEGURIDAD: 'Seguridad',
  MOVILIDAD: 'Movilidad',
  EDUCACION: 'Educación',
  SALUD: 'Salud',
  POBREZA: 'Pobreza',
  VIVIENDA: 'Vivienda y servicios',
  FINANZAS: 'Finanzas públicas',
};
const DEFAULT_TITLE = '¿Qué temas deben ser la prioridad de nuestras propuestas?';
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/Bogota' });

// Solo el texto: una lista es la validación del DTO, que aquí trae el texto
// por defecto en inglés (por eso no se usa `extractErrorMessage` de
// `lib/api-error.ts`, que mostraría el primero de la lista).
function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  return 'No se pudieron guardar los cambios. Vuelve a intentarlo.';
}

/** "AAAA-MM-DD" del cierre en hora de Colombia. */
const toDateInput = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(iso)) : '';

/**
 * Fase 5 del análisis de punta a punta (2026-10-28, GOB-23): la moderación va
 * por páginas. La primera llega con los resultados; las siguientes se piden a
 * `GET /government-plan/consultation/responses`. Antes solo se veían las
 * últimas 100 y las anteriores no se podían ocultar.
 */
type ModerationPage = { items: ConsultationResponseItem[]; page: number; lastPage: number; total: number };

function firstModerationPage(r: ConsultationAdmin): ModerationPage | null {
  if (!r.results) return null;
  const { recent, recentTotal, recentPageSize } = r.results;
  return {
    items: recent,
    page: 1,
    total: recentTotal ?? recent.length,
    lastPage: recentPageSize ? Math.ceil((recentTotal ?? recent.length) / recentPageSize) : 1,
  };
}

export function ConsultationSection() {
  const canWrite = usePermission('PLAN_GOBIERNO', 'canWrite');
  const [data, setData] = useState<ConsultationAdmin | null>(null);
  const [failed, setFailed] = useState(false);
  const [title, setTitle] = useState(DEFAULT_TITLE);
  const [intro, setIntro] = useState('');
  const [closesOn, setClosesOn] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [moderation, setModeration] = useState<ModerationPage | null>(null);
  const [loadingPage, setLoadingPage] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);

  const apply = useCallback((r: ConsultationAdmin) => {
    setData(r);
    setModeration(firstModerationPage(r));
    if (r.consultation) {
      setTitle(r.consultation.title);
      setIntro(r.consultation.intro ?? '');
      setClosesOn(toDateInput(r.consultation.closesAt));
    }
  }, []);

  useEffect(() => {
    getConsultation()
      .then(apply)
      .catch(() => setFailed(true));
  }, [apply]);

  const save = async (status: 'OPEN' | 'CLOSED') => {
    setSaving(true);
    setError(null);
    try {
      apply(
        await saveConsultation({
          status,
          title: title.trim(),
          intro: intro.trim() || null,
          // Cierra al final del día elegido, en hora de Colombia.
          closesAt: closesOn ? `${closesOn}T23:59:59-05:00` : null,
        }),
      );
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const goToPage = async (page: number) => {
    setLoadingPage(true);
    setPageError(null);
    try {
      const r = await getConsultationResponses(page);
      setModeration({ items: r.data, page: r.meta.page, lastPage: r.meta.lastPage, total: r.meta.total });
    } catch {
      setPageError('No se pudo cargar esa página de respuestas. Vuelve a intentarlo.');
    } finally {
      setLoadingPage(false);
    }
  };

  const toggleHidden = async (id: string, hidden: boolean) => {
    try {
      await hideConsultationResponse(id, hidden);
      // Fase 5 (GOB-23): se actualiza el ranking sin perder la página de la
      // moderación (ni lo que se esté editando en el formulario).
      setModeration((m) => (m ? { ...m, items: m.items.map((r) => (r.id === id ? { ...r, hidden } : r)) } : m));
      setData(await getConsultation());
    } catch (e) {
      setError(errorMessage(e));
    }
  };

  if (failed)
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          No se pudo cargar la consulta ciudadana. Recarga la página; si sigue igual, avisa a soporte.
        </CardContent>
      </Card>
    );
  if (!data)
    return (
      <div className="flex h-24 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
      </div>
    );

  const c = data.consultation;
  const link = data.publicPath && typeof window !== 'undefined' ? `${window.location.origin}${data.publicPath}` : null;
  const results = data.results;
  const maxShare = Math.max(1, ...(results?.themes.map((t) => t.share) ?? [1]));

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Megaphone aria-hidden className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              Consulta ciudadana
              {c && (
                <span
                  className={cn(
                    'rounded-full px-2 py-0.5 text-xs font-medium',
                    c.open
                      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                      : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
                  )}
                >
                  {c.open ? 'Abierta' : 'Cerrada'}
                </span>
              )}
            </CardTitle>
            <CardDescription>
              Opcional. Una página pública y anónima donde la gente elige los tres temas que más le importan y deja sus
              propuestas. Los resultados entran al diagnóstico, al borrador con IA y al documento final.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {canWrite && (
          <div className="space-y-3 rounded-lg border border-border p-4">
            <div>
              <label htmlFor="consultation-title" className="text-sm font-medium text-foreground">
                Pregunta de la consulta
              </label>
              <Input id="consultation-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} className="mt-1" />
            </div>
            <div>
              <label htmlFor="consultation-intro" className="text-sm font-medium text-foreground">
                Texto de presentación <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Textarea id="consultation-intro" value={intro} maxLength={1500} rows={3} onChange={(e) => setIntro(e.target.value)} className="mt-1" />
            </div>
            <div className="max-w-xs">
              <label htmlFor="consultation-closes" className="text-sm font-medium text-foreground">
                Cierre automático <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Input id="consultation-closes" type="date" value={closesOn} onChange={(e) => setClosesOn(e.target.value)} className="mt-1" />
            </div>
            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            <div className="flex flex-wrap gap-2">
              {c?.open ? (
                <>
                  <Button type="button" onClick={() => void save('OPEN')} disabled={saving}>
                    {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                    Guardar cambios
                  </Button>
                  <Button type="button" variant="outline" onClick={() => void save('CLOSED')} disabled={saving}>
                    Cerrar la consulta
                  </Button>
                </>
              ) : (
                <Button type="button" onClick={() => void save('OPEN')} disabled={saving || title.trim().length < 3}>
                  {saving && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
                  {c ? 'Volver a abrir' : 'Abrir la consulta'}
                </Button>
              )}
            </div>
          </div>
        )}

        {c && link && (
          <div className="flex flex-col gap-2 rounded-lg bg-muted/50 p-3 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 text-sm">
              <span className="block text-xs text-slate-500">Enlace para compartir</span>
              <span className="block truncate font-medium text-foreground">{link}</span>
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard?.writeText(link).then(() => {
                  setCopied(true);
                  window.setTimeout(() => setCopied(false), 2000);
                });
              }}
            >
              {copied ? <Check aria-hidden className="h-4 w-4" /> : <Copy aria-hidden className="h-4 w-4" />}
              {copied ? 'Copiado' : 'Copiar enlace'}
            </Button>
          </div>
        )}

        {!c ? (
          <p className="text-sm text-slate-500">
            {canWrite ? 'Todavía no has abierto una consulta.' : 'La campaña todavía no ha abierto una consulta.'}
          </p>
        ) : !results || (results.total === 0 && results.hidden === 0) ? (
          <p className="text-sm text-slate-500">Todavía no hay respuestas.</p>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            <section aria-labelledby="consultation-ranking" className="space-y-3">
              <h3 id="consultation-ranking" className="text-sm font-semibold text-foreground">
                Lo que prioriza la gente{' '}
                <span className="font-normal text-slate-500">
                  · {results.total.toLocaleString('es-CO')} {results.total === 1 ? 'respuesta' : 'respuestas'}
                  {results.hidden > 0 && ` (${results.hidden} ${results.hidden === 1 ? 'oculta' : 'ocultas'})`}
                </span>
              </h3>
              <ol className="space-y-2">
                {results.themes
                  .filter((t) => t.mentions > 0)
                  .map((t, i) => (
                    <li key={t.code} className="text-sm">
                      <div className="flex justify-between gap-2">
                        <span>
                          <span className="tabular-nums text-slate-400">{i + 1}.</span> {t.name}
                        </span>
                        <span className="tabular-nums text-slate-600 dark:text-slate-300">
                          {decimal.format(t.share)} %{' '}
                          <span className="text-xs text-slate-400">· {t.firstChoice} en 1.º lugar</span>
                        </span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                        <div className="h-full bg-primary/70" style={{ width: `${(t.share / maxShare) * 100}%` }} />
                      </div>
                    </li>
                  ))}
              </ol>
              <p className="text-xs text-slate-500">
                Porcentaje: parte de las respuestas que eligió el tema. El orden pondera la posición (1.º = 3 puntos, 2.º =
                2, 3.º = 1). Es anónima: no es una encuesta con muestra representativa.
              </p>
              {results.byZone.length > 0 && (
                <>
                  <h4 className="pt-2 text-xs font-medium text-slate-500">Zonas con más respuestas</h4>
                  <ul className="space-y-1 text-sm">
                    {results.byZone.map((z) => (
                      <li key={z.name} className="flex justify-between gap-2">
                        <span>{z.name}</span>
                        <span className="tabular-nums">{z.count}</span>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </section>
            <section aria-labelledby="consultation-recent" className="space-y-3">
              <h3 id="consultation-recent" className="text-sm font-semibold text-foreground">
                Últimas respuestas
                {moderation && moderation.total > 0 && (
                  <span className="font-normal text-slate-500">
                    {' '}
                    · {moderation.total.toLocaleString('es-CO')} en total
                  </span>
                )}
              </h3>
              <ul className={cn('max-h-[420px] space-y-2 overflow-y-auto pr-1', loadingPage && 'opacity-60')} aria-busy={loadingPage}>
                {(moderation?.items ?? []).map((r) => (
                  <li
                    key={r.id}
                    className={cn('rounded-md border border-border p-3 text-sm', r.hidden && 'opacity-50')}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-xs text-slate-500">
                        {dateTime.format(new Date(r.createdAt))}
                        {r.zone ? ` · ${r.zone}` : ''}
                        {r.hidden ? ' · Oculta' : ''}
                      </p>
                      {canWrite && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => void toggleHidden(r.id, !r.hidden)}
                          aria-label={r.hidden ? 'Volver a mostrar esta respuesta' : 'Ocultar esta respuesta'}
                        >
                          {r.hidden ? <Eye aria-hidden className="h-4 w-4" /> : <EyeOff aria-hidden className="h-4 w-4" />}
                        </Button>
                      )}
                    </div>
                    <p className="mt-1 text-xs font-medium text-foreground">
                      {r.priorities.map((p, i) => `${i + 1}. ${THEME_NAMES[p] ?? p}`).join(' · ')}
                    </p>
                    {r.proposal && <p className="mt-1 whitespace-pre-line text-slate-600 dark:text-slate-300">{r.proposal}</p>}
                  </li>
                ))}
              </ul>
              {moderation && moderation.lastPage > 1 && (
                <nav aria-label="Páginas de respuestas" className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                  <span>
                    Página {moderation.page} de {moderation.lastPage}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingPage || moderation.page <= 1}
                      onClick={() => void goToPage(moderation.page - 1)}
                    >
                      Más recientes
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={loadingPage || moderation.page >= moderation.lastPage}
                      onClick={() => void goToPage(moderation.page + 1)}
                    >
                      Anteriores
                    </Button>
                  </div>
                </nav>
              )}
              {pageError && (
                <p role="alert" className="text-xs text-red-700 dark:text-red-400">
                  {pageError}
                </p>
              )}
            </section>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
