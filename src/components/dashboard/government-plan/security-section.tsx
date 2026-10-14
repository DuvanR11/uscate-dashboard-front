'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus, ShieldAlert } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChoroplethMap } from '@/components/dashboard/map/choropleth-map';
import { useBrandColors } from '@/hooks/use-brand-colors';
import {
  getSecurityProfile,
  municipalitiesGeoUrl,
  type CaseIndicatorSummary,
  type SecurityProfileResponse,
} from '@/lib/api/government-plan';
import { cn } from '@/lib/utils';

/**
 * Plan de gobierno, Fase 1 "Seguridad y movilidad" (2026-10-14). Delitos y
 * siniestros viales del territorio con datos de la Policía Nacional
 * (datos.gov.co): último año completo con su tasa por 100.000 habitantes,
 * comparada con el departamento y el país, cambio frente al año anterior y el
 * año corrido frente al mismo periodo. Al elegir un indicador: sus últimos 24
 * meses y el mapa de su tasa por municipio.
 */

const MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const MONTH_NAMES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const number = new Intl.NumberFormat('es-CO');
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const cases = (v: number | null | undefined) => (v === null || v === undefined ? '—' : number.format(v));
const rate = (v: number | null | undefined) => (v === null || v === undefined ? '—' : decimal.format(v));
const monthName = (yyyyMm: string) => {
  const [y, m] = yyyyMm.split('-').map(Number);
  return `${MONTH_NAMES[m - 1]} de ${y}`;
};

/** Cambio porcentual: aquí bajar es mejor (verde) y subir es peor (rojo). */
function Change({ value, label }: { value: number | null; label: string }) {
  if (value === null) return <span className="text-slate-400">—</span>;
  const Icon = value > 0 ? ArrowUpRight : value < 0 ? ArrowDownRight : Minus;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-0.5 font-medium tabular-nums',
        value > 0 ? 'text-red-600' : value < 0 ? 'text-emerald-600' : 'text-slate-500',
      )}
      aria-label={`${label}: ${value > 0 ? 'subió' : value < 0 ? 'bajó' : 'sin cambio'} ${decimal.format(Math.abs(value))} %`}
    >
      <Icon aria-hidden className="h-3.5 w-3.5" />
      {decimal.format(Math.abs(value))} %
    </span>
  );
}

export function SecuritySection() {
  const [data, setData] = useState<SecurityProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getSecurityProfile()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  if (failed) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-slate-600">
          No se pudieron cargar los datos de seguridad. Recarga la página; si sigue igual, avisa a soporte.
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
  const available = data.indicators.filter((i) => i.available);
  if (available.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
          <ShieldAlert className="h-8 w-8 text-slate-400" />
          <p className="font-semibold text-slate-800">Los datos de seguridad todavía no se han cargado</p>
          <p className="max-w-md text-sm text-slate-500">
            Se actualizan cada semana desde la Policía Nacional. Si no aparecen en unos días, avisa a soporte.
          </p>
        </CardContent>
      </Card>
    );
  }
  return <SecurityView data={data} indicators={available} />;
}

