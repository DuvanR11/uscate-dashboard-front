'use client';
import { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePermission } from '@/hooks/use-permission';
import { useAuthStore } from '@/store/auth-store';
import { extractErrorMessage } from '@/lib/api/platform';
import { commandGeographicReview, getGeographicReview, getGeographicReviewHistory, type ReviewAction, type ReviewCommand, type ReviewEvidence, type ReviewWorkflow } from '@/lib/api/territorial-geographic-review';
import { QuerySection } from './query-section';

const actions: Record<ReviewAction, string> = { ASSIGN: 'Asignar responsable', ATTACH_EVIDENCE: 'Registrar evidencia', WITHDRAW_EVIDENCE: 'Retirar evidencia', ACCEPT_REVIEW: 'Aceptar revisión documental', REQUEST_CHANGES: 'Solicitar correcciones', REVOKE: 'Revocar decisión' };
const statuses: Record<string, string> = { PENDING: 'Pendiente de revisión', REVIEWED: 'Revisión documental aceptada', CHANGES_REQUESTED: 'Correcciones solicitadas', REVOKED: 'Decisión revocada', STALE: 'Revisar nueva versión de fuentes', REVIEWER_INACTIVE: 'Responsable sin autorización vigente' };
const emptyEvidence: ReviewEvidence = { title: '', url: '', sha256: '', issuer: '', documentDate: '', scope: '', limitations: '' };
const selectClass = 'mt-1 block w-full min-w-0 rounded border bg-background p-2';

