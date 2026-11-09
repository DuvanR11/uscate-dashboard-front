'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ArrowDownRight, ArrowUpRight, BarChart3, FileDown, Loader2, Minus, Network, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/store/auth-store';
import { formatCalendarDay } from '@/lib/dates';
import { formatDecimal, formatPercent } from '@/lib/format';
import { extractErrorMessage } from '@/lib/api-error';
import type { KeywordKind } from '@/lib/api/monitoring';
import {
  monitoringTrendsApi,
  TREND_PERIOD_LABEL,
  type ShareItem,
  type TrendPeriod,
  type TrendsReport,
} from '@/lib/api/monitoring-trends';

// Monitoreo de medios, Fase 3 (2026-11-08): Tendencias para decidir. Todo lo
// cuenta el servidor (`/monitoring/trends`); la pantalla solo lo dibuja.

const PERIODS: TrendPeriod[] = ['7d', '30d', '90d'];

// Sentimiento: escala de dos polos (rojo ↔ azul) con gris en el medio, de la
// paleta validada del skill de visualización. «Sin clasificar» va más claro.
const SENTIMENT = [
  { key: 'negative', label: 'Negativa', color: '#e34948' },
  { key: 'neutral', label: 'Neutral', color: '#a8a7a0' },
  { key: 'positive', label: 'Positiva', color: '#2a78d6' },
  { key: 'unclassified', label: 'Sin clasificar', color: '#dcdbd4' },
] as const;

// Paleta categórica en orden fijo (validada: pasa CVD y visión normal). El
// color sigue a la etiqueta, no a su puesto: se reparte en un orden estable
// (propias primero, luego por nombre) y desde la novena se agrupan en «Otras».
const CATEGORICAL = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#6250d6', '#e34948'];
const OTHERS_COLOR = '#a8a7a0';
const MAX_SERIES = CATEGORICAL.length - 1;

const KIND_LABEL: Record<KeywordKind, string> = { OWN: 'Propia', RIVAL: 'Rival', TOPIC: 'Tema' };
const KIND_CLASS: Record<KeywordKind, string> = {
  OWN: 'text-sky-700 border-sky-300 bg-sky-50',
  RIVAL: 'text-violet-700 border-violet-300 bg-violet-50',
  TOPIC: 'text-slate-600 border-slate-300 bg-slate-50',
};

const GRID = '#e1e0d9';
const AXIS_TICK = { fontSize: 11, fill: '#6b6a64' };
const TOOLTIP_STYLE = {
  borderRadius: 8,
  border: '1px solid #e1e0d9',
  boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.08)',
  fontSize: 12,
};

const dayLabel = (day: string) => formatCalendarDay(day, { day: 'numeric', month: 'short' });
const share = (fraction: number | null) => (fraction === null ? '—' : formatPercent(fraction * 100));

interface Series {
  id: string;
  name: string;
  color: string;
  items: ShareItem[];
}

/** Etiquetas propias y rivales con su color estable; desde la novena, «Otras». */
function seriesOf(items: ShareItem[]): Series[] {
  const stable = [...items].sort(
    (a, b) => (a.kind === b.kind ? a.name.localeCompare(b.name, 'es') : a.kind === 'OWN' ? -1 : 1),
  );
  if (stable.length <= CATEGORICAL.length)
    return stable.map((item, i) => ({ id: item.id, name: item.name, color: CATEGORICAL[i], items: [item] }));
  const head = stable.slice(0, MAX_SERIES);
  return [
    ...head.map((item, i) => ({ id: item.id, name: item.name, color: CATEGORICAL[i], items: [item] })),
    { id: '__otras', name: 'Otras', color: OTHERS_COLOR, items: stable.slice(MAX_SERIES) },
  ];
}

function Variation({ value, previous, period }: { value: number | null; previous: number; period: TrendPeriod }) {
  const against = `frente a los ${TREND_PERIOD_LABEL[period]} anteriores`;
  if (value === null)
    return <p className="text-xs text-slate-500">{previous === 0 ? `Sin datos ${against}` : against}</p>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <p className="flex items-center gap-1 text-xs text-slate-600">
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      <span>
        {value > 0 ? '+' : ''}
        {formatDecimal(value)} % {against}
      </span>
    </p>
  );
}

function Kpi({ label, value, children }: { label: string; value: string; children?: React.ReactNode }) {
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="space-y-1 p-4">
        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-black text-foreground">{value}</p>
        {children}
      </CardContent>
    </Card>
  );
}

