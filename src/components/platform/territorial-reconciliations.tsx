'use client';
import { useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import { extractErrorMessage } from '@/lib/api/platform';
import { commandReconciliation, createReconciliation, getReconciliation, getReconciliationHistory, listReconciliationResponsibles, listSavedReconciliations, type CreateReconciliation, type ReconciliationCommand, type ReconciliationEvent, type ReconciliationResponsible, type SavedReconciliation } from '@/lib/api/territorial-reconciliations';
const states: Record<string,string> = { PENDING_REVIEW:'Pendiente de revisión', OBSERVED:'Con observaciones', REVIEWED:'Ejercicio revisado', WITHDRAWN:'Retirado' };
const actions: Record<string,string> = { REGISTER:'Registro', ASSIGN:'Asignar responsable', OBSERVE:'Registrar observaciones', REVIEW:'Marcar ejercicio revisado', REOPEN:'Reabrir revisión', WITHDRAW:'Retirar ejercicio' };
const date=(s:string)=>new Date(s).toLocaleString('es-CO',{timeZone:'America/Bogota'});
type Pending={kind:'CREATE';input:CreateReconciliation}|{kind:'COMMAND';id:string;input:ReconciliationCommand};

function ReconciliationCard({ row, users, locked, canWrite, submit, report }: {row:SavedReconciliation;users:ReconciliationResponsible[];locked:boolean;canWrite:boolean;submit:(command:Pending)=>void;report:(message:string)=>void}) {
  const actor=useAuthStore(s=>s.user?.id),[action,setAction]=useState(''),[reason,setReason]=useState(''),[responsible,setResponsible]=useState(''),[checked,setChecked]=useState(false),[history,setHistory]=useState<ReconciliationEvent[]|null>(null),[cursor,setCursor]=useState<number|null>(null),[reading,setReading]=useState(false);
  const own=actor===row.responsibleId, pending=row.state==='PENDING_REVIEW', matching=row.comparisonStatus==='SYNTHETIC_MATCH'&&row.differences===0&&row.incompleteComparisons===0;
  const allowed=row.state==='WITHDRAWN'?[]:['ASSIGN','WITHDRAW',...(own?(pending?['OBSERVE',...(matching?['REVIEW']:[])]:['REOPEN']):[])];
  async function loadHistory(more=false){setReading(true);report('');try{const result=await getReconciliationHistory(row.id,more?cursor??undefined:undefined);setHistory(current=>more?[...(current??[]),...result.items]:result.items);setCursor(result.nextBeforeRevision);}catch(e){report(extractErrorMessage(e)||'No se pudo consultar el historial.');}finally{setReading(false);}}
  async function download(){setReading(true);report('');try{const saved=await getReconciliation(row.id);const url=URL.createObjectURL(new Blob([JSON.stringify({warning:'COPIA DE EJERCICIO FICTICIO. NO ES CONCILIACIÓN OFICIAL.',...saved},null,2)],{type:'application/json;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download='SIMULACION-conciliacion-'+row.id+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}catch(e){report(extractErrorMessage(e)||'No se pudo obtener la copia guardada.');}finally{setReading(false);}}
  function act(){const input:ReconciliationCommand={requestKey:crypto.randomUUID(),expectedRevision:row.revision,action,reason:reason.trim()};if(action==='ASSIGN')input.responsibleId=responsible;if(action==='REVIEW')input.checkedResult=checked;submit({kind:'COMMAND',id:row.id,input});}
  return <article aria-label={'Conciliación guardada '+row.title} className="min-w-0 space-y-3 break-words rounded-lg border p-4">
    <h4 className="font-semibold">{row.title}</h4><p>{states[row.state]??row.state} · Revisión {row.revision} · Datos ficticios</p>
    <p className="text-sm">Responsable: {row.responsibleName} ({row.responsibleEmail}). Registrado el {date(row.createdAt)}.</p>
    <p>Diferencias: {row.differences} · Comparaciones incompletas: {row.incompleteComparisons}</p>
    {!matching&&<p className="text-sm">Este ejercicio requiere observaciones: sus diferencias o datos incompletos impiden marcarlo como revisado. Las cifras guardadas no se editan.</p>}
    <details><summary>Huella del ejercicio guardado</summary><p className="break-all text-xs">{row.snapshotHash}</p></details>
    <Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" variant="outline" disabled={locked||reading} onClick={()=>void download()}>Descargar copia guardada</Button>
    {canWrite&&allowed.length>0&&<fieldset disabled={locked||reading} className="min-w-0 space-y-3"><label className="block">Acción de revisión<select aria-label={'Acción '+row.id} className="block w-full min-w-0 max-w-full rounded border bg-background p-2" value={action} onChange={e=>{setAction(e.target.value);setChecked(false);setResponsible('');}}><option value="">Selecciona una acción</option>{allowed.map(a=><option key={a} value={a}>{actions[a]}</option>)}</select></label>
      {action==='ASSIGN'&&<label className="block">Nuevo responsable<select aria-label={'Responsable '+row.id} className="block w-full min-w-0 max-w-full rounded border bg-background p-2" value={responsible} onChange={e=>setResponsible(e.target.value)}><option value="">Selecciona un operador autorizado</option>{users.filter(u=>u.id!==row.responsibleId).map(u=><option key={u.id} value={u.id}>{u.fullName} ({u.email})</option>)}</select></label>}
      <label className="block">Motivo y observaciones<textarea aria-label={'Motivo '+row.id} className="block min-h-20 w-full rounded border bg-background p-2" minLength={10} maxLength={1000} value={reason} onChange={e=>setReason(e.target.value)}/></label>
      {action==='REVIEW'&&<label className="flex gap-2"><input aria-label={'Comprobación '+row.id} type="checkbox" checked={checked} onChange={e=>setChecked(e.target.checked)}/>Comprobé la comparación completa de prueba. Esto no aprueba resultados oficiales.</label>}
      <Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" disabled={!action||reason.trim().length<10||(action==='ASSIGN'&&!responsible)||(action==='REVIEW'&&!checked)} onClick={act}>Confirmar acción de revisión</Button>
      {!own&&<p className="text-sm">Las decisiones de revisión corresponden al responsable asignado.</p>}
    </fieldset>}
    <details><summary>Historial de decisiones</summary><ol className="space-y-2">{(history??row.history).map(e=><li key={e.id} className="border-b py-2 text-sm">{actions[e.action]??e.action} · Revisión {e.revision} · {date(e.createdAt)} · {e.actorEmail}<p>{e.reason}</p><p>Responsable registrado: {e.snapshot.responsibleName} ({e.snapshot.responsibleEmail})</p></li>)}</ol>
      {history===null&&<Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" variant="outline" disabled={locked||reading} onClick={()=>void loadHistory()}>Consultar historial completo</Button>}{cursor!==null&&<Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" variant="outline" disabled={locked||reading} onClick={()=>void loadHistory(true)}>Cargar más decisiones</Button>}
      {row.historyTruncated&&history===null&&<p>Se muestran las últimas veinte decisiones. Consulta el historial completo para continuar.</p>}
    </details>
  </article>;
}

export function TerritorialReconciliationsPanel({exampleId}:{exampleId:string|null}) {
  const canWrite=usePermission('PLATAFORMA','canWrite');
  const [data,setData]=useState<{items:SavedReconciliation[];truncated:boolean}|null>(null),[users,setUsers]=useState<ReconciliationResponsible[]>([]),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState(''),[pending,setPending]=useState<Pending|null>(null),[title,setTitle]=useState(''),[reason,setReason]=useState('');
  async function refresh(){const [rows,people]=await Promise.all([listSavedReconciliations(),listReconciliationResponsibles()]);setData(rows);setUsers(people.items);}
  async function load(){setBusy(true);setError('');setNotice('');try{await refresh();}catch(e){setError(extractErrorMessage(e)||'No se pudo consultar el registro persistente.');}finally{setBusy(false);}}
  async function execute(command:Pending){setPending(command);setBusy(true);setError('');setNotice('');let written=false;try{if(command.kind==='CREATE')await createReconciliation(command.input);else await commandReconciliation(command.id,command.input);written=true;await refresh();setPending(null);setTitle('');setReason('');setNotice('Decisión guardada con historial y auditoría. Sigue siendo un ejercicio ficticio, sin publicación oficial.');}catch(e){if(!written&&isAxiosError(e)&&e.response&&e.response.status>=400&&e.response.status<500&&![408,429].includes(e.response.status))setPending(null);setError(extractErrorMessage(e)||'No se confirmó la operación. Reintenta el mismo comando antes de realizar otra acción.');}finally{setBusy(false);}}
  return <section aria-label="Registro persistente de conciliaciones" className="min-w-0 space-y-4 rounded-lg border p-4">
    <h3 className="font-semibold">Conciliaciones guardadas · revisión interna de prueba</h3>
    <p className="text-sm">Este registro se conserva en la plataforma con responsable e historial. Solo admite los ejemplos ficticios incluidos; no vincula actas oficiales ni aprueba publicaciones. Las notas de práctica del panel anterior permanecen separadas.</p>
    <Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" variant="outline" disabled={busy||Boolean(pending)} onClick={()=>void load()}>Consultar conciliaciones guardadas</Button>
    {error&&<p role="alert" className="text-destructive">{error}</p>}{notice&&<p role="status">{notice}</p>}
    {data&&canWrite&&<form onSubmit={e=>{e.preventDefault();if(exampleId)void execute({kind:'CREATE',input:{requestKey:crypto.randomUUID(),exampleId,title:title.trim(),reason:reason.trim()}});}} className="space-y-3"><fieldset disabled={busy||Boolean(pending)} className="min-w-0 space-y-3"><legend className="font-medium">Registrar el escenario seleccionado arriba</legend><p className="text-sm">Quedarás como responsable inicial; después podrás asignar otro operador autorizado. {exampleId?'Escenario: '+exampleId:'Selecciona primero un escenario de conciliación en el panel de práctica.'}</p><label className="block">Título del ejercicio<Input aria-label="Título de conciliación" required minLength={3} maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label><label className="block">Motivo del registro<textarea aria-label="Motivo del registro de conciliación" required minLength={10} maxLength={1000} className="block min-h-20 w-full rounded border bg-background p-2" value={reason} onChange={e=>setReason(e.target.value)}/></label><Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="submit" disabled={!exampleId||title.trim().length<3||reason.trim().length<10}>Guardar conciliación ficticia</Button></fieldset></form>}
    {data?.items.map(row=><ReconciliationCard key={row.id+':'+row.revision} row={row} users={users} locked={busy||Boolean(pending)} canWrite={canWrite} submit={c=>void execute(c)} report={setError}/>)}
    {data&&!data.items.length&&<p>No hay ejercicios guardados para este contexto.</p>}{data?.truncated&&<p>Se muestran las últimas cincuenta conciliaciones; los registros anteriores se conservan.</p>}
    {pending&&<div><p>Hay una operación sin confirmar. Se conserva el comando original en esta pestaña; reintenta antes de iniciar otra operación.</p><Button className="h-auto min-h-9 max-w-full whitespace-normal break-words py-2" type="button" disabled={busy} onClick={()=>void execute(pending)}>Reintentar la misma conciliación</Button></div>}
  </section>;
}
