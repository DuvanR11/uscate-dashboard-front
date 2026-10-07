'use client';
import Link from 'next/link';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';
import { usePlatformCapability } from './access-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { QuerySection } from './query-section';
import { extractErrorMessage } from '@/lib/api/platform';
import { createPlatformManagement, updatePlatformManagement, listPlatformManagement, listManagementOperators, MANAGEMENT_STATUS, MANAGEMENT_PRIORITY, type PlatformManagement, type ManagementInput, type ManagementUpdate, type ManagementStatus, type ManagementPriority } from '@/lib/api/platform-management';

const localDate = (value: string) => new Date(new Date(value).getTime() - 5 * 3600000).toISOString().slice(0, 16);

function ManagementForm({ task, organizationId, onSaved, onCancel }: { task?: PlatformManagement; organizationId?: string; onSaved: () => void; onCancel: () => void }) {
  const [saving, setSaving] = useState(false);
  const operatorId = useAuthStore((s) => s.user?.id);
  return <QuerySection title={task ? `Actualizar: ${task.title}` : 'Nueva gestión'} load={listManagementOperators}>{(operators) => <form className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setSaving(true);
    try {
      const input: ManagementInput = { title: String(data.get('title') ?? task?.title ?? '').trim(), notes: String(data.get('notes') ?? ''), priority: String(data.get('priority')) as ManagementPriority, assigneeId: String(data.get('assigneeId')), dueAt: new Date(`${data.get('dueAt')}:00-05:00`).toISOString() };
      if (task) {
        const update: ManagementUpdate = { version: task.version, reason: String(data.get('reason') ?? '').trim() };
        const status = String(data.get('status')) as ManagementStatus;
        if (status !== task.status) update.status = status;
        if (input.priority !== task.priority) update.priority = input.priority;
        if (input.assigneeId !== task.assigneeId) update.assigneeId = input.assigneeId;
        if (String(data.get('dueAt')) !== localDate(task.dueAt)) update.dueAt = input.dueAt;
        if (input.notes !== task.notes) update.notes = input.notes;
        if (Object.keys(update).length === 2) { toast.info('No hay cambios para guardar.'); return; }
        await updatePlatformManagement(task, update);
      } else if (organizationId) await createPlatformManagement(organizationId, input);
      toast.success('Gestión guardada'); onSaved();
    } catch (error) { toast.error(extractErrorMessage(error) || 'No se pudo guardar la gestión.'); }
    finally { setSaving(false); }
  }}>
    {!task && <label className="text-sm sm:col-span-2">Solicitud<Input name="title" required minLength={3} maxLength={160} /></label>}
    <label className="text-sm">Responsable<select name="assigneeId" required defaultValue={task?.assigneeId ?? operatorId} className="block w-full rounded-md border p-2"><option value="">Seleccionar</option>{task && !operators.some((op) => op.id === task.assigneeId) && <option value={task.assigneeId}>{task.assigneeName} (inactivo)</option>}{operators.map((op) => <option key={op.id} value={op.id}>{op.fullName}</option>)}</select></label>
    <label className="text-sm">Vencimiento (hora de Colombia)<Input name="dueAt" type="datetime-local" required defaultValue={task ? localDate(task.dueAt) : ''} /></label>
    <label className="text-sm">Prioridad<select className="block w-full rounded-md border p-2" name="priority" defaultValue={task?.priority ?? 'NORMAL'}>{Object.entries(MANAGEMENT_PRIORITY).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
    {task && <label className="text-sm">Estado<select className="block w-full rounded-md border p-2" name="status" defaultValue={task.status}>{Object.entries(MANAGEMENT_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>}
    <label className="text-sm sm:col-span-2">Notas<textarea className="block min-h-24 w-full rounded-md border p-2" name="notes" maxLength={5000} defaultValue={task?.notes} /></label>
    {task && <label className="text-sm sm:col-span-2">Motivo del cambio<Input name="reason" required minLength={3} maxLength={1000} /></label>}
    <div className="flex gap-2 sm:col-span-2"><Button type="submit" disabled={saving}>{saving ? 'Guardando…' : 'Guardar gestión'}</Button><Button type="button" variant="outline" disabled={saving} onClick={onCancel}>Cancelar</Button></div>
  </form>}</QuerySection>;
}

export function ManagementBoard({ organizationId, onUpdated }: { organizationId?: string; onUpdated?: () => void }) {
  const canWrite = usePlatformCapability('MANAGEMENT_MANAGE');
  const [status, setStatus] = useState('__active__');
  const [priority, setPriority] = useState('');
  const [assigneeId, setAssigneeId] = useState('');
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [editing, setEditing] = useState<PlatformManagement | null>(null);
  const [creating, setCreating] = useState(false);
  const load = useCallback(() => { const params = new URLSearchParams({ page: String(page), pageSize: '20' }); if (status === '__active__') params.set('activeOnly', 'true'); else if (status) params.set('status', status); if (priority) params.set('priority', priority); if (assigneeId) params.set('assigneeId', assigneeId); return listPlatformManagement(params, organizationId); }, [page, status, priority, assigneeId, organizationId]);
  const close = () => { setCreating(false); setEditing(null); };
  return <div className="space-y-4">
    <QuerySection title="Responsable" load={listManagementOperators}>{(operators) => <select aria-label="Filtrar por responsable" value={assigneeId} onChange={(event) => { setAssigneeId(event.target.value); setPage(1); }} className="rounded-md border p-2"><option value="">Todos los responsables</option>{operators.map((operator) => <option key={operator.id} value={operator.id}>{operator.fullName}</option>)}</select>}</QuerySection>
    <p className="text-sm text-muted-foreground">Seguimiento interno de solicitudes. Registrar o resolver una gestión no activa planes ni concede beneficios.</p>
    <div className="flex flex-wrap items-end gap-3"><label className="text-sm">Estado<select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="block rounded-md border p-2"><option value="__active__">Pendientes</option><option value="">Todos</option>{Object.entries(MANAGEMENT_STATUS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><label className="text-sm">Prioridad<select value={priority} onChange={(e) => { setPriority(e.target.value); setPage(1); }} className="block rounded-md border p-2"><option value="">Todas</option>{Object.entries(MANAGEMENT_PRIORITY).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label><Button variant="outline" onClick={() => setRevision((n) => n + 1)}>Actualizar</Button>{canWrite && organizationId && <Button onClick={() => { setEditing(null); setCreating(true); }}>Nueva gestión</Button>}</div>
    {canWrite && (editing || creating) && <ManagementForm key={editing?.id ?? 'new'} task={editing ?? undefined} organizationId={organizationId} onCancel={close} onSaved={() => { close(); setRevision((n) => n + 1); onUpdated?.(); }} />}
    <QuerySection key={revision} title="Gestiones" load={load}>{(result) => <>
      <p>{result.total} gestiones</p>
      {result.items.length ? <ul className="space-y-3">{result.items.map((task) => <li key={task.id} className="rounded-lg border p-4 space-y-2"><div className="flex flex-wrap justify-between gap-2"><strong>{task.title}</strong>{canWrite && <Button variant="outline" size="sm" onClick={() => { setCreating(false); setEditing(task); }}>Actualizar gestión</Button>}</div>{!organizationId && <Link href={`/platform/organizations/${task.organizationId}`} className="text-primary underline">{task.organization.name}</Link>}<p>{MANAGEMENT_STATUS[task.status]} · {MANAGEMENT_PRIORITY[task.priority]} · {task.assigneeName}</p><p className={new Date(task.dueAt).getTime() < Date.now() && !['DONE', 'CANCELLED'].includes(task.status) ? 'text-red-700 font-medium' : 'text-muted-foreground'}>Vence: {new Date(task.dueAt).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</p><p className="whitespace-pre-wrap text-sm">{task.notes}</p></li>)}</ul> : <p>No hay gestiones con estos filtros.</p>}
      <div className="flex gap-3 items-center"><Button variant="outline" disabled={page === 1} onClick={() => setPage((n) => n - 1)}>Anterior</Button><span>Página {page}</span><Button variant="outline" disabled={page * result.pageSize >= result.total} onClick={() => setPage((n) => n + 1)}>Siguiente</Button></div>
    </>}</QuerySection>
  </div>;
}
