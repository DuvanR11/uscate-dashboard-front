'use client';
import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { usePermission } from '@/hooks/use-permission';
import { extractErrorMessage } from '@/lib/api/platform';
import { downloadTerritorialHealth, getTerritorialHealth, requestTerritorialHealth, type TerritorialHealth, type HealthObservation } from '@/lib/api/territorial-health';
import { QuerySection } from './query-section';

const names:Record<string,string>={PUBLICATION:'Publicación municipal',EVIDENCE_METADATA:'Metadatos de originales privados',GEOGRAPHY:'Validación geográfica',ALCALDIA_CAR_05_COMUNAS_2017:'Plano municipal de comunas',ALCALDIA_CAR_17_CENTROS_POBLADOS_2017:'Plano de centros poblados',ALCALDIA_CAR_18_MAPA_GENERAL_2017:'Mapa general municipal',STATION_PDF:'PDF electoral de puestos'};
const statusNames={OK:'Comprobado',ATTENTION:'Requiere atención',ERROR:'Error de integridad'};
const runNames={QUEUED:'En cola',RUNNING:'Comprobando',COMPLETED:'Finalizada',FAILED:'No completada'};
function date(value:string|null){return value?new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota'}):'Sin comprobar';}
function Finding({observation:o}:{observation:HealthObservation}){
 return <li className="min-w-0 space-y-1 rounded border p-3 text-sm"><p className="font-medium">{names[o.resourceCode]??o.title} · {statusNames[o.status]}</p><p>{o.detail}</p><p>{o.nextAction}</p><p className="text-xs text-muted-foreground">Observado: {date(o.checkedAt)}</p>{o.expectedHash&&<p className="break-all text-xs">Huella de referencia: {o.expectedHash}</p>}{o.actualHash&&<p className="break-all text-xs">Huella descargada: {o.actualHash}</p>}{o.httpStatus!==undefined&&<p>HTTP {o.httpStatus}{o.bytes!==undefined?` · ${o.bytes.toLocaleString('es-CO')} bytes`:''}</p>}</li>;
}
function HealthPanel({initial}:{initial:TerritorialHealth}){
 const [data,setData]=useState(initial),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [now,setNow]=useState(Date.now);
 const [exporting,setExporting]=useState(false),[exportError,setExportError]=useState(''),[exportNotice,setExportNotice]=useState('');
 const pending=useRef<string|null>(null),mounted=useRef(true),canWrite=usePermission('PLATAFORMA','canWrite');
 useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),30000);return()=>clearInterval(timer);},[]);
 // Refresh stored results; these reads never enqueue work or contact public sources.
 useEffect(()=>{
  let current=true;
  const timer=setInterval(()=>{void getTerritorialHealth().then(next=>{if(current)setData(next);}).catch(()=>{if(current)setError('No se pudo actualizar el diagnóstico guardado. Usa Actualizar estado.');});},data.busy?5000:60000);
  return()=>{current=false;clearInterval(timer);};
 },[data.busy]);
 async function refresh(){setBusy(true);setError('');try{const next=await getTerritorialHealth();pending.current=null;if(mounted.current)setData(next);}catch(e){if(mounted.current)setError(extractErrorMessage(e)||'No se pudo actualizar el panel.');}finally{if(mounted.current)setBusy(false);}}
 async function request(){
  setBusy(true);setError('');setNotice('');pending.current??=crypto.randomUUID();
  try{await requestTerritorialHealth(pending.current);if(mounted.current)setNotice('Comprobación solicitada. El procesador revisará las fuentes y guardará los resultados.');const next=await getTerritorialHealth();pending.current=null;if(mounted.current)setData(next);}
  catch(e){if(mounted.current)setError(extractErrorMessage(e)||'No se pudo confirmar la solicitud. Reintenta para recuperar la misma operación.');}
  finally{if(mounted.current)setBusy(false);}
 }
 async function download(format:'HTML'|'JSON'){
  setExporting(true);setExportError('');setExportNotice('');
  try{await downloadTerritorialHealth(format);if(mounted.current)setExportNotice(format==='HTML'?'Informe descargado. Ábrelo en tu navegador para leerlo o imprimirlo como PDF.':'Datos del diagnóstico descargados.');}
  catch{if(mounted.current)setExportError('No se pudo descargar el diagnóstico. Actualiza el estado y vuelve a intentarlo.');}
  finally{if(mounted.current)setExporting(false);}
 }
 const alerts=data.alerts.filter(a=>a.status==='OPEN');
 const current=data.lastComplete?.configHash===data.configHash;
 const stale=data.stale||Boolean(data.checkedAt&&now-new Date(data.checkedAt).getTime()>data.staleAfterHours*3600000);
 const cooldown=Boolean(data.canRequestAt&&new Date(data.canRequestAt).getTime()>now);
 return <div className="min-w-0 space-y-4">
  <p>Solicita una comprobación para revisar la publicación, los metadatos de los originales y cuatro PDF conocidos. Los cambios detectados generan alertas internas y requieren revisión antes de una nueva publicación.</p>
  <div className="grid gap-3 sm:grid-cols-3"><div className="rounded border p-3"><p className="text-sm">Última comprobación completa</p><strong>{date(data.checkedAt)}</strong></div><div className="rounded border p-3"><p className="text-sm">Vigencia del diagnóstico</p><strong>{!data.lastComplete?'Sin diagnóstico':!current?'Configuración modificada':stale?'Actualizar diagnóstico':'Menos de 24 horas'}</strong></div><div className="rounded border p-3"><p className="text-sm">Alertas internas abiertas</p><strong>{data.lastComplete?alerts.length:'Aún sin evaluar'}</strong></div></div>
  <div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={busy} onClick={()=>void refresh()}>Actualizar estado</Button>{canWrite&&<Button type="button" disabled={busy||data.busy||!data.workerEnabled||cooldown} onClick={()=>void request()}>{busy?'Solicitando…':data.busy?'Comprobación en curso':'Comprobar fuentes ahora'}</Button>}</div>
  {cooldown&&!data.busy&&<p className="text-sm">Próxima comprobación disponible: {date(data.canRequestAt)}.</p>}
  <p className="text-sm">Las solicitudes manuales y la programación activada comparten la cola. Hay al menos cinco minutos entre solicitudes; actualizar estado consulta el resultado guardado.</p>
  <div className="space-y-2 rounded border p-3"><h3 className="font-semibold">Guardar diagnóstico</h3><p className="text-sm">Descarga un informe para revisión o soporte, con resultados, alertas, fuentes y acciones pendientes. Usa la última comprobación completa y no vuelve a consultar los sitios externos.</p><div className="flex flex-wrap gap-2"><Button type="button" variant="outline" disabled={exporting||busy||!data.lastComplete} onClick={()=>void download('HTML')}>{exporting?'Descargando…':'Descargar informe'}</Button><Button type="button" variant="outline" disabled={exporting||busy||!data.lastComplete} onClick={()=>void download('JSON')}>Descargar datos JSON</Button></div>{!data.lastComplete&&<p className="text-sm">Disponible después de completar la primera comprobación.</p>}{data.lastComplete&&stale&&<p className="text-sm">El archivo indicará que el diagnóstico requiere actualización.</p>}{exportError&&<p role="alert" className="text-destructive">{exportError}</p>}{exportNotice&&<p role="status">{exportNotice}</p>}</div>
  {!data.workerEnabled&&<p>El procesador está deshabilitado. Un operador debe habilitarlo antes de solicitar comprobaciones.</p>}
  {data.busy&&<p role="status">{data.latestRun?.status==='QUEUED'?'Solicitud en cola. El procesador la recogerá en su próxima pasada.':'Comprobando fuentes. Los resultados anteriores se conservan mientras termina.'}</p>}
  {data.interrupted&&<p role="alert">La ejecución está tardando más de lo previsto. El procesador registrará la interrupción y permitirá una nueva solicitud.</p>}
  {data.latestRun?.status==='FAILED'&&<p role="alert">La última comprobación no se completó ({data.latestRun.errorCode}). Los resultados y alertas anteriores siguen disponibles; actualiza el estado antes de reintentar.</p>}
  {notice&&<p role="status">{notice}</p>}{error&&<p role="alert" className="text-destructive">{error}</p>}
  {!data.lastComplete?<p>Sin comprobaciones completas: la disponibilidad y las huellas externas todavía no están evaluadas.</p>:<><h3 className="font-semibold">Resultados de la última comprobación completa</h3><p className="text-sm">Origen: {data.lastComplete.origin==='SCHEDULED'?'Programada':'Solicitud manual'} · Intento {data.lastComplete.attempt??1}{data.lastComplete.scheduledFor?` · Horario programado: ${date(data.lastComplete.scheduledFor)}`:''}</p>{!current&&<p>Estos resultados corresponden a una configuración anterior; solicita una nueva comprobación.</p>}<ul aria-label="Resultados de salud territorial" className="grid min-w-0 gap-3 lg:grid-cols-2">{data.lastComplete.observations?.map(o=><Finding key={o.resourceCode} observation={o}/>)}</ul></>}
  <h3 className="font-semibold">Alertas internas</h3>
  {!alerts.length?<p>{data.lastComplete?'Sin alertas abiertas en los controles realizados. Consulta también la vigencia y el alcance del diagnóstico.':'Se mostrarán después de la primera comprobación.'}</p>:<ul aria-label="Alertas de salud territorial" className="space-y-3">{alerts.map(a=><li key={a.id} className="min-w-0 rounded border p-3 text-sm"><strong>{names[a.resourceCode]??a.title} · {a.severity==='ERROR'?'Error':a.severity==='INFO'?'Pendiente conocido':'Atención'}</strong><p>{a.observation.detail}</p><p>{a.nextAction}</p><p>Primera observación: {date(a.firstObservedAt)} · Última: {date(a.lastObservedAt)}</p></li>)}</ul>}
  <details><summary className="cursor-pointer font-medium">Fuentes externas incluidas y límites</summary><ul className="mt-3 space-y-2">{data.sources.map(s=><li key={s.code} className="break-words text-sm"><a href={s.url} target="_blank" rel="noopener noreferrer" className="underline">{s.title}</a><p>Límite de descarga: {(s.maxBytes/1024/1024).toFixed(0)} MB</p></li>)}</ul>{data.limitations.map(l=><p key={l} className="mt-2 text-sm">{l}</p>)}</details>
  <details><summary className="cursor-pointer font-medium">Últimas comprobaciones ({data.runs.length})</summary><ol className="mt-3 space-y-2">{data.runs.map(r=><li key={r.id} className="rounded border p-3 text-sm"><strong>{runNames[r.status]}</strong><p>{r.origin==='SCHEDULED'?'Programada':'Solicitud manual'} · Intento {r.attempt??1}</p><p>Solicitada: {date(r.requestedAt)} · Finalizada: {date(r.finishedAt)}</p>{r.errorCode&&<p>Resultado: {r.errorCode}</p>}{r.configHash!==data.configHash&&<p>Configuración anterior</p>}<details><summary>Ver resultados guardados</summary><ul className="mt-2 space-y-2">{r.observations?.map(o=><Finding key={o.resourceCode} observation={o}/>)}</ul></details></li>)}</ol><p className="mt-2 text-sm">Se muestran las últimas veinte ejecuciones; las anteriores permanecen en el historial persistido.</p></details>
 </div>;
}
export function TerritorialHealthPanel(){return <QuerySection title="Salud de fuentes y alertas territoriales" load={getTerritorialHealth}>{data=><HealthPanel initial={data}/>}</QuerySection>;}
