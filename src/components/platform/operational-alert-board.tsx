'use client';
import Link from 'next/link';
import { useCallback,useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePlatformAccess,usePlatformCapability } from './access-context';
import { QuerySection } from './query-section';
import { extractErrorMessage } from '@/lib/api/platform';
import { getOperationalAlerts,getOperationalAlert,getAlertAssignees,refreshOperationalAlerts,updateOperationalAlert,type AlertDetail,type OperationalAlert } from '@/lib/api/operational-alerts';
import { infrastructureResources } from '@/lib/api/infrastructure-costs';
const field='mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm';
const statuses:Record<string,string>={ OPEN:'Pendiente',ACKNOWLEDGED:'En revisión',RESOLVED:'Condición resuelta' };
const severities:Record<string,string>={ MEDIUM:'Media',HIGH:'Alta',CRITICAL:'Crítica' };

function Detail({ alert, canManage,saved }: { alert:AlertDetail;canManage:boolean;saved:()=>void }) {
  const [action,setAction]=useState('ACKNOWLEDGE'),[reason,setReason]=useState(''),[assigneeId,setAssignee]=useState(alert.assigneeId ?? '');
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const observation=alert.observation;
  const assigneesLoad=useCallback(()=>getAlertAssignees(alert.id),[alert.id]);
  async function submit(e:React.FormEvent) {
    e.preventDefault();setBusy(true);setError('');
    try { await updateOperationalAlert(alert.id,{ version:alert.version,action,reason,...(action==='ASSIGN'?{ assigneeId }: {}) });saved(); }
    catch(e) { setError(extractErrorMessage(e) || 'No se pudo guardar la alerta.'); } finally { setBusy(false); }
  }
  return <div className="space-y-4">
    <p className="font-medium">{alert.title}</p><p className="text-sm">{alert.nextAction}</p>
    <dl className="grid gap-2 text-sm sm:grid-cols-2">
      <div><dt>Organización</dt><dd>{alert.organizationName}</dd></div><div><dt>Estado</dt><dd>{statuses[alert.status]}</dd></div>
      <div><dt>Período de seguimiento</dt><dd className="break-all">{alert.periodKey.startsWith('LEGACY:')?'Contador histórico sin reinicio confirmado':alert.periodKey}</dd></div>
      <div><dt>Responsable interno</dt><dd className="break-all">{alert.assigneeId ?? 'Sin asignar'}</dd></div>
      {alert.kind==='QUOTA_THRESHOLD' && <><div><dt>Uso / capacidad / saldo</dt><dd>{String(observation.used)} / {String(observation.limit)} / {String(observation.remaining)}</dd></div><div><dt>Próximo reinicio</dt><dd>Consultar la vigencia y los saldos del contrato; no hay fecha única confirmada en esta alerta.</dd></div></>}
      {alert.kind==='BUDGET_THRESHOLD' && <><div><dt>Costo / presupuesto</dt><dd>{String(observation.amount)} / {String(observation.budget)} {String(observation.currency)}</dd></div><div><dt>Calidad / responsable de revisión</dt><dd>{observation.costStatus==='CONFIRMED'?'Confirmado con evidencia':'Estimado'} · {String(observation.reviewer)}</dd></div></>}
      {alert.kind==='OVERDUE_MANAGEMENT' && <div><dt>Vencimiento</dt><dd>{String(observation.dueAt)}</dd></div>}
    </dl>
    {canManage && alert.active && <form aria-label="Gestionar alerta" onSubmit={submit} className="space-y-3 rounded border p-4"><fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
      <label className="text-sm">Acción<select className={field} value={action} onChange={e=>setAction(e.target.value)}><option value="ACKNOWLEDGE">Marcar en revisión</option><option value="ASSIGN">Asignar responsable</option></select></label>
      {action==='ASSIGN' && <QuerySection title="Responsable autorizado" load={assigneesLoad}>{operators=><label className="text-sm">Operador<select className={field} required value={assigneeId} onChange={e=>setAssignee(e.target.value)}><option value="">Selecciona un responsable</option>{operators.map(operator=><option key={operator.id} value={operator.id}>{operator.fullName} · {operator.email}</option>)}</select>{!operators.length && <p>No hay operadores con acceso vigente a esta alerta.</p>}</label>}</QuerySection>}
      <label className="text-sm sm:col-span-2">Motivo<textarea className={field} required minLength={5} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)} /></label>
    </fieldset>{error && <p role="alert" className="text-destructive">{error}</p>}<Button disabled={busy} type="submit">{busy?'Guardando…':'Guardar seguimiento'}</Button></form>}
    <p className="text-xs text-muted-foreground">Marcar en revisión no resuelve la condición ni modifica cupos, acceso o pagos. Una nueva observación determina si la condición se resolvió.</p>
    <ol className="space-y-2">{alert.changes.map(change=><li key={change.id} className="rounded border p-3 text-sm"><p>{new Date(change.createdAt).toLocaleString('es-CO',{ timeZone:'America/Bogota' })} · {change.action}</p><p>{change.reason}</p>{Boolean(change.details) && <details><summary className="cursor-pointer">Cambios registrados</summary><pre className="overflow-auto whitespace-pre-wrap break-all text-xs">{JSON.stringify(change.details,null,2)}</pre></details>}</li>)}</ol>
  </div>;
}
function AuthorizedBoard({ canManage,canRefresh,financial,canManageCosts }: { canManage:boolean;canRefresh:boolean;financial:boolean;canManageCosts:boolean }) {
  const [status,setStatus]=useState('OPEN'),[page,setPage]=useState(1),[revision,setRevision]=useState(0),[detailId,setDetailId]=useState<string|null>(null);
  const [busy,setBusy]=useState(false),[error,setError]=useState('');
  const load=useCallback(()=>getOperationalAlerts(new URLSearchParams({ page:String(page),pageSize:'25',...(status?{ status }: {}) })),[page,status]);
  const detailLoad=useCallback(()=>getOperationalAlert(detailId ?? ''),[detailId]);
  const saved=()=>{ setRevision(n=>n+1);setDetailId(null); };
  async function refresh() { setBusy(true);setError('');try { await refreshOperationalAlerts();saved(); } catch(e) { setError(extractErrorMessage(e)||'No se pudo actualizar la observación.'); } finally { setBusy(false); } }
  return <div className="space-y-5">
    <aside className="rounded border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">Cobertura parcial: umbrales de SMS, correo y WhatsApp, gestiones vencidas y presupuestos aprobados con costos mensuales comparables. Cupos de IA, almacenamiento, acompañamiento y entrega de nuevos avisos por correo permanecen pendientes.</aside>
    {financial && <QuerySection title="Presupuestos de infraestructura aprobados" load={infrastructureResources}>{resources=><div className="space-y-2 text-sm">{resources.filter(r=>r.approvedMonthlyBudget).map(r=><p key={r.id}>{r.name}: {r.approvedMonthlyBudget} {r.budgetCurrency}/mes · revisión: {r.budgetReviewer}</p>)}<p>Solo se comparan registros estimados o confirmados del mes calendario completo, con moneda coincidente. Falta de alertas no acredita gasto cero ni presupuesto disponible.</p><Link className="underline" href="/platform/consumption">Consultar costos y evidencia</Link></div>}</QuerySection>}
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Estado<select className={field} value={status} onChange={e=>{ setStatus(e.target.value);setPage(1); }}><option value="">Todos</option>{Object.entries(statuses).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><Button variant="outline" onClick={()=>setRevision(n=>n+1)}>Recargar listado</Button>{canRefresh && <Button disabled={busy} onClick={refresh}>{busy?'Observando…':'Actualizar condiciones'}</Button>}</div>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {detailId && <QuerySection key={`${detailId}:${revision}`} title="Detalle y seguimiento" load={detailLoad}>{alert=><Detail key={`${alert.id}:${alert.version}`} alert={alert} canManage={canManage && (alert.kind!=='BUDGET_THRESHOLD'||canManageCosts)} saved={saved} />}</QuerySection>}
    <QuerySection key={revision} title="Centro de alertas" load={load}>{report=><div className="space-y-4">
      <p className="text-xs text-muted-foreground">Observación automática {report.automaticCollection?'habilitada cada cinco minutos':'desactivada; un operador global autorizado puede actualizar condiciones'}. Las alertas se agrupan por recurso, umbral y período.</p>
      <div className="grid gap-3 lg:grid-cols-2">{report.items.map((alert:OperationalAlert)=><article key={alert.id} className="space-y-2 rounded border p-4"><p className="text-xs font-semibold">{severities[alert.severity]} · {statuses[alert.status]}</p><h3 className="font-semibold">{alert.title}</h3><p className="text-sm">{alert.organizationName}</p><p className="text-sm text-muted-foreground">{alert.nextAction}</p><p className="text-xs">Observada: {new Date(alert.observedAt).toLocaleString('es-CO',{ timeZone:'America/Bogota' })}</p><Button variant="outline" onClick={()=>setDetailId(alert.id)}>Ver seguimiento</Button></article>)}</div>
      {!report.total && <p>Sin alertas registradas para este estado. Revisa la cobertura y la última observación antes de concluir que no hay incidencias.</p>}
      <div className="flex flex-wrap justify-between gap-3"><p className="text-sm">Página {report.page} · {report.total} alertas</p><div className="flex gap-2"><Button variant="outline" disabled={page<=1} onClick={()=>setPage(page-1)}>Anterior</Button><Button variant="outline" disabled={page*report.pageSize>=report.total} onClick={()=>setPage(page+1)}>Siguiente</Button></div></div>
    </div>}</QuerySection>
  </div>;
}
export function OperationalAlertBoard() {
  const access=usePlatformAccess(),canManage=usePlatformCapability('ALERTS_MANAGE'),canManageCosts=usePlatformCapability('PROVIDER_COSTS_MANAGE');
  return <div className="space-y-5"><div><h1 className="text-2xl font-bold">Alertas y seguimiento</h1><p className="text-sm text-muted-foreground">Condiciones que requieren revisión, con responsable e historial.</p></div>{access?.capabilities.includes('ALERTS_READ')?<AuthorizedBoard key={JSON.stringify(access)} canManage={canManage} canRefresh={canManage && access.allOrganizations} financial={access.allOrganizations && access.capabilities.includes('PROVIDER_COSTS_READ')} canManageCosts={canManageCosts} />:<p role="alert">No tienes permiso interno para consultar alertas operativas.</p>}</div>;
}
