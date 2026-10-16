'use client';
import {useCallback,useState} from 'react';
import {usePlatformAccess,usePlatformCapability} from '@/components/platform/access-context';
import {QuerySection} from '@/components/platform/query-section';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {useAuthStore} from '@/store/auth-store';
import {TerritorialGeographyPanel} from '@/components/platform/territorial-geography';
import {TerritorialHealthPanel} from '@/components/platform/territorial-health';
import {TerritorialHealthSchedulePanel} from '@/components/platform/territorial-health-schedule';
import {TerritorialTrialPanel} from '@/components/platform/territorial-trial';
import {TerritorialPublicationsPanel} from '@/components/platform/territorial-publications';
import {extractErrorMessage} from '@/lib/api/platform';
import {createTerritorialBatch,listTerritorialBatches,downloadTerritorialEvidence,TerritorialBatch} from '@/lib/api/territorial-data';
const labels:Record<string,string>={GROUP:'Agrupaciones',BLANK:'Blanco',NULL:'Nulo',UNMARKED:'No marcado',VALID:'Votos válidos'};
export default function TerritorialDataPage(){
 const access=usePlatformAccess();const capable=usePlatformCapability('CATALOG_MANAGE');const actor=useAuthStore(s=>s.user?.id);
 const [requestKey,setRequestKey]=useState('');const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [generation,setGeneration]=useState(0);
 const load=useCallback(()=>listTerritorialBatches(),[]);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const form=new FormData(event.currentTarget);const key=requestKey||crypto.randomUUID();setRequestKey(key);form.set('requestKey',key);try{await createTerritorialBatch(form);setGeneration(n=>n+1);setRequestKey('');setReason('');}catch(e){setError(extractErrorMessage(e)||'No se pudo guardar. Conserva los archivos y reintenta esta operación.');}finally{setBusy(false);}}
 async function download(batch:TerritorialBatch,fileId:string){setError('');try{const result=await downloadTerritorialEvidence(batch.id,fileId);window.open(result.url,'_blank','noopener,noreferrer');}catch(e){setError(extractErrorMessage(e)||'No se pudo descargar la evidencia.');}}
 if(!access?.enabled||!access.allOrganizations||!capable)return <p className="p-8">Se requiere acceso interno global y autorización para administrar el catálogo.</p>;
 return <main className="mx-auto max-w-6xl space-y-6 p-6">
  <h1 className="text-2xl font-bold">Fuentes territoriales</h1>
  <p>Revisión del piloto Concejo de Neiva 2023. Los originales permanecen privados; consultar resultados requiere una versión publicada y acceso territorial vigente.</p>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  <TerritorialHealthPanel/>
  <TerritorialHealthSchedulePanel/>
  <TerritorialGeographyPanel/>
  <TerritorialTrialPanel/>
  <form onSubmit={submit} className="space-y-4 rounded-xl border p-5">
   <h2 className="font-semibold">Registrar los originales revisados</h2>
   <p className="text-sm text-muted-foreground">Selecciona el ZIP oficial de Huila 2023 y los E-24/E-26 ya contrastados. Se guardarán como evidencias privadas. Esta entrega acepta únicamente esos archivos, sin modificaciones.</p>
   <fieldset disabled={busy} className="space-y-4">
    <label className="block">ZIP MMV Huila 2023<Input type="file" name="source" accept=".zip" required/></label>
    <label className="block">E-24 CON (a.pdf)<Input type="file" name="e24" accept=".pdf" required/></label>
    <label className="block">E-26 CON (a (1).pdf)<Input type="file" name="e26" accept=".pdf" required/></label>
    <label className="block">Motivo de registro<Input name="reason" value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} required/></label>
    {requestKey&&<p className="text-sm">Hay una operación pendiente. Reintenta con los mismos archivos y motivo.</p>}
    <Button type="submit">{busy?'Guardando evidencias…':'Guardar borrador privado'}</Button>
   </fieldset>
  </form>
  <QuerySection key={generation} title="Lotes y vista previa" load={load}>{batches=>!batches.length?<p>Aún no hay lotes registrados.</p>:batches.map(batch=><article key={batch.id} className="space-y-3 rounded-lg border p-4">
   <h3 className="font-semibold">{batch.preview.corporation} · {batch.preview.municipality}, {batch.preview.department} · {batch.preview.electionDate}</h3>
   <p>{batch.state==='DOCUMENT_MATCHED_DRAFT'?'Lote fuente con evidencias guardadas':'Pendiente de guardar evidencias'}. El lote no se publica directamente.</p>
   <p className="text-sm">Acta: {new Date(batch.preview.documentCompletion).toLocaleString('es-CO',{timeZone:'America/Bogota'})}. El corte original del MMV sigue sin acreditar.</p>
   <dl className="grid gap-3 sm:grid-cols-3">{Object.entries(batch.preview.totals).map(([kind,value])=><div key={kind}><dt>{labels[kind]||kind}</dt><dd className="font-semibold">{value.toLocaleString('es-CO')}</dd></div>)}<div><dt>Mesas contrastadas</dt><dd>{batch.preview.observedTables}</dd></div></dl>
   <details><summary className="cursor-pointer">Ver {batch.preview.groups.length} agrupaciones por código</summary><div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Código del acta</th><th className="text-left">Código MMV</th><th className="text-right">Votos</th></tr></thead><tbody>{batch.preview.groups.map(group=><tr key={group.mmvCode}><td>{group.documentCode}</td><td>{group.mmvCode}</td><td className="text-right">{group.votes.toLocaleString('es-CO')}</td></tr>)}</tbody></table></div></details>
   <p className="text-sm">La correspondencia y el contrato se comprueban en los paneles anteriores. Las versiones municipales se revisan y publican a continuación; el detalle por mesa sigue pendiente.</p>
   <ul>{batch.evidence.map(file=><li key={file.id} className="flex flex-wrap items-center gap-2 py-1"><span>{file.kind} · {file.state==='STORED'?'Guardado':'Pendiente'}</span>{file.state==='STORED'&&<Button type="button" variant="outline" size="sm" onClick={()=>download(batch,file.id)}>Descargar original</Button>}</li>)}</ul>
   {batch.state==='PENDING_EVIDENCE'&&batch.createdById===actor&&<Button type="button" variant="outline" onClick={()=>{setRequestKey(batch.requestKey);setReason(batch.reason);window.scrollTo({top:0,behavior:'smooth'});}}>Reanudar carga con los mismos originales</Button>}
   <TerritorialPublicationsPanel batchId={batch.id} ready={batch.state==='DOCUMENT_MATCHED_DRAFT'}/>
  </article>)}</QuerySection>
 </main>;
}
