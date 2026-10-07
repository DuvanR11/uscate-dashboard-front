'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { getProviderUsage, type UsageAttempt, type UsageReport } from '@/lib/api/provider-usage';
import { usageDecimal, usageInterval, usageLabel } from '@/lib/provider-usage';
import { searchPlatformOrganizations } from '@/lib/api/platform';
import { usePlatformAccess } from './access-context';
import { QuerySection } from './query-section';

const field = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm';
const cell = 'px-3 py-3 text-left align-top';
const scopes = ['ORGANIZATION', 'SHARED', 'PLATFORM', 'UNATTRIBUTED'];
const results = ['PENDING', 'ACCEPTED', 'REJECTED', 'UNKNOWN', 'SIMULATED'];
type Filters = { first: string; last: string; organizationId: string; provider: string; service: string; module: string; scope: string; result: string };
function initialFilters(): Filters {
  const last = new Date().toISOString().slice(0, 10);
  const first = new Date(Date.parse(`${last}T00:00:00Z`) - 29 * 86_400_000).toISOString().slice(0, 10);
  return { first, last, organizationId: '', provider: '', service: '', module: '', scope: '', result: '' };
}

function OrganizationSearch({ onSelect }: { onSelect: (id: string) => void }) {
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState<string | null>(null);
  const load = useCallback(() => searchPlatformOrganizations(new URLSearchParams({ q: query ?? '', page: '1', pageSize: '20' })), [query]);
  return <details className="text-sm"><summary className="cursor-pointer">Buscar organización por nombre</summary>
    <div className="mt-3 flex gap-2"><label className="flex-1">Nombre de organización<input className={field} value={search} onChange={(e) => setSearch(e.target.value)} /></label><Button className="self-end" type="button" variant="outline" onClick={() => setQuery(search.trim())}>Buscar</Button></div>
    {query !== null && <QuerySection title="Organizaciones autorizadas" load={load}>{(data) => <div className="space-y-2">{data.items.map((org) => <Button type="button" variant="outline" key={org.id} onClick={() => onSelect(org.id)}>{org.name}</Button>)}<p className="text-xs text-muted-foreground">{data.items.length} de {data.total}. Afina el nombre si faltan resultados. Selecciona una organización y aplica los filtros.</p></div>}</QuerySection>}
  </details>;
}

function AttemptDetail({ item, costs }: { item: UsageAttempt; costs: boolean }) {
  return <details>
    <summary className="cursor-pointer font-medium">Ver detalle</summary>
    <dl className="mt-3 space-y-2 break-all text-xs">
      <div><dt className="font-semibold">Intento / operación</dt><dd>{item.id} / {item.operation.id}</dd></div>
      <div><dt className="font-semibold">Cuenta / modelo</dt><dd>{item.accountRef} / {item.model ?? 'Sin modelo'}</dd></div>
      <div><dt className="font-semibold">Referencia del proveedor</dt><dd>{item.externalId ?? 'Sin referencia'}</dd></div>
      <div><dt className="font-semibold">Fin (UTC)</dt><dd>{item.finishedAt ?? 'Pendiente'}</dd></div>
      {item.measurements.map((m, index) => <div key={index}><dt className="font-semibold">{usageLabel(m.unit)}</dt><dd>{usageDecimal(m.quantity)} · {usageLabel(m.quality)} · {m.source}</dd></div>)}
      {costs && item.valuations?.map((v, index) => <div key={index}><dt className="font-semibold">Importe · {usageLabel(v.status)}</dt><dd>{usageDecimal(v.amount)} · {v.currency ?? 'Moneda sin verificar'} · {v.source}</dd><dd>Importe reportado: {usageDecimal(v.reportedAmount)}. Conciliación: {usageLabel(v.reconciliationStatus)}.</dd></div>)}
    </dl>
  </details>;
}

