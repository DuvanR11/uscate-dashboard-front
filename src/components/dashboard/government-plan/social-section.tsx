'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ChoroplethMap } from '@/components/dashboard/map/choropleth-map';
import { useBrandColors } from '@/hooks/use-brand-colors';
import {
  getSocialProfile,
  municipalitiesGeoUrl,
  type SocialProfileResponse,
  type ValueIndicatorSummary,
} from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';

/**
 * Plan de gobierno, Fase 2 (2026-10-14). Educación, salud, pobreza, vivienda y
 * servicios, y finanzas públicas del territorio, una pestaña por tema: último
 * año con dato de cada indicador, comparado con el departamento y el país (en
 * rojo si está peor que el país), y la diferencia con el dato anterior. Al
 * elegir un indicador: su serie y el mapa por municipio.
 */

const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });

function format(value: number | null | undefined, unit: ValueIndicatorSummary['unit']) {
  if (value === null || value === undefined) return '—';
  return unit === 'PORCENTAJE' ? `${decimal.format(value)} %` : decimal.format(value);
}

/** Peor que el país según si "más es mejor" o "menos es mejor". */
function worseThanCountry(i: ValueIndicatorSummary) {
  if (i.value === null || i.country === null) return false;
  if (i.better === 'HIGHER') return i.value < i.country;
  if (i.better === 'LOWER') return i.value > i.country;
  return false;
}

function Change({ indicator }: { indicator: ValueIndicatorSummary }) {
  const { change, previous, better, unit } = indicator;
  if (change === null || !previous) return <span className="text-slate-400">—</span>;
  const Icon = change > 0 ? ArrowUpRight : change < 0 ? ArrowDownRight : Minus;
  const good = better === 'NEUTRAL' || change === 0 ? null : (change > 0) === (better === 'HIGHER');
  const amount = `${decimal.format(Math.abs(change))}${unit === 'PORCENTAJE' ? ' pts' : ''}`;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular-nums',
        good === true && 'text-emerald-600',
        good === false && 'text-red-600',
        good === null && 'text-slate-500',
      )}
      aria-label={`Frente a ${previous.year}: ${change > 0 ? 'subió' : change < 0 ? 'bajó' : 'sin cambio'} ${amount}`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {amount}
      <span className="ml-1 text-xs font-normal text-slate-400">vs {previous.year}</span>
    </span>
  );
}

export function SocialSection() {
  const [data, setData] = useState<SocialProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSocialProfile()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          No se pudieron cargar los indicadores sociales. Recarga la página; si sigue igual, avisa a soporte.
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
  if (!data.configured) return null;
  return <SocialView data={data} />;
}

