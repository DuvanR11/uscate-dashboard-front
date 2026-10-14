'use client';
import {useState} from 'react';
import {usePlatformCapability} from './access-context';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {extractErrorMessage} from '@/lib/api/platform';
import {useAuthStore} from '@/store/auth-store';
import {decidePlatformException,listPlatformExceptions,type PlatformException} from '@/lib/api/platform-access';
import {previewTerritorialTrial,requestTerritorialTrial,activateTerritorialTrial,type TrialPreview} from '@/lib/api/territorial-data';
const date=(value:string)=>new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota'});
export function TerritorialTrialPanel(){
 const canRead=usePlatformCapability('ORGANIZATIONS_READ'),canRequest=usePlatformCapability('EXCEPTION_REQUEST'),canApprove=usePlatformCapability('EXCEPTION_APPROVE');
 const responsible=useAuthStore(s=>s.user?.email);
 const [org,setOrg]=useState(''),[reason,setReason]=useState(''),[preview,setPreview]=useState<TrialPreview|null>(null),[task,setTask]=useState<PlatformException|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 async function action(fn:()=>Promise<void>){setBusy(true);setError('');try{await fn();}catch(e){setError(extractErrorMessage(e)||'No se pudo completar la operación. Recarga la prueba antes de continuar.');}finally{setBusy(false);}}
 async function load(){const p=await previewTerritorialTrial(org.trim());setPreview(p);const response=await listPlatformExceptions(new URLSearchParams({page:'1',pageSize:'100'}),p.organizationId);setTask(response.items.find(t=>t.kind==='TRIAL'&&t.scope===p.authorizationScope&&['PENDING','APPROVED'].includes(t.effectiveStatus))??null);}
 if(!canRead)return null;
 return <section className="space-y-3 rounded-xl border p-5">
  <h2 className="text-lg font-semibold">Prueba del piloto territorial</h2>
  <p>Siete días de uso y siete de solo lectura. La prueba conserva los datos y condiciones actuales del CRM. Los resultados requieren publicación previa.</p>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  <form onSubmit={e=>{e.preventDefault();void action(load);}} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">Organización piloto<Input required value={org} onChange={e=>{setOrg(e.target.value);setPreview(null);setTask(null);}} placeholder="UUID de la organización piloto"/></label><Button disabled={busy}>Revisar prueba</Button></form>
  {preview&&<div className="space-y-3">
   <p className="font-semibold">{preview.name}</p><p>Plan: {preview.planId} · Territorio: {preview.territoryCode} · Responsable de solicitud: {responsible}</p>
   {preview.current?<div role="status"><p>Prueba registrada.</p><p>Uso hasta {date(preview.current.trialEndsAt)}; solo lectura hasta {date(preview.current.readOnlyEndsAt)}. Su autorización puede revocarse desde Excepciones.</p></div>:<>
    <label className="block">Motivo de la prueba<Input value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} required/></label>
    <div className="flex flex-wrap gap-2">
     {!task&&canRequest&&<Button disabled={busy||reason.trim().length<10} onClick={()=>void action(async()=>{setTask(await requestTerritorialTrial(preview.organizationId,reason.trim()));})}>Solicitar autorización</Button>}
     {task?.effectiveStatus==='PENDING'&&<><p>Autorización pendiente de aprobación.</p>{canApprove&&<Button disabled={busy||reason.trim().length<10} onClick={()=>void action(async()=>{await decidePlatformException(task,{version:task.version,decision:'APPROVE',reason:reason.trim()});await load();})}>Aprobar autorización de la prueba</Button>}</>}
     {task?.effectiveStatus==='APPROVED'&&<><p>Autorización aprobada. Los siete días comienzan al activar.</p>{canApprove&&<Button disabled={busy||reason.trim().length<10} onClick={()=>void action(async()=>{await activateTerritorialTrial(preview.organizationId,task.id,reason.trim());await load();})}>Activar prueba de siete días</Button>}</>}
    </div>
   </>}
  </div>}
 </section>;
}