function Report({ data, costs, onPage }: { data: UsageReport; costs: boolean; onPage: (page: number) => void }) {
  const pages = Math.max(1, Math.ceil(data.total / data.pageSize));
  return <div className="space-y-6">
    <div className="grid gap-3 sm:grid-cols-3">
      {[['Intentos registrados', data.total], ['Pendientes o inciertos', data.unresolved], ['Sin medición', data.missingMeasurements]].map(([label, value]) =>
        <div key={label} className="rounded-lg border p-4"><p className="text-sm text-muted-foreground">{label}</p><p className="text-3xl font-semibold tabular-nums">{value}</p></div>)}
    </div>
    <p className="text-xs text-muted-foreground">Resumen de todos los resultados filtrados, no solo de esta página. Aceptado no acredita entrega. Las simulaciones aparecen en el historial y se excluyen de cantidades y costos.</p>
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="space-y-2"><h3 className="font-semibold">Consumo por unidad y calidad</h3>
        <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={cell}>Unidad / evidencia</th><th className={cell}>Cantidad conocida</th><th className={cell}>Mediciones</th></tr></thead>
          <tbody>{data.units.map((u) => <tr key={`${u.unit}:${u.quality}`} className="border-t"><td className={cell}>{usageLabel(u.unit)}<p className="text-xs text-muted-foreground">{usageLabel(u.quality)}</p></td><td className={cell}>{usageDecimal(u.quantity)}</td><td className={cell}>{u.observed} conocidas · {u.pending} pendientes</td></tr>)}</tbody></table></div>
        {!data.units.length && <p className="text-sm text-muted-foreground">Sin mediciones para este filtro; no equivale a consumo cero.</p>}
        <p className="text-xs text-muted-foreground">Las unidades no se suman entre sí. La caché es parte de la entrada. Invocaciones y aceptaciones son dimensiones del mismo envío, no cargos adicionales ni unidades facturables.</p>
      </section>
      <section className="space-y-2"><h3 className="font-semibold">Costos por moneda y estado</h3>
        {costs ? <><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr><th className={cell}>Moneda / estado</th><th className={cell}>Importe conocido</th><th className={cell}>Registros</th></tr></thead>
          <tbody>{data.costs?.map((c) => <tr key={`${c.currency}:${c.status}`} className="border-t"><td className={cell}>{c.currency ?? 'Moneda sin verificar'}<p className="text-xs text-muted-foreground">{usageLabel(c.status)}</p></td><td className={cell}>{usageDecimal(c.amount)}</td><td className={cell}>{c.attempts}</td></tr>)}</tbody></table></div>
          {!data.costs?.length && <p className="text-sm text-muted-foreground">Sin importes para este filtro; no equivale a costo cero.</p>}
          <p className="text-xs text-muted-foreground">{data.missingValuations} intentos sin registro de valoración. Los pendientes pueden carecer de tarifa o moneda. No se convierten monedas ni se mezclan estimaciones con importes confirmados. Confirmado por proveedor no significa factura conciliada o pagada.</p></> : <p className="text-sm text-muted-foreground">La consulta financiera requiere el permiso interno de costos de proveedores.</p>}
      </section>
    </div>
    <section><h3 className="mb-2 font-semibold">Historial de intentos</h3>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Inicio (UTC)', 'Proveedor / servicio', 'Ámbito / organización', 'Operación / resultado', 'Detalle'].map((h) => <th key={h} className={cell}>{h}</th>)}</tr></thead>
        <tbody>{data.items.map((item) => <tr key={item.id} className="border-t"><td className={`${cell} whitespace-nowrap`}>{item.startedAt.replace('T', ' ').replace('Z', '')}</td><td className={cell}>{item.provider}<p className="text-xs text-muted-foreground">{item.service}</p></td><td className={`${cell} break-all`}>{usageLabel(item.operation.scope)}<p className="text-xs text-muted-foreground">{item.operation.organizationId ?? 'Sin organización'}</p></td><td className={cell}>{item.operation.module} · {item.operation.action}<p className={`mt-1 font-medium ${['UNKNOWN', 'PENDING'].includes(item.result) ? 'text-amber-700 dark:text-amber-400' : ''}`}>{usageLabel(item.result)}</p></td><td className={`${cell} min-w-48`}><AttemptDetail item={item} costs={costs} /></td></tr>)}</tbody></table></div>
      {!data.items.length && <p className="py-6 text-center text-muted-foreground">No hay intentos registrados para estos filtros.</p>}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Página {data.page} de {pages} · {data.total} intentos</p><div className="flex gap-2"><Button variant="outline" disabled={data.page <= 1} onClick={() => onPage(data.page - 1)}>Anterior</Button><Button variant="outline" disabled={data.page >= pages} onClick={() => onPage(data.page + 1)}>Siguiente</Button></div></div>
    </section>
  </div>;
}

export function ProviderUsageBoard() {
  const access = usePlatformAccess();
  const allowed = Boolean(access?.capabilities.includes('PROVIDER_USAGE_READ'));
  const costs = Boolean(access?.capabilities.includes('PROVIDER_COSTS_READ'));
  // Remount all local state when permissions or organization scope change.
  const accessKey = JSON.stringify(access);
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Consumos y costos</h1><p className="text-sm text-muted-foreground">Uso de proveedores y evidencia disponible para la operación comercial.</p></div>
    {allowed && access ? <AuthorizedBoard key={accessKey} costs={costs} allOrganizations={access.allOrganizations} organizationIds={access.organizationIds} organizationsRead={access.capabilities.includes('ORGANIZATIONS_READ')} /> : <p role="alert">No tienes permiso interno para consultar consumos de proveedores.</p>}
  </div>;
}

