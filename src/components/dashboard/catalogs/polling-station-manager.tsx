'use client';

// Fase 3 "Territorio para cualquier municipio" (2026-10-06): catálogo de
// puestos de votación de la organización. Antes el puesto era texto libre en
// cada contacto, así que el mismo colegio escrito de tres formas contaba como
// tres puestos en Día D. Se cargan a mano o desde un Excel/CSV (la
// Registraduría no ofrece un listado nacional descargable).
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  Download,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  Search,
  Trash2,
  Upload,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { extractErrorMessage } from '@/lib/api/catalogs';
import {
  pollingStationsApi,
  type PollingStation,
  type PollingStationImportResult,
} from '@/lib/api/polling-stations';
import { downloadCsv } from '@/lib/api/prospect-imports';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useZones } from '@/hooks/use-zones';

interface PollingStationManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const NO_ZONE = 'none';
const emptyForm = { name: '', address: '', zone: NO_ZONE, tables: '', registeredVoters: '' };
const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

/** "" → null; entero ≥ 0 → número; cualquier otra cosa → undefined (inválido). */
function parseCount(raw: string): number | null | undefined {
  const text = raw.trim().replace(/[.\s]/g, '');
  if (!text) return null;
  return /^\d+$/.test(text) ? Number(text) : undefined;
}

function downloadTemplate() {
  downloadCsv('plantilla-puestos-de-votacion.csv', [
    ['Puesto', 'Dirección', 'Zona', 'Mesas', 'Potencial electoral'],
    ['I.E. Santa Librada', 'Calle 8 # 5-20', 'Comuna 6', 12, 4200],
    ['Escuela Central', 'Carrera 4 # 10-15', 'Comuna 1', 8, 2750],
  ]);
}

