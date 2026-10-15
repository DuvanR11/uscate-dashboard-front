'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  getDiagnosis,
  type CitizenVoice,
  type DiagnosisIndicator,
  type DiagnosisResponse,
  type DiagnosisStatus,
} from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';

/**
 * Plan de gobierno, Fase 3 "Diagnóstico" (2026-10-14). Resume lo que muestran
 * las secciones de abajo: cada indicador frente a los territorios pares (misma
 * categoría de la Contaduría), con semáforo por tercios, tendencia de los
 * últimos años, prioridades (los rojos) y fortalezas (los verdes), y lo que la
 * campaña registró en Zyron. Sin IA: las reglas son fijas y están en el
 * servidor (`government-plan-diagnosis.service.ts`).
 */

type Ready = Extract<DiagnosisResponse, { configured: true }>;

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const number = new Intl.NumberFormat('es-CO');

const STATUS: Record<DiagnosisStatus, { label: string; dot: string; pill: string; text: string }> = {
  RED: {
    label: 'Rezagado',
    dot: 'bg-red-500',
    pill: 'border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300',
    text: 'text-red-700 dark:text-red-400',
  },
  YELLOW: {
    label: 'Intermedio',
    dot: 'bg-amber-400',
    pill: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300',
    text: 'text-amber-700 dark:text-amber-400',
  },
  GREEN: {
    label: 'Destacado',
    dot: 'bg-emerald-500',
    pill: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300',
    text: 'text-emerald-700 dark:text-emerald-400',
  },
};

const REQUEST_TYPES: Record<string, string> = {
  INTERNAL: 'Internas',
  LEGISLATIVE: 'Legislativas',
  SECURITY_APP: 'De seguridad',
};

export function formatIndicatorValue(value: number | null, unit: DiagnosisIndicator['unit']) {
  if (value === null) return '—';
  const v = decimal.format(value);
  switch (unit) {
    case 'POR_100K':
      return `${v} por 100.000`;
    case 'PORCENTAJE':
      return `${v} %`;
    case 'POR_100':
      return `${v} por 100 hab.`;
    case 'POR_10K':
      return `${v} por 10.000 hab.`;
    default:
      return v;
  }
}

/** Cifra corta para la tabla: la unidad va una sola vez bajo el nombre. */
function shortValue(value: number | null, unit: DiagnosisIndicator['unit']) {
  if (value === null) return '—';
  return unit === 'PORCENTAJE' ? `${decimal.format(value)} %` : decimal.format(value);
}

const UNIT_LABEL: Record<DiagnosisIndicator['unit'], string | null> = {
  POR_100K: 'Por 100.000 habitantes',
  PORCENTAJE: null,
  PUNTAJE: 'Puntaje de 0 a 100',
  POR_100: 'Por cada 100 habitantes',
  POR_10K: 'Por cada 10.000 habitantes',
};

function peerNoun(group: Ready['peerGroup']) {
  const kind = group.level === 'DEPARTMENT' ? 'departamentos' : 'municipios';
  if (group.basis === 'CATEGORY' && group.category)
    return `${kind} de categoría ${group.category === 'E' ? 'especial' : group.category}`;
  if (group.basis === 'DEPARTMENT') return `municipios ${group.departmentName ? `de ${group.departmentName}` : 'del departamento'}`;
  return 'departamentos del país';
}

function StatusPill({ status }: { status: DiagnosisStatus | null }) {
  if (!status) return <span className="text-xs text-slate-400">Sin comparación</span>;
  const s = STATUS[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium', s.pill)}>
      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', s.dot)} />
      {s.label}
    </span>
  );
}

function Trend({ trend, lowCount }: { trend: DiagnosisIndicator['trend']; lowCount: boolean }) {
  if (!trend) return <span className="text-xs text-slate-400">{lowCount ? 'Pocos casos' : 'Sin serie'}</span>;
  const Icon = trend.annualChange > 0 ? ArrowUpRight : trend.annualChange < 0 ? ArrowDownRight : Minus;
  const label =
    trend.direction === 'IMPROVING' ? 'Mejora' : trend.direction === 'WORSENING' ? 'Empeora' : 'Estable';
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-xs font-medium',
        trend.direction === 'IMPROVING' && 'text-emerald-700 dark:text-emerald-400',
        trend.direction === 'WORSENING' && 'text-red-700 dark:text-red-400',
        trend.direction === 'STABLE' && 'text-slate-500',
      )}
      title={`Cambio promedio de ${decimal.format(trend.annualChange)} % por año entre ${trend.fromYear} y ${trend.toYear}`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {label}
      <span className="font-normal text-slate-400">desde {trend.fromYear}</span>
    </span>
  );
}

