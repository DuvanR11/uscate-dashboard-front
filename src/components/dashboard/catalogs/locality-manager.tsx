'use client';

// Fase 3 "Territorio para cualquier municipio" (2026-10-06): este catálogo
// eran las 20 localidades de Bogotá, iguales para todos los clientes y
// editables solo por un SUPER_ADMIN. Ahora son las ZONAS de cada
// organización: comunas, barrios, veredas o como divida su municipio. Las
// compartidas (Bogotá) siguen apareciendo, de solo lectura, a quien trabaja
// allí.
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { ListPlus, Loader2, MapPin, MoreHorizontal, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
import { localitiesApi, Locality, extractErrorMessage } from '@/lib/api/catalogs';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { useOrgTerritory } from '@/hooks/use-org-territory';

interface LocalityManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const KIND_SUGGESTIONS = ['Comuna', 'Barrio', 'Vereda', 'Corregimiento', 'Localidad', 'Sector'];
const MAX_BULK = 500;
const emptyForm = { name: '', kind: '', lat: '', lng: '' };

/** "" → sin coordenada; texto no numérico → null (inválido). */
function parseCoordinate(raw: string): number | undefined | null {
  const text = raw.trim().replace(',', '.');
  if (!text) return undefined;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
}

export function LocalityManager({ canWrite, canDelete }: LocalityManagerProps) {
  const { territory } = useOrgTerritory();
  const [items, setItems] = useState<Locality[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Locality | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkKind, setBulkKind] = useState('');
  const [bulkText, setBulkText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await localitiesApi.list(true));
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las zonas');
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
    return items.filter(
      (item) => item.name.toLowerCase().includes(term) || (item.kind ?? '').toLowerCase().includes(term),
    );
  }, [items, search]);

  const bulkNames = useMemo(
    () =>
      bulkText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean),
    [bulkText],
  );

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: Locality) {
    setEditing(item);
    setForm({
      name: item.name,
      kind: item.kind ?? '',
      lat: item.lat === null ? '' : String(item.lat),
      lng: item.lng === null ? '' : String(item.lng),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name.trim();
    if (name.length < 2) {
      toast.error('Escribe el nombre de la zona');
      return;
    }
    const lat = parseCoordinate(form.lat);
    const lng = parseCoordinate(form.lng);
    if (lat === null || lng === null || (lat === undefined) !== (lng === undefined)) {
      toast.error('La ubicación necesita latitud y longitud, o déjalas las dos vacías');
      return;
    }

    setSaving(true);
    try {
      const data = { name, kind: form.kind.trim(), lat, lng };
      if (editing) {
        await localitiesApi.update(editing.id, data);
        toast.success('Zona actualizada');
      } else {
        await localitiesApi.create(data);
        toast.success('Zona creada');
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar la zona');
    } finally {
      setSaving(false);
    }
  }

  async function handleBulk(e: React.FormEvent) {
    e.preventDefault();
    if (bulkNames.length === 0) {
      toast.error('Escribe al menos una zona, una por línea');
      return;
    }
    if (bulkNames.length > MAX_BULK) {
      toast.error(`Máximo ${MAX_BULK} zonas por carga; tu lista trae ${bulkNames.length}`);
      return;
    }
    setSaving(true);
    try {
      const result = await localitiesApi.createBulk({ names: bulkNames, kind: bulkKind.trim() || undefined });
      const skipped = result.skipped.length;
      toast.success(`${result.created} zona(s) creada(s)`, {
        description: skipped > 0 ? `${skipped} ya existían y se omitieron.` : undefined,
      });
      setBulkOpen(false);
      setBulkText('');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudieron crear las zonas');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: Locality) {
    try {
      await localitiesApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Zona desactivada' : 'Zona activada');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo cambiar el estado');
    }
  }

  async function handleDelete(item: Locality) {
    try {
      const count = await localitiesApi.referenceCount(item.id);
      if (!count.canDelete) {
        const b = count.breakdown;
        const detail = b
          ? `contactos: ${b.prospects}, usuarios: ${b.users}, solicitudes: ${b.requests}, puestos de votación: ${b.pollingStations ?? 0}`
          : `${count.total} registro(s) asociado(s)`;
        toast.error(`No se puede eliminar la zona "${item.name}"`, {
          description: `Está en uso (${detail}). Desactívala en su lugar.`,
        });
        return;
      }

      if (!(await confirmDialog(`¿Eliminar la zona "${item.name}"? Esta acción no se puede deshacer.`))) return;

      await localitiesApi.remove(item.id);
      toast.success('Zona eliminada');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo eliminar la zona');
    }
  }

  const ownCount = items.filter((item) => !item.shared).length;
  const sharedCount = items.length - ownCount;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h3 className="text-lg font-semibold text-foreground">
            Zonas{territory.scope !== 'COUNTRY' ? ` de ${territory.name}` : ''}
          </h3>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Las divisiones de tu territorio: comunas, barrios, veredas o corregimientos. Sirven para ubicar
            contactos, líderes, solicitudes y puestos de votación, y para filtrar por zona.
          </p>
        </div>
        {canWrite && (
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="outline" onClick={() => setBulkOpen(true)}>
              <ListPlus className="mr-1 h-4 w-4" /> Agregar varias
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="mr-1 h-4 w-4" /> Nueva zona
            </Button>
          </div>
        )}
      </div>

      {items.length > 10 && (
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            aria-label="Buscar zona"
            placeholder="Buscar zona"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-md border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">
          <p className="font-medium text-slate-700">Todavía no hay zonas.</p>
          <p className="mt-1">
            {canWrite
              ? 'Usa "Agregar varias" para pegar la lista de comunas o barrios de una sola vez.'
              : 'Pide a un administrador que las cree.'}
          </p>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Ninguna zona coincide con la búsqueda.</p>
      ) : (
        <>
          <p className="text-xs text-slate-500">
            {ownCount} propia(s)
            {sharedCount > 0 ? ` · ${sharedCount} del catálogo compartido (no se pueden modificar)` : ''}
          </p>
          <div className="divide-y rounded-md border bg-white">
            {visible.map((item) => (
              <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="font-medium">{item.name}</span>
                  {item.kind && (
                    <Badge variant="secondary" className="text-[10px]">
                      {item.kind}
                    </Badge>
                  )}
                  {item.shared && (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      Compartida
                    </Badge>
                  )}
                  {item.lat !== null && item.lng !== null && (
                    <span className="flex items-center gap-1 font-mono text-xs text-muted-foreground">
                      <MapPin className="h-3 w-3" /> {item.lat.toFixed(4)}, {item.lng.toFixed(4)}
                    </span>
                  )}
                  {!item.isActive && (
                    <Badge variant="outline" className="border-destructive/30 text-[10px] uppercase text-destructive">
                      Inactiva
                    </Badge>
                  )}
                </div>

                {!item.shared && (canWrite || canDelete) && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-8 w-8 shrink-0 p-0">
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
              </div>
            ))}
          </div>
        </>
      )}

      <datalist id="zone-kinds">
        {KIND_SUGGESTIONS.map((kind) => (
          <option key={kind} value={kind} />
        ))}
      </datalist>

      {/* Crear o editar una zona */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar zona' : 'Nueva zona'}</DialogTitle>
            <DialogDescription>Solo el nombre es obligatorio.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="zone-name">Nombre</Label>
              <Input
                id="zone-name"
                autoFocus
                placeholder="Ej: Comuna 6"
                maxLength={120}
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-kind">Tipo (opcional)</Label>
              <Input
                id="zone-kind"
                list="zone-kinds"
                placeholder="Comuna, Barrio, Vereda..."
                maxLength={40}
                value={form.kind}
                onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="zone-lat">Ubicación en el mapa (opcional)</Label>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  id="zone-lat"
                  placeholder="Latitud"
                  inputMode="decimal"
                  value={form.lat}
                  onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
                />
                <Input
                  aria-label="Longitud"
                  placeholder="Longitud"
                  inputMode="decimal"
                  value={form.lng}
                  onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
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

      {/* Agregar varias zonas pegando la lista */}
      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Agregar varias zonas</DialogTitle>
            <DialogDescription>
              Pega la lista, una zona por línea. Las que ya existan se omiten.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleBulk} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bulk-kind">Tipo de todas (opcional)</Label>
              <Input
                id="bulk-kind"
                list="zone-kinds"
                placeholder="Comuna, Barrio, Vereda..."
                maxLength={40}
                value={bulkKind}
                onChange={(e) => setBulkKind(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="bulk-names">Zonas</Label>
              <Textarea
                id="bulk-names"
                rows={8}
                placeholder={'Comuna 1\nComuna 2\nComuna 3'}
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
              />
              <p className="text-xs text-slate-500">
                {bulkNames.length} zona(s) en la lista{bulkNames.length > MAX_BULK ? ` (máximo ${MAX_BULK})` : ''}
              </p>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setBulkOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving || bulkNames.length === 0}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Crear zonas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
