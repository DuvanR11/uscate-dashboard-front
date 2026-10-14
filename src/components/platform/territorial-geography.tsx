'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuerySection } from './query-section';
import { extractErrorMessage } from '@/lib/api/platform';
import { diagnoseTerritorialAccess, getTerritorialGeography, reviewTerritorialGeography, type GeographyConfig, type TerritorialContext } from '@/lib/api/territorial-data';

const reasons: Record<string,string> = {
 CONTRACT_UNVERIFIED:'Faltan un plan comercial y una vigencia comprobables.',
 SUBSCRIPTION_BLOCKED:'La suscripción está suspendida o cancelada.',
 TERRITORY_OUTSIDE_PILOT:'El territorio contratado no cubre Neiva.',
 CONTRACT_MODULE_UNVERIFIED:'El contrato no acredita el módulo de dashboard.',
 CONFIRMED_PAYMENT_UNVERIFIED:'No hay un pago confirmado que respalde la vigencia y el territorio actuales.',
 CURRENT_PERIOD_UNCOVERED:'La renovación futura no acredita cobertura del período actual.',
 GEOGRAPHY_UNVERIFIED:'La correspondencia geográfica está pendiente, revocada o su catálogo está inactivo.',
 PUBLICATION_PENDING:'Territorio comprobado. Falta revisar y publicar los resultados.',
};
function GeographyForm({config,onSaved}:{config:GeographyConfig;onSaved:()=>void}) {
 const [municipalityId,setMunicipalityId]=useState(config.current?.municipalityId.toString()??'');
 const [reason,setReason]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');
 async function save(active:boolean) {
  setBusy(true);setError('');
  try { await reviewTerritorialGeography({expectedRevision:config.current?.revision??0,municipalityId:active?Number(municipalityId):config.current!.municipalityId,active,reason});onSaved(); }
  catch(e){setError(extractErrorMessage(e)||'No se pudo registrar la revisión. Recarga para comprobar la versión actual.');}
  finally{setBusy(false);}
 }
 return <form onSubmit={e=>{e.preventDefault();void save(true);}} className="space-y-3">
  <p>Electoral {config.identity.electoralDepartmentCode}/{config.identity.electoralMunicipalityCode} → DIVIPOLA {config.identity.divipolaMunicipalityCode} · Neiva, Huila.</p>
  <p><a className="underline" href={config.identity.sourceUrl} target="_blank" rel="noopener noreferrer">Consultar ficha oficial del DANE (página 1)</a></p>
  <p>{config.current?`Revisión ${config.current.revision}: ${config.current.active?'activa':'revocada'}. Municipio local ${config.current.municipalityId}.`:'Pendiente de revisión. No hay una correspondencia activa.'}</p>
  {error&&<p role="alert" className="text-destructive">{error}</p>}
  <fieldset disabled={busy} className="space-y-3">
   <label className="block">Municipio del catálogo local
    <select className="mt-1 block w-full rounded border bg-background p-2" required value={municipalityId} onChange={e=>setMunicipalityId(e.target.value)}>
     <option value="">Seleccionar y verificar</option>
     {config.municipalities.map(m=><option key={m.id} value={m.id}>{m.name}, {m.department.name} · ID {m.id}</option>)}
    </select>
   </label>
   {!config.municipalities.length&&<p>Falta un municipio activo de Neiva en Huila. Revisa el catálogo antes de confirmar.</p>}
   <label className="block">Motivo y evidencia revisada<Input required minLength={10} maxLength={500} value={reason} onChange={e=>setReason(e.target.value)}/></label>
   <div className="flex flex-wrap gap-2"><Button type="submit" disabled={!municipalityId}>{busy?'Guardando…':'Confirmar correspondencia revisada'}</Button>
    {config.current?.active&&<Button type="button" variant="outline" disabled={reason.trim().length<10} onClick={()=>void save(false)}>Revocar correspondencia</Button>}
   </div>
  </fieldset>
  <details><summary>Historial de revisiones</summary><ul className="space-y-2 py-2">{config.history.map(r=><li key={r.id}>Revisión {r.revision} · {r.active?'Activa':'Revocada'} · {r.reviewedByEmail} · {new Date(r.createdAt).toLocaleString('es-CO',{timeZone:'America/Bogota'})}<p>{r.reason}</p></li>)}</ul></details>
 </form>;
}
export function TerritorialGeographyPanel() {
 const [generation,setGeneration]=useState(0);const [organizationId,setOrganizationId]=useState('');const [busy,setBusy]=useState(false);const [error,setError]=useState('');const [result,setResult]=useState<TerritorialContext|null>(null);
 async function diagnose(e:React.FormEvent<HTMLFormElement>) {
  e.preventDefault();setBusy(true);setError('');setResult(null);
  try{setResult(await diagnoseTerritorialAccess(organizationId.trim()));}catch(e){setError(extractErrorMessage(e)||'No se pudo comprobar el territorio.');}finally{setBusy(false);}
 }
 return <>
  <QuerySection key={generation} title="Correspondencia geográfica del piloto" load={getTerritorialGeography}>{config=><GeographyForm key={config.current?.revision??0} config={config} onSaved={()=>{setResult(null);setGeneration(n=>n+1);}}/>}</QuerySection>
  <section className="space-y-3 rounded-xl border p-5">
   <h2 className="text-lg font-semibold">Comprobar acceso por territorio contratado</h2>
   <p>El contrato debe acreditar Neiva o Huila, un pago confirmado y la vigencia correspondiente. Esta comprobación no publica el borrador.</p>
   <form onSubmit={diagnose} className="flex flex-wrap items-end gap-3"><label className="min-w-0 flex-1">ID de organización<Input required value={organizationId} onChange={e=>{setOrganizationId(e.target.value);setResult(null);}} placeholder="UUID de la organización"/></label><Button disabled={busy}>{busy?'Comprobando…':'Comprobar contrato'}</Button></form>
   {error&&<p role="alert" className="text-destructive">{error}</p>}
   {result&&<div role="status"><p className="font-semibold">{result.eligibleTerritory?'Territorio autorizado para el piloto':'Acceso territorial pendiente'}</p><p>{reasons[result.reason]??'Se requiere revisión del contrato.'}</p><p>Resultados: pendientes de publicación.</p></div>}
  </section>
 </>;
}
