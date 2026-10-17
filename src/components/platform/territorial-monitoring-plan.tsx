'use client';
import Link from 'next/link';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { TerritorialHealthSchedulePanel } from './territorial-health-schedule';
import { extractErrorMessage } from '@/lib/api/platform';
import { getMonitoringConfiguration, saveMonitoringPlan, type MonitoringConfiguration, type MonitoringPlanCommand, type MonitoringSettings, type RegionalMonitoringPlan } from '@/lib/api/territorial-monitoring-plans';

const date=(v:string|null)=>v?new Date(v).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin definir';
const localDate=(v:string|null)=>v?new Date(Date.parse(v)-5*3600000).toISOString().slice(0,16):'';
const days=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
function RegionalPlan({initial}:{initial:RegionalMonitoringPlan}){
  const [data,setData]=useState(initial),[draft,setDraft]=useState<MonitoringSettings>(initial.current),[reason,setReason]=useState('');
  const [pending,setPending]=useState<MonitoringPlanCommand|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[fresh,setFresh]=useState(true);
  const canWrite=usePermission('PLATAFORMA','canWrite');
  const prepareReady=Boolean(draft.responsibleId&&draft.reviewDueAt&&Date.parse(draft.reviewDueAt)>Date.now()&&draft.sources.length&&draft.sources.every(s=>data.sources.some(c=>c.id===s.id&&c.revision===s.revision&&c.reviewed)));
  async function refresh(){setBusy(true);setFresh(false);setError('');try{const next=await getMonitoringConfiguration(data.dataset.code);if(next.mode!=='REGIONAL_PLAN')throw Error('Cambió el contexto del plan.');setData(next);setFresh(true);if(!pending)setDraft(next.current);}catch(e){setError(extractErrorMessage(e)||'No pudimos actualizar el plan.');}finally{setBusy(false);}}
  async function submit(event:React.FormEvent<HTMLFormElement>){
    event.preventDefault();setBusy(true);setError('');setNotice('');
    const action=(event.nativeEvent as SubmitEvent).submitter?.getAttribute('value')==='PREPARE'?'PREPARE':'SAVE_DRAFT';
    const command=pending??{...draft,enabled:false as const,requestKey:crypto.randomUUID(),expectedRevision:data.current.revision,catalogRevision:data.dataset.revision,action,reason:reason.trim(),sources:[...draft.sources]};
    setPending(command);let acknowledged=false;
    try{
      const response=await saveMonitoringPlan(data.dataset.code,command);
      if(response.data.datasetCode!==data.dataset.code||response.data.enabled!==false)throw Error('No pudimos vincular la respuesta al plan.');
      acknowledged=true;
      const next=await getMonitoringConfiguration(data.dataset.code);if(next.mode!=='REGIONAL_PLAN')throw Error('Cambió el contexto del plan.');
      setData(next);setDraft(next.current);setFresh(true);setPending(null);setReason('');setNotice(next.preparedNow?'Configuración preparada para revisión. Las comprobaciones siguen desactivadas.':'Borrador guardado. Las comprobaciones siguen desactivadas.');
    }catch(e){
      setFresh(false);
      if(!acknowledged&&isAxiosError(e)&&e.response&&e.response.status>=400&&e.response.status<500&&![408,429].includes(e.response.status))setPending(null);
      setError(acknowledged?'El guardado fue aceptado, pero falta actualizar su estado. Reintenta la misma solicitud.':extractErrorMessage(e)||'No pudimos confirmar el guardado. Reintenta la misma solicitud.');
    }finally{setBusy(false);}
  }
  return <div className="min-w-0 space-y-4">
    <p className="font-semibold">Comprobaciones desactivadas · {!fresh?'Estado por actualizar':data.preparedNow?'Configuración preparada':data.current.state==='PREPARED'?'Preparación pendiente de revisar':'Borrador'} · Revisión {data.current.revision}</p>
    <p>Elige las fuentes y prepara la política de revisión de este conjunto. Guardar el plan no consulta enlaces, no envía avisos y no modifica resultados electorales.</p>
    {data.activationBlockers.map(b=><p key={b.code} className="rounded border bg-muted p-3">{b.message}</p>)}
    <p>Horario propuesto: {date(data.proposedNextAt)}. No hay ejecución programada para este plan.</p>
    <Button variant="outline" disabled={busy} onClick={()=>void refresh()}>Actualizar plan</Button>
    {data.reviewBlockers.length>0&&<section aria-label="Requisitos del plan guardado" className="rounded border p-3"><h3 className="font-medium">Requisitos del plan guardado</h3><ul className="list-disc pl-5">{data.reviewBlockers.map(b=><li key={b.code}>{b.message}</li>)}</ul><p className="mt-2 text-sm">Guardar y preparar vuelve a validar estos requisitos con la selección del formulario.</p></section>}
    {canWrite&&data.dataset.state!=='ARCHIVED'?<form onSubmit={event=>void submit(event)} className="space-y-4">
      <fieldset disabled={busy||Boolean(pending)||!fresh} className="grid min-w-0 gap-3 sm:grid-cols-2">
        <legend className="font-semibold">Política propuesta · Hora de Colombia</legend>
        <label>Frecuencia<select aria-label="Frecuencia regional" className="block w-full rounded border p-2" value={draft.cadence} onChange={e=>setDraft({...draft,cadence:e.target.value as 'DAILY'|'WEEKLY',weekDay:e.target.value==='WEEKLY'?1:null})}><option value="DAILY">Diaria</option><option value="WEEKLY">Semanal</option></select></label>
        {draft.cadence==='WEEKLY'&&<label>Día<select aria-label="Día regional" className="block w-full rounded border p-2" value={draft.weekDay??1} onChange={e=>setDraft({...draft,weekDay:Number(e.target.value)})}>{days.map((d,i)=><option key={d} value={i}>{d}</option>)}</select></label>}
        <label>Hora<Input aria-label="Hora regional" type="time" value={String(draft.hour).padStart(2,'0')+':'+String(draft.minute).padStart(2,'0')} onChange={e=>{const [hour,minute]=e.target.value.split(':').map(Number);setDraft({...draft,hour,minute});}} required/></label>
        <label>Responsable<select aria-label="Responsable regional" className="block w-full rounded border p-2" value={draft.responsibleId??''} onChange={e=>setDraft({...draft,responsibleId:e.target.value||null})}><option value="">Sin asignar</option>{draft.responsibleId&&!data.operators.some(o=>o.id===draft.responsibleId)&&<option value={draft.responsibleId}>Responsable anterior sin autorización vigente</option>}{data.operators.map(o=><option key={o.id} value={o.id}>{o.fullName} · {o.email}</option>)}</select></label>
        <label>Fecha límite de revisión<Input aria-label="Fecha límite regional" type="datetime-local" value={localDate(draft.reviewDueAt)} onChange={e=>setDraft({...draft,reviewDueAt:e.target.value?new Date(e.target.value+':00-05:00').toISOString():null})}/></label>
        <label className="flex items-center gap-2"><input type="checkbox" checked={draft.maxRetries===1} onChange={e=>setDraft({...draft,maxRetries:e.target.checked?1:0})}/>Prever un reintento tras una hora</label>
        <div className="sm:col-span-2 space-y-2"><p className="font-medium">Alertas previstas al disponer de un ejecutor</p>
          <label className="flex gap-2"><input type="checkbox" checked={draft.notifyUnavailable} onChange={e=>setDraft({...draft,notifyUnavailable:e.target.checked})}/>Fuente inaccesible</label>
          <label className="flex gap-2"><input type="checkbox" checked={draft.notifyChanged} onChange={e=>setDraft({...draft,notifyChanged:e.target.checked})}/>Archivo o fuente modificada</label>
          <label className="flex gap-2"><input type="checkbox" checked={draft.notifyReviewDue} onChange={e=>setDraft({...draft,notifyReviewDue:e.target.checked})}/>Fecha de revisión vencida</label>
        </div>
        <div className="sm:col-span-2 min-w-0 space-y-2"><p className="font-medium">Originales regionales seleccionados ({draft.sources.length}/20)</p>
          {!data.sources.length&&<p>No hay originales regionales registrados. <Link className="text-primary underline" href="/platform/territorial-data">Administrar fuentes</Link></p>}
          {data.sources.map(s=>{const selected=draft.sources.find(c=>c.id===s.id);return <label key={s.id} className="flex min-w-0 gap-2 rounded border p-3"><input aria-label={'Seleccionar '+s.title} type="checkbox" checked={Boolean(selected)} disabled={!selected&&draft.sources.length>=20} onChange={e=>setDraft({...draft,sources:e.target.checked?[...draft.sources,{id:s.id,revision:s.revision}]:draft.sources.filter(c=>c.id!==s.id)})}/><span className="min-w-0 break-words">{s.title}<span className="block text-sm">Revisión {s.revision} · {s.reviewed?'Original almacenado y revisado':'Revisión documental pendiente'}</span>{selected&&selected.revision!==s.revision&&<span className="block text-sm text-amber-700">La fuente cambió. Desmarca y vuelve a seleccionarla después de revisarla.</span>}</span></label>;})}
          {draft.sources.some(s=>!data.sources.some(c=>c.id===s.id))&&<p role="alert">Falta una fuente guardada. <Button type="button" variant="outline" onClick={()=>setDraft({...draft,sources:draft.sources.filter(s=>data.sources.some(c=>c.id===s.id))})}>Quitar fuentes no disponibles</Button></p>}
          {data.sourcesTruncated&&<p className="text-sm">Se muestran los cien originales más recientes y los seleccionados previamente.</p>}
        </div>
        <label className="sm:col-span-2">Motivo<Input aria-label="Motivo regional" value={reason} onChange={e=>setReason(e.target.value)} required minLength={10} maxLength={500}/></label>
      </fieldset>
      {data.operatorsTruncated&&<p>La lista de responsables está limitada a los primeros 25 operadores y al responsable vigente.</p>}
      {pending&&<p role="status">Hay una solicitud sin confirmar. Se conserva su clave para recuperarla sin duplicar el historial.</p>}
      <div className="flex flex-wrap gap-3">{pending?<Button type="submit" disabled={busy}>Reintentar guardado regional</Button>:<>
        <Button type="submit" value="SAVE_DRAFT" variant="outline" disabled={busy||!fresh||reason.trim().length<10}>Guardar borrador regional</Button>
        <Button type="submit" value="PREPARE" disabled={busy||!fresh||reason.trim().length<10||!prepareReady}>Guardar y preparar configuración</Button>
      </>}</div>
    </form>:<p>La configuración está disponible en lectura. Se requiere escritura y un conjunto sin archivar para modificarla.</p>}
    {error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <p className="text-sm">Límites previstos: una ejecución principal por día, separación de 23 horas y como máximo un reintento después de 60 minutos. No se habilitan correos ni un nuevo procesador en esta entrega.</p>
    <details><summary>Historial de configuración ({data.history.length})</summary><ol className="space-y-2 mt-2">{data.history.map(h=><li key={h.id} className="rounded border p-3 break-words">Revisión {h.revision} · {h.action==='PREPARE'?'Preparación':'Borrador'} · {date(h.createdAt)}<p>{h.actorEmail}</p><p>{h.reason}</p></li>)}</ol><p className="text-sm">Se muestran las últimas veinte revisiones; se conserva el historial anterior.</p></details>
  </div>;
}
export function TerritorialMonitoringPlan({initial}:{initial:MonitoringConfiguration}){
  return <section className="min-w-0 space-y-4" aria-label={'Monitoreo de '+initial.dataset.code}>
    <h2 className="text-xl font-semibold">{initial.dataset.name}</h2>
    <p className="text-sm break-all">{initial.dataset.code} · Catálogo, revisión {initial.dataset.revision}</p>
    {initial.mode==='LEGACY_NEIVA'?<>
      <p>Neiva utiliza su programación existente y sus cuatro fuentes fijadas. Esta vista consulta y permite gestionar esa misma programación; no crea un segundo trabajo.</p>
      <ul className="list-disc pl-5">{initial.sources.map(s=><li key={s.code}>{s.title}</li>)}</ul>
      <TerritorialHealthSchedulePanel initial={initial.legacy}/>
    </>:<RegionalPlan key={initial.dataset.code} initial={initial}/>}
  </section>;
}
