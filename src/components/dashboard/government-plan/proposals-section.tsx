'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Download, FileText, Loader2, Pencil, Sparkles, Target } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatIndicatorValue } from '@/components/dashboard/government-plan/diagnosis-section';
import { DraftEditor } from '@/components/dashboard/government-plan/draft-editor';
import { todayISO } from '@/lib/dates';
import { usePermission } from '@/hooks/use-permission';
import {
  downloadPlanDocument,
  generateProposals,
  getProposals,
  type PlanDraft,
  type ProposalGoal,
  type ProposalsResponse,
} from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';

/**
 * Plan de gobierno, Fase 4 "Redacción con IA" (2026-10-15). Borrador del
 * programa de gobierno (o de la agenda de propuestas, si el cargo es de una
 * corporación) sobre el diagnóstico. El texto lo escribe la IA; las metas
 * (línea base del dato oficial y meta al final del periodo) las calcula el
 * servidor. Se redacta en segundo plano: la pantalla consulta cada pocos
 * segundos hasta que termina.
 */

const THEMES: { code: string; name: string }[] = [
  { code: 'SEGURIDAD', name: 'Seguridad' },
  { code: 'MOVILIDAD', name: 'Movilidad' },
  { code: 'EDUCACION', name: 'Educación' },
  { code: 'SALUD', name: 'Salud' },
  { code: 'POBREZA', name: 'Pobreza' },
  { code: 'VIVIENDA', name: 'Vivienda y servicios' },
  { code: 'FINANZAS', name: 'Finanzas públicas' },
];
const POLL_MS = 4000;
const dateTime = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' });

function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message)) return message.join(' ');
  return 'No se pudo pedir el borrador. Vuelve a intentarlo.';
}

