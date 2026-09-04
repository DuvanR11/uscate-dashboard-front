'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal, Pencil, Plus, Power, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
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
import { SimpleCatalogItem, extractErrorMessage } from '@/lib/api/catalogs';

/**
 * Panel de administración reusado para los 4 catálogos con shape idéntico
 * `{id,name,isActive}`: channels, occupations, segments, tags.
 *
 * "Eliminar" en el menú de acciones consulta `referenceCount` antes de
 * confirmar — si el catálogo tiene registros asociados, bloquea el intento
 * en el cliente y sugiere desactivar en su lugar (el backend igual lo
 * protege con un 409 como red de seguridad, ver `CatalogsService`).
 */

interface SimpleCatalogApi {
  list: (includeInactive?: boolean) => Promise<SimpleCatalogItem[]>;
  create: (data: { name: string }) => Promise<SimpleCatalogItem>;
  update: (id: number, data: { name: string }) => Promise<SimpleCatalogItem>;
  toggleStatus: (id: number) => Promise<SimpleCatalogItem>;
  referenceCount: (id: number) => Promise<{ total: number; canDelete: boolean }>;
  remove: (id: number) => Promise<void>;
}

interface SimpleCatalogManagerProps {
  /** Título de la sección, ej. "Canales". */
  pluralTitle: string;
  /** Nombre singular sin artículo, minúscula, ej. "canal" / "ocupación". */
  singular: string;
  /** Artículo para armar mensajes, ej. "el" / "la". */
  article: 'el' | 'la';
  /** Título del diálogo de creación, con género ya resuelto, ej. "Nuevo canal". */
  newLabel: string;
  api: SimpleCatalogApi;
  canWrite: boolean;
  canDelete: boolean;
}

export function SimpleCatalogManager({
  pluralTitle,
  singular,
  article,
  newLabel,
  api,
  canWrite,
  canDelete,
}: SimpleCatalogManagerProps) {
  const [items, setItems] = useState<SimpleCatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<SimpleCatalogItem | null>(null);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // includeInactive:true — la tabla admin necesita ver también lo
      // desactivado, a diferencia de los dropdowns de creación de prospectos.
      const data = await api.list(true);
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error(`No se pudo cargar ${pluralTitle.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [api, pluralTitle]);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setName('');
    setDialogOpen(true);
  }

  function openEdit(item: SimpleCatalogItem) {
    setEditing(item);
    setName(item.name);
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.update(editing.id, { name: name.trim() });
        toast.success('Actualizado correctamente');
      } else {
        await api.create({ name: name.trim() });
        toast.success('Creado correctamente');
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: SimpleCatalogItem) {
    try {
      await api.toggleStatus(item.id);
      toast.success(item.isActive ? 'Desactivado' : 'Activado');
      load();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado');
    }
  }

  async function handleDelete(item: SimpleCatalogItem) {
    try {
      const count = await api.referenceCount(item.id);
      if (!count.canDelete) {
        toast.error(`No se puede eliminar ${article} ${singular} "${item.name}"`, {
          description: `Tiene ${count.total} registro(s) asociado(s). Desactívalo en su lugar.`,
        });
        return;
      }

      if (!confirm(`¿Eliminar ${article} ${singular} "${item.name}"? Esta acción no se puede deshacer.`)) {
        return;
      }

      await api.remove(item.id);
      toast.success('Eliminado correctamente');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">{pluralTitle}</h3>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> {newLabel}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Sin registros todavía.</p>
      ) : (
        <div className="rounded-md border divide-y bg-white">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{item.name}</span>
                {!item.isActive && (
                  <Badge
                    variant="outline"
                    className="text-[10px] uppercase text-destructive border-destructive/30"
                  >
                    Inactivo
                  </Badge>
                )}
              </div>

              {(canWrite || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
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
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? `Editar ${singular}` : newLabel}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nombre"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
