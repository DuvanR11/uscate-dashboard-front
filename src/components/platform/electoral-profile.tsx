'use client';
import { useCallback, useState } from 'react';
import { isAxiosError } from 'axios';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { usePlatformCapability } from './access-context';
import { QuerySection } from './query-section';
import { extractErrorMessage } from '@/lib/api/platform';
import { getElectoralOptions, getElectoralProfile, saveElectoralProfile, type ElectoralOptions, type ElectoralProfileCommand, type ElectoralProfileState, type ElectoralUser, type TeamFunction } from '@/lib/api/electoral-profile';

const functions: Record<TeamFunction, string> = { CANDIDATE: 'Aspirante', COORDINATOR: 'Coordinación', MEMBER: 'Colaborador' };
const selectClass = 'block w-full min-w-0 rounded border bg-background p-2';
function Profile({ initial }: { initial: ElectoralProfileState }) {
  const canWrite = usePlatformCapability('ORGANIZATIONS_CREATE');
  const [data, setData] = useState(initial), [name, setName] = useState(initial.profile?.aspirantName ?? ''), [dataset, setDataset] = useState(initial.profile?.datasetCode ?? '');
  const [team, setTeam] = useState<Record<string, { function: TeamFunction; user: ElectoralUser }>>(() => Object.fromEntries((initial.profile?.team ?? []).map(m => [m.userId, { function: m.function, user: m.user }])));
  const [options, setOptions] = useState<ElectoralOptions | null>(null), [search, setSearch] = useState(''), [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false), [pending, setPending] = useState<ElectoralProfileCommand | null>(null), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const id = data.organization.id;
  async function reload() {
    setBusy(true); setError('');
    try { const next = await getElectoralProfile(id); setData(next); setName(next.profile?.aspirantName ?? ''); setDataset(next.profile?.datasetCode ?? ''); setTeam(Object.fromEntries((next.profile?.team ?? []).map(m => [m.userId, { function: m.function, user: m.user }]))); }
    catch (e) { setError(extractErrorMessage(e) || 'No se pudo actualizar la ficha.'); } finally { setBusy(false); }
  }
  async function find() {
    setBusy(true); setError('');
    try { setOptions(await getElectoralOptions(id, search)); } catch (e) { setError(extractErrorMessage(e) || 'No se pudieron consultar los conjuntos y usuarios.'); } finally { setBusy(false); }
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true); setError(''); setNotice('');
    const command = pending ?? { requestKey: crypto.randomUUID(), expectedRevision: data.profile?.revision ?? 0, aspirantName: name.trim(), datasetCode: dataset, reason: reason.trim(), team: Object.entries(team).map(([userId, m]) => ({ userId, function: m.function })) };
    setPending(command);
    try { await saveElectoralProfile(id, command); const next = await getElectoralProfile(id); setData(next); setPending(null); setReason(''); setNotice('Ficha electoral y equipo guardados.'); }
    catch (e) { if (isAxiosError(e) && e.response && e.response.status >= 400 && e.response.status < 500 && ![408, 429].includes(e.response.status)) setPending(null); setError(extractErrorMessage(e) || 'No se pudo confirmar el guardado. Reintenta la misma operación.'); } finally { setBusy(false); }
  }
  const datasets = [...(options?.datasets ?? [])];
  if (data.profile && !datasets.some(d => d.code === data.profile!.datasetCode)) datasets.unshift(data.profile.dataset);
  const users = new Map([...(options?.users ?? []).map(u => [u.id, u] as const), ...Object.entries(team).map(([userId, m]) => [userId, m.user] as const)]);
  return <div className="min-w-0 space-y-5">
    <p>Registra al aspirante, la elección, el cargo, el territorio y las personas que forman su equipo.</p>
    <p className="text-sm text-muted-foreground">La ficha es un registro interno. La inscripción oficial de la candidatura, la cobertura contratada y los resultados disponibles se verifican por separado.</p>
    {data.profile ? <article className="space-y-2 rounded-lg border p-4 break-words" aria-label="Ficha electoral registrada"><h3 className="font-semibold">{data.profile.aspirantName}</h3><p>{data.profile.dataset.election.name} · {data.profile.dataset.election.electionDate}</p><p>{data.profile.dataset.corporation.name} · {data.profile.dataset.territory.name} ({data.profile.dataset.territoryCode}) · {data.profile.dataset.constituencyCode}</p><p>Conjunto: {data.profile.datasetCode}{data.profile.dataset.state === 'ARCHIVED' ? ' · Archivado en el catálogo' : ''}</p><p>Revisión {data.profile.revision}</p><ul>{data.profile.team.map(m => <li key={m.userId}>{m.user.fullName} · {functions[m.function]} · Rol de acceso: {m.user.role.name}{!m.user.isActive && ' · Cuenta inactiva: revisar asignación'}</li>)}</ul>{!data.profile.team.length && <p>Equipo pendiente de asignación.</p>}</article> : <p>No hay ficha electoral registrada para esta organización.</p>}
    {error && <p role="alert" className="break-words text-destructive">{error}</p>}{notice && <p role="status">{notice}</p>}
    <Button type="button" variant="outline" disabled={busy || Boolean(pending)} onClick={() => void reload()}>Recargar ficha</Button>
    {canWrite ? <form onSubmit={e => void submit(e)} className="space-y-4">
      <fieldset disabled={busy || Boolean(pending)} className="min-w-0 space-y-4">
        <label className="block">Nombre del aspirante<Input aria-label="Nombre del aspirante" required minLength={3} maxLength={180} value={name} onChange={e => setName(e.target.value)} /></label>
        <div className="space-y-2"><label className="block">Buscar conjunto o integrante<Input aria-label="Buscar conjunto o integrante" maxLength={80} value={search} onChange={e => setSearch(e.target.value)} /></label><Button type="button" variant="outline" onClick={() => void find()}>Consultar opciones</Button><p className="text-sm">Busca por nombre o código del conjunto, territorio, nombre o correo del integrante. Se muestran hasta 50 opciones de cada tipo.</p></div>
        {options && (options.truncated.datasets || options.truncated.users) && <p>Hay más resultados. Escribe una búsqueda más específica.</p>}
        <label className="block">Elección, cargo y territorio<select aria-label="Conjunto electoral" required className={selectClass} value={dataset} onChange={e => setDataset(e.target.value)}><option value="">Seleccionar conjunto del catálogo</option>{datasets.map(d => <option key={d.code} value={d.code}>{d.election.name} · {d.corporation.name} · {d.territory.name} · {d.constituencyCode} · {d.code}</option>)}</select></label>
        {options && !options.datasets.length && <p>No se encontraron conjuntos. Configura primero la elección, el cargo y el territorio en Administración → Fuentes territoriales → Catálogo territorial nacional.</p>}
        <div className="space-y-2"><h3 className="font-medium">Equipo de la organización</h3><p className="text-sm">Asigna funciones a cuentas de esta organización. Los permisos y cupos se mantienen en la gestión de usuarios. El aspirante puede registrarse sin cuenta de acceso.</p>
          {[...users.values()].map(user => <div key={user.id} className="min-w-0 space-y-2 rounded border p-3 break-words"><label className="flex gap-2 items-start"><input type="checkbox" aria-label={'Incluir a ' + user.fullName} checked={Boolean(team[user.id])} disabled={!user.isActive && !team[user.id]} onChange={e => setTeam(current => { const next = { ...current }; if (e.target.checked) next[user.id] = { user, function: 'MEMBER' }; else delete next[user.id]; return next; })} /><span>{user.fullName} · {user.email} · {user.role.name}{!user.isActive && ' · Inactivo: retira la asignación para guardar'}</span></label>{team[user.id] && <select className={selectClass} aria-label={'Función de ' + user.fullName} value={team[user.id].function} onChange={e => setTeam(current => ({ ...current, [user.id]: { user, function: e.target.value as TeamFunction } }))}>{Object.entries(functions).map(([code, label]) => <option key={code} value={code}>{label}</option>)}</select>}</div>)}
          {options && !options.users.length && <p>No hay usuarios activos con esa búsqueda. Las cuentas se crean desde Usuarios dentro de la organización, respetando sus cupos.</p>}
        </div>
        <label className="block">Motivo del registro o cambio<Input aria-label="Motivo de la ficha electoral" required minLength={10} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} /></label>
      </fieldset>
      {pending && <p>Hay un guardado pendiente de confirmar. Reintenta para recuperar su resultado antes de hacer otro cambio.</p>}
      <Button type="submit" disabled={busy || (!pending && (!dataset || name.trim().length < 3 || reason.trim().length < 10))}>{busy ? 'Guardando…' : pending ? 'Reintentar el mismo guardado' : 'Guardar ficha electoral'}</Button>
    </form> : <p>Tu cuenta tiene acceso de consulta a la ficha electoral.</p>}
    <details><summary>Historial electoral ({data.history.length})</summary><ol>{data.history.map(h => <li key={h.id} className="border-b py-2 break-words">Revisión {h.revision} · {new Date(h.createdAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })} · {h.actorEmail}<p>{h.reason}</p></li>)}</ol><p className="text-sm">Se muestran las últimas veinte revisiones.</p></details>
  </div>;
}
export function ElectoralProfilePanel({ organizationId }: { organizationId: string }) {
  const load = useCallback(() => getElectoralProfile(organizationId), [organizationId]);
  return <QuerySection key={organizationId} title="Aspirante y equipo electoral" load={load}>{initial => <Profile initial={initial} />}</QuerySection>;
}