function SecurityView({
  data,
  indicators,
}: {
  data: Extract<SecurityProfileResponse, { configured: true }>;
  indicators: CaseIndicatorSummary[];
}) {
  const { primary } = useBrandColors();
  const [selected, setSelected] = useState(indicators[0].code);
  const indicator = indicators.find((i) => i.code === selected) ?? indicators[0];
  const isMunicipality = data.territory.level === 'MUNICIPALITY';
  const departmentLabel = data.territory.departmentName ?? 'Departamento';
  const lastYear = indicators[0].lastYear;
  const ytdSample = indicators.find((i) => i.ytd)?.ytd ?? null;
  const latestCoverage = indicators.map((i) => i.coverage?.to ?? '').sort().at(-1) ?? '';
  const unavailable = data.indicators.filter((i) => !i.available);

  const groups = useMemo(
    () =>
      [
        { key: 'SEGURIDAD', title: 'Seguridad y convivencia' },
        { key: 'MOVILIDAD', title: 'Movilidad' },
      ].map((g) => ({ ...g, items: indicators.filter((i) => i.dimension === g.key) })),
    [indicators],
  );

  const mapValues = useMemo(
    () => Object.fromEntries(Object.entries(indicator.units).map(([code, p]) => [code, p.rate])),
    [indicator],
  );
  const monthly = indicator.monthly.map((m) => ({ ...m, label: `${MONTHS[m.month - 1]} ${String(m.year).slice(2)}` }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Seguridad y movilidad</CardTitle>
        <CardDescription>
          Casos registrados por la Policía Nacional y tasa por cada 100.000 habitantes (población proyectada del DANE).
          Datos hasta {monthName(latestCoverage)}. Elige un indicador para ver sus meses y el mapa.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="border-b text-left text-xs text-slate-500">
                <th className="py-2 pr-3 font-medium">Indicador</th>
                <th className="px-3 py-2 text-right font-medium">Casos {lastYear}</th>
                <th className="px-3 py-2 text-right font-medium">Tasa {data.territory.name}</th>
                {isMunicipality && <th className="px-3 py-2 text-right font-medium">Tasa {departmentLabel}</th>}
                <th className="px-3 py-2 text-right font-medium">Tasa Colombia</th>
                <th className="px-3 py-2 text-right font-medium">Frente a {lastYear ? lastYear - 1 : ''}</th>
                {ytdSample && (
                  <th className="py-2 pl-3 text-right font-medium">
                    {ytdSample.year} (ene–{MONTHS[ytdSample.throughMonth - 1]}) frente a {ytdSample.year - 1}
                  </th>
                )}
              </tr>
            </thead>
            {groups.map((group) =>
              group.items.length === 0 ? null : (
                <tbody key={group.key}>
                  <tr>
                    <th colSpan={7} scope="rowgroup" className="pt-4 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {group.title}
                    </th>
                  </tr>
                  {group.items.map((item) => {
                    const c = item.current;
                    const above = c?.rate !== null && c?.rate !== undefined && c.country.rate !== null && c.rate > c.country.rate;
                    const active = item.code === indicator.code;
                    return (
                      <tr key={item.code} className={cn('border-b last:border-0', active && 'bg-primary/5')}>
                        <td className="py-2 pr-3">
                          <button
                            type="button"
                            onClick={() => setSelected(item.code)}
                            aria-pressed={active}
                            className={cn('text-left hover:text-primary hover:underline', active && 'font-semibold text-primary')}
                            title={item.description}
                          >
                            {item.name}
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{cases(c?.cases)}</td>
                        <td className={cn('px-3 py-2 text-right font-semibold tabular-nums', above && 'text-red-600')}>
                          {rate(c?.rate)}
                        </td>
                        {isMunicipality && <td className="px-3 py-2 text-right tabular-nums text-slate-600">{rate(c?.department?.rate)}</td>}
                        <td className="px-3 py-2 text-right tabular-nums text-slate-600">{rate(c?.country.rate)}</td>
                        <td className="px-3 py-2 text-right">
                          <Change value={c?.change ?? null} label={`${item.name} frente al año anterior`} />
                        </td>
                        {ytdSample && (
                          <td className="py-2 pl-3 text-right">
                            {item.ytd ? (
                              <span className="inline-flex items-center gap-2">
                                <span className="tabular-nums text-slate-600">
                                  {cases(item.ytd.cases)} / {cases(item.ytd.previousCases)}
                                </span>
                                <Change value={item.ytd.change} label={`${item.name} en lo corrido del año`} />
                                {item.ytd.throughMonth !== ytdSample.throughMonth && (
                                  <span className="text-xs text-slate-500">(ene–{MONTHS[item.ytd.throughMonth - 1]})</span>
                                )}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              ),
            )}
          </table>
        </div>
        <p className="text-xs text-slate-500">
          En rojo, una tasa por encima de la del país. Las flechas comparan casos: bajar es mejor. En municipios
          pequeños pocos casos cambian mucho la tasa.
        </p>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <h3 className="text-sm font-semibold text-foreground">{indicator.name}: últimos 24 meses</h3>
            <p className="mb-2 text-xs text-slate-500">Casos por mes en {data.territory.name}.</p>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthly} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} width={40} allowDecimals={false} />
                  <Tooltip formatter={(v) => [cases(Number(v)), 'Casos']} />
                  <Bar dataKey="cases" fill={primary} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="lg:col-span-3">
            <h3 className="text-sm font-semibold text-foreground">
              {indicator.name} por municipio, {indicator.lastYear}
            </h3>
            <p className="mb-2 text-xs text-slate-500">Tasa por cada 100.000 habitantes. Toca un municipio para ver su cifra.</p>
            <div className="h-[360px]">
              <ChoroplethMap
                geoUrl={municipalitiesGeoUrl(data.map.departmentCode)}
                values={mapValues}
                names={data.unitNames}
                highlightCode={data.map.highlightCode}
                color={primary}
                formatValue={(v) => decimal.format(v)}
                legendTitle="Tasa por 100.000 hab."
                renderDetail={(code) => (
                  <p className="text-xs text-slate-500">{cases(indicator.units[code]?.cases)} casos en {indicator.lastYear}</p>
                )}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-slate-500">
          Fuentes:{' '}
          {data.sources.map((source, i) => (
            <span key={source.code}>
              {i > 0 && ' · '}
              <a href={source.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                {source.publisher}, {source.name}
              </a>
            </span>
          ))}
          .{unavailable.length > 0 && ` Todavía sin cargar: ${unavailable.map((i) => i.name).join(', ')}.`}
        </p>
      </CardContent>
    </Card>
  );
}
