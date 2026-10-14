'use client';

import { useEffect, useMemo, useState } from 'react';
import { Landmark, Loader2, MapPinned } from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChoroplethMap } from '@/components/dashboard/map/choropleth-map';
import { SecuritySection } from '@/components/dashboard/government-plan/security-section';
import { SocialSection } from '@/components/dashboard/government-plan/social-section';
import { useBrandColors } from '@/hooks/use-brand-colors';
import {
  getTerritoryProfile,
  municipalitiesGeoUrl,
  type TerritoryProfile,
  type TerritoryProfileResponse,
  type TerritorySummary,
} from '@/lib/api/government-plan';

/**
 * `/plan-de-gobierno` — Plan de gobierno, Fase 0 "Cimientos del territorio"
 * (2026-10-14). El territorio al que aspira la campaña con sus datos base del
 * DANE: población, cabecera y zona rural, superficie y densidad, comparados
 * con el departamento y el país, y un mapa de sus municipios. Desde la Fase 1
 * (2026-10-14) también delitos y siniestros viales (`SecuritySection`) y, desde
 * la Fase 2, educación, salud, pobreza, vivienda y finanzas (`SocialSection`).
 * Fuera del menú hasta que el diagnóstico esté completo (`UNLISTED_ROUTES`).
 */

const number = new Intl.NumberFormat('es-CO');
const decimal = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
const people = (v: number | null) => (v === null ? '—' : number.format(Math.round(v)));
const km2 = (v: number | null) => (v === null ? '—' : `${number.format(Math.round(v))} km²`);
const density = (v: number | null) => (v === null ? '—' : `${decimal.format(v)} hab./km²`);
const percent = (v: number | null) => (v === null ? '—' : `${decimal.format(v)} %`);
const compact = new Intl.NumberFormat('es-CO', { notation: 'compact', maximumFractionDigits: 1 });

type MapMetric = 'population' | 'density' | 'ruralShare';
const METRICS: Record<MapMetric, { label: string; legend: string; format: (v: number) => string }> = {
  population: { label: 'Población', legend: 'Habitantes', format: (v) => number.format(Math.round(v)) },
  density: { label: 'Densidad', legend: 'Hab. por km²', format: (v) => decimal.format(v) },
  ruralShare: { label: '% rural', legend: 'Población rural', format: (v) => `${decimal.format(v)} %` },
};

export default function GovernmentPlanPage() {
  const [data, setData] = useState<TerritoryProfileResponse | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    getTerritoryProfile()
      .then(setData)
      .catch(() => setFailed(true));
  }, []);

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-10">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="rounded-xl border border-primary/20 bg-primary/10 p-3">
          <Landmark className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-foreground">Plan de gobierno</h1>
          <p className="text-sm text-slate-500">
            El territorio al que aspiras, con datos públicos oficiales: población, seguridad, movilidad, educación, salud,
            pobreza y finanzas públicas.
          </p>
        </div>
      </div>

      {failed ? (
        <Card>
          <CardContent className="py-10 text-center text-slate-600">
            No se pudo cargar el territorio. Recarga la página; si sigue igual, avisa a soporte.
          </CardContent>
        </Card>
      ) : !data ? (
        <div className="flex h-[50vh] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
        </div>
      ) : !data.configured ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <MapPinned className="h-10 w-10 text-slate-400" />
            <p className="font-semibold text-slate-800">Tu campaña todavía no tiene un territorio asignado</p>
            <p className="max-w-md text-sm text-slate-500">
              Pide a soporte de Zyron que registre el municipio o departamento al que aspiras. Con eso esta pantalla
              muestra su población, superficie y mapa.
            </p>
          </CardContent>
        </Card>
      ) : (
        <TerritoryView profile={data} />
      )}
    </div>
  );
}

