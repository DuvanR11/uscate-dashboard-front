'use client';

import { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { RefreshCw, BarChart3, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { MunicipalExports } from './municipal-exports';
import type { TerritorialContext } from '@/lib/api/territorial-data';
import { getOrganizationMunicipalResults, getOrganizationTerritorialContext, validateMunicipalResults, votePercentage, filterMunicipalGroups, type MunicipalResults } from '@/lib/api/territorial-results';

type View = { kind: 'loading' } | { kind: 'unavailable'; message: string } |
  { kind: 'error'; message: string } | { kind: 'ready'; result: MunicipalResults; context: TerritorialContext };
const number = new Intl.NumberFormat('es-CO');
const percent = (votes: number, denominator: number) => {
  const value = votePercentage(votes, denominator);
  return value === null ? 'Sin denominador' : `${value.toLocaleString('es-CO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
};
const date = (value: string) => Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : 'Fecha no acreditada';
const unavailable: Record<string, string> = {
  PUBLICATION_PENDING: 'Tu acceso territorial está vigente, pero aún no hay una versión publicada compatible con el territorio.',
  GEOGRAPHY_UNVERIFIED: 'La correspondencia geográfica requiere revisión antes de consultar resultados.',
  TERRITORY_OUTSIDE_PILOT: 'El territorio contratado no está cubierto por el piloto municipal de Neiva.',
  CONTRACT_UNVERIFIED: 'El acceso territorial aún no está acreditado. Solicita a soporte que revise tu contrato o la activación de la demo.',
  CONTRACT_MODULE_UNVERIFIED: 'El contrato no acredita el módulo de consulta territorial. Solicita su revisión a soporte.',
  CONFIRMED_PAYMENT_UNVERIFIED: 'El pago que respalda el acceso territorial requiere verificación.',
  CURRENT_PERIOD_UNCOVERED: 'No se ha acreditado cobertura para el período actual de la suscripción.',
  SUBSCRIPTION_BLOCKED: 'La suscripción no permite consultar resultados en este momento.',
  DEMO_EXPIRED: 'La demo territorial y su período de lectura han finalizado.',
  DEMO_CONDITIONS_CHANGED: 'Las condiciones de la demo territorial cambiaron y requieren revisión.',
  DEMO_AUTHORIZATION_INACTIVE: 'La autorización de la demo territorial no está vigente.',
};
const limits: Record<string, string> = {
  MUNICIPAL_AGGREGATES_ONLY: 'Solo agregados municipales. No hay desglose por puesto, zona o mesa.',
  GROUP_NAMES_NOT_VALIDATED: 'Las agrupaciones se identifican por código. Sus nombres oficiales aún no están validados.',
  USER_PROVIDED_ACTAS_NO_CRYPTOGRAPHIC_VERIFICATION: 'Las actas fueron aportadas por el usuario; no se verificó su firma criptográfica.',
  MMV_ORIGINAL_TYPE_AND_CUTOFF_UNVERIFIED: 'El tipo y el corte originales del MMV no están acreditados.',
  NO_TABLE_OR_CANDIDATE_RECONCILIATION: 'El contraste municipal no certifica cada mesa ni los resultados por candidato.',
  MISSING_SPECIAL_ROWS_NOT_IMPUTED: 'Las filas de categorías especiales ausentes no se completaron con ceros.',
  NO_ELECTORAL_ROLL_OR_AGE_DENOMINATORS: 'No hay censo electoral ni denominadores para participación o edades de votantes.',
  E24_SOME_LABELS_TRUNCATED: 'Cuatro rótulos del E-24 aparecen truncados; los nombres completos se contrastaron con el E-26 y el MMV.',
  ELECTION_AND_TERRITORY_SCOPED_NOT_NATIONAL_LEGAL_NAMES: 'Las denominaciones corresponden a listas de esta elección municipal; no acreditan una razón social nacional ni equivalencias en otras elecciones.',
};
function OfficialLink({ url, children }: { url: string; children: React.ReactNode }) {
  let allowed = false;
  try {
    const parsed = new URL(url);
    allowed = parsed.protocol === 'https:' && !parsed.username && !parsed.password && (parsed.hostname === 'registraduria.gov.co' || parsed.hostname.endsWith('.registraduria.gov.co'));
  } catch { /* A malformed source must never become a navigable link. */ }
  if (allowed) return <a className="underline underline-offset-4" href={url} target="_blank" rel="noopener noreferrer">{children}</a>;
  return <span>{children} (enlace no disponible)</span>;
}

export function MunicipalExplorer() {
  const [view, setView] = useState<View>({ kind: 'loading' });
  const [query, setQuery] = useState('');
  const [order, setOrder] = useState('votes');
  const [refresh, setRefresh] = useState(0);
  const currentRequest = useRef<AbortController | null>(null);
  useEffect(() => {
    let active = true;
    async function load() {
      currentRequest.current?.abort();
      const controller = new AbortController(); currentRequest.current = controller;
      setView({ kind: 'loading' });
      try {
        const context = await getOrganizationTerritorialContext(controller.signal);
        if (!active || controller.signal.aborted) return;
        if (!context.eligibleTerritory || !context.resultsAvailable) {
          setView({ kind: 'unavailable', message: unavailable[context.reason] ?? 'El acceso territorial no está disponible. Solicita una revisión a soporte.' });
          return;
        }
        const result = await getOrganizationMunicipalResults(controller.signal);
        if (!active || controller.signal.aborted) return;
        validateMunicipalResults(result, context);
        setView({ kind: 'ready', result, context });
      } catch (error) {
        if (!active || controller.signal.aborted) return;
        const status = axios.isAxiosError(error) ? error.response?.status : undefined;
        if (status === 403 || status === 404) setView({ kind: 'unavailable', message: status === 403
          ? 'El acceso territorial cambió o no está autorizado. Solicita una revisión a soporte.'
          : 'La versión publicada dejó de estar disponible. Actualiza la consulta o contacta a soporte.' });
        else setView({ kind: 'error', message: 'No pudimos comprobar la versión vigente. Actualiza la consulta para volver a intentarlo.' });
      }
    }
    void load();
    const onFocus = () => { if (document.visibilityState === 'visible') void load(); };
    const interval = window.setInterval(onFocus, 60_000);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    return () => { active = false; currentRequest.current?.abort(); window.clearInterval(interval); window.removeEventListener('focus', onFocus); document.removeEventListener('visibilitychange', onFocus); };
  }, [refresh]);

  const header = <header className="flex flex-wrap items-start justify-between gap-3">
    <div><h1 className="flex items-center gap-2 text-2xl font-semibold"><BarChart3 className="h-6 w-6 shrink-0" aria-hidden="true" />Resultados electorales</h1><p className="mt-1 text-sm text-muted-foreground">Explorador municipal de resultados públicos agregados.</p></div>
    <Button variant="outline" disabled={view.kind === 'loading'} onClick={() => setRefresh(n => n + 1)}><RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />Actualizar consulta</Button>
  </header>;
  if (view.kind !== 'ready') return <div className="space-y-5">{header}<Card><CardContent className="py-8"><p role={view.kind === 'error' ? 'alert' : 'status'}>{view.kind === 'loading' ? 'Comprobando acceso y versión publicada…' : view.message}</p></CardContent></Card></div>;

  const { result, context } = view, { data: d, version } = result;
  const denominator = d.groupPercentageDenominator.votes;
  const named = d.methodologyVersion === 'NEIVA_E26_MUNICIPAL_NAMES_V2';
  const groups = filterMunicipalGroups(d.groups, query).sort((a, b) => order === 'votes' ? b.votes - a.votes || a.documentCode.localeCompare(b.documentCode) : order === 'name' ? (a.name ?? a.documentCode).localeCompare(b.name ?? b.documentCode, 'es') : a.documentCode.localeCompare(b.documentCode));
  const metrics = [ ['Agrupaciones', d.totals.GROUP], ['Votos en blanco', d.totals.BLANK], ['Votos válidos (incluye blanco)', d.totals.VALID], ['Votos nulos', d.totals.NULL], ['No marcados', d.totals.UNMARKED], ['Total de categorías', d.categoryTotal] ] as const;
  return <div className="min-w-0 space-y-6">{header}
    <section aria-label="Versión y territorio" className="space-y-2 rounded-lg border bg-muted/30 p-4">
      <h2 className="flex items-center gap-2 text-xl font-semibold"><MapPin className="h-5 w-5 shrink-0" aria-hidden="true" />{d.municipality}, {d.department} · Concejo 2023</h2>
      <p className="text-sm">Elección: {d.electionDate} · DIVIPOLA: {d.territoryCode} · Versión {version.number}, publicada el {date(version.publishedAt)} (Colombia).</p>
      <p className="text-sm">{context.accessMode === 'DEMO' ? 'Acceso por demo territorial.' : 'Acceso por suscripción territorial.'}{context.subscriptionAccess === 'READ_ONLY' ? ' Período de solo lectura.' : ''}</p>
      {context.trial && <p className="text-sm">Uso hasta {date(context.trial.trialEndsAt)}; lectura hasta {date(context.trial.readOnlyEndsAt)} (Colombia).</p>}
    </section>
    <MunicipalExports key={`${version.id}-${version.contentHash}`} version={version} onInvalidation={() => setRefresh(n => n + 1)} />
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{metrics.map(([label, value]) => <Card key={label}><CardContent className="p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="mt-1 text-2xl font-semibold tabular-nums">{number.format(value)}</p></CardContent></Card>)}</div>
    <p className="text-sm text-muted-foreground">Cobertura contrastada: {number.format(d.coverage.observedTables)} de {number.format(d.coverage.expectedTables)} mesas. El total de categorías no representa personas únicas ni el censo electoral.</p>
    <Card><CardHeader><CardTitle>Votos por agrupación</CardTitle><p className="text-sm text-muted-foreground">Porcentajes = votos de la agrupación ÷ {number.format(denominator)} votos válidos, incluido blanco × 100. Redondeo a dos decimales; las agrupaciones no suman 100 % porque el denominador incluye blanco.</p></CardHeader><CardContent className="space-y-5">
      <div className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1 text-sm">Buscar agrupación<Input value={query} onChange={e => setQuery(e.target.value)} placeholder={named ? 'Nombre o código' : 'Código acta o MMV'} className="mt-1" /></label><label className="text-sm">Ordenar<select value={order} onChange={e => setOrder(e.target.value)} className="mt-1 block rounded-md border bg-background p-2"><option value="votes">Más votos primero</option><option value="code">Código de acta</option>{named && <option value="name">Nombre de agrupación</option>}</select></label></div>
      <p className="text-sm">{groups.length} de {d.groups.length} agrupaciones. El filtro conserva el denominador municipal. {named ? 'Nombres del MMV contrastados con E-26 y E-24 para esta elección.' : 'Esta versión conserva solo los códigos; no incorpora un catálogo revisado de nombres.'}</p>
      {groups.length ? <>
        <div className="space-y-3" role="img" aria-label="Porcentaje por agrupación sobre votos válidos, escala de cero a cien por ciento. Valores exactos disponibles en la tabla.">{groups.map(g => <div key={g.mmvCode}><div className="mb-1 flex justify-between gap-2 text-sm"><span className="min-w-0 break-words">{g.name ?? `Código ${g.documentCode}`}{named && <span className="block text-xs text-muted-foreground">Acta {g.documentCode} · MMV {g.mmvCode}</span>}</span><span className="shrink-0 tabular-nums">{number.format(g.votes)} · {percent(g.votes, denominator)}</span></div><div className="h-2 rounded-full bg-muted"><div className="h-2 rounded-full bg-primary" style={{ width: `${votePercentage(g.votes, denominator) ?? 0}%` }} /></div></div>)}</div>
        <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Votos y porcentajes municipales por agrupación y códigos de la fuente</caption><thead><tr className="border-b">{named && <th scope="col" className="min-w-48 py-2 pr-3 text-left">Agrupación</th>}<th scope="col" className="py-2 text-left">Código acta</th><th scope="col" className="text-left">Código MMV</th><th scope="col" className="text-right">Votos</th><th scope="col" className="text-right">% de válidos</th></tr></thead><tbody>{groups.map(g => <tr key={g.mmvCode} className="border-b">{named && <th scope="row" className="py-2 pr-3 text-left font-normal">{g.name}</th>}<td className="py-2">{g.documentCode}</td><td>{g.mmvCode}</td><td className="text-right tabular-nums">{number.format(g.votes)}</td><td className="text-right tabular-nums">{percent(g.votes, denominator)}</td></tr>)}</tbody></table></div>
      </> : <p role="status">No hay agrupaciones con ese código.</p>}
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Fuentes y metodología</CardTitle></CardHeader><CardContent className="space-y-4 text-sm">
      <p>Base: resumen municipal del E-26 aportado, contrastado con E-24 y MMV. La coincidencia de los totales municipales no acredita cada fila por mesa ni resultados por candidato.</p>
      {named && d.groupNameCatalog && <p>Catálogo de denominaciones: {d.groupNameCatalog.version}, revisado el {d.groupNameCatalog.reviewedOn}. Nombres preservados del MMV, contrastados con el resumen E-26 (página {d.groupNameCatalog.e26SummaryPage}) y los encabezados E-24.</p>}
      <dl className="space-y-3 break-words"><div><dt className="font-medium">E-26 aportado</dt><dd>{d.sources.actas.e26Reference}</dd><dd>Finalización declarada del escrutinio: {date(d.sources.actas.statedScrutinyCompletion)} (Colombia).</dd></div><div><dt className="font-medium">E-24 aportado</dt><dd>{d.sources.actas.e24Reference}</dd><dd>Generación declarada: {date(d.sources.actas.e24GenerationTime)} (Colombia).</dd></div><div><dt className="font-medium">Procedencia de las actas</dt><dd>PDF aportados por el usuario después de consultar el portal oficial. Sin verificación criptográfica. <OfficialLink url={d.sources.actas.declaredPortal}>Portal de escrutinios de la Registraduría</OfficialLink>.</dd></div><div><dt className="font-medium">Archivo MMV</dt><dd><OfficialLink url={d.sources.mmv.url}>Archivo público del Observatorio de la Registraduría</OfficialLink>.</dd><dd>Tipo original: no acreditado. Corte original: {d.sources.mmv.cutoff ? date(d.sources.mmv.cutoff) : 'desconocido'}. La fecha del acta no reemplaza el corte del MMV.</dd></div></dl>
      <h3 className="font-semibold">Alcance y limitaciones</h3><ul className="list-disc space-y-2 pl-5">{d.limits.map(limit => <li key={limit}>{limits[limit] ?? `Limitación adicional de la fuente: ${limit}`}</li>)}</ul>
      <p>Participación electoral: sin datos. Edades de votantes: sin datos. Las edades del CRM o la población del territorio no sustituyen estos denominadores.</p>
      <p>Estos resultados describen votos agregados del municipio; no indican por quién votó una persona ni su orientación política.</p>
      <details><summary className="cursor-pointer">Identificación de la versión y metodología</summary><dl className="mt-3 space-y-2"><div><dt>Metodología</dt><dd className="break-all">{d.methodologyVersion}</dd></div><div><dt>Correspondencia geográfica</dt><dd>Revisión {d.geographyRevision}</dd></div><div><dt>Huella SHA-256 de la versión</dt><dd className="break-all font-mono text-xs">{version.contentHash}</dd></div></dl></details>
    </CardContent></Card>
  </div>;
}
