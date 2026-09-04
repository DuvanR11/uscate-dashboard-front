'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Bell, BellOff, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  listMonitors,
  createMonitor,
  pauseMonitor,
  resumeMonitor,
  deleteMonitor,
  listAlerts,
  markAlertRead,
  extractErrorMessage,
  type CaseMonitor,
  type CaseMonitorAlert,
} from '@/lib/api/osint';

export default function MonitorsTab({ caseId }: { caseId: string }) {
  const [monitors, setMonitors] = useState<CaseMonitor[]>([]);
  const [alerts, setAlerts] = useState<CaseMonitorAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [onlyUnread, setOnlyUnread] = useState(false);

  const loadAll = async (unread = onlyUnread) => {
    setLoading(true);
    try {
      const [m, a] = await Promise.all([listMonitors(caseId), listAlerts(caseId, unread || undefined)]);
      setMonitors(m);
      setAlerts(a);
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudieron cargar los monitores');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const handleToggle = async (monitor: CaseMonitor) => {
    try {
      const updated = monitor.isActive ? await pauseMonitor(caseId, monitor.id) : await resumeMonitor(caseId, monitor.id);
      setMonitors((prev) => prev.map((m) => (m.id === monitor.id ? updated : m)));
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo cambiar el estado del monitor');
    }
  };

  const handleDelete = async (monitor: CaseMonitor) => {
    if (!window.confirm(`¿Eliminar el monitor "${monitor.query}"?`)) return;
    try {
      await deleteMonitor(caseId, monitor.id);
      setMonitors((prev) => prev.filter((m) => m.id !== monitor.id));
      toast.success('Monitor eliminado');
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo eliminar el monitor');
    }
  };

  const handleMarkRead = async (alert: CaseMonitorAlert) => {
    try {
      const updated = await markAlertRead(caseId, alert.id);
      setAlerts((prev) => (onlyUnread ? prev.filter((a) => a.id !== alert.id) : prev.map((a) => (a.id === alert.id ? updated : a))));
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo marcar la alerta como leída');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-slate-400" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-primary">Monitores ({monitors.length})</CardTitle>
          <NewMonitorDialog caseId={caseId} onCreated={(m) => setMonitors((prev) => [m, ...prev])} />
        </CardHeader>
        <CardContent className="p-0">
          {monitors.length === 0 ? (
            <p className="p-8 text-center text-sm text-slate-500">
              Sin monitores — un monitor revisa periódicamente si aparece información nueva sobre un término
              (nombre, empresa) en las 9 fuentes OSINT.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Consulta</TableHead>
                  <TableHead>Frecuencia</TableHead>
                  <TableHead>Última revisión</TableHead>
                  <TableHead>Activo</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {monitors.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.query}</TableCell>
                    <TableCell className="text-xs">cada {Math.round(m.frequencyMinutes / 60)}h</TableCell>
                    <TableCell className="text-xs text-slate-400">
                      {m.lastCheckedAt ? new Date(m.lastCheckedAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : 'Nunca'}
                    </TableCell>
                    <TableCell><Switch checked={m.isActive} onCheckedChange={() => handleToggle(m)} /></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" onClick={() => handleDelete(m)}>
                        <Trash2 className="h-3.5 w-3.5 text-slate-400" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card className="border-0 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base text-primary flex items-center gap-1.5">
            <Bell size={16} /> Alertas ({alerts.length})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Switch
              checked={onlyUnread}
              onCheckedChange={(v) => { setOnlyUnread(v); loadAll(v); }}
            />
            Solo no leídas
          </div>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[420px] overflow-y-auto">
          {alerts.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-6">Sin alertas.</p>
          ) : (
            alerts.map((a) => (
              <div
                key={a.id}
                className={`rounded-lg border p-3 text-sm ${a.readAt ? 'bg-white border-slate-100' : 'bg-yellow-50 border-yellow-200'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-slate-700">{a.message}</p>
                  {!a.readAt && (
                    <Button variant="ghost" size="sm" onClick={() => handleMarkRead(a)} className="shrink-0 h-6 px-2">
                      <BellOff size={12} />
                    </Button>
                  )}
                </div>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {a.details?.deltas?.map((d, i) => (
                    <Badge key={i} variant="outline" className="text-[10px]">
                      {d.source}: {d.previous} → {d.current}
                    </Badge>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-2">
                  {new Date(a.createdAt).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function NewMonitorDialog({ caseId, onCreated }: { caseId: string; onCreated: (m: CaseMonitor) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ query: '', frequencyHours: 24 });

  const handleSubmit = async () => {
    if (form.query.trim().length < 3) {
      toast.error('La consulta debe tener al menos 3 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const created = await createMonitor(caseId, {
        query: form.query.trim(),
        frequencyMinutes: Math.min(10080, Math.max(60, form.frequencyHours * 60)),
      });
      onCreated(created);
      toast.success('Monitor creado');
      setOpen(false);
      setForm({ query: '', frequencyHours: 24 });
    } catch (err) {
      toast.error(extractErrorMessage(err) || 'No se pudo crear el monitor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nuevo monitor</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Nuevo monitor de caso</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div className="space-y-1.5">
            <Label>Término a monitorear</Label>
            <Input
              value={form.query}
              onChange={(e) => setForm((f) => ({ ...f, query: e.target.value }))}
              placeholder="Nombre de la persona o empresa"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Frecuencia (horas, 1-168)</Label>
            <Input
              type="number"
              min={1}
              max={168}
              value={form.frequencyHours}
              onChange={(e) => setForm((f) => ({ ...f, frequencyHours: Number(e.target.value) }))}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear monitor'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