function LegendRow({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
      {items.map((item) => (
        <li key={item.label} className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

export default function TendenciasPage() {
  const press = useAuthStore((s) => s.user?.organizationUsage === 'PRESS');
  const [period, setPeriod] = useState<TrendPeriod>('30d');
  const [data, setData] = useState<TrendsReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const load = useCallback(async (value: TrendPeriod) => {
    setLoading(true);
    try {
      setData(await monitoringTrendsApi.get(value));
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudieron cargar las tendencias');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(period);
  }, [load, period]);

  async function downloadReport() {
    if (!data) return;
    setDownloading(true);
    try {
      await monitoringTrendsApi.downloadReport(period, data.period.days[data.period.days.length - 1]);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo generar el informe');
    } finally {
      setDownloading(false);
    }
  }

  const series = useMemo(() => (data ? seriesOf(data.shareOfVoice.items) : []), [data]);
  const donut = useMemo(
    () =>
      series
        .map((s) => ({
          name: s.name,
          color: s.color,
          news: s.items.reduce((total, item) => total + item.news, 0),
        }))
        .filter((s) => s.news > 0),
    [series],
  );
  const shareDaily = useMemo(
    () =>
      data
        ? data.shareOfVoice.daily.map((d) => ({
            day: d.day,
            ...Object.fromEntries(
              series.map((s) => [s.id, s.items.reduce((total, item) => total + (d.counts[item.id] ?? 0), 0)]),
            ),
          }))
        : [],
    [data, series],
  );

  const showShare = !press;
  const negativeShare = data && data.totals.news > 0 ? data.totals.negative / data.totals.news : null;

  return (
    <div className="min-h-screen bg-slate-100 p-4 md:p-6">
      <div className="mb-6 flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground md:text-3xl">
            <BarChart3 className="text-secondary" /> Tendencias
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {press
              ? 'Cuánto se habla de tus temas, con qué tono y quién los cubre.'
              : 'Cuánto se habla de ti y de tus rivales, con qué tono y en qué medios.'}
          </p>
        </div>

        <div className="flex w-full flex-wrap gap-2 md:w-auto">
          <div role="group" aria-label="Periodo" className="inline-flex rounded-md border border-slate-300 bg-white p-0.5">
            {PERIODS.map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={period === value}
                onClick={() => setPeriod(value)}
                className={`rounded px-3 py-1.5 text-sm font-medium ${
                  period === value ? 'bg-primary text-primary-foreground' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                {TREND_PERIOD_LABEL[value]}
              </button>
            ))}
          </div>
          <Button variant="outline" onClick={downloadReport} disabled={!data || downloading}>
            {downloading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileDown className="mr-2 h-4 w-4" />}
            Informe en PDF
          </Button>
          <Link
            href="/inteligencia/redes"
            className="inline-flex items-center rounded-md border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            <Network size={16} className="mr-2" /> Vínculos entre personas
          </Link>
        </div>
      </div>

      {loading && !data ? (
        <div className="flex items-center justify-center gap-2 py-24 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando tendencias...
        </div>
      ) : !data ? null : (
        <div className={`space-y-6 ${loading ? 'opacity-60' : ''}`} aria-busy={loading}>
          {data.truncated && (
            <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Hay demasiadas menciones en este periodo: las cifras cuentan las más recientes. Prueba un periodo más
              corto.
            </p>
          )}

          {data.keywords.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="space-y-3 p-6 text-sm text-slate-600">
                <p>Todavía no hay etiquetas. Crea las de los temas y las personas que quieres seguir.</p>
                <Link href="/inteligencia/monitoreo/configuracion" className="font-medium text-primary underline">
                  Ir a Configuración
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showShare ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
                <Kpi label="Noticias" value={formatDecimal(data.totals.news, 0)}>
                  <Variation value={data.totals.variationPct} previous={data.totals.previousNews} period={period} />
                </Kpi>
                <Kpi label="Negativas" value={formatDecimal(data.totals.negative, 0)}>
                  <p className="text-xs text-slate-500">
                    {negativeShare === null ? 'Sin noticias' : `${share(negativeShare)} de las noticias`} · antes{' '}
                    {formatDecimal(data.totals.previousNegative, 0)}
                  </p>
                </Kpi>
                {showShare && (
                  <Kpi
                    label="Tu parte frente a rivales"
                    value={data.shareOfVoice.available ? share(data.shareOfVoice.ownShare) : '—'}
                  >
                    <p className="text-xs text-slate-500">
                      {data.shareOfVoice.available
                        ? `Antes ${share(data.shareOfVoice.previousOwnShare)}`
                        : 'Marca etiquetas propias y rivales'}
                    </p>
                  </Kpi>
                )}
                <Kpi label="Medios distintos" value={formatDecimal(data.totals.outlets, 0)}>
                  <p className="text-xs text-slate-500">que publicaron sobre tus etiquetas</p>
                </Kpi>
              </div>

              <Card className="border-0 shadow-sm">
                <CardHeader className="space-y-2 border-b bg-white pb-4">
                  <CardTitle className="text-base text-foreground">Noticias por día y su tono</CardTitle>
                  <LegendRow items={SENTIMENT.map((s) => ({ label: s.label, color: s.color }))} />
                </CardHeader>
                <CardContent className="space-y-3 p-4">
                  <div className="h-[260px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.daily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid vertical={false} stroke={GRID} />
                        <XAxis
                          dataKey="day"
                          tickFormatter={dayLabel}
                          tick={AXIS_TICK}
                          axisLine={{ stroke: '#c3c2b7' }}
                          tickLine={false}
                          interval="preserveStartEnd"
                          minTickGap={16}
                        />
                        <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                        <Tooltip
                          cursor={{ fill: '#f1f0ea' }}
                          contentStyle={TOOLTIP_STYLE}
                          labelFormatter={(day) => dayLabel(String(day))}
                        />
                        {SENTIMENT.map((s) => (
                          <Bar
                            key={s.key}
                            dataKey={s.key}
                            name={s.label}
                            stackId="tono"
                            fill={s.color}
                            stroke="#ffffff"
                            strokeWidth={1}
                            maxBarSize={28}
                            isAnimationActive={false}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <details className="text-sm">
                    <summary className="cursor-pointer text-xs font-medium text-slate-500">Ver como tabla</summary>
                    <div className="mt-2 max-h-64 overflow-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-500">
                          <tr>
                            <th className="py-1 pr-2 font-medium">Día</th>
                            <th className="py-1 pr-2 text-right font-medium">Noticias</th>
                            {SENTIMENT.map((s) => (
                              <th key={s.key} className="py-1 pr-2 text-right font-medium">
                                {s.label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.daily.map((d) => (
                            <tr key={d.day}>
                              <td className="py-1 pr-2">{dayLabel(d.day)}</td>
                              <td className="py-1 pr-2 text-right">{d.total}</td>
                              {SENTIMENT.map((s) => (
                                <td key={s.key} className="py-1 pr-2 text-right">
                                  {d[s.key]}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                  <p className="text-xs text-slate-500">
                    El tono es el de la nota. Cada noticia cuenta una vez, el día que llegó, aunque toque varias
                    etiquetas.
                  </p>
                </CardContent>
              </Card>

              {showShare && (
                <Card className="border-0 shadow-sm">
                  <CardHeader className="space-y-2 border-b bg-white pb-4">
                    <CardTitle className="text-base text-foreground">Tú frente a tus rivales</CardTitle>
                    {data.shareOfVoice.available && (
                      <LegendRow items={series.map((s) => ({ label: s.name, color: s.color }))} />
                    )}
                  </CardHeader>
                  <CardContent className="p-4">
                    {!data.shareOfVoice.available ? (
                      <div className="flex flex-col items-start gap-3 text-sm text-slate-600">
                        <p>
                          {data.hasOwn
                            ? 'Falta marcar al menos una etiqueta como Rival.'
                            : data.hasRivals
                              ? 'Falta marcar al menos una etiqueta como Propia (tu nombre o el de tu campaña).'
                              : 'Marca tus etiquetas como Propia (tu nombre, tu campaña) o Rival para ver qué parte de las noticias se lleva cada uno.'}
                        </p>
                        <Link
                          href="/inteligencia/monitoreo/configuracion"
                          className="inline-flex items-center gap-1.5 font-medium text-primary underline"
                        >
                          <Settings2 className="h-4 w-4" /> Ir a Configuración
                        </Link>
                      </div>
                    ) : donut.length === 0 ? (
                      <p className="py-6 text-center text-sm text-slate-500">
                        En el periodo no salieron noticias de tus etiquetas propias ni de las rivales.
                      </p>
                    ) : (
                      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
                        <div className="flex flex-col items-center">
                          <div className="h-[200px] w-full max-w-[240px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={donut}
                                  dataKey="news"
                                  nameKey="name"
                                  innerRadius={56}
                                  outerRadius={88}
                                  stroke="#ffffff"
                                  strokeWidth={2}
                                  isAnimationActive={false}
                                >
                                  {donut.map((slice) => (
                                    <Cell key={slice.name} fill={slice.color} />
                                  ))}
                                </Pie>
                                <Tooltip contentStyle={TOOLTIP_STYLE} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <ul className="mt-2 w-full max-w-[260px] space-y-1 text-sm">
                            {donut.map((slice) => {
                              const total = donut.reduce((sum, s) => sum + s.news, 0);
                              return (
                                <li key={slice.name} className="flex items-center justify-between gap-2">
                                  <span className="flex min-w-0 items-center gap-2">
                                    <span
                                      className="h-2.5 w-2.5 shrink-0 rounded-sm"
                                      style={{ backgroundColor: slice.color }}
                                      aria-hidden
                                    />
                                    <span className="truncate text-slate-700">{slice.name}</span>
                                  </span>
                                  <span className="shrink-0 font-semibold text-foreground">
                                    {share(slice.news / total)}
                                  </span>
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                        <div className="h-[260px] w-full lg:col-span-2">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={shareDaily} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                              <CartesianGrid vertical={false} stroke={GRID} />
                              <XAxis
                                dataKey="day"
                                tickFormatter={dayLabel}
                                tick={AXIS_TICK}
                                axisLine={{ stroke: '#c3c2b7' }}
                                tickLine={false}
                                interval="preserveStartEnd"
                                minTickGap={16}
                              />
                              <YAxis allowDecimals={false} tick={AXIS_TICK} axisLine={false} tickLine={false} width={40} />
                              <Tooltip
                                cursor={{ fill: '#f1f0ea' }}
                                contentStyle={TOOLTIP_STYLE}
                                labelFormatter={(day) => dayLabel(String(day))}
                              />
                              {series.map((s) => (
                                <Bar
                                  key={s.id}
                                  dataKey={s.id}
                                  name={s.name}
                                  stackId="rivales"
                                  fill={s.color}
                                  stroke="#ffffff"
                                  strokeWidth={1}
                                  maxBarSize={28}
                                  isAnimationActive={false}
                                />
                              ))}
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                <Card className="min-w-0 border-0 shadow-sm">
                  <CardHeader className="border-b bg-white pb-4">
                    <CardTitle className="text-base text-foreground">Por etiqueta</CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-slate-50 text-xs text-slate-500">
                        <tr>
                          <th className="px-4 py-2 font-medium">Etiqueta</th>
                          <th className="px-2 py-2 text-right font-medium">Noticias</th>
                          <th className="px-2 py-2 text-right font-medium">Antes</th>
                          <th className="px-4 py-2 text-right font-medium" title="Negativas para el sujeto de la etiqueta">
                            Negativas
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {data.keywords.map((k) => (
                          <tr key={k.id}>
                            <td className="px-4 py-2">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-medium text-foreground">{k.name}</span>
                                <Badge variant="outline" className={`text-[10px] ${KIND_CLASS[k.kind]}`}>
                                  {KIND_LABEL[k.kind]}
                                </Badge>
                              </div>
                            </td>
                            <td className="px-2 py-2 text-right font-semibold">{k.news}</td>
                            <td className="px-2 py-2 text-right text-slate-500">{k.previousNews}</td>
                            <td className="px-4 py-2 text-right">{share(k.negativeShare)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <p className="px-4 py-3 text-xs text-slate-500">
                      «Negativas» mide cómo queda {press ? 'el tema' : 'la persona o el tema'} de cada etiqueta en la
                      nota, no solo el tono general.
                    </p>
                  </CardContent>
                </Card>

                <Card className="min-w-0 border-0 shadow-sm">
                  <CardHeader className="border-b bg-white pb-4">
                    <CardTitle className="text-base text-foreground">
                      {press ? 'Quién cubre tus temas' : 'Medios que más hablan de ti y de tus rivales'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="overflow-x-auto p-0">
                    {data.outlets.length === 0 ? (
                      <p className="px-4 py-6 text-center text-sm text-slate-500">Sin noticias en el periodo.</p>
                    ) : (
                      <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs text-slate-500">
                          <tr>
                            <th className="px-4 py-2 font-medium">Medio</th>
                            <th className="px-2 py-2 text-right font-medium">Noticias</th>
                            {!press && data.hasOwn && <th className="px-2 py-2 text-right font-medium">De ti</th>}
                            {!press && data.hasRivals && (
                              <th className="px-2 py-2 text-right font-medium">De rivales</th>
                            )}
                            {!press && data.hasOwn && (
                              <th className="px-4 py-2 text-right font-medium" title="Negativas para tus etiquetas propias">
                                Contra ti
                              </th>
                            )}
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {data.outlets.map((o) => (
                            <tr key={o.name}>
                              <td className="max-w-[12rem] truncate px-4 py-2 font-medium text-foreground">{o.name}</td>
                              <td className="px-2 py-2 text-right font-semibold">{o.news}</td>
                              {!press && data.hasOwn && <td className="px-2 py-2 text-right">{o.own}</td>}
                              {!press && data.hasRivals && <td className="px-2 py-2 text-right">{o.rival}</td>}
                              {!press && data.hasOwn && <td className="px-4 py-2 text-right">{o.ownNegative}</td>}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