/** Una frase por indicador, armada con los datos (sin IA). */
function explain(i: DiagnosisIndicator, noun: string) {
  const parts: string[] = [];
  if (i.peers) {
    const worse = i.peers.count - i.peers.betterCount;
    parts.push(
      i.status === 'GREEN'
        ? `Mejor que ${number.format(worse)} de ${number.format(i.peers.count)} ${noun} (mediana ${formatIndicatorValue(i.peers.median, i.unit)}).`
        : `${number.format(i.peers.betterCount)} de ${number.format(i.peers.count)} ${noun} están mejor (mediana ${formatIndicatorValue(i.peers.median, i.unit)}).`,
    );
  }
  if (i.country !== null && i.country !== i.value) {
    const better = i.better === 'LOWER' ? i.value < i.country : i.value > i.country;
    parts.push(`${better ? 'Mejor' : 'Peor'} que el promedio del país (${formatIndicatorValue(i.country, i.unit)}).`);
  }
  if (i.trend && i.trend.direction !== 'STABLE')
    parts.push(
      `${i.trend.direction === 'WORSENING' ? 'Empeora' : 'Mejora'} desde ${i.trend.fromYear}: ${decimal.format(Math.abs(i.trend.annualChange))} % por año.`,
    );
  if (i.lowCount && i.cases !== null)
    parts.push(`Pocos casos (${number.format(i.cases)}): la tasa cambia mucho de un año a otro.`);
  return parts.join(' ');
}

export function DiagnosisSection() {
  const [data, setData] = useState<DiagnosisResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getDiagnosis()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          No se pudo cargar el diagnóstico. Recarga la página; si sigue igual, avisa a soporte.
        </CardContent>
      </Card>
    );
  }
  if (!data) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
      </div>
    );
  }
  if (!data.configured || data.indicators.length === 0) return null;
  return (
    <>
      <DiagnosisView data={data} />
      <CitizenVoiceCard voice={data.citizenVoice} />
    </>
  );
}

