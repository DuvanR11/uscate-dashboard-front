'use client';
import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { extractErrorMessage } from '@/lib/api/platform';
import { QuerySection } from './query-section';
import { getTerritorialHealthSchedule, saveTerritorialHealthSchedule, type HealthScheduleCommand, type HealthScheduleConfiguration, type HealthScheduleSettings } from '@/lib/api/territorial-health-schedule';
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
const blocked:Record<string,string>={CONFIG_CHANGED:'Las fuentes o controles cambiaron. Revisa y vuelve a guardar para aprobar la configuración actual.',REQUESTER_UNAUTHORIZED:'El responsable perdió su autorización. Selecciona un responsable autorizado y vuelve a guardar.',RESPONSIBLE_CHANGED:'Cambió la identidad del responsable. Revisa su asignación y vuelve a guardar.'};
const date=(value:string|null)=>value?new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin ejecución programada';
function Schedule({initial}:{initial:HealthScheduleConfiguration}){
 const [data,setData]=useState(initial),[draft,setDraft]=useState<HealthScheduleSettings>(initial.current),[reason,setReason]=useState('');
 const [busy,setBusy]=useState(false),[pending,setPending]=useState<HealthScheduleCommand|null>(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const canWrite=usePermission('PLATAFORMA','canWrite');
 const [remoteChanged,setRemoteChanged]=useState(false),[pollError,setPollError]=useState('');
 const scheduleEnabled=data.current.enabled,scheduleRevision=data.current.revision;
 useEffect(()=>{
  if(!scheduleEnabled||busy||pending)return;
  let active=true;
  const timer=setInterval(()=>{void getTerritorialHealthSchedule().then(next=>{
   if(!active)return;setPollError('');
   if(next.current.revision!==scheduleRevision){setRemoteChanged(true);return;}
   // Runtime status may advance without changing the approved policy. Never replace an unsaved draft.
   setData(previous=>({...previous,workerEnabled:next.workerEnabled,currentConfigHash:next.currentConfigHash,current:{...previous.current,nextRunAt:next.current.nextRunAt,blockedReason:next.current.blockedReason,updatedAt:next.current.updatedAt}}));
  }).catch(()=>{if(active)setPollError('No se pudo actualizar automáticamente el estado. Usa Actualizar programación.');});},60000);
  return()=>{active=false;clearInterval(timer);};
 },[scheduleEnabled,scheduleRevision,busy,pending]);
 async function refresh(){setBusy(true);setError('');try{const next=await getTerritorialHealthSchedule();setData(next);setRemoteChanged(false);setPollError('');if(!pending)setDraft(next.current);}catch(e){setError(extractErrorMessage(e)||'No se pudo actualizar la programación.');}finally{setBusy(false);}}
 async function save(event:React.FormEvent){
  event.preventDefault();setBusy(true);setError('');setNotice('');
  const command=pending??{enabled:draft.enabled,cadence:draft.cadence,hour:draft.hour,minute:draft.minute,weekDay:draft.cadence==='WEEKLY'?draft.weekDay:null,maxRetries:draft.maxRetries,responsibleId:draft.responsibleId||null,expectedRevision:data.current.revision,reason:reason.trim(),requestKey:crypto.randomUUID()};setPending(command);
  try{await saveTerritorialHealthSchedule(command);const next=await getTerritorialHealthSchedule();setData(next);setDraft(next.current);setPending(null);setRemoteChanged(false);setReason('');setNotice(next.current.enabled?'Programación guardada. Revisa la próxima ejecución indicada.':'Programación guardada y desactivada.');}
  catch(e){if(isAxiosError(e)&&e.response&&e.response.status>=400&&e.response.status<500&&![408,429].includes(e.response.status))setPending(null);setError(extractErrorMessage(e)||'No se pudo confirmar el guardado. Reintenta para recuperar la misma operación.');}
  finally{setBusy(false);}
 }
 const changed=data.current.approvedConfigHash!==data.currentConfigHash;
 return <div className="min-w-0 space-y-4">
  <p>Programa la revisión de las cuatro fuentes PDF y los controles locales. Comparte la cola con las solicitudes manuales y conserva el último diagnóstico completo si una ejecución falla.</p>
  <p className="font-medium">Estado: {!data.current.enabled?'Desactivada':data.current.blockedReason||changed?'Bloqueada para revisión':!data.workerEnabled?'Procesador deshabilitado':'Activada'} · Hora de Colombia</p>
  <p>Próxima ejecución: {date(data.current.nextRunAt)}.</p>
  {data.current.blockedReason&&<p role="alert">{blocked[data.current.blockedReason]??'Revisa el bloqueo antes de guardar una nueva configuración.'}</p>}
  {changed&&!data.current.blockedReason&&<p role="alert">Las fuentes o controles cambiaron. La programación debe revisarse antes de volver a ejecutarse.</p>}
  {!data.workerEnabled&&<p>El procesador está deshabilitado; no se ejecutarán trabajos hasta habilitarlo.</p>}
  <Button type="button" variant="outline" disabled={busy} onClick={()=>void refresh()}>Actualizar programación</Button>
  {remoteChanged&&<p role="alert">Otro operador cambió la programación. Actualiza el formulario antes de guardar.</p>}
  {pollError&&<p role="alert">{pollError}</p>}
  <p className="text-sm">Actualizar programación carga la configuración guardada y reemplaza el formulario. El estado activo se consulta automáticamente cada minuto.</p>
  {canWrite?<form onSubmit={event=>void save(event)} className="space-y-3">
   <fieldset disabled={busy||Boolean(pending)} className="grid min-w-0 gap-3 sm:grid-cols-2">
    <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={draft.enabled} onChange={e=>setDraft({...draft,enabled:e.target.checked})}/>Activar comprobaciones automáticas</label>
    <label>Frecuencia<select aria-label="Frecuencia automática" className="mt-1 block w-full rounded border p-2" value={draft.cadence} onChange={e=>setDraft({...draft,cadence:e.target.value as 'DAILY'|'WEEKLY',weekDay:e.target.value==='WEEKLY'?1:null})}><option value="DAILY">Diaria</option><option value="WEEKLY">Semanal</option></select></label>
    <label>Hora de Colombia<Input aria-label="Hora automática" type="time" required value={`${String(draft.hour).padStart(2,'0')}:${String(draft.minute).padStart(2,'0')}`} onChange={e=>{if(!e.target.value)return;const[h,m]=e.target.value.split(':').map(Number);setDraft({...draft,hour:h,minute:m});}}/></label>
    {draft.cadence==='WEEKLY'&&<label>Día<select aria-label="Día automático" className="mt-1 block w-full rounded border p-2" value={draft.weekDay??1} onChange={e=>setDraft({...draft,weekDay:Number(e.target.value)})}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>}
    <label>Responsable<select aria-label="Responsable automático" required={draft.enabled} className="mt-1 block w-full rounded border p-2" value={draft.responsibleId??''} onChange={e=>setDraft({...draft,responsibleId:e.target.value||null})}><option value="">Seleccionar responsable</option>{data.operators.map(o=><option key={o.id} value={o.id}>{o.fullName} · {o.email}</option>)}</select></label>
    <label className="flex items-center gap-2 sm:col-span-2"><input type="checkbox" checked={draft.maxRetries===1} onChange={e=>setDraft({...draft,maxRetries:e.target.checked?1:0})}/>Permitir un reintento, una hora después de una ejecución fallida o interrumpida</label>
    <label className="sm:col-span-2">Motivo<Input aria-label="Motivo de programación" required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   </fieldset>
   <p className="text-sm">Guardar activada autoriza hasta cuatro consultas PDF por ejecución programada. El reintento opcional puede repetir esas consultas una sola vez. Un HTTP 403 o una alerta completada no provoca reintentos.</p>
   {pending&&<p role="status">Hay un guardado sin confirmar. Reintenta la misma operación antes de editar; actualizar el estado no descarta la solicitud pendiente.</p>}
   <Button type="submit" disabled={busy||(!pending&&(remoteChanged||reason.trim().length<10||(draft.enabled&&!draft.responsibleId)||!data.workerEnabled&&draft.enabled))}>{busy?'Guardando…':pending?'Reintentar guardado':draft.enabled?'Guardar y activar programación':'Guardar programación desactivada'}</Button>
  </form>:<p>Se requiere permiso de escritura para modificar la programación.</p>}
  {error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
  <p className="text-sm">Máximo una ejecución principal programada por día, separada al menos {data.policy.minPrimaryGapHours} horas de la anterior. Las ventanas perdidas por más de {data.policy.graceMinutes} minutos se omiten; no se acumulan trabajos. Un reintento solo puede ejecutarse dentro de las {data.policy.retryWindowHours} horas del horario original.</p>
  <details><summary>Historial de configuración ({data.history.length})</summary><ol className="mt-2 space-y-2">{data.history.map(h=><li key={h.id} className="break-words rounded border p-2 text-sm">Revisión {h.revision} · {date(h.createdAt)} · {h.actorEmail}<p>{h.reason}</p><p>{h.snapshot.enabled?'Activada':'Desactivada'} · {h.snapshot.cadence==='DAILY'?'Diaria':'Semanal'} · {String(h.snapshot.hour).padStart(2,'0')}:{String(h.snapshot.minute).padStart(2,'0')} Colombia</p></li>)}</ol><p className="text-sm">Se muestran las últimas veinte configuraciones; el historial anterior permanece guardado.</p></details>
 </div>;
}
export function TerritorialHealthSchedulePanel({initial}:{initial?:HealthScheduleConfiguration}={}){return initial?<section aria-label="Programación existente de Neiva"><Schedule initial={initial}/></section>:<QuerySection title="Programación de comprobaciones territoriales" load={getTerritorialHealthSchedule}>{initial=><Schedule initial={initial}/>}</QuerySection>;}
