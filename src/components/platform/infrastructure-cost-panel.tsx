'use client';

import { useCallback, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlatformAccess, usePlatformCapability } from './access-context';
import { QuerySection } from './query-section';
import { extractErrorMessage } from '@/lib/api/platform';
import { infrastructureCosts, infrastructureDetail, infrastructureResources, saveInfrastructureCost, type InfrastructureCost, type InfrastructureDetail, type InfrastructureInput, type InfrastructureResource, type InfrastructureStatus } from '@/lib/api/infrastructure-costs';

const field = 'mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm';
const cell = 'px-3 py-3 text-left align-top';
const labels: Record<InfrastructureStatus, string> = { DECLARED: 'Declarado', ESTIMATED: 'Estimado', CONFIRMED: 'Confirmado con evidencia', VOID: 'Anulado' };
const initial: InfrastructureInput = { resourceId: 'INFRA-01', periodStart: '', periodEnd: '', amount: '', currency: 'USD', status: 'DECLARED', notes: '', reason: '' };

function CostForm({ resources, current, saved, close }: { resources: InfrastructureResource[]; current?: InfrastructureDetail; saved: () => void; close: () => void }) {
  const [draft, setDraft] = useState<InfrastructureInput>(() => current ? {
    resourceId: current.resourceId, periodStart: current.periodStart.slice(0, 10), periodEnd: current.periodEnd.slice(0, 10), amount: current.amount, currency: current.currency, status: current.status,
    invoiceReference: current.invoiceReference ?? '', evidenceReference: current.evidenceReference ?? '', paidAmount: current.paidAmount ?? '', paidCurrency: current.paidCurrency ?? '', paymentReference: current.paymentReference ?? '', notes: current.notes, reason: '',
  } : { ...initial });
  const [error, setError] = useState(''), [busy, setBusy] = useState(false);
  const update = (name: keyof InfrastructureInput, value: string) => setDraft((old) => ({ ...old, [name]: value }));
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await saveInfrastructureCost({ ...draft, paidAmount: draft.paidAmount || undefined, paidCurrency: draft.paidCurrency || undefined }, current);
      saved();
    } catch (e) { setError(extractErrorMessage(e) || 'No se pudo guardar el costo.'); }
    finally { setBusy(false); }
  }
  return <form aria-label="Registro de costo de infraestructura" className="space-y-4 rounded-lg border p-4" onSubmit={submit}>
    <h3 className="font-semibold">{current ? `Corregir costo · versión ${current.version}` : 'Registrar costo por período'}</h3>
    <p className="text-xs text-muted-foreground">Registra el total del recurso para el período indicado. Fin exclusivo: para octubre, inicio 01/10 y fin 01/11. Confirmar acredita la evidencia revisada; el pago se registra por separado.</p>
    <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <label className="text-sm">Recurso<select className={field} disabled={Boolean(current)} value={draft.resourceId} onChange={(e) => update('resourceId', e.target.value)}>{resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      {(['periodStart', 'periodEnd'] as const).map((name) => <label className="text-sm" key={name}>{name === 'periodStart' ? 'Inicio del período' : 'Fin del período (exclusivo)'}<input required type="date" className={field} value={draft[name]} onChange={(e) => update(name, e.target.value)} /></label>)}
      <label className="text-sm">Importe del costo<input required className={field} inputMode="decimal" pattern="(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?" value={draft.amount} onChange={(e) => update('amount', e.target.value)} placeholder="Ej. 20.00" /></label>
      <label className="text-sm">Moneda del costo<select className={field} value={draft.currency} onChange={(e) => update('currency', e.target.value)}><option>USD</option><option>COP</option></select></label>
      <label className="text-sm">Estado<select className={field} value={draft.status} onChange={(e) => update('status', e.target.value)}>{Object.entries(labels).filter(([status]) => current || status !== 'VOID').map(([status, label]) => <option key={status} value={status}>{label}</option>)}</select></label>
      <label className="text-sm">Referencia de factura<input className={field} maxLength={160} required={draft.status === 'CONFIRMED'} value={draft.invoiceReference ?? ''} onChange={(e) => update('invoiceReference', e.target.value)} /></label>
      <label className="text-sm sm:col-span-2">Referencia de evidencia revisada<input className={field} maxLength={500} required={draft.status === 'CONFIRMED'} value={draft.evidenceReference ?? ''} onChange={(e) => update('evidenceReference', e.target.value)} placeholder="Referencia del documento o expediente interno" /></label>
      <label className="text-sm">Total pagado (opcional)<input className={field} inputMode="decimal" pattern="(0|[1-9][0-9]{0,13})(\.[0-9]{1,6})?" value={draft.paidAmount ?? ''} onChange={(e) => update('paidAmount', e.target.value)} /></label>
      <label className="text-sm">Moneda del pago<select className={field} value={draft.paidCurrency ?? ''} onChange={(e) => update('paidCurrency', e.target.value)}><option value="">Sin pago registrado</option><option>USD</option><option>COP</option></select></label>
      <label className="text-sm">Comprobante del pago<input className={field} maxLength={160} value={draft.paymentReference ?? ''} onChange={(e) => update('paymentReference', e.target.value)} /></label>
      <label className="text-sm sm:col-span-2">Notas<textarea className={field} maxLength={2000} value={draft.notes} onChange={(e) => update('notes', e.target.value)} /></label>
      <label className="text-sm">Motivo del registro o corrección<textarea required minLength={5} maxLength={500} className={field} value={draft.reason} onChange={(e) => update('reason', e.target.value)} /></label>
    </fieldset>
    <p className="text-xs text-muted-foreground">No se convierten monedas. Para anular un registro con pago, retira sus tres datos de pago; el historial conserva la información anterior. Anular no devuelve dinero.</p>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    <div className="flex gap-2"><Button disabled={busy} type="submit">{busy ? 'Guardando…' : 'Guardar costo'}</Button><Button disabled={busy} type="button" variant="outline" onClick={close}>Cancelar</Button></div>
  </form>;
}

