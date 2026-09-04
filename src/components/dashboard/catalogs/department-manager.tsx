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
import { departmentsApi, Department, extractErrorMessage } from '@/lib/api/catalogs';

interface DepartmentManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const emptyForm = { name: '', code: '', lat: '', lng: '' };

export function DepartmentManager({ canWrite, canDelete }: DepartmentManagerProps) {
  const [items, setItems] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await departmentsApi.list(true);
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar los departamentos');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEdit(item: Department) {
    setEditing(item);
    setForm({
      name: item.name,
      code: item.code || '',
      lat: item.lat != null ? String(item.lat) : '',
      lng: item.lng != null ? String(item.lng) : '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    const payload = {
      name: form.name.trim(),
      code: form.code.trim() || undefined,
      lat: form.lat.trim() ? Number(form.lat) : undefined,
      lng: form.lng.trim() ? Number(form.lng) : undefined,
    };

    setSaving(true);
    try {
      if (editing) {
        await departmentsApi.update(editing.id, payload);
        toast.success('Actualizado correctamente');
      } else {
        await departmentsApi.create(payload);
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

  async function handleToggle(item: Department) {
    try {
      await departmentsApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Desactivado' : 'Activado');
      load();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado');
    }
  }

  async function handleDelete(item: Department) {
    try {
      const count = await departmentsApi.referenceCount(item.id);
      if (!count.canDelete) {
        toast.error(`No se puede eliminar el departamento "${item.name}"`, {
          description: `Tiene ${count.total} municipio(s) asociado(s). Desactívalo en su lugar.`,
        });
        return;
      }

      if (!confirm(`¿Eliminar el departamento "${item.name}"? Esta acción no se puede deshacer.`)) return;

      await departmentsApi.remove(item.id);
      toast.success('Eliminado correctamente');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Departamentos</h3>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo departamento
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
                {item.code && (
                  <span className="text-xs text-muted-foreground font-mono">{item.code}</span>
                )}
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
            <DialogTitle>{editing ? 'Editar departamento' : 'Nuevo departamento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              placeholder="Código DANE/ISO (opcional)"
              value={form.code}
              onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Input
                placeholder="Latitud (opcional)"
                type="number"
                step="any"
                value={form.lat}
                onChange={(e) => setForm((f) => ({ ...f, lat: e.target.value }))}
              />
              <Input
                placeholder="Longitud (opcional)"
                type="number"
                step="any"
                value={form.lng}
                onChange={(e) => setForm((f) => ({ ...f, lng: e.target.value }))}
              />
            </div>
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
