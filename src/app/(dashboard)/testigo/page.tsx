'use client';

// Plan hacia la versión estable, Fase 5 (2026-11-10): «Mis mesas», la
// pantalla del testigo electoral en el celular. Marca la instalación de la
// mesa, toma la foto del E-14, la hace leer (IA, con señal) y confirma o
// corrige los números antes de enviar; reporta incidentes del puesto.
//
// Sin señal: la pantalla abre con la última copia de sus mesas (IndexedDB +
// service worker con alcance `/testigo`) y los reportes quedan en cola en el
// celular hasta que vuelva la conexión (`lib/election-day-outbox.ts`).
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  CloudOff,
  Loader2,
  RefreshCw,
  ScanLine,
  Siren,
  Wifi,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Textarea } from '@/components/ui/textarea';
import { ElectionDayOff } from '@/components/dashboard/election-day/contest-picker';
import { apiErrorMessage } from '@/lib/api-error';
import {
  compressPhoto,
  CONTEST_STATUS_LABEL,
  CONTEST_STATUS_TONE,
  electionDayApi,
  INCIDENT_KIND_LABEL,
  INCIDENT_KIND_ORDER,
  newClientId,
  number,
  timeOf,
  useElectionDayEnabled,
  type IncidentKind,
  type MyAssignment,
} from '@/lib/api/election-day';
import {
  clearWitnessStorage,
  dropReport,
  flushOutbox,
  queueReport,
  queuedReports,
  retryReport,
  saveAssignments,
  savedAssignments,
  type QueuedReport,
} from '@/lib/election-day-outbox';
import { useAuthStore } from '@/store/auth-store';
import { useVisibleInterval } from '@/hooks/use-visible-interval';
import { getCurrentSession } from '@/lib/api/auth';

type Table = MyAssignment['tables'][number];

function subscribeOnline(onChange: () => void): () => void {
  window.addEventListener('online', onChange);
  window.addEventListener('offline', onChange);
  return () => {
    window.removeEventListener('online', onChange);
    window.removeEventListener('offline', onChange);
  };
}

function useOnline(): boolean {
  return useSyncExternalStore(
    subscribeOnline,
    () => navigator.onLine,
    () => true,
  );
}