export function ProposalsSection() {
  const canWrite = usePermission('PLAN_GOBIERNO', 'canWrite');
  const [data, setData] = useState<ProposalsResponse | null>(null);
  const [failed, setFailed] = useState(false);
  const [focus, setFocus] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [requestError, setRequestError] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedOptions = useRef(false);

  const load = useCallback(async () => {
    try {
      const r = await getProposals();
      setData(r);
      const last = r.configured ? (r.attempt ?? r.draft) : null;
      if (last && !loadedOptions.current) {
        loadedOptions.current = true;
        setFocus(last.focus);
        setNotes(last.notes ?? '');
      }
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [load]);

  const draft = data?.configured ? data.draft : null;
  const attempt = data?.configured ? data.attempt : null;
  const generating = attempt?.status === 'GENERATING';

  useEffect(() => {
    if (!generating) return;
    timer.current = setTimeout(() => void load(), POLL_MS);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [generating, data, load]);

  const submit = async (force = false) => {
    setSending(true);
    setNotice(null);
    setRequestError(null);
    try {
      const r = await generateProposals({ focus, notes: notes.trim() || undefined, force: force || undefined });
      if (r.reused)
        setNotice('Los datos y las opciones no cambiaron: este es el mismo borrador. Puedes pedir otra versión.');
      setData((prev) =>
        prev?.configured
          ? r.reused
            ? { ...prev, draft: r.draft, attempt: null, outdated: false }
            : { ...prev, attempt: r.draft }
          : prev,
      );
    } catch (error) {
      setRequestError(errorMessage(error));
    } finally {
      setSending(false);
    }
  };

  if (failed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          No se pudo cargar el borrador del programa. Recarga la página; si sigue igual, avisa a soporte.
        </CardContent>
      </Card>
    );
  }
  if (!data || !data.configured) return null;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-ai/10 p-2 text-ai">
            <Sparkles aria-hidden className="h-5 w-5" />
          </div>
          <div className="space-y-1.5">
            <CardTitle className="text-base">Programa de gobierno: borrador con IA</CardTitle>
            <CardDescription>
              La inteligencia artificial redacta los ejes y las propuestas a partir del diagnóstico. Las cifras no las
              escribe la IA: cada meta parte del dato oficial y propone llegar, al final del periodo, a la mediana de
              los territorios comparables (o mejorar un 10 % si ya está mejor). Es un borrador para revisar.
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {canWrite && (
          <div className="space-y-4 rounded-lg border border-border p-4">
            <div>
              <p id="proposal-focus" className="text-sm font-medium text-foreground">
                Temas que quieres priorizar <span className="font-normal text-slate-500">(opcional)</span>
              </p>
              <p className="mb-2 text-xs text-slate-500">
                Sin elegir, el borrador toma los temas donde el territorio está peor.
              </p>
              <div className="flex flex-wrap gap-2" role="group" aria-labelledby="proposal-focus">
                {THEMES.map((t) => {
                  const active = focus.includes(t.code);
                  return (
                    <button
                      key={t.code}
                      type="button"
                      aria-pressed={active}
                      disabled={generating || sending}
                      onClick={() => setFocus((f) => (active ? f.filter((c) => c !== t.code) : [...f, t.code]))}
                      className={cn(
                        'rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-60',
                        active ? 'border-ai bg-ai/10 text-ai' : 'border-border text-slate-600 hover:border-ai/50',
                      )}
                    >
                      {t.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <div>
              <label htmlFor="proposal-notes" className="text-sm font-medium text-foreground">
                Prioridades de tu campaña <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Textarea
                id="proposal-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={1500}
                rows={3}
                disabled={generating || sending}
                placeholder="Por ejemplo: recuperar los parques de las comunas, apoyar a los emprendedores jóvenes…"
                className="mt-1"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                onClick={() => void submit(false)}
                disabled={generating || sending}
                className="bg-ai text-ai-foreground hover:bg-ai/90"
              >
                {sending || generating ? (
                  <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles aria-hidden className="h-4 w-4" />
                )}
                {draft ? 'Redactar de nuevo' : 'Redactar borrador'}
              </Button>
              {notice && draft && !attempt && (
                <Button type="button" variant="outline" onClick={() => void submit(true)} disabled={sending}>
                  Pedir otra versión
                </Button>
              )}
            </div>
            {notice && <p className="text-xs text-slate-600">{notice}</p>}
            {requestError && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {requestError}
              </p>
            )}
          </div>
        )}

        {attempt?.status === 'GENERATING' && (
          <div className="flex items-center gap-3 rounded-lg bg-ai/5 p-4 text-sm text-foreground" role="status">
            <Loader2 aria-hidden className="h-5 w-5 animate-spin text-ai" />
            Redactando el borrador. Suele tardar menos de un minuto; puedes seguir viendo el diagnóstico.
          </div>
        )}
        {attempt?.status === 'FAILED' && (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200"
          >
            <AlertTriangle aria-hidden className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              El último intento ({dateTime.format(new Date(attempt.createdAt))}) no se pudo terminar:{' '}
              {attempt.error ?? 'error desconocido.'}
              {draft && ' Abajo sigue el último borrador listo.'}
            </span>
          </div>
        )}
        {draft ? (
          <DraftView
            draft={draft}
            outdated={data.outdated}
            canWrite={canWrite}
            onUpdated={(updated) => setData((prev) => (prev?.configured ? { ...prev, draft: updated } : prev))}
          />
        ) : (
          !attempt && (
            <p className="text-sm text-slate-500">
              {canWrite
                ? 'Todavía no hay un borrador. Elige los temas, si quieres, y pide el primero.'
                : 'Todavía no hay un borrador del programa.'}
            </p>
          )
        )}
      </CardContent>
    </Card>
  );
}

const slug = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

async function blobErrorMessage(error: unknown) {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (data instanceof Blob) {
    try {
      const parsed = JSON.parse(await data.text()) as { message?: unknown };
      if (typeof parsed.message === 'string') return parsed.message;
    } catch {
      /* abajo */
    }
  }
  return 'No se pudo generar el documento. Vuelve a intentarlo.';
}

function DraftView({
  draft,
  outdated,
  canWrite,
  onUpdated,
}: {
  draft: PlanDraft;
  outdated: boolean;
  canWrite: boolean;
  onUpdated: (draft: PlanDraft) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState<'pdf' | 'docx' | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const content = draft.content;
  if (!content) return null;

  const download = async (format: 'pdf' | 'docx') => {
    setBusy(format);
    setDownloadError(null);
    try {
      const blob = await downloadPlanDocument(draft.id, format);
      const kind = content.agenda === 'LEGISLATIVE' ? 'agenda-de-propuestas' : 'programa-de-gobierno';
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `${kind}-${slug(content.officeLabel)}-${todayISO()}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(await blobErrorMessage(error));
    } finally {
      setBusy(null);
    }
  };

  if (editing)
    return (
      <DraftEditor
        draft={draft}
        onCancel={() => setEditing(false)}
        onSaved={(updated) => {
          setEditing(false);
          onUpdated(updated);
        }}
      />
    );

  return (
    <article className="space-y-6">
      <header className="space-y-2 border-b border-border pb-4">
        <p className="text-xs font-medium uppercase tracking-wide text-ai">
          {content.agenda === 'LEGISLATIVE' ? 'Agenda de propuestas' : 'Programa de gobierno'}
        </p>
        <h3 className="text-xl font-bold text-foreground">{content.officeLabel}</h3>
        {(content.document?.candidateName || content.document?.party) && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            {[content.document?.candidateName, content.document?.party].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="text-xs text-slate-500">
          Borrador redactado con IA el {dateTime.format(new Date(draft.finishedAt ?? draft.createdAt))}
          {draft.createdBy ? `, a pedido de ${draft.createdBy}` : ''}.
          {content.edited && ` Corregido por la campaña el ${dateTime.format(new Date(content.edited.at))}${content.edited.by ? ` (${content.edited.by})` : ''}.`}
        </p>
        {content.reviewed ? (
          <p className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
            Revisado por la campaña el {dateTime.format(new Date(content.reviewed.at))}
            {content.reviewed.by ? ` (${content.reviewed.by})` : ''}: el documento sale sin la marca de borrador.
          </p>
        ) : (
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Sin revisar: el PDF y el Word salen marcados &quot;Borrador para revisión&quot;
            {canWrite ? ' hasta que la campaña lo revise (botón Editar).' : '.'}
          </p>
        )}
        {outdated && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:bg-amber-950 dark:text-amber-200">
            Los datos públicos se actualizaron después de este borrador. Redáctalo de nuevo para que las metas usen las
            cifras nuevas.
          </p>
        )}
        <div className="flex flex-wrap gap-2 pt-2">
          {canWrite && (
            <Button type="button" variant="outline" size="sm" onClick={() => setEditing(true)}>
              <Pencil aria-hidden className="h-4 w-4" />
              Editar
            </Button>
          )}
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download('pdf')}>
            {busy === 'pdf' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <Download aria-hidden className="h-4 w-4" />}
            Descargar PDF
          </Button>
          <Button type="button" variant="outline" size="sm" disabled={busy !== null} onClick={() => void download('docx')}>
            {busy === 'docx' ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : <FileText aria-hidden className="h-4 w-4" />}
            Descargar Word
          </Button>
        </div>
        {downloadError && (
          <p role="alert" className="text-sm text-red-700 dark:text-red-400">
            {downloadError}
          </p>
        )}
      </header>

      {content.vision && (
        <section aria-labelledby="draft-vision" className="space-y-2">
          <h4 id="draft-vision" className="text-sm font-semibold text-foreground">
            Visión
          </h4>
          <p className="max-w-[70ch] text-sm leading-relaxed text-slate-700 dark:text-slate-300">{content.vision}</p>
          {content.principles.length > 0 && (
            <ul className="flex flex-wrap gap-2 pt-1">
              {content.principles.map((p) => (
                <li key={p} className="rounded-full bg-muted px-3 py-1 text-xs text-slate-700 dark:text-slate-300">
                  {p}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {content.axes.map((axis, index) => (
        <section key={axis.dimension} aria-labelledby={`draft-axis-${index}`} className="space-y-3">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
              Eje {index + 1} · {axis.name}
            </p>
            <h4 id={`draft-axis-${index}`} className="text-base font-semibold text-foreground">
              {axis.title}
            </h4>
            {axis.problem && (
              <p className="mt-1 max-w-[70ch] text-sm text-slate-600 dark:text-slate-300">{axis.problem}</p>
            )}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {axis.proposals.map((p) => (
              <div key={p.title} className="flex flex-col gap-2 rounded-lg border border-border p-4">
                <h5 className="font-medium text-foreground">{p.title}</h5>
                {p.description && <p className="text-sm text-slate-600 dark:text-slate-300">{p.description}</p>}
                {p.actions.length > 0 && (
                  <ul className="list-disc space-y-1 pl-5 text-sm text-slate-600 dark:text-slate-300">
                    {p.actions.map((a) => (
                      <li key={a}>{a}</li>
                    ))}
                  </ul>
                )}
                {p.goal && <Goal goal={p.goal} />}
              </div>
            ))}
          </div>
        </section>
      ))}

      {content.removedSentences > 0 && (
        <p className="text-xs text-slate-500">
          Se quitaron {content.removedSentences} {content.removedSentences === 1 ? 'frase' : 'frases'} en las que la IA
          escribió cifras sin respaldo en los datos oficiales.
        </p>
      )}
    </article>
  );
}

function Goal({ goal }: { goal: ProposalGoal }) {
  return (
    <div className="mt-auto rounded-md bg-muted/60 p-3 text-xs">
      <p className="flex items-center gap-1.5 font-medium text-foreground">
        <Target aria-hidden className="h-3.5 w-3.5 text-primary" />
        Meta {goal.targetYear}: {goal.indicatorName}
      </p>
      <p className="mt-1 tabular-nums text-slate-700 dark:text-slate-300">
        De {formatIndicatorValue(goal.baseline.value, goal.unit)} ({goal.baseline.year}) a{' '}
        <span className="font-semibold">{formatIndicatorValue(goal.target, goal.unit)}</span>
      </p>
      <p className="mt-0.5 text-slate-500">
        {goal.rule === 'PEER_MEDIAN'
          ? 'Llegar a la mediana de los territorios comparables.'
          : goal.rule === 'TOWARD_PEER_MEDIAN'
            ? 'Acercarse a la mediana: mejorar un 30 % en el periodo (la mediana queda más lejos).'
            : 'Ya está mejor que la mediana: seguir mejorando un 10 %.'}
        {goal.baseline.year < 2020 && ' Dato del censo de 2018: se vuelve a medir con el próximo censo.'}
      </p>
    </div>
  );
}
