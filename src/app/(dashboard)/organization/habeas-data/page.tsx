'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ShieldCheck, Loader2, Clock, CheckCircle2, XCircle, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { usePermission } from '@/hooks/use-permission';
import {
  listDataSubjectRequests,
  markDataSubjectRequestInReview,
  resolveDataSubjectRequest,
  rejectDataSubjectRequest,
  extendDataSubjectRequest,
  extractErrorMessage,
  isAlreadyClosedError,
  type DataSubjectRequest,
} from '@/lib/api/habeas-data';
import {
  REQUEST_TYPE_LABEL,
  STATUS_CONFIG,
  changesDataOnResolve,
  daysRemaining,
  isOpenRequest,
} from './_components/habeas-data-labels';
import { RequestDetailDialog, RequestDetails } from './_components/request-detail-dialog';

/**
 * `/organization/habeas-data` — cola interna de solicitudes ARCO (Ley
 * 1581 de 2012). Permiso propio `HABEAS_DATA`, atendido en la práctica
 * por el rol Abogado (RWD) — el ADMIN solo tiene visibilidad (R).
 */

/**
 * Fase 2 del análisis de punta a punta (2026-10-28, MSG-13): el servidor
 * responde 409 si otra persona ya cerró la solicitud. Se avisa con su texto y
 * se recarga la cola para que se vea cómo quedó.
 */
function handleActionError(err: unknown, fallback: string, onDone: () => void): boolean {
  toast.error(extractErrorMessage(err) || fallback);
  if (isAlreadyClosedError(err)) {
    onDone();
    return true;
  }
  return false;
}

