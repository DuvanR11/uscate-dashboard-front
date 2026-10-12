"use client";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SessionForm } from './support-session-form';
import { proposeSupportExtension, decideSupportExtension, resolveSupportReview, type SupportExtension, type SupportReservation } from '@/lib/api/support-reservations';
const time = (s:number) => `${Math.floor(s/60)} min ${s%60} s`;
const date = (s:string) => new Date(s).toLocaleString('es-CO',{timeZone:'America/Bogota'});
const buttonClass = 'h-auto max-w-full whitespace-normal';
export function SupportExtensions({ sessionId, reservation:r, extensions, platform, canManage, canFinance, onSaved }: { sessionId:string; reservation:SupportReservation; extensions:SupportExtension[]; platform:boolean; canManage:boolean; canFinance:boolean; onSaved:()=>void }) {
  const [creating,setCreating] = useState(false), [decision,setDecision] = useState<{id:string;action:'confirm'|'release'}|null>(null), [resolving,setResolving] = useState(false);
  const authorized = r.estimatedSeconds + extensions.filter(e=>e.state==='CONFIRMED').reduce((n,e)=>n+e.seconds,0);
  return <div className="space-y-3">
    <p>Máximo autorizado total: {time(authorized)}. Las extensiones requieren confirmación antes de agotar el tiempo autorizado, dentro del horario reservado. Las pausas no amplían el plazo de confirmación.</p>
    {extensions.map(e=><article key={e.id} className="space-y-2 rounded border p-3 break-words">
      <p className="font-semibold">Extensión: {time(e.seconds)} · {({PENDING:'Pendiente de confirmación',CONFIRMED:'Confirmada por el cliente',RELEASED:'Propuesta liberada',EXPIRED:'Propuesta vencida'} as Record<string,string>)[e.state]}</p>
      <p>{e.notice}</p><p>Confirmar antes de {date(e.confirmBefore)} (Colombia).</p><p>{date(e.createdAt)} · {e.actorName}: {e.reason}</p>
      {e.decision && <p>{date(e.decision.createdAt)} · {e.decision.actorName}: {e.decision.reason}</p>}
      {e.allocations.map(a=><p key={a.balanceId}>{a.sourceType==='MONTHLY'?'Incluido mensual':a.sourceType==='TRIAL'?'Prueba inicial':'Comprado'} · reservado {time(a.reservedSeconds)} · consumido {time(a.consumedSeconds)} · vence {date(a.expiresAt)}{['SETTLED','RELEASED'].includes(r.state) ? ` · liberado ${time(a.reservedSeconds-a.consumedSeconds)}` : ''}</p>)}
      {e.state==='PENDING' && r.state==='STARTED' && <div className="flex flex-wrap gap-2">
        {!platform && <Button className={buttonClass} onClick={()=>setDecision({id:e.id,action:'confirm'})}>Confirmar extensión</Button>}
        {(!platform || canManage) && <Button className={buttonClass} variant="outline" onClick={()=>setDecision({id:e.id,action:'release'})}>Liberar propuesta de extensión</Button>}
      </div>}
    </article>)}
    {platform && canManage && r.state==='STARTED' && !extensions.some(e=>e.state==='PENDING') && <Button className={buttonClass} variant="outline" onClick={()=>setCreating(v=>!v)}>Proponer minutos adicionales</Button>}
    {creating && <SessionForm label="Proponer extensión con información previa" onSaved={onSaved} send={d=>proposeSupportExtension(sessionId,d)} build={d=>({expectedVersion:r.version,seconds:Number(d.get('extraMinutes'))*60+Number(d.get('extraSeconds')),notice:String(d.get('notice')).trim(),reason:String(d.get('reason')).trim()})}>
      <p>El horario de agenda y los vencimientos se conservan. La propuesta compromete saldo, pero no habilita consumo hasta que el cliente confirme.</p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2"><label>Minutos adicionales<Input name="extraMinutes" type="number" min={0} max={1440} step={1} required /></label><label>Segundos adicionales<Input name="extraSeconds" type="number" min={0} max={59} defaultValue={0} step={1} required /></label></div>
      <label className="block">Información previa<Input name="notice" minLength={10} maxLength={2000} required /></label>
      <label className="block">Motivo público<Input name="reason" minLength={10} maxLength={2000} required /></label>
    </SessionForm>}
    {decision && <SessionForm key={`${decision.id}-${decision.action}`} label={decision.action==='confirm'?'Autorizar minutos adicionales':'Confirmar liberación de propuesta'} onSaved={onSaved} send={d=>decideSupportExtension(platform,sessionId,decision.id,decision.action,d)} build={d=>({expectedVersion:r.version,reason:String(d.get('reason')).trim()})}>
      {decision.action==='confirm' && <label className="flex gap-2"><input type="checkbox" required />He leído el aviso y las fuentes; autorizo estos minutos adicionales dentro del horario reservado.</label>}
      <label className="block">Motivo visible para el cliente<Input name="reason" minLength={10} maxLength={2000} required /></label>
    </SessionForm>}
    {platform && canManage && canFinance && r.state==='REVIEW' && <Button className={buttonClass} variant="outline" onClick={()=>setResolving(v=>!v)}>Resolver diferencia sin descuento</Button>}
    {resolving && <SessionForm label="Confirmar resolución financiera sin descuento" onSaved={onSaved} send={d=>resolveSupportReview(sessionId,d)} build={d=>({expectedVersion:r.version,reason:String(d.get('reason')).trim(),evidence:String(d.get('evidence')).trim()})}>
      <p>Conserva el tiempo real y su evidencia, libera el saldo comprometido y cierra la revisión sin descontar minutos ni generar cobros retroactivos.</p>
      <label className="block">Motivo público<Input name="reason" minLength={10} maxLength={2000} required /></label>
      <label className="block">Evidencia pública de la decisión<Input name="evidence" minLength={10} maxLength={4000} required /></label>
    </SessionForm>}
    {r.reviewResolvedAt && <div role="status"><p className="font-semibold">Diferencia resuelta sin descuento · {date(r.reviewResolvedAt)} · {r.reviewResolvedByName}</p><p>Evidencia: {r.reviewEvidence}</p></div>}
  </div>;
}