/** El formulario del E-14 de una mesa. */
function E14Dialog({
  userId,
  assignment,
  table,
  online,
  onClose,
  onQueued,
}: {
  userId: string;
  assignment: MyAssignment;
  table: Table | null;
  online: boolean;
  onClose: () => void;
  onQueued: () => void;
}) {
  const lines = assignment.contest.lines;
  const [clientId, setClientId] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [proposal, setProposal] = useState<Record<string, number | null> | null>(null);
  const [proposalTotal, setProposalTotal] = useState<number | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [total, setTotal] = useState('');
  const [reading, setReading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!table) return;
    setClientId(newClientId());
    setPhoto(null);
    setPreview(null);
    setPhotoUploaded(!!table.result?.hasPhoto && table.result.status === 'DRAFT');
    setProposal(null);
    setProposalTotal(null);
    setVotes({});
    setTotal('');
  }, [table]);

  useEffect(() => () => {
    if (preview) URL.revokeObjectURL(preview);
  }, [preview]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    const compressed = await compressPhoto(file);
    setPhoto(compressed);
    setPreview(URL.createObjectURL(compressed));
    setPhotoUploaded(false);
    setProposal(null);
    setProposalTotal(null);
  };

  const read = async () => {
    if (!photo || !table) return;
    setReading(true);
    try {
      const result = await electionDayApi.readPhoto(assignment.contest.id, table.id, photo);
      setPhotoUploaded(true);
      const proposed = Object.fromEntries(result.lines.map((l) => [l.lineId, l.votes]));
      setProposal(proposed);
      setProposalTotal(result.totalVoters);
      setVotes((current) => {
        const next = { ...current };
        for (const line of lines) {
          const value = proposed[line.id];
          if ((next[line.id] ?? '') === '' && value !== null && value !== undefined) next[line.id] = String(value);
        }
        return next;
      });
      if (total === '' && result.totalVoters !== null) setTotal(String(result.totalVoters));
      toast.success('Foto leída', { description: 'Revisa cada número contra el acta antes de enviar.' });
    } catch (e) {
      toast.error('No se pudo leer la foto', {
        description: apiErrorMessage(e) ?? 'Digita los números a mano; la foto se envía igual.',
      });
    } finally {
      setReading(false);
    }
  };

  if (!table) return null;

  const sum = lines.reduce((acc, l) => acc + (Number(votes[l.id]) || 0), 0);
  const totalNumber = total === '' ? null : Number(total);
  const filled = lines.every((l) => votes[l.id] !== undefined && votes[l.id] !== '') && totalNumber !== null;
  const warnings: string[] = [];
  if (filled && totalNumber !== null) {
    if (assignment.contest.coversAllLines ? sum !== totalNumber : sum > totalNumber)
      warnings.push(`La suma de los renglones (${number(sum)}) no da el total de votantes (${number(totalNumber)}).`);
    if (table.registeredVoters !== null && totalNumber > table.registeredVoters)
      warnings.push(`Hay más votantes (${number(totalNumber)}) que inscritos en la mesa (${number(table.registeredVoters)}).`);
  }
  const differs = (lineId: string) =>
    proposal !== null &&
    proposal[lineId] !== null &&
    proposal[lineId] !== undefined &&
    votes[lineId] !== '' &&
    String(proposal[lineId]) !== votes[lineId];
  if (proposal && lines.some((l) => differs(l.id)))
    warnings.push('Algunos números no coinciden con lo que leyó la foto: confírmalos contra el acta.');
  if (!photo && !photoUploaded) warnings.push('Sin foto del E-14: la campaña lo va a revisar.');

  const submit = async () => {
    if (!filled || totalNumber === null) return;
    setSaving(true);
    try {
      await queueReport({
        clientId,
        userId,
        kind: 'result',
        contestId: assignment.contest.id,
        tableId: table.id,
        tableNumber: table.number,
        totalVoters: totalNumber,
        lines: lines.map((l) => ({ lineId: l.id, votes: Number(votes[l.id]) })),
        photo: photoUploaded ? null : photo,
        reportedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      onQueued();
      onClose();
    } catch {
      toast.error('No se pudo guardar en el celular', {
        description: 'Revisa que el navegador no esté en modo privado e intenta de nuevo.',
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>E-14 · mesa {table.number}</DialogTitle>
          <DialogDescription>Copia los números tal como quedaron en el acta de la mesa.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-2">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => void pick(e.target.files?.[0])}
            />
            {preview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt={`Foto del E-14 de la mesa ${table.number}`} className="max-h-64 w-full rounded-md object-contain" />
            ) : photoUploaded ? (
              <p className="text-sm text-muted-foreground">La foto ya está guardada.</p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={() => fileRef.current?.click()}>
                <Camera className="mr-2 h-4 w-4" /> {photo || photoUploaded ? 'Tomar otra foto' : 'Tomar foto del E-14'}
              </Button>
              {photo && !photoUploaded && (
                <Button type="button" variant="outline" onClick={read} disabled={!online || reading}>
                  {reading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ScanLine className="mr-2 h-4 w-4" />}
                  Leer la foto
                </Button>
              )}
            </div>
            {photo && !photoUploaded && !online && (
              <p className="text-xs text-muted-foreground">Sin señal no se puede leer la foto: digita los números y envía.</p>
            )}
          </div>

          <div className="grid gap-2">
            {lines.map((line, index) => (
              <div key={line.id} className="grid grid-cols-[1fr_6.5rem] items-center gap-2">
                <Label htmlFor={`e14-${index}`} className={line.isOwn ? 'font-semibold' : 'font-normal'}>
                  {line.label}
                  {differs(line.id) && (
                    <span className="block text-xs font-normal text-amber-700 dark:text-amber-300">
                      La foto dice {number(proposal?.[line.id])}
                    </span>
                  )}
                </Label>
                <Input
                  id={`e14-${index}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  value={votes[line.id] ?? ''}
                  onChange={(e) => setVotes((v) => ({ ...v, [line.id]: e.target.value }))}
                  className={`h-11 text-right text-lg ${differs(line.id) ? 'border-amber-500' : ''}`}
                />
              </div>
            ))}
            <div className="grid grid-cols-[1fr_6.5rem] items-center gap-2 border-t pt-3">
              <Label htmlFor="e14-total" className="font-semibold">
                Total de votantes
                {proposalTotal !== null && total !== '' && String(proposalTotal) !== total && (
                  <span className="block text-xs font-normal text-amber-700 dark:text-amber-300">
                    La foto dice {number(proposalTotal)}
                  </span>
                )}
              </Label>
              <Input
                id="e14-total"
                type="number"
                inputMode="numeric"
                min={0}
                value={total}
                onChange={(e) => setTotal(e.target.value)}
                className="h-11 text-right text-lg"
              />
            </div>
            <p className="text-xs text-muted-foreground">Suma de los renglones: {number(sum)}</p>
          </div>

          {warnings.length > 0 && (
            <div className="rounded-md border border-amber-400 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
              <p className="flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4" aria-hidden /> Revisa antes de enviar
              </p>
              <ul className="ml-6 list-disc">
                {warnings.map((w) => (
                  <li key={w}>{w}</li>
                ))}
              </ul>
              <p className="mt-1 text-xs">Si el acta dice eso, envíalo igual: la campaña lo revisa.</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!filled || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar E-14
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function IncidentDialog({
  userId,
  assignment,
  onClose,
  onQueued,
}: {
  userId: string;
  assignment: MyAssignment | null;
  onClose: () => void;
  onQueued: () => void;
}) {
  const [kind, setKind] = useState<IncidentKind | ''>('');
  const [tableId, setTableId] = useState('none');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<Blob | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Se monta al abrirla y se desmonta al cerrarla: cada incidente empieza de cero.
  if (!assignment) return null;

  const submit = async () => {
    if (!kind) return;
    try {
      await queueReport({
        clientId: newClientId(),
        userId,
        kind: 'incident',
        contestId: assignment.contest.id,
        incidentKind: kind,
        tableId: tableId === 'none' ? null : tableId,
        description: description.trim() || null,
        photo,
        occurredAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
      });
      onQueued();
      onClose();
    } catch {
      toast.error('No se pudo guardar en el celular');
    }
  };

  return (
    <Dialog open onOpenChange={(value) => !value && onClose()}>
      <DialogContent className="max-h-[95vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Reportar un incidente</DialogTitle>
          <DialogDescription>{assignment.station.name}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid gap-1.5">
            <Label htmlFor="incident-kind">Qué pasó</Label>
            <Select value={kind} onValueChange={(value) => setKind(value as IncidentKind)}>
              <SelectTrigger id="incident-kind">
                <SelectValue placeholder="Elige el tipo" />
              </SelectTrigger>
              <SelectContent>
                {INCIDENT_KIND_ORDER.map((k) => (
                  <SelectItem key={k} value={k}>
                    {INCIDENT_KIND_LABEL[k]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-table">Mesa</Label>
            <Select value={tableId} onValueChange={setTableId}>
              <SelectTrigger id="incident-table">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Todo el puesto</SelectItem>
                {assignment.tables.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    Mesa {t.number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="incident-description">Cuéntalo en pocas palabras</Label>
            <Textarea
              id="incident-description"
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Qué viste, dónde y a qué hora. No escribas nombres de votantes."
            />
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              if (file) setPhoto(await compressPhoto(file, 1600, 0.8));
            }}
          />
          <Button type="button" variant="outline" className="w-fit" onClick={() => fileRef.current?.click()}>
            <Camera className="mr-2 h-4 w-4" /> {photo ? 'Foto lista · tomar otra' : 'Agregar foto (opcional)'}
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!kind}>
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const SESSION_KEY = 'zyron:testigo:sesion';
const SESSION_WARN_MS = 3 * 60 * 60 * 1000;

/**
 * Hora en que vence la sesión (en producción dura 8 h). Se guarda en el
 * celular para mostrarla sin señal: un testigo que entra a las 7:00 queda sin
 * sesión antes del cierre y debe volver a entrar para enviar el E-14.
 */
function useSessionExpiry(userId: string, online: boolean): string | null {
  const [loaded, setLoaded] = useState<{ userId: string; expiresAt: string } | null>(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(SESSION_KEY) ?? 'null') as {
        userId?: string;
        expiresAt?: string;
      } | null;
      return saved?.userId && saved.expiresAt ? { userId: saved.userId, expiresAt: saved.expiresAt } : null;
    } catch {
      return null;
    }
  });
  useEffect(() => {
    if (!userId || !online) return;
    getCurrentSession()
      .then((session) => {
        const value = { userId, expiresAt: session.expiresAt };
        setLoaded(value);
        try {
          window.localStorage.setItem(SESSION_KEY, JSON.stringify(value));
        } catch {
          // Sin almacenamiento: se muestra solo con señal.
        }
      })
      .catch(() => undefined);
  }, [userId, online]);
  return loaded && loaded.userId === userId ? loaded.expiresAt : null;
}

export default function WitnessPage() {
  const enabled = useElectionDayEnabled();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const userId = user?.id ?? '';
  const online = useOnline();
  const [assignments, setAssignments] = useState<MyAssignment[] | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueuedReport[]>([]);
  const [e14, setE14] = useState<{ assignment: MyAssignment; table: Table } | null>(null);
  const [incidentFor, setIncidentFor] = useState<MyAssignment | null>(null);
  const [syncing, setSyncing] = useState(false);
  const expiresAt = useSessionExpiry(userId, online);
  const [now, setNow] = useState(() => Date.now());
  useVisibleInterval(() => setNow(Date.now()), 60_000);

  // Service worker con alcance `/testigo`: deja abrir la pantalla sin señal.
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    navigator.serviceWorker.register('/testigo-sw.js', { scope: '/testigo' }).catch(() => undefined);
  }, []);

  const refreshQueue = useCallback(async () => {
    if (userId) setQueue(await queuedReports(userId));
  }, [userId]);

  const load = useCallback(async () => {
    if (!userId) return;
    try {
      const data = await electionDayApi.me();
      setAssignments(data);
      setSavedAt(null);
      await saveAssignments(userId, data);
    } catch {
      const saved = await savedAssignments(userId);
      if (saved) {
        setAssignments(saved.data);
        setSavedAt(saved.savedAt);
      } else {
        setAssignments((current) => current ?? []);
      }
    }
  }, [userId]);

  const sync = useCallback(async () => {
    if (!userId) return;
    setSyncing(true);
    try {
      const { sent } = await flushOutbox(userId);
      if (sent > 0) {
        toast.success(sent === 1 ? 'Reporte enviado' : `${sent} reportes enviados`);
        await load();
      }
    } finally {
      await refreshQueue();
      setSyncing(false);
    }
  }, [userId, load, refreshQueue]);

  useEffect(() => {
    if (enabled === false) return;
    void load();
    void sync();
  }, [enabled, load, sync]);

  // Al volver la señal se envía lo pendiente; mientras haya cola, se reintenta cada 30 s.
  useEffect(() => {
    if (online) void sync();
  }, [online, sync]);
  useEffect(() => {
    if (queue.length === 0) return;
    const id = window.setInterval(() => void sync(), 30_000);
    return () => window.clearInterval(id);
  }, [queue.length, sync]);

  const queuedTables = useMemo(
    () => new Set(queue.filter((r) => r.kind === 'result').map((r) => (r.kind === 'result' ? r.tableId : ''))),
    [queue],
  );

  const install = async (assignment: MyAssignment, table: Table) => {
    try {
      await electionDayApi.install(assignment.contest.id, table.id);
      toast.success(`Mesa ${table.number} instalada`);
      await load();
    } catch (e) {
      toast.error('No se pudo marcar', { description: apiErrorMessage(e) });
    }
  };

  const signOut = async () => {
    if (
      queue.length > 0 &&
      !(await confirmDialog({
        title: 'Tienes reportes sin enviar',
        description: 'Si cierras sesión ahora se borran de este celular y la campaña no los recibe.',
        confirmLabel: 'Cerrar sesión igual',
        destructive: true,
      }))
    )
      return;
    await clearWitnessStorage();
    logout();
  };

  if (enabled === false)
    return (
      <div className="p-4">
        <ElectionDayOff />
      </div>
    );

  return (
    <div className="mx-auto max-w-xl space-y-4 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Mis mesas</h1>
          <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
            {online ? <Wifi className="h-4 w-4" aria-hidden /> : <CloudOff className="h-4 w-4" aria-hidden />}
            {online ? 'Con señal' : 'Sin señal: lo que reportes se envía cuando vuelva'}
          </p>
          {savedAt && (
            <p className="text-xs text-muted-foreground">Mostrando la copia guardada a las {timeOf(savedAt)}.</p>
          )}
        </div>
        <Button variant="outline" size="icon" aria-label="Actualizar" onClick={() => void load()} disabled={!online}>
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {expiresAt && new Date(expiresAt).getTime() - now < SESSION_WARN_MS && (
        <Card className="border-amber-400">
          <CardContent className="space-y-2 p-4">
            <p className="font-medium">
              {new Date(expiresAt).getTime() <= now
                ? 'Tu sesión venció'
                : `Tu sesión vence a las ${timeOf(expiresAt)}`}
            </p>
            <p className="text-sm text-muted-foreground">
              Para enviar el E-14 al cierre, vuelve a entrar con tu usuario y contraseña. Lo que tengas por enviar
              queda guardado en este celular y se envía al entrar.
            </p>
            <Button size="sm" variant="outline" onClick={logout} disabled={!online}>
              Volver a entrar
            </Button>
          </CardContent>
        </Card>
      )}

      {queue.length > 0 && (
        <Card className="border-amber-400">
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-medium">
                {queue.length === 1 ? '1 reporte por enviar' : `${queue.length} reportes por enviar`}
              </p>
              <Button size="sm" variant="outline" onClick={() => void sync()} disabled={!online || syncing}>
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}Enviar ahora
              </Button>
            </div>
            <ul className="space-y-2 text-sm">
              {queue.map((report) => (
                <li key={report.clientId} className="rounded-md bg-muted/50 p-2">
                  <p>
                    {report.kind === 'result'
                      ? `E-14 de la mesa ${report.tableNumber}`
                      : `Incidente: ${INCIDENT_KIND_LABEL[report.incidentKind]}`}{' '}
                    <span className="text-xs text-muted-foreground">· {timeOf(report.createdAt)}</span>
                  </p>
                  {report.error && (
                    <div className="mt-1 space-y-1">
                      <p className="text-xs text-destructive">{report.error}</p>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            await retryReport(userId, report.clientId);
                            await sync();
                          }}
                        >
                          Reintentar
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={async () => {
                            await dropReport(report.clientId);
                            await refreshQueue();
                          }}
                        >
                          Descartar
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {assignments === null ? (
        <div className="flex justify-center p-10">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" aria-label="Cargando tus mesas" />
        </div>
      ) : assignments.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">
            Todavía no tienes mesas asignadas. Cuando la campaña te asigne, aparecen aquí.
          </CardContent>
        </Card>
      ) : (
        assignments.map((assignment) => {
          const open = assignment.contest.status === 'OPEN';
          return (
            <Card key={assignment.witnessId}>
              <CardHeader className="space-y-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle className="text-lg">{assignment.contest.name}</CardTitle>
                  <Badge className={CONTEST_STATUS_TONE[assignment.contest.status]}>
                    {CONTEST_STATUS_LABEL[assignment.contest.status]}
                  </Badge>
                </div>
                <p className="text-sm">
                  {assignment.station.name}
                  {assignment.station.municipality ? ` · ${assignment.station.municipality.name}` : ''}
                </p>
                {assignment.station.address && (
                  <p className="text-xs text-muted-foreground">{assignment.station.address}</p>
                )}
                {assignment.credentialNumber && (
                  <p className="text-xs text-muted-foreground">Credencial {assignment.credentialNumber}</p>
                )}
                {assignment.contest.status === 'DRAFT' && (
                  <p className="text-sm text-muted-foreground">La jornada todavía no abre: aquí verás tus mesas ese día.</p>
                )}
              </CardHeader>
              <CardContent className="space-y-3">
                {assignment.tables.length === 0 && (
                  <p className="text-sm text-muted-foreground">La campaña todavía no te asignó mesas en este puesto.</p>
                )}
                {assignment.tables.map((table) => {
                  const sent = table.result && table.result.status !== 'DRAFT';
                  const queued = queuedTables.has(table.id);
                  return (
                    <div key={table.id} className="rounded-md border p-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-base font-semibold">Mesa {table.number}</p>
                        {sent ? (
                          <Badge className="bg-green-100 text-green-800">
                            <CheckCircle2 className="mr-1 h-3 w-3" aria-hidden /> E-14 enviado {timeOf(table.result?.submittedAt)}
                          </Badge>
                        ) : queued ? (
                          <Badge variant="outline">En cola para enviar</Badge>
                        ) : table.installedAt ? (
                          <Badge variant="outline">Instalada {timeOf(table.installedAt)}</Badge>
                        ) : (
                          <Badge variant="outline">Sin instalar</Badge>
                        )}
                      </div>
                      {sent && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Total de votantes: {number(table.result?.totalVoters)}. Si hay que corregirlo, avísale a la campaña.
                        </p>
                      )}
                      {open && !sent && !queued && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {!table.installedAt && (
                            <Button variant="outline" size="sm" onClick={() => install(assignment, table)} disabled={!online}>
                              Marcar mesa instalada
                            </Button>
                          )}
                          <Button size="sm" onClick={() => setE14({ assignment, table })}>
                            Reportar E-14
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
                {open && (
                  <Button variant="outline" className="w-full" onClick={() => setIncidentFor(assignment)}>
                    <Siren className="mr-2 h-4 w-4" /> Reportar un incidente
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })
      )}

      <Button variant="ghost" className="w-full text-muted-foreground" onClick={signOut}>
        Cerrar sesión y borrar lo guardado en este celular
      </Button>

      {e14 && (
        <E14Dialog
          userId={userId}
          assignment={e14.assignment}
          table={e14.table}
          online={online}
          onClose={() => setE14(null)}
          onQueued={() => {
            void refreshQueue().then(() => sync());
            toast.success(online ? 'E-14 guardado, enviando…' : 'E-14 guardado: se envía cuando vuelva la señal');
          }}
        />
      )}
      {incidentFor && (
        <IncidentDialog
          userId={userId}
          assignment={incidentFor}
          onClose={() => setIncidentFor(null)}
          onQueued={() => {
            void refreshQueue().then(() => sync());
            toast.success(online ? 'Incidente guardado, enviando…' : 'Incidente guardado: se envía cuando vuelva la señal');
          }}
        />
      )}
    </div>
  );
}