function DiagnosisView({ data }: { data: Ready }) {
  const [dimension, setDimension] = useState<string | null>(null);
  const noun = peerNoun(data.peerGroup);
  const byCode = useMemo(() => new Map(data.indicators.map((i) => [i.code, i])), [data.indicators]);
  const priorities = data.priorities.map((c) => byCode.get(c)).filter((i): i is DiagnosisIndicator => !!i);
  const strengths = data.strengths.map((c) => byCode.get(c)).filter((i): i is DiagnosisIndicator => !!i);
  const dimensionName = useMemo(() => new Map(data.dimensions.map((d) => [d.code, d.name])), [data.dimensions]);
  const rows = dimension ? data.indicators.filter((i) => i.dimension === dimension) : data.indicators;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Diagnóstico</CardTitle>
        <CardDescription>
          Cada indicador de {data.territory.name} comparado con los {number.format(data.peerGroup.count)} {noun}: en rojo
          si está en el tercio peor, en amarillo si está en el medio y en verde si está en el tercio mejor. Sin
          inteligencia artificial: son reglas fijas sobre los datos oficiales que aparecen más abajo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7" role="group" aria-label="Filtrar por tema">
          {data.dimensions.map((d) => {
            const active = dimension === d.code;
            return (
              <button
                key={d.code}
                type="button"
                aria-pressed={active}
                onClick={() => setDimension(active ? null : d.code)}
                className={cn(
                  'flex flex-col gap-1.5 rounded-lg border p-3 text-left transition-colors hover:border-primary/50',
                  active ? 'border-primary bg-primary/5' : 'border-border bg-card',
                )}
              >
                <span className="text-xs font-semibold text-foreground">{d.name}</span>
                <StatusPill status={d.status} />
                <span className="flex items-center gap-2 text-[11px] tabular-nums text-slate-500">
                  {(['RED', 'YELLOW', 'GREEN'] as const).map((s) => (
                    <span key={s} className="inline-flex items-center gap-1" title={`${STATUS[s].label}: ${d.counts[s]}`}>
                      <span aria-hidden className={cn('h-1.5 w-1.5 rounded-full', STATUS[s].dot)} />
                      <span className="sr-only">{STATUS[s].label}:</span>
                      {d.counts[s]}
                    </span>
                  ))}
                </span>
              </button>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <section aria-labelledby="diagnosis-priorities">
            <h3 id="diagnosis-priorities" className="text-sm font-semibold text-foreground">
              Prioridades
            </h3>
            <p className="mb-3 text-xs text-slate-500">Los indicadores en rojo, primero los que vienen empeorando.</p>
            {priorities.length === 0 ? (
              <p className="text-sm text-slate-500">Ningún indicador está en el tercio peor de sus pares.</p>
            ) : (
              <ul className="space-y-3">
                {priorities.map((i) => (
                  <Finding key={i.code} indicator={i} noun={noun} dimension={dimensionName.get(i.dimension)} />
                ))}
              </ul>
            )}
          </section>
          <section aria-labelledby="diagnosis-strengths">
            <h3 id="diagnosis-strengths" className="text-sm font-semibold text-foreground">
              Fortalezas
            </h3>
            <p className="mb-3 text-xs text-slate-500">Donde el territorio está entre los mejores de sus pares.</p>
            {strengths.length === 0 ? (
              <p className="text-sm text-slate-500">Ningún indicador está en el tercio mejor de sus pares.</p>
            ) : (
              <ul className="space-y-3">
                {strengths.map((i) => (
                  <Finding key={i.code} indicator={i} noun={noun} dimension={dimensionName.get(i.dimension)} />
                ))}
              </ul>
            )}
          </section>
        </div>

        <div>
          <div className="mb-2 flex flex-wrap items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold text-foreground">
              {dimension ? dimensionName.get(dimension) : 'Todos los indicadores'}
            </h3>
            {dimension && (
              <button type="button" onClick={() => setDimension(null)} className="text-xs text-primary hover:underline">
                Ver todos los temas
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-slate-500">
                  <th className="py-2 pr-3 font-medium">Indicador</th>
                  <th className="px-3 py-2 text-right font-medium">Año</th>
                  <th className="px-3 py-2 text-right font-medium">{data.territory.name}</th>
                  <th className="px-3 py-2 text-right font-medium">Mediana de pares</th>
                  <th className="px-3 py-2 text-right font-medium">Colombia</th>
                  <th className="px-3 py-2 text-right font-medium">Pares mejor</th>
                  <th className="px-3 py-2 font-medium">Tendencia</th>
                  <th className="py-2 pl-3 font-medium">Semáforo</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((i) => (
                  <tr key={i.code} className="border-b last:border-0">
                    <td className="py-2 pr-3">
                      <span className="font-medium text-foreground">{i.name}</span>
                      {UNIT_LABEL[i.unit] && <span className="block text-[11px] text-slate-400">{UNIT_LABEL[i.unit]}</span>}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-500">{i.year}</td>
                    <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', i.status && STATUS[i.status].text)}>
                      {shortValue(i.value, i.unit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {shortValue(i.peers?.median ?? null, i.unit)}
                    </td>
                    <td className="px-3 py-2 text-right tabular-nums text-slate-600">
                      {shortValue(i.country, i.unit)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums text-slate-600">
                      {i.peers ? `${number.format(i.peers.betterCount)} de ${number.format(i.peers.count)}` : '—'}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <Trend trend={i.trend} lowCount={i.lowCount} />
                    </td>
                    <td className="whitespace-nowrap py-2 pl-3">
                      <StatusPill status={i.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-slate-500">
            «Pares mejor»: cuántos de los {noun} con dato ese año tienen una cifra mejor. Los delitos se comparan por
            cada 100.000 habitantes. La tendencia usa los últimos cinco datos; menos de 3 % de cambio por año se cuenta
            como estable. Los datos del censo de 2018 y los delitos con menos de 10 casos en el año no tienen tendencia.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function Finding({ indicator: i, noun, dimension }: { indicator: DiagnosisIndicator; noun: string; dimension?: string }) {
  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <span className="font-medium text-foreground">{i.name}</span>
        <span className={cn('text-sm font-semibold tabular-nums', i.status && STATUS[i.status].text)}>
          {formatIndicatorValue(i.value, i.unit)} <span className="text-xs font-normal text-slate-400">({i.year})</span>
        </span>
      </div>
      {dimension && <p className="text-[11px] uppercase tracking-wide text-slate-400">{dimension}</p>}
      <p className="mt-1 text-xs text-slate-600 dark:text-slate-300">{explain(i, noun)}</p>
    </li>
  );
}

function CitizenVoiceCard({ voice }: { voice: CitizenVoice }) {
  const { requests, complaints, mentions } = voice;
  if (!requests && !complaints && !mentions) return null;
  const maxTopic = Math.max(1, ...(mentions?.topics.map((t) => t.total) ?? [1]));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lo que dice la gente</CardTitle>
        <CardDescription>
          Lo que tu equipo registró en Zyron: solicitudes y denuncias de los últimos 12 meses y noticias de los últimos
          90 días. No es una encuesta: muestra lo que llegó a la campaña.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {requests && (
          <section aria-labelledby="voice-requests" className="space-y-2">
            <h3 id="voice-requests" className="text-sm font-semibold text-foreground">
              Solicitudes
            </h3>
            <p className="text-2xl font-bold tabular-nums text-foreground">{number.format(requests.total)}</p>
            <p className="text-xs text-slate-500">{number.format(requests.open)} sin resolver</p>
            <ul className="space-y-1 text-sm">
              {requests.byType.map((t) => (
                <li key={t.type} className="flex justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{REQUEST_TYPES[t.type] ?? t.type}</span>
                  <span className="tabular-nums">{number.format(t.count)}</span>
                </li>
              ))}
            </ul>
            {requests.topZones.length > 0 && (
              <>
                <p className="pt-2 text-xs font-medium text-slate-500">Zonas con más solicitudes</p>
                <ul className="space-y-1 text-sm">
                  {requests.topZones.map((z) => (
                    <li key={z.name} className="flex justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300">{z.name}</span>
                      <span className="tabular-nums">{number.format(z.count)}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </section>
        )}
        {complaints && (
          <section aria-labelledby="voice-complaints" className="space-y-2">
            <h3 id="voice-complaints" className="text-sm font-semibold text-foreground">
              Denuncias y demandas
            </h3>
            <p className="text-2xl font-bold tabular-nums text-foreground">{number.format(complaints.total)}</p>
            <p className="text-xs text-slate-500">{number.format(complaints.open)} sin responder</p>
            <ul className="space-y-1 text-sm">
              {complaints.byType.map((t) => (
                <li key={t.type} className="flex justify-between gap-2">
                  <span className="text-slate-600 dark:text-slate-300">{t.type === 'DENUNCIA' ? 'Denuncias' : 'Demandas'}</span>
                  <span className="tabular-nums">{number.format(t.count)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {mentions && (
          <section aria-labelledby="voice-mentions" className="space-y-2">
            <h3 id="voice-mentions" className="text-sm font-semibold text-foreground">
              Noticias por tema
            </h3>
            <p className="text-2xl font-bold tabular-nums text-foreground">{number.format(mentions.total)}</p>
            <p className="text-xs text-slate-500">
              {number.format(mentions.negative)} con tono negativo
              {mentions.total > 0 && ` (${decimal.format((mentions.negative / mentions.total) * 100)} %)`}
            </p>
            {mentions.topics.length === 0 ? (
              <p className="text-sm text-slate-500">Sin noticias de tus temas en Monitoreo.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                <li className="text-[11px] text-slate-400">En rojo, la parte con tono negativo.</li>
                {mentions.topics.map((t) => (
                  <li key={t.name}>
                    <div className="flex justify-between gap-2">
                      <span className="text-slate-600 dark:text-slate-300">{t.name}</span>
                      <span className="tabular-nums">{number.format(t.total)}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" aria-hidden>
                      <div className="flex h-full" style={{ width: `${(t.total / maxTopic) * 100}%` }}>
                        <div className="h-full bg-red-400" style={{ width: `${t.total ? (t.negative / t.total) * 100 : 0}%` }} />
                        <div className="h-full flex-1 bg-primary/60" />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}
      </CardContent>
    </Card>
  );
}
