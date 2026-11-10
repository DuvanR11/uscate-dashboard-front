'use client';

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Jornada electoral —
// Testigos». Cada testigo tiene su cuenta (usuario y contraseña, rol «Testigo
// electoral», que solo ve sus mesas) y cubre mesas de un puesto. Puedes tener
// tantos testigos activos como mesas creadas.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ContestPicker, ElectionDayOff, useSelectedContest } from '@/components/dashboard/election-day/contest-picker';
import { apiErrorMessage } from '@/lib/api-error';
import {
  electionDayApi,
  timeOf,
  type ElectionTable,
  type Station,
  type Witness,
  type WitnessInput,
} from '@/lib/api/election-day';

function TablePicker({
  stationId,
  selected,
  taken,
  onChange,
}: {
  stationId: number | null;
  selected: string[];
  taken: Set<string>;
  onChange: (ids: string[]) => void;
}) {
  // Las mesas quedan ligadas a su puesto: al cambiarlo se ve «cargando».
  const [loaded, setLoaded] = useState<{ stationId: number; tables: ElectionTable[] } | null>(null);
  const tables = loaded && loaded.stationId === stationId ? loaded.tables : null;
  useEffect(() => {
    if (!stationId) return;
    electionDayApi
      .tables(stationId)
      .then((list) => setLoaded({ stationId, tables: list }))
      .catch(() => setLoaded({ stationId, tables: [] }));
  }, [stationId]);

  if (!stationId) return <p className="text-sm text-muted-foreground">Elige primero el puesto.</p>;
  if (tables === null) return <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />;
  if (tables.length === 0)
    return <p className="text-sm text-muted-foreground">Este puesto no tiene mesas: créalas en Configurar.</p>;
  return (
    <div className="flex flex-wrap gap-2">
      {tables.map((table) => {
        const busy = taken.has(table.id) && !selected.includes(table.id);
        return (
          <label
            key={table.id}
            className={`flex items-center gap-2 rounded-md border px-2 py-1 text-sm ${busy ? 'opacity-50' : ''}`}
          >
            <Checkbox
              id={`table-${table.id}`}
              checked={selected.includes(table.id)}
              disabled={busy}
              onCheckedChange={(checked) =>
                onChange(checked === true ? [...selected, table.id] : selected.filter((id) => id !== table.id))
              }
            />
            Mesa {table.number}
            {busy && <span className="text-xs text-muted-foreground">(con testigo)</span>}
          </label>
        );
      })}
    </div>
  );
}

