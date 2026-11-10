'use client';

// Plan hacia la versión estable, Fase 4 (2026-11-10): resultados de una
// encuesta, sumados y sin nombres. El Coordinador ve solo lo que registró su
// equipo (las respuestas por enlace no tienen quién las registró).
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { apiErrorMessage } from '@/lib/api-error';
import {
  SURVEY_CHANNEL_LABEL,
  surveysApi,
  useSurveysEnabled,
  type QuestionResult,
  type SurveyChannel,
  type SurveyResults,
} from '@/lib/api/surveys';

const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);
const percent = (part: number, total: number) =>
  total > 0
    ? `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format((part / total) * 100)} %`
    : '0 %';

/** Barras horizontales de un solo color, con la cifra escrita al lado. */
function Bars({ rows, total, caption }: { rows: { label: string; count: number }[]; total: number; caption: string }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <table className="w-full text-sm">
      <caption className="sr-only">{caption}</caption>
      <tbody>
        {rows.map((row) => (
          <tr key={row.label} className="align-middle">
            <th scope="row" className="w-2/5 py-1.5 pr-3 text-left font-normal text-slate-700">
              {row.label}
            </th>
            <td className="py-1.5">
              <div className="flex items-center gap-2">
                <div className="h-3 flex-1 rounded-full bg-slate-100" aria-hidden>
                  <div
                    className="h-3 rounded-full bg-primary"
                    style={{ width: `${(row.count / max) * 100}%`, minWidth: row.count > 0 ? 4 : 0 }}
                  />
                </div>
                <span className="w-28 shrink-0 text-right tabular-nums text-slate-700">
                  {number(row.count)} · {percent(row.count, total)}
                </span>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function QuestionCard({ question, index }: { question: QuestionResult; index: number }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base text-foreground">
          {index + 1}. {question.prompt}
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          {number(question.answered)} {question.answered === 1 ? 'persona respondió' : 'personas respondieron'}
          {question.type === 'MULTIPLE' && ' · podían elegir varias, así que los porcentajes suman más de 100'}
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {question.options && (
          <Bars rows={question.options} total={question.answered} caption={`Respuestas a ${question.prompt}`} />
        )}
        {question.distribution && (
          <>
            <p className="text-sm text-slate-700">
              Promedio:{' '}
              <span className="text-lg font-bold tabular-nums">
                {question.average == null
                  ? '—'
                  : new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(question.average)}
              </span>{' '}
              de {question.scaleMax}
            </p>
            <Bars
              rows={question.distribution.map((d) => ({
                label:
                  String(d.value) +
                  (d.value === question.scaleMin && question.minLabel ? ` (${question.minLabel})` : '') +
                  (d.value === question.scaleMax && question.maxLabel ? ` (${question.maxLabel})` : ''),
                count: d.count,
              }))}
              total={question.answered}
              caption={`Distribución de ${question.prompt}`}
            />
          </>
        )}
        {question.texts &&
          (question.texts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sin respuestas escritas todavía.</p>
          ) : (
            <ul className="max-h-80 space-y-2 overflow-y-auto">
              {question.texts.map((text, i) => (
                <li key={i} className="whitespace-pre-line rounded-lg bg-muted/40 px-3 py-2 text-sm text-slate-700">
                  {text}
                </li>
              ))}
            </ul>
          ))}
      </CardContent>
    </Card>
  );
}

export default function SurveyResultsPage() {
  const { id } = useParams<{ id: string }>();
  const enabled = useSurveysEnabled();
  const [data, setData] = useState<SurveyResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    surveysApi
      .results(id)
      .then(setData)
      .catch((e) => setError(apiErrorMessage(e) ?? 'No se pudieron cargar los resultados.'));
  }, [enabled, id]);

  if (enabled === false) {
    return (
      <div className="mx-auto max-w-xl rounded-lg border bg-white p-6 text-sm text-slate-600">
        Las encuestas todavía no están activas en Zyron.
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-16">
      <div className="border-b border-border/40 pb-5">
        <Link href="/encuestas" className="text-sm text-primary hover:underline">
          ← Encuestas
        </Link>
        <h1 className="mt-2 flex items-center gap-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          <BarChart3 className="h-7 w-7 text-primary" /> {data?.title ?? 'Resultados'}
        </h1>
        {data && (
          <p className="text-muted-foreground">
            {data.scope === 'TEAM'
              ? 'Lo que registraron tú y tu equipo.'
              : 'Toda la organización, sumado y sin nombres.'}
          </p>
        )}
      </div>

      {error && <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
      {!data && !error && <Loader2 className="h-6 w-6 animate-spin text-slate-400" aria-label="Cargando" />}

      {data && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">Respuestas</p>
                <p className="text-3xl font-black tabular-nums text-slate-800">{number(data.total)}</p>
              </CardContent>
            </Card>
            {(Object.keys(SURVEY_CHANNEL_LABEL) as SurveyChannel[]).map((channel) => (
              <Card key={channel}>
                <CardContent className="p-4">
                  <p className="text-xs text-slate-500">{SURVEY_CHANNEL_LABEL[channel]}</p>
                  <p className="text-2xl font-bold tabular-nums text-slate-800">{number(data.channels[channel] ?? 0)}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {data.total === 0 ? (
            <p className="rounded-lg border bg-white p-6 text-center text-sm text-muted-foreground">
              Todavía no hay respuestas.
            </p>
          ) : (
            data.questions.map((question, index) => <QuestionCard key={question.id} question={question} index={index} />)
          )}
        </>
      )}
    </div>
  );
}
