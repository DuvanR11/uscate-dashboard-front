'use client';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { usePlatformAccess, usePlatformCapability } from './access-context';
import { extractErrorMessage } from '@/lib/api/platform';
import { actOnResultVersion, listResultVersions, prepareResultVersion, type TerritorialResultVersion, type PublicationAction, type PublicationCommand } from '@/lib/api/territorial-publications';
const states={DRAFT:'Pendiente de revisión',REVIEWED:'Revisada, pendiente de publicación',PUBLISHED:'Publicada',WITHDRAWN:'Retirada'};
const actions={review:'Confirmar revisión',publish:'Publicar versión',withdraw:'Retirar versión'};
const events:Record<string,string>={PREPARED:'Preparación',REVIEWED:'Revisión',PUBLISHED:'Publicación',WITHDRAWN:'Retiro',SUPERSEDED:'Sustitución por otra versión'};
const date=(value:string)=>new Date(value).toLocaleString('es-CO',{timeZone:'America/Bogota'});
function VersionCard({version,canWrite,onUpdated}:{version:TerritorialResultVersion;canWrite:boolean;onUpdated:()=>Promise<void>}) {
  const [reason,setReason]=useState(''),[accepted,setAccepted]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
  const [pending,setPending]=useState<{action:PublicationAction;input:PublicationCommand}|null>(null);
  const action:PublicationAction|null=pending?.action??(version.state==='DRAFT'?'review':version.state==='REVIEWED'?'publish':version.state==='PUBLISHED'?'withdraw':null);
  async function act(){
    if(!action)return;
    const command=pending??{action,input:{requestKey:crypto.randomUUID(),expectedRevision:version.revision,reason:reason.trim(),...(action==='review'?{acceptLimitations:accepted}:{})}};
    setPending(command);setBusy(true);setError('');
    try{await actOnResultVersion(version.id,command.action,command.input);await onUpdated();setPending(null);setReason('');setAccepted(false);}catch(e){setError(extractErrorMessage(e)||'No se pudo completar. Reintenta la misma decisión o recarga para comprobar el estado.');}finally{setBusy(false);}
  }
  return <article className="space-y-3 rounded-lg border p-4">
    <h4 className="font-semibold">Versión {version.number} · {states[version.state]}</h4>
    <p className="text-sm">Neiva · Concejo · {version.payload.electionDate} · Correspondencia revisada {version.payload.geographyRevision}.</p>
    <p className="text-sm">Resumen del E-26 aportado, contrastado con E-24 y MMV. Finalización declarada: {date(version.payload.sources.actas.statedScrutinyCompletion)}.</p>
    <ul className="list-disc space-y-1 pl-5 text-sm"><li>{version.payload.groupNameCatalog ? `Nombres del catálogo ${version.payload.groupNameCatalog.version}, contrastados con E-26 y E-24 para esta elección municipal.` : 'Esta versión conserva agrupaciones por código, sin un catálogo de nombres incorporado.'}</li><li>Actas aportadas por el usuario, sin verificación criptográfica. Tipo y corte originales del MMV sin acreditar.</li><li>Sin detalle por mesa, puesto, zona o candidato; no se imputan filas ausentes como ceros.</li><li>Sin participación ni edades de votantes. El porcentaje por agrupación usa votos válidos, incluido blanco.</li></ul>
    <dl className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">{Object.entries(version.payload.totals).map(([key,value])=><div key={key}><dt>{({GROUP:'Agrupaciones',BLANK:'Blanco',NULL:'Nulo',UNMARKED:'No marcado',VALID:'Votos válidos'} as Record<string,string>)[key]??key}</dt><dd className="font-semibold">{value.toLocaleString('es-CO')}</dd></div>)}</dl>
    <details><summary className="cursor-pointer text-sm">Revisar cifras de las {version.payload.groups.length} agrupaciones</summary><div className="overflow-auto"><table className="w-full text-sm"><thead><tr><th className="text-left">Agrupación</th><th className="text-left">Código acta</th><th className="text-left">Código MMV</th><th className="text-right">Votos</th></tr></thead><tbody>{version.payload.groups.map(group=><tr key={group.mmvCode}><td className="min-w-48 pr-2">{group.name??'Identificada por código'}</td><td>{group.documentCode}</td><td>{group.mmvCode}</td><td className="text-right">{group.votes.toLocaleString('es-CO')}</td></tr>)}</tbody></table></div></details>
    {version.publishedAt&&<p className="text-sm">Publicada el {date(version.publishedAt)}{version.withdrawnAt?`; retirada el ${date(version.withdrawnAt)}`:''}.</p>}
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    {canWrite&&action&&<form onSubmit={e=>{e.preventDefault();void act();}} className="space-y-3">
      <label className="block text-sm">Motivo de {action==='review'?'revisión':action==='publish'?'publicación':'retiro'}<Input value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} required disabled={busy||pending!==null}/></label>
      {action==='review'&&<label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={accepted} disabled={busy||pending!==null} onChange={e=>setAccepted(e.target.checked)} required/><span>Revisé las cifras y reconozco el alcance municipal y las limitaciones de estas fuentes.</span></label>}
      {action==='publish'&&<p className="text-sm">Publicar sustituye cualquier versión vigente del piloto. Solo podrán consultarla organizaciones con acceso territorial válido; no activa su demo.</p>}
      {action==='withdraw'&&<p className="text-sm">Retirar impide nuevas consultas a esta versión. Se conserva el historial y no se restaura otra versión automáticamente.</p>}
      <Button type="submit" variant={action==='withdraw'?'destructive':'default'} disabled={busy||reason.trim().length<10||(action==='review'&&!accepted)}>{busy?'Registrando…':pending?'Reintentar la misma decisión':actions[action]}</Button>
      {pending&&<p className="text-xs text-muted-foreground">La solicitud conserva su clave. Recarga las versiones para comprobar si quedó registrada.</p>}
    </form>}
    <details className="text-sm"><summary className="cursor-pointer">Historial de esta versión</summary><ul className="space-y-2 py-2">{version.events.map(event=><li key={event.id}>{events[event.action]??event.action} · {event.actorEmail} · {date(event.createdAt)}<p>{event.reason}</p></li>)}</ul></details>
  </article>;
}
export function TerritorialPublicationsPanel({batchId,ready}:{batchId:string;ready:boolean}) {
  const scope=usePlatformAccess(),capable=usePlatformCapability('CATALOG_MANAGE'),write=usePermission('PLATAFORMA','canWrite');
  const allowed=Boolean(scope?.enabled&&scope.allOrganizations&&capable);
  const [versions,setVersions]=useState<TerritorialResultVersion[]>([]),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(''),[reason,setReason]=useState(''),[requestKey,setRequestKey]=useState('');
  const load=useCallback(async()=>{const result=await listResultVersions(batchId);setVersions(result);setError('');},[batchId]);
  useEffect(()=>{if(!allowed)return;let active=true;listResultVersions(batchId).then(result=>{if(active)setVersions(result);}).catch(e=>{if(active)setError(extractErrorMessage(e)||'No se pudieron consultar las versiones.');}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[batchId,allowed]);
  async function prepare(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const key=requestKey||crypto.randomUUID();setRequestKey(key);try{await prepareResultVersion(batchId,{requestKey:key,reason:reason.trim(),methodologyVersion:'NEIVA_E26_MUNICIPAL_NAMES_V2'});await load();setRequestKey('');setReason('');}catch(e){setError(extractErrorMessage(e)||'No se pudo preparar. Reintenta con el mismo motivo.');}finally{setBusy(false);}}
  if(!allowed)return null;
  return <section className="space-y-4 border-t pt-4"><h3 className="text-lg font-semibold">Versiones revisadas y publicación</h3><p className="text-sm">El lote original permanece inmutable. Cada versión conserva cifras, fuentes y revisión geográfica; revisar y publicar son decisiones separadas.</p>
    {error&&<p role="alert" className="text-destructive">{error}</p>}
    <Button type="button" variant="outline" disabled={busy} onClick={()=>load().catch(e=>setError(extractErrorMessage(e)||'No se pudieron consultar las versiones.'))}>Recargar versiones</Button>
    {write&&ready&&<form onSubmit={prepare} className="space-y-3"><p className="text-sm">La nueva versión incorporará el catálogo revisado de nombres. Se conservan códigos, votos y fuentes; revisar y publicar siguen siendo decisiones separadas.</p><label className="block text-sm">Motivo de preparación<Input value={reason} onChange={e=>setReason(e.target.value)} minLength={10} maxLength={500} required disabled={busy||Boolean(requestKey)}/></label><Button disabled={busy||reason.trim().length<10}>{busy?'Preparando…':requestKey?'Reintentar preparación':'Preparar versión con nombres'}</Button></form>}
    {loading?<p>Cargando versiones…</p>:versions.length?versions.map(version=><VersionCard key={`${version.id}-${version.revision}`} version={version} canWrite={write} onUpdated={load}/>):<p>Todavía no hay versiones preparadas.</p>}
  </section>;
}