export function PollingStationManager({ canWrite, canDelete }: PollingStationManagerProps) {
  const { zones } = useZones();
  const [items, setItems] = useState<PollingStation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<PollingStation | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<PollingStationImportResult | null>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await pollingStationsApi.list(true));
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar los puestos de votación');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const visible = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) =>
      [item.name, item.address, item.zoneName].some((text) => (text ?? '').toLowerCase().includes(term)),
    );
  }, [items, search]);

  const totals = useMemo(
    () => ({
      contacts: items.reduce((sum, item) => sum + item.contacts, 0),
      voters: items.reduce((sum, item) => sum + (item.registeredVoters ?? 0), 0),
    }),
    [items],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: PollingStation) {
    setEditing(item);
    setForm({
      name: item.name,
      address: item.address ?? '',
      zone: item.localityId === null ? NO_ZONE : String(item.localityId),
      tables: item.tables === null ? '' : String(item.tables),
      registeredVoters: item.registeredVoters === null ? '' : String(item.registeredVoters),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error('Escribe el nombre del puesto de votación');
      return;
    }
    const tables = parseCount(form.tables);
    const registeredVoters = parseCount(form.registeredVoters);
    if (tables === undefined || registeredVoters === undefined) {
      toast.error('Mesas y potencial electoral deben ser números enteros');
      return;
    }

    setSaving(true);
    try {
      const data = {
        name,
        address: form.address.trim(),
        localityId: form.zone === NO_ZONE ? null : Number(form.zone),
        tables,
        registeredVoters,
      };
      if (editing) {
        await pollingStationsApi.update(editing.id, data);
        toast.success('Puesto actualizado');
      } else {
        const created = await pollingStationsApi.create(data);
        toast.success('Puesto creado', {
          description:
            created.linkedProspects > 0
              ? `${number(created.linkedProspects)} contacto(s) que ya lo tenían escrito quedaron enlazados.`
              : undefined,
        });
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar el puesto');
    } finally {
      setSaving(false);
    }
  }

  async function handleFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setImporting(true);
    try {
      setImportResult(await pollingStationsApi.importFile(file));
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo leer el archivo');
    } finally {
      setImporting(false);
    }
  }

  async function handleToggle(item: PollingStation) {
    try {
      await pollingStationsApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Puesto desactivado' : 'Puesto activado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo cambiar el estado');
    }
  }

  async function handleDelete(item: PollingStation) {
    const confirmed = await confirmDialog({
      title: `¿Eliminar el puesto "${item.name}"?`,
      description:
        item.contacts > 0
          ? `${number(item.contacts)} contacto(s) votan aquí. No se borran: conservan el nombre del puesto, pero dejan de estar enlazados al catálogo.`
          : 'Esta acción no se puede deshacer.',
      confirmLabel: 'Eliminar',
      destructive: true,
    });
    if (!confirmed) return;
    try {
      await pollingStationsApi.remove(item.id);
      toast.success('Puesto eliminado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo eliminar el puesto');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">Puestos de votación</h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Los puestos donde vota tu gente. Con el catálogo, cada contacto queda enlazado a un puesto con un solo
            nombre, y Día D muestra mesas y potencial electoral por puesto.
          </p>
        </div>
        {canWrite && (
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={downloadTemplate}>
              <Download className="mr-1 h-4 w-4" /> Plantilla
            </Button>
            <Button size="sm" variant="outline" disabled={importing} onClick={() => fileInput.current?.click()}>
              {importing ? (
                <Loader2 className="mr-1 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-1 h-4 w-4" />
              )}
              Cargar desde Excel
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Nuevo puesto
            </Button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv,.txt"
              className="hidden"
              onChange={handleFile}
              aria-label="Archivo con el listado de puestos de votación"
            />
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <Input
              aria-label="Buscar puesto"
              placeholder="Buscar por nombre, dirección o zona"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <p className="text-xs text-slate-500">
            {number(items.length)} puesto(s) · {number(totals.contacts)} contacto(s) enlazados
            {totals.voters > 0 ? ` · potencial ${number(totals.voters)}` : ''}
          </p>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">Todavía no hay puestos de votación.</p>
          <p className="mt-1">
            {canWrite
              ? 'Descarga la plantilla, llénala con los puestos de tu municipio y súbela con "Cargar desde Excel".'
              : 'Pide a un administrador que los cargue.'}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Ningún puesto coincide con la búsqueda.</p>
      ) : (
        <div className="overflow-x-auto rounded-md border bg-white">
          <table className="w-full min-w-[640px] text-sm">
            <thead className="border-b bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th scope="col" className="px-4 py-2 font-semibold">Puesto</th>
                <th scope="col" className="px-4 py-2 font-semibold">Zona</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Mesas</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Potencial</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Contactos</th>
                <th scope="col" className="px-4 py-2">
                  <span className="sr-only">Acciones</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {visible.map((item) => (
                <tr key={item.id}>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-slate-800">{item.name}</span>
                      {!item.isActive && (
                        <Badge
                          variant="outline"
                          className="border-destructive/30 text-[10px] uppercase text-destructive"
                        >
                          Inactivo
                        </Badge>
                      )}
                    </div>
                    {item.address && <p className="text-xs text-slate-500">{item.address}</p>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{item.zoneName ?? '—'}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {item.tables === null ? '—' : number(item.tables)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-600">
                    {item.registeredVoters === null ? '—' : number(item.registeredVoters)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-slate-800">
                    {number(item.contacts)}
                    {item.confirmed > 0 && (
                      <span className="block text-xs text-slate-500">{number(item.confirmed)} con voto confirmado</span>
                    )}
                  </td>
                  <td className="px-2 py-3 text-right">
                    {(canWrite || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <span className="sr-only">Acciones de {item.name}</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          {canWrite && (
                            <DropdownMenuItem onClick={() => openEdit(item)}>
                              <Pencil className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>
                          )}
                          {canWrite && (
                            <DropdownMenuItem onClick={() => handleToggle(item)}>
                              <Power className="mr-2 h-4 w-4" />
                              {item.isActive ? 'Desactivar' : 'Activar'}
                            </DropdownMenuItem>
                          )}
                          {canDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(item)}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Crear o editar un puesto */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar puesto de votación' : 'Nuevo puesto de votación'}</DialogTitle>
            <DialogDescription>
              {editing
                ? 'Si cambias el nombre, los contactos enlazados lo reciben también.'
                : 'Solo el nombre es obligatorio.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="station-name">Nombre</Label>
              <Input
                id="station-name"
                autoFocus
                placeholder="Ej: I.E. Santa Librada"
                maxLength={160}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="station-address">Dirección (opcional)</Label>
              <Input
                id="station-address"
                maxLength={200}
                value={form.address}
                onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="station-zone">Zona (opcional)</Label>
              <Select value={form.zone} onValueChange={(zone) => setForm((f) => ({ ...f, zone }))}>
                <SelectTrigger id="station-zone">
                  <SelectValue placeholder="Sin zona" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={NO_ZONE}>Sin zona</SelectItem>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={String(zone.id)}>
                      {zone.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="station-tables">Mesas (opcional)</Label>
                <Input
                  id="station-tables"
                  inputMode="numeric"
                  value={form.tables}
                  onChange={(e) => setForm((f) => ({ ...f, tables: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="station-voters">Potencial electoral (opcional)</Label>
                <Input
                  id="station-voters"
                  inputMode="numeric"
                  value={form.registeredVoters}
                  onChange={(e) => setForm((f) => ({ ...f, registeredVoters: e.target.value }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Resultado de la carga desde archivo */}
      <Dialog open={importResult !== null} onOpenChange={(open) => !open && setImportResult(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Listado cargado</DialogTitle>
            <DialogDescription>
              {importResult ? `${number(importResult.total)} fila(s) leídas del archivo.` : ''}
            </DialogDescription>
          </DialogHeader>
          {importResult && (
            <div className="space-y-3 text-sm text-slate-700">
              <ul className="space-y-1">
                <li>
                  <strong>{number(importResult.created)}</strong> puesto(s) nuevos
                </li>
                <li>
                  <strong>{number(importResult.updated)}</strong> puesto(s) que ya existían, actualizados
                </li>
                {importResult.linkedProspects > 0 && (
                  <li>
                    <strong>{number(importResult.linkedProspects)}</strong> contacto(s) que ya tenían escrito el
                    puesto quedaron enlazados
                  </li>
                )}
              </ul>
              {importResult.unknownZones.length > 0 && (
                <p className="rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  Estas zonas del archivo no existen en tu catálogo y esos puestos quedaron sin zona:{' '}
                  {importResult.unknownZones.slice(0, 10).join(', ')}
                  {importResult.unknownZones.length > 10 ? '…' : ''}. Créalas en la pestaña Zonas y vuelve a subir
                  el archivo para asignarlas.
                </p>
              )}
              {importResult.skippedCount > 0 && (
                <div className="space-y-1">
                  <p className="font-semibold">{number(importResult.skippedCount)} fila(s) no entraron:</p>
                  <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2 text-xs text-slate-600">
                    {importResult.skipped.map((issue) => (
                      <li key={issue.row}>
                        Fila {issue.row}: {issue.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setImportResult(null)}>Entendido</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
