'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeft, CheckCircle2, ExternalLink, Loader2, Newspaper, RefreshCw, Sparkles, Wand2 } from 'lucide-react';
import { Can } from '@/components/shared/can';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { IncludeExcludeHelp } from '@/components/dashboard/monitoring/include-exclude-help';
import { MediaCatalogPicker } from '@/components/dashboard/monitoring/media-catalog-picker';
import { TermList } from '@/components/dashboard/monitoring/term-list';
import { extractErrorMessage, requestFailureMessage } from '@/lib/api-error';
import type { KeywordKind } from '@/lib/api/monitoring';
import {
  monitoringSetupApi,
  SETUP_ROLE_LABEL,
  SETUP_ROLES,
  type AppliedSetup,
  type SetupPreview,
  type SetupProposal,
  type SetupRole,
} from '@/lib/api/monitoring-setup';
import { cn } from '@/lib/utils';

/**
 * `/inteligencia/asistente` — Monitoreo de medios, Fase 4 (2026-11-08).
 * La persona escribe un nombre o una frase; Zyron propone las etiquetas
 * (con sus alias), arma la búsqueda de Google News sin que nadie pegue una
 * URL y, antes de guardar, cuenta cuántas noticias habría traído en 7 días.
 * Crear etiquetas pide escribir en Monitoreo, igual que en Configuración.
 */
export default function MonitoringSetupPage() {
  return (
    <Can
      module="MONITOREO_PREDICTIVO"
      action="canWrite"
      fallback={
        <div className="p-12 text-center text-slate-500">
          Solo quien administra el monitoreo puede crear etiquetas. Pídeselo a tu administrador; mientras tanto, las
          noticias están en{' '}
          <Link href="/inteligencia/hoy" className="font-medium text-primary underline">
            Hoy
          </Link>
          .
        </div>
      }
    >
      <SetupWizard />
    </Can>
  );
}

const PLACEHOLDER: Record<SetupRole, string> = {
  CANDIDATE: 'Tu nombre como sale en la prensa, p. ej. Ana Gómez',
  COUNCIL: 'Tu nombre o tu corporación, p. ej. Concejo de Neiva',
  CONGRESS: 'Tu nombre o un proyecto de ley que sigues',
  PRESS: 'Un tema o un personaje, p. ej. seguridad en Neiva',
};

const KIND_LABEL: Record<KeywordKind, string> = { OWN: 'Propia', RIVAL: 'Rival', TOPIC: 'Tema' };

const KIND_HINT: Record<KeywordKind, string> = {
  OWN: 'Propia: tu nombre, el de tu campaña o tu despacho.',
  RIVAL: 'Rival: un contendor o alguien con quien te comparan.',
  TOPIC: 'Tema: un asunto que sigues (seguridad, un proyecto, un barrio).',
};

const defaultKind = (role: SetupRole): KeywordKind => (role === 'PRESS' ? 'TOPIC' : 'OWN');

interface Draft extends SetupProposal {
  key: string;
  selected: boolean;
  preview: SetupPreview | null;
  previewing: boolean;
  previewError: string | null;
  /** Se cambió algo después de la última vista previa. */
  stale: boolean;
}

const errorText = (error: unknown, fallback: string) =>
  extractErrorMessage(error) ?? requestFailureMessage(error) ?? fallback;