function CostDetail({ id, resources, canWrite, saved, close }: { id: string; resources: InfrastructureResource[]; canWrite: boolean; saved: () => void; close: () => void }) {
  const [revision, setRevision] = useState(0);
  const load = useCallback(() => infrastructureDetail(id), [id]);
  return <QuerySection key={revision} title="Detalle e historial del costo" load={load}>{(data) => <div className="space-y-4">
    <Button type="button" variant="outline" onClick={() => setRevision((n) => n + 1)}>Recargar detalle</Button>
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div><dt className="font-medium">Factura</dt><dd>{data.invoiceReference ?? 'Pendiente'}</dd></div>
      <div><dt className="font-medium">Evidencia</dt><dd className="break-all">{data.evidenceReference ?? 'Pendiente'}</dd></div>
      <div><dt className="font-medium">Pago / comprobante</dt><dd>{data.paidAmount ?? 'Pendiente'} {data.paidCurrency} · {data.paymentReference ?? 'Sin comprobante'}</dd></div>
      <div><dt className="font-medium">Notas</dt><dd className="whitespace-pre-wrap">{data.notes || 'Sin notas'}</dd></div>
    </dl>
    <ol className="space-y-3">{data.changes.map((change) => <li className="rounded border p-3 text-sm" key={change.id}><p>{new Date(change.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · {change.operatorEmail}</p><p className="whitespace-pre-wrap">{change.reason}</p><details><summary className="cursor-pointer">Ver valores antes y después</summary><pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify({ antes: change.before, despues: change.after }, null, 2)}</pre></details></li>)}</ol>
    {canWrite ? <CostForm key={`${data.id}:${data.version}`} resources={resources} current={data} saved={saved} close={close} /> : <Button variant="outline" onClick={close}>Cerrar detalle</Button>}
  </div>}</QuerySection>;
}

function AuthorizedPanel({ canWrite }: { canWrite: boolean }) {
  const [filters, setFilters] = useState({ resourceId: '', status: '', from: '', to: '' });
  const [applied, setApplied] = useState(filters), [page, setPage] = useState(1), [revision, setRevision] = useState(0);
  const [editor, setEditor] = useState<string | null>(null);
  const load = useCallback(() => { const params = new URLSearchParams({ page: String(page), pageSize: '25' }); for (const [key, value] of Object.entries(applied)) if (value) params.set(key, value); return infrastructureCosts(params); }, [applied, page]);
  const saved = () => { setEditor(null); setRevision((n) => n + 1); };
  return <QuerySection title="Infraestructura: recursos y referencias comerciales" load={infrastructureResources}>{(resources) => <div className="space-y-5">
    <div className="grid gap-3 md:grid-cols-3">{resources.map((resource) => <div className="rounded border p-4 text-sm" key={resource.id}><h3 className="font-semibold">{resource.name}</h3><p>{resource.supplier ?? 'Proveedor pendiente'} · {resource.technicalReference}</p><p className="mt-2">Titular: {resource.billingOwner ?? 'Pendiente'}</p><p>Referencia declarada: {resource.declaredPlanAmount ?? 'Pendiente'} {resource.declaredPlanCurrency}</p><p>Moneda de pago declarada: {resource.declaredPaymentCurrency ?? 'Pendiente'}</p><p className="mt-2 text-xs text-muted-foreground">{resource.declarationSource ?? 'Sin declaración comercial. Proveedor y factura pendientes.'}</p></div>)}</div>
    <p className="text-sm text-muted-foreground">Referencias sin periodicidad confirmada. Los componentes alojados comparten el costo del Droplet. El registro de facturas es manual y parcial; las referencias de planes quedan fuera de sus totales.</p>
    <form aria-label="Filtros de costos de infraestructura" className="flex flex-wrap items-end gap-3" onSubmit={(e) => { e.preventDefault(); setApplied({ ...filters }); setPage(1); setRevision((n) => n + 1); }}>
      <label className="text-sm">Recurso<select className={field} value={filters.resourceId} onChange={(e) => setFilters({ ...filters, resourceId: e.target.value })}><option value="">Todos</option>{resources.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
      <label className="text-sm">Estado<select className={field} value={filters.status} onChange={(e) => setFilters({ ...filters, status: e.target.value })}><option value="">Todos</option>{Object.entries(labels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
      <label className="text-sm">Desde<input className={field} type="date" required={Boolean(filters.to)} value={filters.from} onChange={(e) => setFilters({ ...filters, from: e.target.value })} /></label>
      <label className="text-sm">Hasta (exclusivo)<input className={field} type="date" required={Boolean(filters.from)} value={filters.to} onChange={(e) => setFilters({ ...filters, to: e.target.value })} /></label>
      <Button type="submit">Consultar costos</Button>{canWrite && <Button type="button" variant="outline" onClick={() => setEditor('new')}>Registrar costo</Button>}
    </form>
    {editor === 'new' && canWrite && <CostForm resources={resources} saved={saved} close={() => setEditor(null)} />}
    {editor && editor !== 'new' && <CostDetail key={editor} id={editor} resources={resources} canWrite={canWrite} saved={saved} close={() => setEditor(null)} />}
    <QuerySection key={revision} title="Costos por recurso y período" load={load}>{(data) => <div className="space-y-4">
      <p className="text-xs text-muted-foreground">Totales de todos los resultados filtrados. Se incluyen períodos que se cruzan con el filtro, por su importe completo, sin prorratear. Declarados, estimados, confirmados y pagos se presentan por separado; anulados excluidos de totales.</p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{data.totals.map((total) => <p className="rounded border p-3 text-sm" key={`${total.currency}:${total.status}`}>{labels[total.status]} · {total.currency}<strong className="block text-xl tabular-nums">{total.amount ?? 'Pendiente'}</strong>{total.records} registros</p>)}</div>
      <p className="text-sm">Pagos documentados: {data.payments.length ? data.payments.map((p) => `${p.amount} ${p.currency} (${p.records} registros)`).join(' · ') : 'Sin pagos registrados'}</p>
      <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr>{['Recurso', 'Período (fin exclusivo)', 'Costo / estado', 'Pago documentado', 'Acciones'].map((label) => <th className={cell} key={label}>{label}</th>)}</tr></thead><tbody>{data.items.map((cost: InfrastructureCost) => <tr className="border-t" key={cost.id}><td className={cell}>{cost.resource.name}</td><td className={`${cell} whitespace-nowrap`}>{cost.periodStart.slice(0, 10)} → {cost.periodEnd.slice(0, 10)}</td><td className={cell}>{cost.amount} {cost.currency}<p>{labels[cost.status]}</p></td><td className={cell}>{cost.paidAmount === null ? 'Pendiente' : `${cost.paidAmount} ${cost.paidCurrency}`}</td><td className={cell}><Button type="button" variant="outline" onClick={() => setEditor(cost.id)}>{canWrite ? 'Detalle y corregir' : 'Ver detalle'}</Button></td></tr>)}</tbody></table></div>
      {!data.total && <p className="text-sm">Sin costos registrados para estos filtros. No equivale a gasto cero.</p>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className="text-sm">Página {data.page} · {data.total} registros</p><div className="flex gap-2"><Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Anterior</Button><Button variant="outline" disabled={page * data.pageSize >= data.total} onClick={() => setPage(page + 1)}>Siguiente</Button></div></div>
    </div>}</QuerySection>
  </div>}</QuerySection>;
}

export function InfrastructureCostPanel() {
  const access = usePlatformAccess();
  const canWrite = usePlatformCapability('PROVIDER_COSTS_MANAGE');
  if (!access?.capabilities.includes('PROVIDER_COSTS_READ') || !access.allOrganizations) return <section className="rounded-xl border p-5"><h2 className="font-semibold">Costos de infraestructura</h2><p className="text-sm text-muted-foreground">Consulta disponible para personal autorizado a costos de proveedores con ámbito global.</p></section>;
  return <AuthorizedPanel key={JSON.stringify(access)} canWrite={canWrite} />;
}
