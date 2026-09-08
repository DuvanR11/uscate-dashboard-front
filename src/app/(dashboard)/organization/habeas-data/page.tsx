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
import {
  listDataSubjectRequests,
  markDataSubjectRequestInReview,
  resolveDataSubjectRequest,
  rejectDataSubjectRequest,
  extendDataSubjectRequest,
  extractErrorMessage,
  type DataSubjectRequest,
  type DataSubjectRequestStatus,
} from '@/lib/api/habeas-data';

/**
 * `/organization/habeas-data` — cola interna de solicitudes ARCO (Ley
 * 1581 de 2012). Permiso propio `HABEAS_DATA`, atendido en la práctica
 * por el rol Abogado (RWD) — el ADMIN solo tiene visibilidad (R).
 */
const REQUEST_TYPE_LABEL: Record<string, string> = {
  ACCESO: 'Acceso',
  RECTIFICACION: 'Rectificación',
  CANCELACION: 'Cancelación',
  OPOSICION: 'Oposición',
};

const STATUS_CONFIG: Record<DataSubjectRequestStatus, { label: string; variant: 'secondary' | 'outline' | 'default' | 'destructive' }> = {
  PENDIENTE: { label: 'Pendiente', variant: 'secondary' },
  EN_REVISION: { label: 'En revisión', variant: 'outline' },
  RESUELTA: { label: 'Resuelta', variant: 'default' },
  RECHAZADA: { label: 'Rechazada', variant: 'destructive' },
};

function daysRemaining(request: DataSubjectRequest): number {
  const dueAt = new Date(request.extendedDueAt ?? request.dueAt);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  dueAt.setHours(0, 0, 0, 0);
  return Math.ceil((dueAt.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function HabeasDataPage() {
  const [requests, setRequests] = useState<DataSubjectRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

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
      toast.error(extractErrorMessage(err) || 'No se pudo actualizar la solicitud');
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

  const pendingCount = requests.filter((r) => r.status === 'PENDIENTE' || r.status === 'EN_REVISION').length;

  return (
    <div className="p-6 md:p-12 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
        <div className="p-3 bg-primary/10 rounded-xl border border-primary/20">
          <ShieldCheck className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-primary tracking-tight">Habeas Data</h1>
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
                <TableHead>Tipo</TableHead>
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
                  const isOpen = r.status === 'PENDIENTE' || r.status === 'EN_REVISION';
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-mono text-xs">{r.publicCode}</TableCell>
                      <TableCell>{REQUEST_TYPE_LABEL[r.requestType] ?? r.requestType}</TableCell>
                      <TableCell>
                        <p className="text-sm">{r.prospect ? `${r.prospect.firstName} ${r.prospect.lastName}` : '—'}</p>
                        <p className="text-xs text-slate-400 font-mono">{r.documentNumber}</p>
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
                        {isOpen && (
                          <div className="flex items-center gap-2 justify-end">
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
                          </div>
                        )}
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

  const handleSubmit = async () => {
    if (!notes.trim()) {
      toast.error('Escribe una nota de resolución.');
      return;
    }
    setSaving(true);
    try {
      await resolveDataSubjectRequest(request.id, notes.trim());
      toast.success('Solicitud resuelta');
      setOpen(false);
      onDone();
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo resolver la solicitud');
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
        {request.requestType === 'CANCELACION' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Al resolver, el prospecto real queda ANONIMIZADO (nombre/email/teléfono/dirección/cédula
            redactados) — nunca se borra la fila para no romper su historial real.
          </p>
        )}
        {request.requestType === 'OPOSICION' && (
          <p className="text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-3">
            Al resolver, el email/teléfono real del prospecto se agregan a la lista de exclusión —
            no volverá a recibir difusiones.
          </p>
        )}
        <Textarea
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
      toast.error(extractErrorMessage(err) || 'No se pudo rechazar la solicitud');
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
      toast.error(extractErrorMessage(err) || 'No se pudo prorrogar el plazo');
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