function NewWitnessDialog({
  open,
  contestId,
  stations,
  taken,
  onClose,
  onSaved,
}: {
  open: boolean;
  contestId: string;
  stations: Station[];
  taken: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [accounts, setAccounts] = useState<{ id: string; fullName: string; email: string }[]>([]);
  const [form, setForm] = useState<WitnessInput & { stationId: number | null }>({ pollingStationId: 0, stationId: null });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('new');
    setForm({ pollingStationId: 0, stationId: null, tableIds: [] });
    electionDayApi
      .witnessAccounts()
      .then(setAccounts)
      .catch(() => setAccounts([]));
  }, [open]);

  const set = (patch: Partial<typeof form>) => setForm((f) => ({ ...f, ...patch }));
  const ready =
    !!form.stationId &&
    (mode === 'existing'
      ? !!form.userId
      : !!form.fullName?.trim() &&
        /^[0-9]{5,12}$/.test(form.documentNumber ?? '') &&
        /^[0-9]{10}$/.test(form.phone ?? '') &&
        !!form.email?.includes('@') &&
        /^(?=.*[A-Za-z])(?=.*\d).{8,72}$/.test(form.password ?? ''));

  const save = async () => {
    if (!form.stationId) return;
    setSaving(true);
    try {
      const input: WitnessInput = {
        pollingStationId: form.stationId,
        tableIds: form.tableIds ?? [],
        ...(form.credentialNumber?.trim() ? { credentialNumber: form.credentialNumber.trim() } : {}),
        ...(mode === 'existing'
          ? { userId: form.userId }
          : {
              fullName: form.fullName?.trim(),
              documentNumber: form.documentNumber,
              phone: form.phone,
              email: form.email?.trim(),
              password: form.password,
            }),
      };
      await electionDayApi.createWitness(contestId, input);
      toast.success('Testigo agregado', {
        description: mode === 'new' ? 'Entrégale al testigo su correo y su contraseña para entrar a Zyron.' : undefined,
      });
      onSaved();
    } catch (e) {
      toast.error('No se pudo agregar el testigo', { description: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nuevo testigo</DialogTitle>
          <DialogDescription>
            El testigo entra a Zyron con su correo y su contraseña y solo ve sus mesas: marcar la instalación,
            enviar el E-14 y reportar incidentes.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="flex gap-2">
            <Button type="button" variant={mode === 'new' ? 'default' : 'outline'} size="sm" onClick={() => setMode('new')}>
              Cuenta nueva
            </Button>
            <Button
              type="button"
              variant={mode === 'existing' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setMode('existing')}
              disabled={accounts.length === 0}
            >
              Un testigo que ya tiene cuenta
            </Button>
          </div>
          {mode === 'existing' ? (
            <div className="grid gap-1.5">
              <Label htmlFor="witness-account">Testigo</Label>
              <Select value={form.userId ?? ''} onValueChange={(userId) => set({ userId })}>
                <SelectTrigger id="witness-account">
                  <SelectValue placeholder="Elige la cuenta" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((account) => (
                    <SelectItem key={account.id} value={account.id}>
                      {account.fullName} · {account.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="w-name">Nombre completo</Label>
                <Input id="w-name" value={form.fullName ?? ''} onChange={(e) => set({ fullName: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="w-doc">Cédula</Label>
                <Input
                  id="w-doc"
                  inputMode="numeric"
                  value={form.documentNumber ?? ''}
                  onChange={(e) => set({ documentNumber: e.target.value.replace(/\D/g, '') })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="w-phone">Celular</Label>
                <Input
                  id="w-phone"
                  inputMode="tel"
                  value={form.phone ?? ''}
                  onChange={(e) => set({ phone: e.target.value.replace(/\D/g, '').slice(0, 10) })}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="w-email">Correo (con él entra a Zyron)</Label>
                <Input id="w-email" type="email" value={form.email ?? ''} onChange={(e) => set({ email: e.target.value })} />
              </div>
              <div className="grid gap-1.5 sm:col-span-2">
                <Label htmlFor="w-password">Contraseña</Label>
                <Input
                  id="w-password"
                  type="password"
                  autoComplete="new-password"
                  value={form.password ?? ''}
                  onChange={(e) => set({ password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  De 8 a 72 caracteres, con al menos una letra y un número. El testigo la puede cambiar en su perfil.
                </p>
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="w-station">Puesto de votación</Label>
              <Select
                value={form.stationId ? String(form.stationId) : ''}
                onValueChange={(value) => set({ stationId: Number(value), tableIds: [] })}
              >
                <SelectTrigger id="w-station">
                  <SelectValue placeholder="Elige el puesto" />
                </SelectTrigger>
                <SelectContent>
                  {stations.map((station) => (
                    <SelectItem key={station.id} value={String(station.id)}>
                      {station.name}
                      {station.municipality ? ` · ${station.municipality.name}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="w-credential">Credencial de la Registraduría (opcional)</Label>
              <Input
                id="w-credential"
                value={form.credentialNumber ?? ''}
                onChange={(e) => set({ credentialNumber: e.target.value })}
              />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Mesas que cubre</Label>
            <TablePicker
              stationId={form.stationId}
              selected={form.tableIds ?? []}
              taken={taken}
              onChange={(tableIds) => set({ tableIds })}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Agregar testigo
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditWitnessDialog({
  witness,
  taken,
  onClose,
  onSaved,
}: {
  witness: Witness | null;
  taken: Set<string>;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [credential, setCredential] = useState('');
  const [accredited, setAccredited] = useState(false);
  const [tableIds, setTableIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setCredential(witness?.credentialNumber ?? '');
    setAccredited(!!witness?.accreditedAt);
    setTableIds(witness?.tables.map((t) => t.table.id) ?? []);
  }, [witness]);

  if (!witness) return null;
  const save = async () => {
    setSaving(true);
    try {
      await electionDayApi.updateWitness(witness.id, {
        credentialNumber: credential.trim() || null,
        accredited,
        tableIds,
      });
      toast.success('Testigo actualizado');
      onSaved();
    } catch (e) {
      toast.error('No se pudo guardar', { description: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{witness.user.fullName}</DialogTitle>
          <DialogDescription>{witness.pollingStation.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="edit-credential">Credencial de la Registraduría</Label>
            <Input id="edit-credential" value={credential} onChange={(e) => setCredential(e.target.value)} />
          </div>
          <label className="flex items-center gap-3 text-sm">
            <Switch checked={accredited} onCheckedChange={setAccredited} />
            Acreditado ante la Registraduría
          </label>
          <div className="grid gap-1.5">
            <Label>Mesas que cubre</Label>
            <TablePicker stationId={witness.pollingStation.id} selected={tableIds} taken={taken} onChange={setTableIds} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function WitnessesPage() {
  const { enabled, contests, contest, select, error } = useSelectedContest();
  // La lista queda ligada a su contienda: al cambiarla se ve «cargando».
  const [loaded, setLoaded] = useState<{ contestId: string; list: Witness[] } | null>(null);
  const witnesses = loaded && loaded.contestId === contest?.id ? loaded.list : null;
  const [stations, setStations] = useState<Station[]>([]);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Witness | null>(null);
  const [filter, setFilter] = useState('');

  const load = useCallback(async () => {
    if (!contest) return;
    const contestId = contest.id;
    await Promise.all([electionDayApi.witnesses(contestId), electionDayApi.stations()])
      .then(([w, s]) => {
        setLoaded({ contestId, list: w });
        setStations(s);
      })
      .catch((e: unknown) => {
        toast.error('No se pudieron cargar los testigos', { description: apiErrorMessage(e) });
        setLoaded({ contestId, list: [] });
      });
  }, [contest]);

  useEffect(() => {
    void load();
  }, [load]);

  const taken = useMemo(
    () => new Set((witnesses ?? []).flatMap((w) => w.tables.map((t) => t.table.id))),
    [witnesses],
  );
  const shown = useMemo(() => {
    const q = filter.trim().toLowerCase();
    return (witnesses ?? []).filter(
      (w) => !q || w.user.fullName.toLowerCase().includes(q) || w.pollingStation.name.toLowerCase().includes(q),
    );
  }, [witnesses, filter]);

  const remove = async (witness: Witness) => {
    const ok = await confirmDialog({
      title: `¿Quitar a ${witness.user.fullName} de esta contienda?`,
      description: 'Si no es testigo de otra contienda, su cuenta se desactiva y se cierran sus sesiones.',
      destructive: true,
      confirmLabel: 'Quitar',
    });
    if (!ok) return;
    try {
      const result = await electionDayApi.removeWitness(witness.id);
      toast.success(result.accountDeactivated ? 'Testigo quitado y cuenta desactivada' : 'Testigo quitado');
      await load();
    } catch (e) {
      toast.error('No se pudo quitar', { description: apiErrorMessage(e) });
    }
  };

  if (enabled === false)
    return (
      <div className="p-4 md:p-6">
        <ElectionDayOff />
      </div>
    );

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Testigos</h1>
        <p className="text-sm text-muted-foreground">
          Quién cubre cada mesa. Puedes tener tantos testigos activos como mesas creadas.
        </p>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <ContestPicker contests={contests} contest={contest} onSelect={select} />
        {contest && (
          <Button onClick={() => setCreating(true)}>
            <Plus className="mr-1 h-4 w-4" /> Nuevo testigo
          </Button>
        )}
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {contest && (
        <Card>
          <CardContent className="space-y-3 overflow-x-auto p-4">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Buscar por nombre o puesto"
              aria-label="Buscar testigo"
              className="sm:w-72"
            />
            {witnesses === null ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : shown.length === 0 ? (
              <p className="text-sm text-muted-foreground">Todavía no hay testigos en esta contienda.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Testigo</TableHead>
                    <TableHead>Puesto</TableHead>
                    <TableHead>Mesas</TableHead>
                    <TableHead>Credencial</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.map((witness) => (
                    <TableRow key={witness.id}>
                      <TableCell>
                        <p className="font-medium">{witness.user.fullName}</p>
                        <p className="text-xs text-muted-foreground">
                          {witness.user.phone ?? 'Sin celular'} · {witness.user.email}
                        </p>
                        {!witness.user.isActive && <Badge variant="outline">Cuenta desactivada</Badge>}
                      </TableCell>
                      <TableCell>{witness.pollingStation.name}</TableCell>
                      <TableCell>
                        {witness.tables.length === 0 ? (
                          <span className="text-sm text-muted-foreground">Sin mesas</span>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {witness.tables.map((t) => (
                              <Badge
                                key={t.table.id}
                                variant="outline"
                                title={t.installedAt ? `Instalada a las ${timeOf(t.installedAt)}` : 'Sin instalar'}
                              >
                                {t.table.number}
                                {t.installedAt ? ' ✓' : ''}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {witness.credentialNumber ?? '—'}
                        {witness.accreditedAt && <p className="text-xs text-muted-foreground">Acreditado</p>}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-right">
                        <Button variant="ghost" size="sm" onClick={() => setEditing(witness)}>
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Quitar a ${witness.user.fullName}`}
                          onClick={() => remove(witness)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
      {contest && (
        <NewWitnessDialog
          open={creating}
          contestId={contest.id}
          stations={stations}
          taken={taken}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            void load();
          }}
        />
      )}
      <EditWitnessDialog
        witness={editing}
        taken={taken}
        onClose={() => setEditing(null)}
        onSaved={() => {
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}
