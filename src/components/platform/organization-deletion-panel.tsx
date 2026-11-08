'use client';

// Borrar organización (2026-11-07): la pestaña «Cierre y borrado» de la ficha
// de organización. Programar y anular solo los ve el administrador
// principal; el servidor lo exige igual.
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { extractErrorMessage } from '@/lib/api-error';
import { usePlatformAccess } from './access-context';
import { QuerySection } from './query-section';
import {
  cancelOrganizationDeletion,
  DELETION_MODE_LABEL,
  DELETION_STATUS_LABEL,
  getDeletionPreview,
  scheduleOrganizationDeletion,
  TABLE_LABEL,
  type DeletionPreview,
  type OrganizationDeletionRequest,
} from '@/lib/api/platform-organization-deletion';

const formatDate = (date?: string | null) =>
  date ? new Date(date).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'long', timeStyle: 'short' }) : 'Sin fecha';
const number = (n: number) => n.toLocaleString('es-CO');

function CountList({ counts, limit = 12 }: { counts: Record<string, number>; limit?: number }) {
  const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const named = rows.filter(([model]) => TABLE_LABEL[model]).slice(0, limit);
  const rest = rows.filter((row) => !named.includes(row));
  const restRows = rest.reduce((sum, [, n]) => sum + n, 0);
  if (!rows.length) return <p className="text-sm text-muted-foreground">Nada.</p>;
  return <ul className="grid gap-1 text-sm sm:grid-cols-2">
    {named.map(([model, n]) => <li key={model}>{TABLE_LABEL[model]}: <strong>{number(n)}</strong></li>)}
    {restRows > 0 && <li>Otros registros en {rest.length} tabla(s): <strong>{number(restRows)}</strong></li>}
  </ul>;
}

function RequestStatus({ request, principal, onChanged }: { request: OrganizationDeletionRequest; principal: boolean; onChanged: () => void }) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  async function cancel() {
    setBusy(true);
    try {
      const result = await cancelOrganizationDeletion(request.id, reason.trim());
      toast.success(`Borrado anulado: ${result.reactivatedUsers} usuario(s) vuelven a entrar.${result.slugRestored ? '' : ' El identificador anterior ya lo usa otra organización: queda el temporal.'}`);
      onChanged();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo anular el borrado.');
    } finally {
      setBusy(false);
    }
  }
  const tone = request.status === 'COMPLETED' ? 'border-slate-300 bg-slate-50 text-slate-900' : request.status === 'FAILED' ? 'border-red-300 bg-red-50 text-red-900' : 'border-amber-300 bg-amber-50 text-amber-900';
  return <div className={`space-y-3 rounded-lg border p-4 ${tone}`} role="status">
    <p className="font-semibold">{DELETION_STATUS_LABEL[request.status]}</p>
    {request.status === 'SCHEDULED' && <p>Se borra sola el <strong>{formatDate(request.scheduledFor)}</strong>. Mientras tanto la organización está bloqueada: nadie de su equipo entra, sus automatizaciones están detenidas y sus páginas públicas están apagadas.</p>}
    {request.status === 'COMPLETED' && <p>Borrada el {formatDate(request.completedAt)}. {request.mode ? DELETION_MODE_LABEL[request.mode] : ''}{request.result?.totalRows !== undefined ? ` · ${number(request.result.totalRows)} registros` : ''}{request.result?.files && !request.result.files.skipped ? ` · ${number(request.result.files.deleted)} archivos` : ''}.</p>}
    {request.status === 'FAILED' && <p>Intento {request.attempts} de 3. {request.error}</p>}
    <p className="text-sm">Pedido por {request.requestedByEmail} el {formatDate(request.requestedAt)}. Motivo: {request.reason}</p>
    <p className="text-sm">Identificador original: {request.organizationSlug}</p>
    {request.status === 'SCHEDULED' && principal && <div className="space-y-2">
      <Label htmlFor="cancel-deletion-reason">Por qué anulas el borrado</Label>
      <Textarea id="cancel-deletion-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ejemplo: el cliente renovó y pidió seguir." />
      <Button type="button" variant="outline" disabled={busy || reason.trim().length < 10} onClick={cancel}>Anular el borrado y devolver el acceso</Button>
    </div>}
  </div>;
}