function Workflow({ initial }: { initial: ReviewWorkflow }) {
  const [data, setData] = useState(initial);
  const [key, setKey] = useState(initial.targets[0].key);
  const [action, setAction] = useState<ReviewAction>('ASSIGN');
  const [assigneeId, setAssigneeId] = useState('');
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [evidenceId, setEvidenceId] = useState('');
  const [evidenceIds, setEvidenceIds] = useState<string[]>([]);
  const [acknowledge, setAcknowledge] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const pending = useRef<{ fingerprint: string; command: ReviewCommand } | null>(null);
  const canWrite = usePermission('PLATAFORMA', 'canWrite');
  const userId = useAuthStore(s => s.user?.id);
  const target = data.targets.find(t => t.key === key)!;
  const assignedToMe = target.assignee?.id === userId;
  async function reload() {
    setBusy(true); setError(''); setNotice('');
    try { setData(await getGeographicReview()); pending.current = null; }
    catch (e) { setError(extractErrorMessage(e) || 'No se pudo actualizar la revisión.'); }
    finally { setBusy(false); }
  }
  async function save(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    const body = { expectedRevision: data.revision, reportHash: data.reportHash, targetKey: key, action, reason,
      ...(action === 'ASSIGN' ? { assigneeId } : {}), ...(action === 'ATTACH_EVIDENCE' ? { evidence } : {}),
      ...(action === 'WITHDRAW_EVIDENCE' ? { evidenceId } : {}),
      ...(action === 'ACCEPT_REVIEW' ? { evidenceIds, acknowledgeDocumentaryOnly: acknowledge } : {}) };
    const fingerprint = JSON.stringify(body);
    if (pending.current?.fingerprint !== fingerprint) pending.current = { fingerprint, command: { ...body, requestKey: crypto.randomUUID() } };
    try {
      const result = await commandGeographicReview(pending.current.command);
      setData(result.state); pending.current = null; setReason(''); setEvidenceIds([]); setAcknowledge(false); setEvidenceId('');
      if (action === 'ATTACH_EVIDENCE') setEvidence(emptyEvidence);
      setNotice(`Operación registrada en la revisión ${result.receipt.revision}.`);
    } catch (e) { setError(extractErrorMessage(e) || 'No se pudo confirmar la operación. Puedes reintentar con los mismos datos o actualizar el estado.'); }
    finally { setBusy(false); }
  }
  async function moreHistory() {
    if (!data.nextBeforeRevision) return;
    setBusy(true); setError('');
    try { const more = await getGeographicReviewHistory(data.nextBeforeRevision); setData(d => ({ ...d, history: [...d.history, ...more.history], nextBeforeRevision: more.nextBeforeRevision })); }
    catch (e) { setError(extractErrorMessage(e) || 'No se pudo consultar el historial.'); }
    finally { setBusy(false); }
  }
  return <div className="min-w-0 space-y-4">
    <p>1. Asigna un responsable. 2. Registra la referencia y la huella del documento. 3. El responsable acepta la revisión o solicita correcciones. Las decisiones se pueden revocar y quedan en el historial.</p>
    <p><strong>{data.reviewedCount} de 10 revisiones documentales aceptadas.</strong> La validación geográfica y la publicación submunicipal siguen pendientes.</p>
    <Button type="button" variant="outline" disabled={busy} onClick={() => void reload()}>Actualizar revisión</Button>
    {error && <p role="alert" className="text-destructive">{error}</p>}
    {notice && <p role="status">{notice}</p>}
    <label className="block">Caso o requisito<select aria-label="Caso o requisito" className={selectClass} value={key} disabled={busy} onChange={e => { setKey(e.target.value); setEvidenceIds([]); setEvidenceId(''); setAcknowledge(false); setReason(''); setError(''); setNotice(''); }}>{data.targets.map(t => <option key={t.key} value={t.key}>{statuses[t.status] ?? t.status} · {t.title}</option>)}</select></label>
    <div className="space-y-2 rounded border p-3 text-sm">
      <p><strong>{target.title}</strong> · {statuses[target.status] ?? target.status}</p>
      <p>Responsable: {target.assignee?.email ?? 'Sin asignar'}</p><p>{target.requiredEvidence}</p>
      {target.decision && <p>Última decisión: {target.decision.reason} · {target.decision.actorEmail}</p>}
      <p>Las evidencias se registran como referencias declaradas por el operador. El sistema no descarga el documento ni comprueba automáticamente su autenticidad o suficiencia.</p>
      {target.evidence.length === 0 ? <p>Sin evidencias registradas para este caso.</p> : <ul aria-label="Evidencias del caso" className="space-y-3">{target.evidence.map(e => <li key={e.id} className="break-words"><a className="underline" href={e.url} target="_blank" rel="noopener noreferrer">{e.title}</a> · {e.withdrawn ? 'Retirada' : e.current ? 'Versión actual' : 'Versión anterior: requiere nuevo registro y revisión'}<p>{e.issuer} · {e.documentDate} · {e.scope}</p><p>Límites de la evidencia: {e.limitations}</p><p className="break-all text-xs">SHA-256: {e.sha256}</p></li>)}</ul>}
    </div>
    {!canWrite ? <p>Tu acceso permite consultar la revisión. Se requiere permiso de escritura en Plataforma para registrar cambios.</p> : <form onSubmit={save} className="space-y-3" aria-label="Registrar revisión geográfica">
      <fieldset disabled={busy} className="min-w-0 space-y-3">
        <label className="block">Acción<select aria-label="Acción de revisión" className={selectClass} value={action} onChange={e => { setAction(e.target.value as ReviewAction); setError(''); setNotice(''); }}>{Object.entries(actions).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        {action === 'ASSIGN' && <label className="block">Responsable<select required aria-label="Responsable de revisión" className={selectClass} value={assigneeId} onChange={e => setAssigneeId(e.target.value)}><option value="">Seleccionar operador autorizado</option>{data.operators.map(o => <option key={o.id} value={o.id}>{o.fullName} · {o.email}</option>)}</select></label>}
        {action === 'ATTACH_EVIDENCE' && <div className="grid min-w-0 gap-3 sm:grid-cols-2">{(Object.entries({ title: 'Título del documento', url: 'URL pública del documento', sha256: 'SHA-256 del archivo original', issuer: 'Entidad emisora', documentDate: 'Fecha del documento', scope: 'Qué acredita para este caso', limitations: 'Qué no acredita y limitaciones' }) as [keyof ReviewEvidence, string][]).map(([field, label]) => <label className={`block min-w-0 ${field === 'scope' || field === 'limitations' ? 'sm:col-span-2' : ''}`} key={field}>{label}{field === 'scope' || field === 'limitations' ? <textarea className={selectClass} required minLength={10} maxLength={1500} value={evidence[field]} onChange={e => setEvidence(v => ({ ...v, [field]: e.target.value }))} /> : <Input aria-label={label} required type={field === 'url' ? 'url' : field === 'documentDate' ? 'date' : 'text'} maxLength={field === 'sha256' ? 64 : field === 'url' ? 1000 : 200} pattern={field === 'sha256' ? '[a-f0-9]{64}' : undefined} value={evidence[field]} onChange={e => setEvidence(v => ({ ...v, [field]: e.target.value }))} />}</label>)}</div>}
        {action === 'WITHDRAW_EVIDENCE' && <label className="block">Evidencia que se retira<select required className={selectClass} value={evidenceId} onChange={e => setEvidenceId(e.target.value)}><option value="">Seleccionar evidencia</option>{target.evidence.filter(e => !e.withdrawn).map(e => <option key={e.id} value={e.id}>{e.title}</option>)}</select></label>}
        {['ACCEPT_REVIEW', 'REQUEST_CHANGES'].includes(action) && !assignedToMe && <p>Esta decisión debe registrarla el responsable asignado con su propia sesión.</p>}
        {action === 'ACCEPT_REVIEW' && <div className="space-y-3"><p>Selecciona las evidencias efectivamente revisadas. Si cambian las fuentes del informe, se deberá repetir la revisión.</p>{target.evidence.filter(e => e.current && !e.withdrawn).map(e => <label key={e.id} className="flex items-start gap-2"><input type="checkbox" checked={evidenceIds.includes(e.id)} onChange={event => setEvidenceIds(ids => event.target.checked ? [...ids, e.id] : ids.filter(id => id !== e.id))} />{e.title}</label>)}<label className="flex items-start gap-2"><input type="checkbox" required checked={acknowledge} onChange={e => setAcknowledge(e.target.checked)} />Confirmo que revisé los documentos seleccionados. Esta aceptación no certifica geometrías ni publica resultados.</label></div>}
        <label className="block">Motivo de la operación<textarea aria-label="Motivo de revisión" className={selectClass} required minLength={10} maxLength={1500} value={reason} onChange={e => setReason(e.target.value)} /></label>
        <Button type="submit" className="h-auto max-w-full whitespace-normal" disabled={reason.trim().length < 10 || (['ACCEPT_REVIEW', 'REQUEST_CHANGES'].includes(action) && !assignedToMe) || (action === 'ACCEPT_REVIEW' && !evidenceIds.length) || (action === 'REVOKE' && !target.decision)}>{busy ? 'Registrando…' : actions[action]}</Button>
      </fieldset>
    </form>}
    <details><summary className="cursor-pointer font-medium">Historial de operaciones ({data.history.length} cargadas)</summary><ol className="mt-3 space-y-3">{data.history.map(h => <li key={h.id} className="break-words rounded border p-3 text-sm"><strong>Revisión {h.revision} · {actions[h.action]}</strong><p>{data.targets.find(t => t.key === h.targetKey)?.title ?? h.targetKey}</p><p>{h.actorEmail} · {new Date(h.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p><p>{h.reason}</p>{h.payload.assignee && <p>Responsable: {h.payload.assignee.email}</p>}{h.payload.evidence && <p>Documento: {h.payload.evidence.title} · {h.payload.evidence.sha256}</p>}{h.reportHash !== data.reportHash && <p>Operación registrada sobre una versión anterior de las fuentes.</p>}</li>)}</ol>{data.nextBeforeRevision && <Button variant="outline" disabled={busy} onClick={() => void moreHistory()}>Cargar operaciones anteriores</Button>}</details>
    <details><summary className="cursor-pointer font-medium">Pendientes para publicar por comuna o corregimiento</summary><ul className="mt-2 list-disc space-y-2 pl-5">{data.publicationBlockers.map(b => <li key={b}>{b}</li>)}</ul></details>
  </div>;
}
export function TerritorialGeographicReviewPanel() {
  return <QuerySection title="Revisión interna de geografía" load={getGeographicReview}>{data => <Workflow initial={data} />}</QuerySection>;
}