function AuthorizedBoard({ costs, allOrganizations, organizationIds, organizationsRead }: { costs: boolean; allOrganizations: boolean; organizationIds: string[]; organizationsRead: boolean }) {
  const [draft, setDraft] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState('');
  const load = useCallback(() => {
    const params = new URLSearchParams({ ...usageInterval(applied.first, applied.last), page: String(page), pageSize: '25' });
    for (const name of ['organizationId', 'provider', 'service', 'module', 'scope', 'result'] as const) {
      if (applied[name].trim()) params.set(name, applied[name].trim());
    }
    return getProviderUsage(params, costs);
  }, [applied, page, costs]);
  function apply(event: React.FormEvent) {
    event.preventDefault();
    try {
      usageInterval(draft.first, draft.last);
      if (draft.organizationId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(draft.organizationId.trim())) throw new Error('Introduce un UUID válido de organización.');
      setError(''); setApplied({ ...draft }); setPage(1); setRevision((n) => n + 1);
    } catch (e) { setError(e instanceof Error ? e.message : 'Revisa los filtros.'); }
  }
  const update = (name: keyof Filters, value: string) => setDraft((previous) => ({ ...previous, [name]: value }));
  return <>
    <aside className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-semibold">Cobertura parcial · registro desde el 7 de octubre de 2026</p><p>IA y SMS desde las 10:07 de Colombia; correo y WhatsApp desde las 16:17. No hay reconstrucción histórica. Almacenamiento e infraestructura aún no están medidos. Un importe pendiente no es cero.</p></aside>
    <form onSubmit={apply} className="rounded-xl border bg-card p-5 space-y-4" aria-label="Filtros de consumo">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(['first', 'last'] as const).map((name) => <label key={name} className="text-sm font-medium">{name === 'first' ? 'Desde' : 'Hasta'} (día UTC incluido)<input className={field} type="date" required value={draft[name]} onChange={(e) => update(name, e.target.value)} /></label>)}
        <label className="text-sm font-medium">Organización {allOrganizations ? <input className={field} placeholder="UUID o todas" value={draft.organizationId} onChange={(e) => update('organizationId', e.target.value)} /> : <select className={field} value={draft.organizationId} onChange={(e) => update('organizationId', e.target.value)}><option value="">Todas las asignadas</option>{organizationIds.map((id) => <option key={id} value={id}>{id}</option>)}</select>}</label>
        <label className="text-sm font-medium">Ámbito<select className={field} value={draft.scope} onChange={(e) => update('scope', e.target.value)}><option value="">{allOrganizations ? 'Todos' : 'Organizaciones asignadas'}</option>{(allOrganizations ? scopes : ['ORGANIZATION']).map((s) => <option key={s} value={s}>{usageLabel(s)}</option>)}</select></label>
        {(['provider', 'service', 'module'] as const).map((name) => <label key={name} className="text-sm font-medium">{({ provider: 'Proveedor', service: 'Servicio', module: 'Módulo' })[name]}<input className={field} maxLength={80} placeholder={({ provider: 'Ej. OPENAI, RESEND, META', service: 'Ej. AI_CHAT, EMAIL', module: 'Código del módulo' })[name]} value={draft[name]} onChange={(e) => update(name, e.target.value)} /></label>)}
        <label className="text-sm font-medium">Resultado<select className={field} value={draft.result} onChange={(e) => update('result', e.target.value)}><option value="">Todos</option>{results.map((r) => <option key={r} value={r}>{usageLabel(r)}</option>)}</select></label>
      </div>
      {organizationsRead && <OrganizationSearch onSelect={(id) => update('organizationId', id)} />}
      <div className="flex flex-wrap items-center gap-3"><Button type="submit">Aplicar filtros</Button><Button variant="outline" type="button" onClick={() => setRevision((n) => n + 1)}>Actualizar resultados</Button><p className="text-xs text-muted-foreground">Máximo 90 días. Proveedor, servicio y módulo usan su código exacto.</p></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
    </form>
    <QuerySection key={revision} title="Resultados del período aplicado" load={load}>{(data) => <><p className="text-xs text-muted-foreground">Intervalo UTC: {data.from} hasta {data.to} (fin exclusivo).</p><Report data={data} costs={costs} onPage={setPage} /></>}</QuerySection>
  </>;
}