function ScheduleForm({ preview, onChanged }: { preview: DeletionPreview; onChanged: () => void }) {
  const [reason, setReason] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const ready = reason.trim().length >= 10 && confirm.trim() === preview.organization.slug;
  async function schedule() {
    setBusy(true);
    try {
      const request = await scheduleOrganizationDeletion(preview.organization.id, { confirmSlug: confirm.trim(), reason: reason.trim() });
      toast.success(`Borrado programado para el ${formatDate(request.scheduledFor)}. La organización ya quedó bloqueada.`);
      onChanged();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo programar el borrado.');
    } finally {
      setBusy(false);
    }
  }
  return <div className="space-y-3 rounded-lg border border-red-300 p-4">
    <p className="font-semibold text-red-900 dark:text-red-200">Programar el borrado</p>
    <p className="text-sm">Al confirmar, la organización queda bloqueada de inmediato y se borra sola el {formatDate(preview.scheduledFor)}. Hasta ese día puedes anularlo y todo vuelve como estaba. Después no se deshace: solo queda el respaldo diario de la base.</p>
    <div className="space-y-1">
      <Label htmlFor="deletion-reason">Motivo</Label>
      <Textarea id="deletion-reason" value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Ejemplo: el titular pidió por escrito cerrar la cuenta (correo del 7 de noviembre)." />
    </div>
    <div className="space-y-1">
      <Label htmlFor="deletion-confirm">Para confirmar, escribe <code>{preview.organization.slug}</code></Label>
      <Input id="deletion-confirm" value={confirm} onChange={(event) => setConfirm(event.target.value)} autoComplete="off" />
    </div>
    <Button type="button" variant="destructive" disabled={busy || !ready} onClick={schedule}>Bloquear y programar el borrado</Button>
  </div>;
}

export function OrganizationDeletionPanel({ organizationId, onChanged }: { organizationId: string; onChanged: () => void }) {
  const access = usePlatformAccess();
  const principal = Boolean(access?.principal);
  const [revision, setRevision] = useState(0);
  const load = useCallback(() => getDeletionPreview(organizationId), [organizationId]);
  const changed = () => {
    setRevision((n) => n + 1);
    onChanged();
  };
  return <QuerySection key={revision} title="Cierre y borrado de la organización" load={load}>{(preview) => {
    const open = preview.request && preview.request.status !== 'CANCELLED' ? preview.request : null;
    const kept = Object.keys(preview.ledger).length > 0;
    return <div className="space-y-4">
      {open && <RequestStatus request={open} principal={principal} onChanged={changed} />}
      {!open && <>
        <p className="text-sm">{DELETION_MODE_LABEL[preview.mode]}.{' '}
          {kept ? 'Tiene historia contable: se borran sus contactos, usuarios, documentos y demás datos de trabajo, y queda una organización cerrada con nombre, NIT, pagos, cobros, facturas, consumos de proveedores, aceptaciones legales y soporte. Los usuarios quedan sin nombre, correo ni datos personales.' : 'No tiene pagos, cobros, consumos de proveedores ni aceptaciones legales: se borra todo, incluidos sus usuarios y la organización.'}
          {' '}La prueba de autorización de cada contacto y el registro de cada difusión se conservan siempre (los exige la ley y no se pueden borrar).</p>
        <div className="space-y-2">
          <p className="font-medium">Se borraría: {number(preview.totalRows)} registros y {number(preview.users)} usuario(s), además de sus archivos.</p>
          <CountList counts={preview.deletes} />
        </div>
        {kept && <div className="space-y-2"><p className="font-medium">Se conserva:</p><CountList counts={preview.ledger} /></div>}
        {preview.blockers.length > 0 && <ul className="space-y-1 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-900" role="alert">{preview.blockers.map((blocker) => <li key={blocker}>{blocker}</li>)}</ul>}
        {principal && preview.blockers.length === 0 && <ScheduleForm preview={preview} onChanged={changed} />}
        {!principal && <p className="text-sm text-muted-foreground">Solo el administrador principal de la plataforma puede programar el borrado de una organización.</p>}
      </>}
    </div>;
  }}</QuerySection>;
}
