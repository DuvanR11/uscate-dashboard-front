'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Copy, Loader2, Plus, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { extractErrorMessage } from '@/lib/api/platform';
import { listSalesReps, type SalesRep } from '@/lib/api/billing';
import { createDemo, listDemos, resetDemo, type CreatedDemo, type PlatformDemo } from '@/lib/api/demos';
import { confirmDialog } from '@/components/ui/confirm-dialog';

const NO_REP = '__none__';

const formatDateTime = (value: string | null) =>
  value ? new Date(value).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' }) : '—';

// Fase E (2026-09-29): una demo por comercial, con datos de ejemplo. Se
// reinicia sola cada noche (medianoche en Colombia) y con el botón; en una
// demo los correos y SMS se simulan, nunca salen a destinatarios reales.
export function DemosTab() {
  const [demos, setDemos] = useState<PlatformDemo[] | null>(null);
  const [reps, setReps] = useState<SalesRep[]>([]);
  const [open, setOpen] = useState(false);
  const [repId, setRepId] = useState(NO_REP);
  const [label, setLabel] = useState('');
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<CreatedDemo | null>(null);
  const [resettingId, setResettingId] = useState<string | null>(null);

  const load = useCallback(() => {
    listDemos().then(setDemos).catch(() => toast.error('No se pudieron cargar las demos'));
  }, []);

  useEffect(() => {
    load();
    listSalesReps()
      .then((all) => setReps(all.filter((r) => r.isActive)))
      .catch(() => setReps([]));
  }, [load]);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const result = await createDemo(repId !== NO_REP ? { salesRepId: repId } : { label: label.trim() });
      setCreated(result);
      setOpen(false);
      setRepId(NO_REP);
      setLabel('');
      load();
    } catch (error) {
      toast.error('No se pudo crear la demo', { description: extractErrorMessage(error) });
    } finally {
      setCreating(false);
    }
  };

  const handleReset = async (demo: PlatformDemo) => {
    if (!await confirmDialog(`¿Reiniciar "${demo.name}"? Se borran sus datos y se vuelven a cargar los de ejemplo. Los usuarios y contraseñas se conservan.`)) return;
    setResettingId(demo.id);
    try {
      await resetDemo(demo.id);
      toast.success('Demo reiniciada');
      load();
    } catch (error) {
      toast.error('No se pudo reiniciar', { description: extractErrorMessage(error) });
    } finally {
      setResettingId(null);
    }
  };

  const copyCredentials = async () => {
    if (!created) return;
    const text = `${created.name}\nhttps://app.jurytechsolutions.com/login\nUsuario: ${created.users[0]?.email}\nContraseña: ${created.password}`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Credenciales copiadas');
    } catch {
      toast.error('No se pudo copiar; cópialas a mano');
    }
  };

  const canCreate = repId !== NO_REP || label.trim().length >= 2;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-slate-500">
          Organizaciones de demostración con datos de ejemplo. Se reinician solas cada noche y con el botón. Los correos
          y SMS se simulan: nunca salen a destinatarios reales.
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="mr-1.5 h-3.5 w-3.5" /> Nueva demo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nueva demo</DialogTitle>
              <DialogDescription>Una candidatura ficticia a la Cámara con datos de ejemplo en todos los módulos.</DialogDescription>
            </DialogHeader>
            <div className="space-y-3 text-sm">
              <div className="space-y-1">
                <Label>Comercial</Label>
                <Select value={repId} onValueChange={setRepId}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_REP}>Sin comercial (demo interna)</SelectItem>
                    {reps.map((rep) => (
                      <SelectItem key={rep.id} value={rep.id}>{rep.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {repId === NO_REP && (
                <div className="space-y-1">
                  <Label>Nombre de la demo</Label>
                  <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Ej: Equipo interno" />
                </div>
              )}
            </div>
            <DialogFooter>
              <Button disabled={!canCreate || creating} onClick={handleCreate}>
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Crear demo
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Credenciales: se muestran UNA sola vez. */}
      <Dialog open={created !== null} onOpenChange={(v) => !v && setCreated(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Demo creada</DialogTitle>
            <DialogDescription>
              Guarda la contraseña ahora: no se vuelve a mostrar. Es la misma para los 6 usuarios de la demo y se conserva
              en cada reinicio.
            </DialogDescription>
          </DialogHeader>
          {created && (
            <div className="space-y-2 text-sm">
              <p className="font-medium">{created.name}</p>
              <p>Contraseña: <code className="rounded bg-slate-100 px-1.5 py-0.5">{created.password}</code></p>
              <ul className="space-y-0.5 text-xs text-slate-600">
                {created.users.map((u) => (
                  <li key={u.email}><code>{u.email}</code> · {u.role}</li>
                ))}
              </ul>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={copyCredentials}><Copy className="mr-1.5 h-4 w-4" /> Copiar acceso del administrador</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Demo</TableHead>
              <TableHead>Comercial</TableHead>
              <TableHead>Usuario administrador</TableHead>
              <TableHead>Último reinicio</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {demos === null ? (
              <TableRow><TableCell colSpan={5} className="text-center text-slate-400"><Loader2 className="mx-auto h-4 w-4 animate-spin" /></TableCell></TableRow>
            ) : demos.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center text-sm text-slate-400">Todavía no hay demos.</TableCell></TableRow>
            ) : (
              demos.map((demo) => (
                <TableRow key={demo.id}>
                  <TableCell className="font-medium">{demo.name}</TableCell>
                  <TableCell>{demo.demoSalesRep?.name ?? <span className="text-slate-400">—</span>}</TableCell>
                  <TableCell><code className="text-xs">{demo.adminEmail}</code></TableCell>
                  <TableCell className="text-xs text-slate-600">{formatDateTime(demo.demoResetAt)}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="outline" disabled={resettingId !== null} onClick={() => handleReset(demo)}>
                      {resettingId === demo.id ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="mr-1.5 h-3.5 w-3.5" />}
                      Reiniciar
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
