'use client';

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Jornada electoral —
// Configurar». La contienda (sus renglones del E-14 y su estado) y las mesas
// de cada puesto. La contienda la maneja solo un administrador; el
// Coordinador crea y ajusta las mesas de los puestos de su territorio.
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ElectionDayOff } from '@/components/dashboard/election-day/contest-picker';
import { usePermission } from '@/hooks/use-permission';
import { apiErrorMessage } from '@/lib/api-error';
import { calendarDayISO } from '@/lib/dates';
import {
  CONTEST_STATUS_LABEL,
  CONTEST_STATUS_TONE,
  electionDayApi,
  FIXED_LINE_KINDS,
  LINE_KIND_LABEL,
  number,
  useElectionDayEnabled,
  type Contest,
  type ContestLineInput,
  type ContestSummary,
  type ElectionTable,
  type LineKind,
  type Station,
} from '@/lib/api/election-day';
import { useAuthStore } from '@/store/auth-store';

const COUNTED_KINDS: LineKind[] = ['CANDIDATE', 'LIST'];

function ContestDialog({
  open,
  contest,
  onClose,
  onSaved,
}: {
  open: boolean;
  contest: Contest | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [coversAll, setCoversAll] = useState(false);
  const [lines, setLines] = useState<ContestLineInput[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setName(contest?.name ?? '');
    setDate(contest?.electionDate ? calendarDayISO(contest.electionDate) : '');
    setCoversAll(contest?.coversAllLines ?? false);
    setLines(
      contest?.lines.map((l) => ({ id: l.id, label: l.label, kind: l.kind, isOwn: l.isOwn })) ?? [
        { label: '', kind: 'CANDIDATE', isOwn: true },
      ],
    );
  }, [open, contest]);

  const counted = lines.filter((l) => COUNTED_KINDS.includes(l.kind));
  const fixed = lines.filter((l) => FIXED_LINE_KINDS.includes(l.kind));
  const update = (index: number, patch: Partial<ContestLineInput>) =>
    setLines((all) => {
      const target = counted[index];
      return all.map((l) => (l === target ? { ...l, ...patch } : l));
    });

  const save = async () => {
    setSaving(true);
    try {
      const input = {
        name: name.trim(),
        electionDate: date || null,
        coversAllLines: coversAll,
        lines: [...counted.map((l) => ({ ...l, label: l.label.trim() })), ...fixed],
      };
      if (contest) await electionDayApi.updateContest(contest.id, input);
      else await electionDayApi.createContest(input);
      toast.success(contest ? 'Contienda actualizada' : 'Contienda creada');
      onSaved();
    } catch (e) {
      toast.error('No se pudo guardar', { description: apiErrorMessage(e) });
    } finally {
      setSaving(false);
    }
  };

  const ready = name.trim().length >= 3 && counted.length > 0 && counted.every((l) => l.label.trim());

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{contest ? 'Editar contienda' : 'Nueva contienda'}</DialogTitle>
          <DialogDescription>
            Los renglones son lo que tus testigos van a copiar del E-14: tu candidato, los rivales o listas que
            quieras contar. El voto en blanco, los nulos y las tarjetas no marcadas se agregan solos.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="contest-name">Nombre</Label>
              <Input
                id="contest-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Alcaldía de Neiva 2027"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="contest-date">Fecha de la elección</Label>
              <Input id="contest-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-md border p-3">
            <Switch id="contest-all" checked={coversAll} onCheckedChange={setCoversAll} />
            <Label htmlFor="contest-all" className="grid gap-1 font-normal">
              <span className="font-medium">Cuento todos los renglones del tarjetón</span>
              <span className="text-xs text-muted-foreground">
                Así la suma de renglones debe dar exacto el total de votantes de la mesa. Si solo cuentas algunos
                candidatos, déjalo apagado: la suma puede quedar por debajo.
              </span>
            </Label>
          </div>
          <div className="grid gap-2">
            <Label>Candidatos y listas</Label>
            {counted.map((line, index) => (
              <div key={line.id ?? `new-${index}`} className="flex flex-wrap items-center gap-2">
                <Input
                  id={`line-label-${index}`}
                  aria-label={`Nombre del renglón ${index + 1}`}
                  value={line.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder="Nombre como aparece en el E-14"
                  className="min-w-0 flex-1"
                />
                <Select value={line.kind} onValueChange={(kind) => update(index, { kind: kind as LineKind })}>
                  <SelectTrigger className="w-40" aria-label={`Tipo del renglón ${index + 1}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTED_KINDS.map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {LINE_KIND_LABEL[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <Checkbox
                    id={`line-own-${index}`}
                    checked={!!line.isOwn}
                    onCheckedChange={(checked) => update(index, { isOwn: checked === true })}
                  />
                  Es mi campaña
                </label>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Quitar renglón ${index + 1}`}
                  onClick={() => setLines((all) => all.filter((l) => l !== line))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="w-fit"
              onClick={() => setLines((all) => [...all, { label: '', kind: 'CANDIDATE', isOwn: false }])}
            >
              <Plus className="mr-1 h-4 w-4" /> Agregar renglón
            </Button>
            <p className="text-xs text-muted-foreground">
              Siempre al final: {FIXED_LINE_KINDS.map((k) => LINE_KIND_LABEL[k]).join(', ')}.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function TablesDialog({ station, onClose, onChanged }: { station: Station | null; onClose: () => void; onChanged: () => void }) {
  const [tables, setTables] = useState<ElectionTable[] | null>(null);
  const [newNumber, setNewNumber] = useState('');
  const canDelete = usePermission('JORNADA_ELECTORAL_ADMIN', 'canDelete');

  // Se monta con `key` por puesto: cambiar de puesto empieza de cero.
  const load = useCallback(async () => {
    if (!station) return;
    await electionDayApi
      .tables(station.id)
      .then(setTables)
      .catch((e: unknown) => toast.error('No se pudieron cargar las mesas', { description: apiErrorMessage(e) }));
  }, [station]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!station) return null;

  const saveVoters = async (table: ElectionTable, raw: string) => {
    const value = raw.trim() === '' ? null : Number(raw);
    if (value !== null && (!Number.isInteger(value) || value < 0)) return;
    if (value === table.registeredVoters) return;
    try {
      await electionDayApi.updateTable(table.id, value);
      await load();
    } catch (e) {
      toast.error('No se pudo guardar el potencial', { description: apiErrorMessage(e) });
    }
  };

  const add = async () => {
    const value = Number(newNumber);
    if (!Number.isInteger(value) || value < 1) return;
    try {
      await electionDayApi.addTable(station.id, { number: value });
      setNewNumber('');
      await load();
      onChanged();
    } catch (e) {
      toast.error('No se pudo agregar la mesa', { description: apiErrorMessage(e) });
    }
  };

  const remove = async (table: ElectionTable) => {
    if (!(await confirmDialog({ title: `¿Borrar la mesa ${table.number}?`, destructive: true, confirmLabel: 'Borrar' })))
      return;
    try {
      await electionDayApi.removeTable(table.id);
      await load();
      onChanged();
    } catch (e) {
      toast.error('No se pudo borrar la mesa', { description: apiErrorMessage(e) });
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Mesas de {station.name}</DialogTitle>
          <DialogDescription>
            El potencial (inscritos de la mesa) es opcional: con él, Zyron avisa si una mesa reporta más votantes
            que los inscritos.
          </DialogDescription>
        </DialogHeader>
        {tables === null ? (
          <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
        ) : (
          <div className="max-h-[50vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mesa</TableHead>
                  <TableHead>Potencial</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {tables.map((table) => (
                  <TableRow key={table.id}>
                    <TableCell className="font-medium">{table.number}</TableCell>
                    <TableCell>
                      <Input
                        id={`voters-${table.id}`}
                        aria-label={`Potencial de la mesa ${table.number}`}
                        type="number"
                        min={0}
                        defaultValue={table.registeredVoters ?? ''}
                        onBlur={(e) => saveVoters(table, e.target.value)}
                        className="h-8 w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      {canDelete && (
                        <Button variant="ghost" size="icon" aria-label={`Borrar mesa ${table.number}`} onClick={() => remove(table)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {tables.length === 0 && <p className="text-sm text-muted-foreground">Este puesto no tiene mesas todavía.</p>}
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="grid gap-1.5">
            <Label htmlFor="new-table">Agregar mesa número</Label>
            <Input id="new-table" type="number" min={1} value={newNumber} onChange={(e) => setNewNumber(e.target.value)} className="w-32" />
          </div>
          <Button variant="outline" onClick={add} disabled={!newNumber}>
            Agregar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ElectionSetupPage() {
  const enabled = useElectionDayEnabled();
  const role = useAuthStore((s) => s.user?.role?.code);
  const isCoordinator = role === 'COORDINATOR';
  const canDelete = usePermission('JORNADA_ELECTORAL_ADMIN', 'canDelete');
  const [contests, setContests] = useState<ContestSummary[] | null>(null);
  const [stations, setStations] = useState<Station[] | null>(null);
  const [editing, setEditing] = useState<{ open: boolean; contest: Contest | null }>({ open: false, contest: null });
  const [tablesOf, setTablesOf] = useState<Station | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, s] = await Promise.all([electionDayApi.contests(), electionDayApi.stations()]);
      setContests(c);
      setStations(s);
    } catch (e) {
      toast.error('No se pudo cargar la configuración', { description: apiErrorMessage(e) });
      setContests([]);
      setStations([]);
    }
  }, []);

  useEffect(() => {
    if (enabled) void load();
  }, [enabled, load]);

  const edit = async (id: string) => {
    try {
      setEditing({ open: true, contest: await electionDayApi.contest(id) });
    } catch (e) {
      toast.error('No se pudo abrir la contienda', { description: apiErrorMessage(e) });
    }
  };

  const setStatus = async (contest: ContestSummary, status: 'OPEN' | 'CLOSED') => {
    const ok = await confirmDialog(
      status === 'OPEN'
        ? {
            title: `¿Abrir «${contest.name}»?`,
            description: 'Desde ahora los testigos pueden marcar la instalación, enviar E-14 y reportar incidentes.',
            confirmLabel: 'Abrir jornada',
          }
        : {
            title: `¿Cerrar «${contest.name}»?`,
            description:
              'Los testigos ya no pueden enviar reportes nuevos. Lo que llenaron antes del cierre y llegue sin señal se recibe hasta 24 horas después.',
            confirmLabel: 'Cerrar jornada',
            destructive: true,
          },
    );
    if (!ok) return;
    try {
      await electionDayApi.setStatus(contest.id, status);
      toast.success(status === 'OPEN' ? 'Jornada abierta' : 'Jornada cerrada');
      await load();
    } catch (e) {
      toast.error('No se pudo cambiar el estado', { description: apiErrorMessage(e) });
    }
  };

  const remove = async (contest: ContestSummary) => {
    if (
      !(await confirmDialog({
        title: `¿Borrar «${contest.name}»?`,
        description: 'Deja de verse en la jornada, con sus testigos, E-14 e incidentes.',
        destructive: true,
        confirmLabel: 'Borrar',
      }))
    )
      return;
    try {
      await electionDayApi.removeContest(contest.id);
      await load();
    } catch (e) {
      toast.error('No se pudo borrar', { description: apiErrorMessage(e) });
    }
  };

  const generate = async () => {
    setBusy(true);
    try {
      const result = await electionDayApi.generateTables();
      toast.success(
        result.created > 0
          ? `Se crearon ${number(result.created)} mesas en ${number(result.stations)} puestos`
          : 'Ya estaban todas las mesas creadas',
      );
      await load();
    } catch (e) {
      toast.error('No se pudieron crear las mesas', { description: apiErrorMessage(e) });
    } finally {
      setBusy(false);
    }
  };

  if (enabled === false)
    return (
      <div className="p-4 md:p-6">
        <ElectionDayOff />
      </div>
    );

  const totalTables = (stations ?? []).reduce((acc, s) => acc + s.createdTables, 0);

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold">Configurar la jornada</h1>
        <p className="text-sm text-muted-foreground">
          Crea la contienda con los renglones del E-14, las mesas de tus puestos y, después, carga los testigos.
        </p>
      </div>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Contiendas</CardTitle>
            <CardDescription>Una contienda es un cargo en una fecha. Solo una contienda abierta recibe reportes.</CardDescription>
          </div>
          {!isCoordinator && (
            <Button onClick={() => setEditing({ open: true, contest: null })}>
              <Plus className="mr-1 h-4 w-4" /> Nueva contienda
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {contests === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : contests.length === 0 ? (
            <p className="text-sm text-muted-foreground">Todavía no hay contiendas.</p>
          ) : (
            <ul className="divide-y">
              {contests.map((contest) => (
                <li key={contest.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="font-medium">{contest.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {contest.electionDate ? calendarDayISO(contest.electionDate) : 'Sin fecha'} ·{' '}
                      {number(contest.lineCount)} renglones · {number(contest.witnessCount)} testigos ·{' '}
                      {number(contest.resultCount)} E-14
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge className={CONTEST_STATUS_TONE[contest.status]}>{CONTEST_STATUS_LABEL[contest.status]}</Badge>
                    {!isCoordinator && (
                      <>
                        <Button variant="outline" size="sm" onClick={() => edit(contest.id)}>
                          Editar
                        </Button>
                        {contest.status === 'OPEN' ? (
                          <Button variant="outline" size="sm" onClick={() => setStatus(contest, 'CLOSED')}>
                            Cerrar jornada
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => setStatus(contest, 'OPEN')}>
                            {contest.status === 'CLOSED' ? 'Reabrir' : 'Abrir jornada'}
                          </Button>
                        )}
                        {canDelete && contest.status !== 'OPEN' && (
                          <Button variant="ghost" size="icon" aria-label={`Borrar ${contest.name}`} onClick={() => remove(contest)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Puestos y mesas</CardTitle>
            <CardDescription>
              Las mesas salen del número de mesas de cada puesto (Territorio → Puestos de votación). {number(totalTables)} mesas
              creadas. Puedes tener tantos testigos como mesas.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={generate} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Crear las mesas de todos los puestos
          </Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {stations === null ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : stations.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {isCoordinator
                ? 'Tu territorio no tiene puestos de votación.'
                : 'Tu organización no tiene puestos de votación cargados.'}
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Puesto</TableHead>
                  <TableHead>Municipio</TableHead>
                  <TableHead className="text-right">Mesas del puesto</TableHead>
                  <TableHead className="text-right">Mesas creadas</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {stations.map((station) => (
                  <TableRow key={station.id}>
                    <TableCell className="font-medium">{station.name}</TableCell>
                    <TableCell>{station.municipality?.name ?? '—'}</TableCell>
                    <TableCell className="text-right tabular-nums">{number(station.declaredTables)}</TableCell>
                    <TableCell className="text-right tabular-nums">{number(station.createdTables)}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => setTablesOf(station)}>
                        Ver mesas
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <ContestDialog
        open={editing.open}
        contest={editing.contest}
        onClose={() => setEditing({ open: false, contest: null })}
        onSaved={() => {
          setEditing({ open: false, contest: null });
          void load();
        }}
      />
      {tablesOf && <TablesDialog key={tablesOf.id} station={tablesOf} onClose={() => setTablesOf(null)} onChanged={load} />}
    </div>
  );
}