function SocialView({ data }: { data: Extract<SocialProfileResponse, { configured: true }> }) {
  const { primary } = useBrandColors();
  const dimensions = data.dimensions.filter((d) => d.indicators.some((i) => i.available));
  const [tab, setTab] = useState(dimensions[0]?.code ?? '');
  const [selected, setSelected] = useState<Record<string, string>>({});
  const isMunicipality = data.territory.level === 'MUNICIPALITY';

  if (dimensions.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Educación, salud, pobreza y finanzas</CardTitle>
        <CardDescription>
          Último dato oficial de cada indicador frente al departamento y al país (en rojo, peor que el país). Cada fila
          dice de qué año es: la pobreza y la vivienda vienen del censo de 2018, el último que mide estos temas por
          municipio.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="h-auto flex-wrap" aria-label="Tema">
            {dimensions.map((d) => (
              <TabsTrigger key={d.code} value={d.code}>
                {d.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {dimensions.map((d) => {
            const available = d.indicators.filter((i) => i.available);
            const current = available.find((i) => i.code === selected[d.code]) ?? available[0];
            return (
              <TabsContent key={d.code} value={d.code} className="space-y-6 pt-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs text-slate-500">
                        <th className="py-2 pr-3 font-medium">Indicador</th>
                        <th className="px-3 py-2 text-right font-medium">Año</th>
                        <th className="px-3 py-2 text-right font-medium">{data.territory.name}</th>
                        {isMunicipality && (
                          <th className="px-3 py-2 text-right font-medium">{data.territory.departmentName ?? 'Departamento'}</th>
                        )}
                        <th className="px-3 py-2 text-right font-medium">Colombia</th>
                        <th className="py-2 pl-3 text-right font-medium">Cambio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {available.map((i) => {
                        const active = i.code === current.code;
                        return (
                          <tr key={i.code} className={cn('border-b last:border-0', active && 'bg-primary/5')}>
                            <td className="py-2 pr-3">
                              <button
                                type="button"
                                onClick={() => setSelected((s) => ({ ...s, [d.code]: i.code }))}
                                aria-pressed={active}
                                title={i.description}
                                className={cn('text-left hover:text-primary hover:underline', active && 'font-semibold text-primary')}
                              >
                                {i.name}
                              </button>
                            </td>
                            <td className="px-3 py-2 text-right tabular-nums text-slate-500">{i.year}</td>
                            <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', worseThanCountry(i) && 'text-red-600')}>
                              {format(i.value, i.unit)}
                            </td>
                            {isMunicipality && (
                              <td className="px-3 py-2 text-right tabular-nums text-slate-600">{format(i.department, i.unit)}</td>
                            )}
                            <td className="px-3 py-2 text-right tabular-nums text-slate-600">{format(i.country, i.unit)}</td>
                            <td className="py-2 pl-3 text-right">
                              <Change indicator={i} />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="space-y-1 text-xs text-slate-500">
                  <p>
                    <span className="font-medium text-slate-700">{current.name}:</span> {current.description}
                  </p>
                  {current.aggregationNote && <p>{current.aggregationNote}</p>}
                </div>

                <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
                  <div className="lg:col-span-2">
                    <h3 className="text-sm font-semibold text-foreground">Evolución en {data.territory.name}</h3>
                    {current.series.length > 1 ? (
                      <div className="mt-2 h-[260px]">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={current.series} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} width={40} domain={['auto', 'auto']} />
                            <Tooltip formatter={(v) => [format(Number(v), current.unit), current.name]} labelFormatter={(l) => `Año ${l}`} />
                            <Line type="monotone" dataKey="value" stroke={primary} strokeWidth={2} dot={{ r: 3 }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-slate-500">
                        Solo hay un dato ({current.year}): la fuente no tiene una serie para comparar.
                      </p>
                    )}
                  </div>
                  <div className="lg:col-span-3">
                    <h3 className="text-sm font-semibold text-foreground">
                      {current.name} por municipio, {current.year}
                    </h3>
                    <p className="mb-2 text-xs text-slate-500">Toca un municipio para ver su cifra.</p>
                    <div className="h-[340px]">
                      <SocialMap data={data} indicator={current} color={primary} />
                    </div>
                  </div>
                </div>
              </TabsContent>
            );
          })}
        </Tabs>
        <p className="mt-6 text-xs text-slate-500">
          Fuentes:{' '}
          {data.sources.map((source, i) => (
            <span key={source.code}>
              {i > 0 && ' · '}
              <a href={source.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                {source.publisher}, {source.name}
              </a>
            </span>
          ))}
          .
        </p>
      </CardContent>
    </Card>
  );
}

function SocialMap({
  data,
  indicator,
  color,
}: {
  data: Extract<SocialProfileResponse, { configured: true }>;
  indicator: ValueIndicatorSummary;
  color: string;
}) {
  const values = useMemo(() => indicator.units, [indicator]);
  return (
    <ChoroplethMap
      geoUrl={municipalitiesGeoUrl(data.map.departmentCode)}
      values={values}
      names={data.unitNames}
      highlightCode={data.map.highlightCode}
      color={color}
      formatValue={(v) => format(v, indicator.unit)}
      legendTitle={indicator.name}
    />
  );
}
