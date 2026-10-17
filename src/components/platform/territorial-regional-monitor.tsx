'use client';
import {useCallback,useState} from 'react';
import {isAxiosError} from 'axios';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {usePermission} from '@/hooks/use-permission';
import {QuerySection} from './query-section';
import {extractErrorMessage} from '@/lib/api/platform';
import {configureRegionalMonitor,getRegionalMonitor,type RegionalMonitorCommand,type RegionalMonitorConfiguration} from '@/lib/api/territorial-regional-monitor';
const date=(v:string|null)=>v?new Date(v).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin programar';
const labels:Record<string,string>={QUEUED:'En cola',RUNNING:'En ejecución',COMPLETED:'Completada',FAILED:'Fallida',CANCELLED:'Cancelada',UNCHANGED:'Archivo sin cambios',CONTENT_CHANGED:'Contenido modificado',INVALID_DOCUMENT:'Documento no válido',ACCESS_DENIED:'Acceso denegado',HTTP_UNAVAILABLE:'Fuente no disponible',REDIRECT_REVIEW_REQUIRED:'Redirección pendiente de revisión',NETWORK_UNAVAILABLE:'Consulta de red incompleta',INTERRUPTED:'Ejecución interrumpida',REVIEW_DUE_EXPIRED:'Venció la revisión del plan',PLAN_CHANGED:'Cambió el plan aprobado',SOURCE_CHANGED:'Cambió una fuente seleccionada',SOURCE_NOT_REVIEWED:'Revisión documental pendiente',PLAN_NOT_PREPARED:'Prepara primero la política de fuentes',TARGET_UNSUPPORTED:'El destino o formato necesita un adaptador revisado',RESPONSIBLE_UNAUTHORIZED:'El responsable perdió su autorización',RESPONSIBLE_CHANGED:'Cambió la identidad del responsable',CONTROL_CHANGED:'Cambió el control de ejecución',MONITOR_DISABLED:'Control desactivado',SCHEDULE_WINDOW_EXPIRED:'Horario de ejecución vencido',COLLECTION_FAILED:'No se completó la comprobación'};
const label=(code:string)=>labels[code]??code;
function Control({initial}:{initial:RegionalMonitorConfiguration}){
 const [data,setData]=useState(initial),[reason,setReason]=useState(''),[confirm,setConfirm]=useState(false),[busy,setBusy]=useState(false),[fresh,setFresh]=useState(true),[pending,setPending]=useState<RegionalMonitorCommand|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const canWrite=usePermission('PLATAFORMA','canWrite'),code=data.dataset.code;
 async function refresh(){setBusy(true);setFresh(false);setError('');try{setData(await getRegionalMonitor(code));setFresh(true);}catch(e){setError(extractErrorMessage(e)||'No pudimos actualizar el ejecutor.');}finally{setBusy(false);}}
 async function save(enabled:boolean){
  setBusy(true);setError('');setNotice('');let accepted=false;
  const command=pending??{requestKey:crypto.randomUUID(),expectedRevision:data.current.revision,planRevision:data.readiness.planRevision??data.current.planRevision,enabled,reason:reason.trim()};setPending(command);
  try{const result=await configureRegionalMonitor(code,command);if(result.data.datasetCode!==code||!Number.isSafeInteger(result.data.revision)||result.data.revision<1)throw Error('No pudimos vincular la confirmación al conjunto.');accepted=true;const next=await getRegionalMonitor(code);setData(next);setFresh(true);setPending(null);setReason('');setConfirm(false);setNotice('Control guardado. Revisa el estado y la próxima ejecución.');}
  catch(e){setFresh(false);if(!accepted&&isAxiosError(e)&&e.response&&e.response.status>=400&&e.response.status<500&&![408,429].includes(e.response.status))setPending(null);setError(accepted?'El control fue aceptado, pero falta consultar su estado. Reintenta la misma solicitud.':extractErrorMessage(e)||'No pudimos confirmar el control.');}
  finally{setBusy(false);}
 }
 const canActivate=fresh&&data.workerEnabled&&data.readiness.ready&&confirm&&reason.trim().length>=10&&!busy;
 return <section className="min-w-0 space-y-4" aria-label={'Ejecución regional de '+code}>
  <h3 className="text-lg font-semibold">Ejecución automática regional</h3>
  <p className="font-semibold">{!fresh?'Estado por actualizar':!data.workerEnabled?'Ejecutor global desactivado':data.current.blockedReason||data.readiness.blocker&&data.current.enabled?'Detenida para revisión':data.current.enabled?'Programación regional activada':'Programación regional desactivada'}</p>
  <p>Este control activa las comprobaciones de la política de fuentes preparada. Guardar o cambiar esa política no activa el control ni adopta cambios automáticamente.</p>
  {!data.workerEnabled&&<p>La ejecución global permanece apagada. No se consultan fuentes desde este proceso hasta habilitarla y activar expresamente cada región.</p>}
  <p>Próxima ejecución: {date(data.current.nextRunAt)} · Control, revisión {data.current.revision} · Política aprobada, revisión {data.current.planRevision}</p>
  {data.current.blockedReason&&<p role="alert">Requiere revisión: {label(data.current.blockedReason)}. Revisa las fuentes y confirma de nuevo el control.</p>}
  {data.readiness.blocker&&<p>Requisito pendiente: {label(data.readiness.blocker)}</p>}
  <Button variant="outline" onClick={()=>void refresh()} disabled={busy}>Actualizar ejecutor regional</Button>
  {canWrite&&<div className="space-y-3 rounded border p-3">
   <p>Actualiza el ejecutor después de preparar la política para consultar su revisión vigente.</p>
   <Input aria-label="Motivo de ejecución regional" placeholder="Motivo de la activación o desactivación" value={reason} disabled={busy||Boolean(pending)||!fresh} maxLength={500} onChange={e=>setReason(e.target.value)}/>
   {data.workerEnabled&&data.readiness.ready&&<label className="flex gap-2"><input aria-label="Confirmar ejecución regional" type="checkbox" disabled={busy||Boolean(pending)||!fresh} checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Confirmo el responsable, las fuentes revisadas y el horario de la política vigente.</label>}
   {pending?<><p role="status">Hay una confirmación pendiente. El reintento conserva la misma clave.</p><Button disabled={busy} onClick={()=>void save(pending.enabled)}>Reintentar control regional</Button></>:<div className="flex flex-wrap gap-3"><Button disabled={!canActivate} onClick={()=>void save(true)}>{data.current.enabled?'Confirmar de nuevo ejecución regional':'Activar ejecución regional'}</Button>{data.current.enabled&&<Button variant="outline" disabled={busy||!fresh||reason.trim().length<10} onClick={()=>void save(false)}>Desactivar ejecución regional</Button>}</div>}
  </div>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <p className="text-sm">Una región a la vez, hasta veinte fuentes y 10 MB por archivo. Las redirecciones requieren revisión. Solo se comprueban disponibilidad y huellas; los resultados publicados y los originales privados permanecen bajo revisión documental.</p>
  <section aria-label="Alertas regionales" className="space-y-2"><h4 className="font-semibold">Alertas internas ({data.alerts.filter(a=>a.status==='OPEN').length} abiertas)</h4>{!data.alerts.length&&<p>Sin alertas registradas.</p>}{data.alerts.map(a=><article key={a.resourceCode} className="rounded border p-3 break-words"><p>{label(a.code)} · {a.status==='OPEN'?'Abierta':'Resuelta'} · Episodio {a.episode}</p><p>Responsable: {a.responsibleEmail}</p><p>Última observación: {date(a.lastObservedAt)}</p><p className="text-sm">Referencia: {a.resourceCode}</p></article>)}</section>
  <section aria-label="Historial de ejecuciones regionales" className="space-y-2"><h4 className="font-semibold">Últimas ejecuciones ({data.runs.length})</h4>{!data.runs.length&&<p>Sin ejecuciones registradas. Esta vista no inicia una comprobación.</p>}{data.runs.map(r=><details key={r.id} className="rounded border p-3 break-words"><summary>{date(r.scheduledFor)} · {label(r.status)} · Intento {r.attempt}</summary><p>Política {r.planRevision} · Control {r.controlRevision}</p>{r.errorCode&&<p>{label(r.errorCode)}</p>}{r.observations.map(o=><p key={o.sourceId}>{label(o.code)} · {o.sourceId}{o.httpStatus?' · HTTP '+o.httpStatus:''}</p>)}</details>)}</section>
  <details><summary>Historial del control ({data.history.length})</summary>{data.history.map(h=><article key={h.id} className="rounded border p-3 mt-2 break-words"><p>Revisión {h.revision} · {h.snapshot.enabled?'Activación':'Desactivación'} · {date(h.createdAt)}</p><p>{h.actorEmail}</p><p>{h.reason}</p></article>)}</details>
  <p className="text-sm">Se muestran las últimas veinte ejecuciones y cambios del control, y hasta cincuenta alertas. El historial anterior se conserva. Los avisos son internos; no se envían correos.</p>
 </section>;
}
export function TerritorialRegionalMonitorPanel({code}:{code:string}){const load=useCallback(()=>getRegionalMonitor(code),[code]);return <QuerySection key={code} title="Control y resultados del monitoreo" load={load}>{data=><Control key={code} initial={data}/>}</QuerySection>;}