function TerritoryView({ profile }: { profile: TerritoryProfile }) {
  const { primary } = useBrandColors();
  const [metric, setMetric] = useState<MapMetric>('population');
  const { territory, summary, year } = profile;
  const isMunicipality = profile.level === 'MUNICIPALITY';

  const mapValues = useMemo(
    () => Object.fromEntries(profile.units.map((u) => [u.code, u[metric]])),
    [profile.units, metric],
  );
  const names = useMemo(() => Object.fromEntries(profile.units.map((u) => [u.code, u.name])), [profile.units]);
  const ranking = useMemo(
    () => [...profile.units].sort((a, b) => (b.population ?? -1) - (a.population ?? -1)),
    [profile.units],
  );
  const position = isMunicipality ? ranking.findIndex((u) => u.code === territory.code) + 1 : 0;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold text-foreground">{territory.name}</h2>
        {isMunicipality && territory.departmentName && (
          <span className="text-slate-500">({territory.departmentName})</span>
        )}
        <Badge variant="secondary">{isMunicipality ? 'Municipio' : 'Departamento'}</Badge>
        {territory.category && (
          <Badge variant="outline">
            Categoría {territory.category === 'E' ? 'especial' : territory.category} ({territory.categoryYear})
          </Badge>
        )}
        <span className="text-xs text-slate-500">Código DANE {territory.code}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric label={`Población ${year}`} value={people(summary.population)} note="Proyección del DANE" />
        <Metric
          label="Cabecera / zona rural"
          value={`${percent(summary.ruralShare === null ? null : 100 - summary.ruralShare)} / ${percent(summary.ruralShare)}`}
          note={`${people(summary.urbanPopulation)} en la cabecera · ${people(summary.ruralPopulation)} en la zona rural`}
        />
        <Metric label="Superficie" value={km2(summary.areaKm2)} note="Marco Geoestadístico 2025" />
        <Metric
          label="Densidad"
          value={density(summary.density)}
          note={isMunicipality && position > 0 ? `Puesto ${position} de ${ranking.length} en población del departamento` : undefined}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Comparación</CardTitle>
          <CardDescription>Mismas cifras para {isMunicipality ? 'el departamento y ' : ''}el país, año {year}.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Territorio</TableHead>
                <TableHead className="text-right">Población</TableHead>
                <TableHead className="text-right">% rural</TableHead>
                <TableHead className="text-right">Densidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[summary, profile.department, profile.country]
                .filter((row): row is TerritorySummary => row !== null)
                .map((row, i) => (
                  <TableRow key={row.code} className={i === 0 ? 'font-semibold' : undefined}>
                    <TableCell>{row.name}</TableCell>
                    <TableCell className="text-right tabular-nums">{people(row.population)}</TableCell>
                    <TableCell className="text-right tabular-nums">{percent(row.ruralShare)}</TableCell>
                    <TableCell className="text-right tabular-nums">{density(row.density)}</TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <SecuritySection />

      <SocialSection />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-3">
          <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
            <div>
              <CardTitle className="text-base">
                Municipios de {isMunicipality ? territory.departmentName ?? 'el departamento' : territory.name}
              </CardTitle>
              <CardDescription>
                {isMunicipality ? `${territory.name} va resaltado. ` : ''}Toca un municipio para ver su cifra.
              </CardDescription>
            </div>
            <Tabs value={metric} onValueChange={(v) => setMetric(v as MapMetric)}>
              <TabsList aria-label="Dato que pinta el mapa">
                {(Object.keys(METRICS) as MapMetric[]).map((key) => (
                  <TabsTrigger key={key} value={key}>
                    {METRICS[key].label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </CardHeader>
          <CardContent className="h-[440px]">
            <ChoroplethMap
              geoUrl={municipalitiesGeoUrl(profile.map.departmentCode)}
              values={mapValues}
              names={names}
              highlightCode={profile.map.highlightCode}
              color={primary}
              formatValue={METRICS[metric].format}
              legendTitle={METRICS[metric].legend}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Población 2020–2035</CardTitle>
            <CardDescription>Proyección del DANE con base en el censo de 2018.</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={profile.populationSeries} margin={{ top: 22, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="population-fill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={primary} stopOpacity={0.35} />
                    <stop offset="100%" stopColor={primary} stopOpacity={0.03} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="year" tick={{ fontSize: 12 }} />
                <YAxis
                  tick={{ fontSize: 12 }}
                  width={48}
                  tickFormatter={(v: number) => compact.format(v)}
                  domain={['auto', 'auto']}
                />
                <Tooltip
                  formatter={(v) => [people(Number(v)), 'Habitantes']}
                  labelFormatter={(label) => `Año ${label}`}
                />
                <ReferenceLine x={year} stroke="#0B1728" strokeDasharray="4 4" label={{ value: 'Hoy', fontSize: 11, position: 'top' }} />
                <Area type="monotone" dataKey="total" stroke={primary} strokeWidth={2} fill="url(#population-fill)" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Municipios del departamento por población</CardTitle>
          <CardDescription>Año {year}.</CardDescription>
        </CardHeader>
        <CardContent className="max-h-[420px] overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Municipio</TableHead>
                <TableHead className="text-right">Población</TableHead>
                <TableHead className="text-right">% rural</TableHead>
                <TableHead className="text-right">Densidad</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ranking.map((unit, i) => (
                <TableRow
                  key={unit.code}
                  className={unit.code === profile.map.highlightCode ? 'bg-primary/10 font-semibold' : undefined}
                >
                  <TableCell className="tabular-nums text-slate-500">{i + 1}</TableCell>
                  <TableCell>{unit.name}</TableCell>
                  <TableCell className="text-right tabular-nums">{people(unit.population)}</TableCell>
                  <TableCell className="text-right tabular-nums">{percent(unit.ruralShare)}</TableCell>
                  <TableCell className="text-right tabular-nums">{density(unit.density)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <p className="text-xs text-slate-500">
        Fuentes:{' '}
        {profile.sources.map((source, i) => (
          <span key={source.code}>
            {i > 0 && ' · '}
            <a href={source.url} target="_blank" rel="noreferrer" className="underline hover:text-primary">
              {source.publisher}, {source.name}
            </a>
          </span>
        ))}
        .
      </p>
    </>
  );
}

function Metric({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <Card>
      <CardContent className="space-y-1 p-5">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        <p className="text-2xl font-black tabular-nums text-foreground">{value}</p>
        {note && <p className="text-xs text-slate-500">{note}</p>}
      </CardContent>
    </Card>
  );
}