function SetupWizard() {
  const [role, setRole] = useState<SetupRole>('CANDIDATE');
  const [text, setText] = useState('');
  const [kind, setKind] = useState<KeywordKind>('OWN');
  const [suggesting, setSuggesting] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [usedAi, setUsedAi] = useState(true);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState<AppliedSetup | null>(null);

  useEffect(() => {
    let alive = true;
    monitoringSetupApi
      .context()
      .then((context) => {
        if (!alive) return;
        setRole(context.role);
        setKind(defaultKind(context.role));
        if (context.speaker) setText((current) => current || context.speaker!);
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, []);

  function chooseRole(next: SetupRole) {
    setRole(next);
    setKind(defaultKind(next));
  }

  function patch(key: string, change: Partial<Draft>, affectsPreview = true) {
    setDrafts((current) =>
      current?.map((d) => (d.key === key ? { ...d, ...change, ...(affectsPreview ? { stale: true } : {}) } : d)) ??
      null,
    );
  }

  async function runPreview(draft: Draft) {
    setDrafts((current) =>
      current?.map((d) => (d.key === draft.key ? { ...d, previewing: true, previewError: null } : d)) ?? null,
    );
    try {
      const preview = await monitoringSetupApi.preview(draft);
      setDrafts((current) =>
        current?.map((d) => (d.key === draft.key ? { ...d, preview, previewing: false, stale: false } : d)) ?? null,
      );
    } catch (error) {
      setDrafts((current) =>
        current?.map((d) =>
          d.key === draft.key
            ? { ...d, previewing: false, previewError: errorText(error, 'No se pudo leer Google News.') }
            : d,
        ) ?? null,
      );
    }
  }

  async function suggest(e: React.FormEvent) {
    e.preventDefault();
    if (text.trim().length < 2) {
      toast.error('Escribe un nombre o una frase.');
      return;
    }
    setSuggesting(true);
    try {
      const result = await monitoringSetupApi.suggest({ role, text: text.trim(), kind });
      const next: Draft[] = result.proposals.map((p, i) => ({
        ...p,
        key: `${Date.now()}-${i}`,
        selected: true,
        preview: null,
        previewing: false,
        previewError: null,
        stale: false,
      }));
      setUsedAi(result.ai);
      setDrafts(next);
      // La vista previa sale sola: es lo que decide si la etiqueta sirve.
      next.forEach((draft) => void runPreview(draft));
    } catch (error) {
      toast.error(errorText(error, 'No se pudieron proponer las etiquetas.'));
    } finally {
      setSuggesting(false);
    }
  }

  async function apply() {
    const chosen = drafts?.filter((d) => d.selected) ?? [];
    if (!chosen.length) return;
    if (chosen.some((d) => d.name.trim().length < 2)) {
      toast.error('Cada etiqueta necesita un nombre.');
      return;
    }
    setApplying(true);
    try {
      setApplied(await monitoringSetupApi.apply(chosen));
    } catch (error) {
      toast.error(errorText(error, 'No se pudieron crear las etiquetas.'));
    } finally {
      setApplying(false);
    }
  }

  function restart() {
    setApplied(null);
    setDrafts(null);
    setText('');
  }

  const chosen = drafts?.filter((d) => d.selected).length ?? 0;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-center gap-3 border-b border-border/40 pb-6 sm:flex-nowrap">
        <Link href="/inteligencia/monitoreo/configuracion">
          <Button variant="ghost" size="sm" className="-ml-2 mb-1">
            <ArrowLeft className="mr-1 h-4 w-4" /> Configuración
          </Button>
        </Link>
        <div className="rounded-lg bg-secondary/20 p-2">
          <Wand2 className="h-6 w-6 text-secondary-foreground" />
        </div>
        <div className="min-w-0">
          <h2 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Asistente de monitoreo</h2>
          <p className="text-muted-foreground">
            Escribe a quién o qué quieres seguir. Zyron propone las etiquetas, arma la búsqueda en Google News y te
            muestra qué habría llegado en la última semana antes de guardar.
          </p>
        </div>
      </div>

      {applied ? (
        <AppliedCard applied={applied} onRestart={restart} />
      ) : (
        <>
          <form onSubmit={suggest} className="space-y-5 rounded-xl border bg-white p-4 sm:p-6">
            <fieldset>
              <legend className="mb-2 text-sm font-medium text-slate-800">1. ¿Para quién es el monitoreo?</legend>
              <div className="flex flex-wrap gap-2">
                {SETUP_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-pressed={role === r}
                    onClick={() => chooseRole(r)}
                    className={cn(
                      'rounded-full border px-3 py-1.5 text-sm transition-colors',
                      role === r
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'border-slate-300 bg-white text-slate-700 hover:bg-slate-50',
                    )}
                  >
                    {SETUP_ROLE_LABEL[r]}
                  </button>
                ))}
              </div>
            </fieldset>

            <div className="grid gap-4 sm:grid-cols-[1fr_12rem]">
              <div className="space-y-2">
                <Label htmlFor="setup-text">2. ¿Qué quieres seguir?</Label>
                <Input
                  id="setup-text"
                  value={text}
                  maxLength={160}
                  placeholder={PLACEHOLDER[role]}
                  onChange={(e) => setText(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="setup-kind">3. ¿Qué es?</Label>
                <Select value={kind} onValueChange={(v) => setKind(v as KeywordKind)}>
                  <SelectTrigger id="setup-kind" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['OWN', 'RIVAL', 'TOPIC'] as KeywordKind[]).map((k) => (
                      <SelectItem key={k} value={k}>
                        {KIND_LABEL[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <p className="-mt-2 text-xs text-slate-500">
              {KIND_HINT[kind]}
            </p>

            <Button type="submit" disabled={suggesting}>
              {suggesting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
              {drafts ? 'Proponer de nuevo' : 'Proponer etiquetas'}
            </Button>
          </form>

          {drafts && (
            <section className="space-y-4" aria-label="Etiquetas propuestas">
              {!usedAi && (
                <p className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Esta vez la propuesta no pasó por la IA: quedó la frase tal cual. Puedes agregar otras formas de
                  decirla en «Incluir».
                </p>
              )}
              <IncludeExcludeHelp />
              {drafts.map((draft, index) => (
                <ProposalCard
                  key={draft.key}
                  draft={draft}
                  index={index}
                  onChange={(change, affectsPreview) => patch(draft.key, change, affectsPreview)}
                  onPreview={() => void runPreview(draft)}
                />
              ))}
              <div className="flex flex-col-reverse gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">
                  Cada etiqueta crea su búsqueda en Google News (si no tenías una igual). Cuentan en los topes de tu
                  plan.
                </p>
                <Button onClick={apply} disabled={applying || chosen === 0}>
                  {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {chosen === 1 ? 'Crear 1 etiqueta' : `Crear ${chosen} etiquetas`}
                </Button>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

function ProposalCard({
  draft,
  index,
  onChange,
  onPreview,
}: {
  draft: Draft;
  index: number;
  onChange: (change: Partial<Draft>, affectsPreview?: boolean) => void;
  onPreview: () => void;
}) {
  const id = `proposal-${index}`;
  return (
    <article
      className={cn('space-y-4 rounded-xl border bg-white p-4 sm:p-5', !draft.selected && 'opacity-60')}
      aria-labelledby={`${id}-name-label`}
    >
      <div className="flex items-start gap-3">
        <Checkbox
          id={`${id}-selected`}
          checked={draft.selected}
          onCheckedChange={(checked) => onChange({ selected: checked === true }, false)}
          aria-label={`Crear la etiqueta ${draft.name}`}
          className="mt-8"
        />
        <div className="grid flex-1 gap-3 sm:grid-cols-[1fr_9rem]">
          <div className="space-y-1.5">
            <Label id={`${id}-name-label`} htmlFor={`${id}-name`}>
              Etiqueta
            </Label>
            <Input
              id={`${id}-name`}
              value={draft.name}
              maxLength={60}
              onChange={(e) => onChange({ name: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`${id}-kind`}>Tipo</Label>
            <Select value={draft.kind} onValueChange={(v) => onChange({ kind: v as KeywordKind }, false)}>
              <SelectTrigger id={`${id}-kind`} className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(['OWN', 'RIVAL', 'TOPIC'] as KeywordKind[]).map((k) => (
                  <SelectItem key={k} value={k}>
                    {KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      {draft.reason && <p className="text-xs text-slate-500">{draft.reason}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <TermList
          id={`${id}-includes`}
          label="Incluir"
          tone="include"
          terms={draft.includes}
          onChange={(includes) => onChange({ includes })}
        />
        <TermList
          id={`${id}-excludes`}
          label="Excluir"
          tone="exclude"
          terms={draft.excludes}
          onChange={(excludes) => onChange({ excludes })}
        />
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer text-xs font-medium text-slate-600">Búsqueda en Google News</summary>
        <div className="mt-2 space-y-1.5">
          <Label htmlFor={`${id}-query`} className="text-xs">
            Lo que se busca (las comillas piden la frase exacta)
          </Label>
          <Input
            id={`${id}-query`}
            value={draft.query}
            maxLength={200}
            onChange={(e) => onChange({ query: e.target.value })}
          />
        </div>
      </details>

      <PreviewBox draft={draft} onPreview={onPreview} />
    </article>
  );
}

/** Lo máximo que devuelve una búsqueda RSS de Google News. */
const GOOGLE_NEWS_CAP = 100;

const DAY_FORMAT =new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'America/Bogota' });

function PreviewBox({ draft, onPreview }: { draft: Draft; onPreview: () => void }) {
  const { preview } = draft;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3" aria-live="polite">
      {draft.previewing ? (
        <p className="flex items-center gap-2 text-sm text-slate-600">
          <Loader2 className="h-4 w-4 animate-spin" /> Revisando Google News de los últimos 7 días…
        </p>
      ) : draft.previewError ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-red-700">{draft.previewError}</p>
          <Button type="button" variant="outline" size="sm" onClick={onPreview}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reintentar
          </Button>
        </div>
      ) : preview ? (
        <div className="space-y-2">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <p className="text-sm text-slate-800">
              En los últimos 7 días esto habría traído{' '}
              <strong className="text-base">
                {preview.matched === 1 ? '1 noticia' : `${preview.matched} noticias`}
              </strong>
              .
              {preview.excluded > 0 && (
                <span className="block text-xs text-slate-500">
                  «Excluir» dejó por fuera {preview.excluded === 1 ? '1 más' : `${preview.excluded} más`}.
                </span>
              )}
              {preview.found >= GOOGLE_NEWS_CAP && (
                <span className="block text-xs text-slate-500">
                  Google News entrega hasta {GOOGLE_NEWS_CAP} por búsqueda: puede haber más. Si son demasiadas, afina
                  con «Excluir».
                </span>
              )}
              {preview.matched === 0 && (
                <span className="block text-xs text-slate-500">
                  {preview.found === 0
                    ? 'Google News no encontró nada con esa búsqueda: prueba con menos palabras o sin comillas.'
                    : 'Google News encontró noticias, pero ninguna dice el nombre ni lo que pusiste en «Incluir».'}
                </span>
              )}
            </p>
            {draft.stale && (
              <Button type="button" variant="outline" size="sm" onClick={onPreview}>
                <RefreshCw className="mr-1 h-3.5 w-3.5" /> Volver a contar
              </Button>
            )}
          </div>
          {draft.stale && <p className="text-xs text-amber-700">Cambiaste la etiqueta: el conteo es del cambio anterior.</p>}
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
        <Button type="button" variant="outline" size="sm" onClick={onPreview}>
          Ver cuántas noticias habría traído
        </Button>
      )}
    </div>
  );
}

function AppliedCard({ applied, onRestart }: { applied: AppliedSetup; onRestart: () => void }) {
  const k = applied.keywords.length;
  const s = applied.sources.length;
  const [pickerOpen, setPickerOpen] = useState(false);
  return (
    <div className="space-y-4 rounded-xl border bg-white p-6 text-center">
      <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
      <h3 className="text-lg font-semibold text-slate-800">
        {k === 1 ? 'Creaste 1 etiqueta' : `Creaste ${k} etiquetas`}
        {s > 0 ? (s === 1 ? ' y 1 búsqueda en Google News' : ` y ${s} búsquedas en Google News`) : ''}
      </h3>
      <ul className="flex flex-wrap justify-center gap-2">
        {applied.keywords.map((kw) => (
          <li key={kw.id} className="rounded-full border px-3 py-1 text-sm text-slate-700">
            {kw.name} · {KIND_LABEL[kw.kind]}
          </li>
        ))}
      </ul>
      <p className="mx-auto max-w-md text-sm text-slate-500">
        {s > 0
          ? 'La primera lectura ya va en camino: las noticias aparecen en Hoy en unos minutos.'
          : 'Ya tenías una búsqueda igual en Google News, así que las noticias llegan con la próxima lectura.'}
      </p>
      {/* Catálogo de medios (2026-11-09): además de Google News, los medios de una lista. */}
      <div className="mx-auto flex max-w-md flex-col items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
        <p>¿Quieres leer también El Tiempo, Caracol, RCN o los medios de tu región? Elígelos de una lista.</p>
        <Button size="sm" variant="outline" onClick={() => setPickerOpen(true)}>
          <Newspaper className="mr-1 h-4 w-4" /> Elegir medios
        </Button>
      </div>
      <MediaCatalogPicker open={pickerOpen} onOpenChange={setPickerOpen} />
      <div className="flex flex-col justify-center gap-2 sm:flex-row">
        <Button asChild>
          <Link href="/inteligencia/hoy">Ir a Hoy</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/inteligencia/monitoreo/configuracion">Ver la configuración</Link>
        </Button>
        <Button variant="ghost" onClick={onRestart}>
          Armar otra
        </Button>
      </div>
    </div>
  );
}