export default function HabeasDataPage() {
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  // El ADMIN solo lee (permiso R): sin escritura no se muestran botones que
  // terminarían en "No tienes permiso".
  const canWrite = usePermission('HABEAS_DATA', 'canWrite');

  const load = async () => {
    setLoading(true);
    try {
      const data = await listDataSubjectRequests();
      setRequests(data);
      setError(false);
    } catch (err) {
      console.error(err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleMarkInReview = async (id: string) => {
    setBusyId(id);
    try {
      await markDataSubjectRequestInReview(id);
      toast.success('Solicitud marcada en revisión');
      load();
    } catch (err) {
      handleActionError(err, 'No se pudo actualizar la solicitud', load);
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-slate-400" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center">
        <ShieldCheck className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-slate-800">No se pudo cargar la cola de Habeas Data</h2>
        <p className="text-slate-500">Verifica que tu cuenta tenga el permiso de Habeas Data.</p>
      </div>
    );
  }

  const pendingCount = requests.filter(isOpenRequest).length;

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-foreground tracking-tight">Habeas Data</h1>
          <p className="text-slate-500 text-sm">
            {pendingCount} solicitud{pendingCount !== 1 ? 'es' : ''} pendiente{pendingCount !== 1 ? 's' : ''} de atender — derechos ARCO (Ley 1581 de 2012).
          </p>
        </div>
      </div>

      <Card className="border-0 shadow-md ring-1 ring-slate-100">
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Solicitud</TableHead>
                <TableHead>Titular</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {requests.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-slate-400 py-8">
                    Sin solicitudes todavía.
                  </TableCell>
                </TableRow>
              ) : (
                requests.map((r) => {
                  const remaining = daysRemaining(r);
                  const isOpen = isOpenRequest(r);
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.publicCode}</TableCell>
                      {/* MSG-06: tipo + adelanto de lo que pide (el texto completo, en "Ver"). */}
                      <TableCell className="whitespace-normal">
                        <p className="text-sm">{REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}</p>
                        <p className="line-clamp-2 max-w-[16rem] break-words text-xs text-slate-500">{r.details}</p>
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        <p className="text-sm">{r.prospect ? `${r.prospect.firstName} ${r.prospect.lastName}` : '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.documentNumber}</p>
                        {/* MSG-06: cómo responderle, sin ensanchar la fila. */}
                        {r.contactEmail && (
                          <p className="max-w-[12rem] truncate text-xs text-slate-500" title={r.contactEmail}>
                            {r.contactEmail}
                          </p>
                        )}
                        {r.contactPhone && <p className="text-xs text-slate-500">{r.contactPhone}</p>}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_CONFIG[r.status].variant}>{STATUS_CONFIG[r.status].label}</Badge>
                      </TableCell>
                      <TableCell>
                        {isOpen ? (
                          <Badge variant={remaining < 0 ? 'destructive' : remaining <= 2 ? 'destructive' : 'outline'}>
                            {remaining < 0 ? `Vencido hace ${Math.abs(remaining)}d` : `${remaining}d restantes`}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 justify-end">
                          <RequestDetailDialog request={r} />
                          {isOpen && canWrite && (
                            <>
                              {r.status === 'PENDIENTE' && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={busyId === r.id}
                                  onClick={() => handleMarkInReview(r.id)}
                                >
                                  <Eye className="mr-1.5 h-3.5 w-3.5" /> Revisar
                                </Button>
                              )}
                              <ExtendDialog request={r} onDone={load} />
                              <ResolveDialog request={r} onDone={load} />
                              <RejectDialog request={r} onDone={load} />
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function ResolveDialog({ request, onDone }: { request: DataSubjectRequest; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const withoutContact = changesDataOnResolve(request) && !request.prospect;

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error('Escribe una nota de resolución.');
      return;
    }
    setSaving(true);
    try {
      const resolved = await resolveDataSubjectRequest(request.id, notes.trim());
      // MSG-13: el aviso dice qué se hizo con los datos; si no había ningún
      // contacto con esa cédula, se resalta en vez de dar un éxito a secas.
      const message = resolved.effect?.message || 'Solicitud resuelta';
      if (resolved.effect?.action === 'NO_CONTACT') {
        toast.warning(message, { duration: 10000 });
      } else {
        toast.success(message);
      }
      setOpen(false);
      onDone();
    } catch (err) {
      if (handleActionError(err, 'No se pudo resolver la solicitud', onDone)) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" /> Resolver
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver solicitud {request.publicCode}</DialogTitle>
        </DialogHeader>
        {/* MSG-06: quien resuelve ve qué pidió el titular. */}
        <RequestDetails request={request} className="max-h-40 overflow-y-auto" />
        {request.requestType === 'CANCELACION' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Al resolver, el contacto queda ANONIMIZADO (nombre, correo, teléfono, dirección y cédula
            borrados) y sale de las automatizaciones en curso. La fila no se borra, para no romper su historial.
          </p>
        )}
        {request.requestType === 'OPOSICION' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Al resolver, el correo y el teléfono del contacto pasan a la lista de exclusión y sale de las
            automatizaciones en curso: no volverá a recibir difusiones.
          </p>
        )}
        {withoutContact && (
          <p className="text-xs text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-3">
            Esta solicitud no está enlazada a ningún contacto. Al resolver se busca la cédula{' '}
            <span className="font-mono">{request.documentNumber}</span> en tu base; si no aparece, queda resuelta
            sin borrar ni excluir nada, y así lo verá el titular en el seguimiento.
          </p>
        )}
        <Textarea
          aria-label="Nota de resolución"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Ej: Se envió la información solicitada al correo registrado."
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RejectDialog({ request, onDone }: { request: DataSubjectRequest; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error('Escribe el motivo del rechazo.');
      return;
    }
    setSaving(true);
    try {
      await rejectDataSubjectRequest(request.id, notes.trim());
      toast.success('Solicitud rechazada');
      setOpen(false);
      onDone();
    } catch (err) {
      if (handleActionError(err, 'No se pudo rechazar la solicitud', onDone)) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <XCircle className="mr-1.5 h-3.5 w-3.5" /> Rechazar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Rechazar solicitud {request.publicCode}</DialogTitle>
        </DialogHeader>
        <Textarea
          aria-label="Motivo del rechazo"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Ej: No fue posible verificar la identidad del solicitante."
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar rechazo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ExtendDialog({ request, onDone }: { request: DataSubjectRequest; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const alreadyExtended = !!request.extendedDueAt;

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Escribe el motivo de la prórroga.');
      return;
    }
    setSaving(true);
    try {
      await extendDataSubjectRequest(request.id, reason.trim());
      toast.success('Plazo prorrogado');
      setOpen(false);
      onDone();
    } catch (err) {
      if (handleActionError(err, 'No se pudo prorrogar el plazo', onDone)) setOpen(false);
    } finally {
      setSaving(false);
    }
  };

  if (alreadyExtended) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Clock className="mr-1.5 h-3.5 w-3.5" /> Prorrogar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Prorrogar plazo de {request.publicCode}</DialogTitle>
        </DialogHeader>
        <p className="text-xs text-slate-400">
          {request.requestType === 'ACCESO' ? '5 días hábiles más (consulta).' : '8 días hábiles más (reclamo).'}
        </p>
        <Textarea
          aria-label="Motivo de la prórroga"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="Ej: Se requiere verificación adicional con el área de sistemas."
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar prórroga'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
