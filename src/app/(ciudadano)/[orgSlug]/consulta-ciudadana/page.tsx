'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CheckCircle2, Loader2, MessageSquareHeart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { getPublicConsultation, sendConsultationResponse, type PublicConsultation } from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';
import { usePublicBrand } from '@/components/public/campaign-brand';

/**
 * `/<enlace>/consulta-ciudadana` — Plan de gobierno, Fase 6 "Consulta ciudadana"
 * (2026-10-15). Página pública y ANÓNIMA: la persona elige hasta 3 temas en
 * orden de importancia y, si quiere, su zona y una propuesta corta. No se pide
 * ningún dato personal. El enlace lo comparte la campaña desde
 * `/plan-de-gobierno`.
 */

const MAX = 3;
const ORDINAL = ['1.º', '2.º', '3.º'];

// Solo el texto: una lista es la validación del DTO, que aquí trae el texto
// por defecto en inglés (por eso no se usa `extractErrorMessage` de
// `lib/api-error.ts`, que mostraría el primero de la lista).
function errorMessage(error: unknown) {
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message;
  if (typeof message === 'string') return message;
  return 'No pudimos registrar tu respuesta. Revisa tu conexión e inténtalo de nuevo.';
}

export default function PlanConsultationPage() {
  const { orgSlug } = useParams<{ orgSlug: string }>();
  const [data, setData] = useState<PublicConsultation | null>(null);
  // Recorrido de alta (Fase 3): el nombre de la marca, no el nombre interno.
  const brandName = usePublicBrand()?.name;
  const [failed, setFailed] = useState(false);
  const [priorities, setPriorities] = useState<string[]>([]);
  const [zone, setZone] = useState('');
  const [proposal, setProposal] = useState('');
  const [website, setWebsite] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (!orgSlug) return;
    getPublicConsultation(orgSlug)
      .then(setData)
      .catch(() => setFailed(true));
  }, [orgSlug]);

  const toggle = (code: string) =>
    setPriorities((list) => (list.includes(code) ? list.filter((c) => c !== code) : list.length < MAX ? [...list, code] : list));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!priorities.length) {
      setError('Elige al menos un tema.');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await sendConsultationResponse(orgSlug, {
        priorities,
        proposal: proposal.trim() || undefined,
        localityId: zone ? Number(zone) : undefined,
        website: website || undefined,
      });
      setDone(true);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-8 dark:bg-slate-950">
      <div className="mx-auto w-full max-w-xl">
        {failed ? (
          <p className="rounded-lg border bg-white p-6 text-center text-sm text-slate-600 dark:bg-slate-900">
            No pudimos cargar la consulta. Revisa tu conexión y vuelve a abrir el enlace.
          </p>
        ) : !data ? (
          <div className="flex h-60 items-center justify-center" aria-busy="true">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" aria-label="Cargando" />
          </div>
        ) : !data.open ? (
          <section className="rounded-xl border bg-white p-8 text-center dark:bg-slate-900">
            <MessageSquareHeart aria-hidden className="mx-auto h-10 w-10 text-slate-400" />
            <h1 className="mt-3 text-lg font-semibold text-slate-900 dark:text-slate-100">{brandName ?? data.organizationName}</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Esta consulta no está abierta en este momento.</p>
          </section>
        ) : done ? (
          <section className="rounded-xl border bg-white p-8 text-center dark:bg-slate-900" role="status">
            <CheckCircle2 aria-hidden className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">¡Gracias por participar!</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">
              Tu respuesta quedó registrada de forma anónima y ayudará a construir las propuestas de {brandName ?? data.organizationName}.
            </p>
          </section>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="space-y-6 rounded-xl border bg-white p-5 shadow-sm dark:bg-slate-900 sm:p-8">
            <header className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{brandName ?? data.organizationName}</p>
              <h1 className="text-2xl font-bold leading-tight text-slate-900 dark:text-slate-100">{data.title}</h1>
              {data.intro && <p className="whitespace-pre-line text-sm text-slate-600 dark:text-slate-300">{data.intro}</p>}
              <p className="text-xs text-slate-500">
                Es anónima: no te pedimos nombre, documento, teléfono ni correo.
                {data.closesAt &&
                  ` Abierta hasta el ${new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'America/Bogota' }).format(new Date(data.closesAt))}.`}
              </p>
            </header>

            <fieldset className="space-y-3">
              <legend className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                ¿Qué temas son más importantes para ti?
              </legend>
              <p className="text-xs text-slate-500">Elige hasta tres, en orden: el primero que toques es el más importante.</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {data.themes.map((t) => {
                  const position = priorities.indexOf(t.code);
                  const active = position >= 0;
                  return (
                    <button
                      key={t.code}
                      type="button"
                      aria-pressed={active}
                      onClick={() => toggle(t.code)}
                      disabled={!active && priorities.length >= MAX}
                      className={cn(
                        'flex min-h-12 items-center justify-between gap-3 rounded-lg border px-4 py-3 text-left text-sm font-medium transition-colors disabled:opacity-50',
                        active
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-slate-200 text-slate-700 hover:border-primary/50 dark:border-slate-700 dark:text-slate-200',
                      )}
                    >
                      {t.name}
                      {active && (
                        <span className="rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                          {ORDINAL[position]}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            {data.zones.length > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="consultation-zone" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  ¿En qué zona vives? <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <select
                  id="consultation-zone"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                  className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm dark:border-slate-700 dark:bg-slate-900"
                >
                  <option value="">Prefiero no decirlo</option>
                  {data.zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="consultation-proposal" className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                ¿Qué propones? <span className="font-normal text-slate-500">(opcional)</span>
              </label>
              <Textarea
                id="consultation-proposal"
                value={proposal}
                onChange={(e) => setProposal(e.target.value)}
                maxLength={500}
                rows={4}
                placeholder="Una idea concreta para mejorar tu barrio o tu municipio."
              />
              <p className="text-xs text-slate-500">
                No escribas datos personales tuyos ni de otras personas. {proposal.length}/500
              </p>
            </div>

            {/* Trampa para bots: una persona no la ve ni la llena. */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
              <label htmlFor="consultation-website">Sitio web</label>
              <input
                id="consultation-website"
                tabIndex={-1}
                autoComplete="off"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
              />
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700 dark:text-red-400">
                {error}
              </p>
            )}
            <Button type="submit" className="h-12 w-full text-base" disabled={sending}>
              {sending && <Loader2 aria-hidden className="h-4 w-4 animate-spin" />}
              Enviar mi respuesta
            </Button>
          </form>
        )}
      </div>
    </main>
  );
}
