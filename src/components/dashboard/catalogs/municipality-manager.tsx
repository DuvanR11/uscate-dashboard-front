'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, MoreHorizontal, Pencil, Plus, Power, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import {
  departmentsApi,
  municipalitiesApi,
  Department,
  Municipality,
  extractErrorMessage,
} from '@/lib/api/catalogs';

interface MunicipalityManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const PAGE_SIZE = 20;

/**
 * A diferencia de los demás catálogos, Municipality tiene volumen alto
 * (~1.100 filas en Colombia) — usa paginación server-side propia en vez del
 * listado plano de los otros managers. Paginación por estado local (no por
 * la URL, a diferencia de `components/ui/data-table.tsx`) para no pelear por
 * los query params `page`/`limit` con el resto de tabs de esta misma página.
 */
export function MunicipalityManager({ canWrite, canDelete }: MunicipalityManagerProps) {
  const [items, setItems] = useState<Municipality[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [total, setTotal] = useState(0);
  const [pageCount, setPageCount] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Municipality | null>(null);
  const [form, setForm] = useState({ name: '', departmentId: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    departmentsApi.list(true).then(setDepartments).catch((error) => {
      console.error(error);
      toast.error('No se pudieron cargar los departamentos para el filtro');
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await municipalitiesApi.list({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        departmentId: departmentFilter !== 'all' ? Number(departmentFilter) : undefined,
        includeInactive: true,
      });
      setItems(res.data);
      setTotal(res.total);
      setPageCount(res.pageCount);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar los municipios');
    } finally {
      setLoading(false);
    }
  }, [page, search, departmentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  // Cambiar de filtro reinicia a la página 1.
  function handleSearchChange(value: string) {
    setSearch(value);
    setPage(1);
  }

  function handleDepartmentFilterChange(value: string) {
    setDepartmentFilter(value);
    setPage(1);
  }

  function openCreate() {
    setEditing(null);
    setForm({ name: '', departmentId: departmentFilter !== 'all' ? departmentFilter : '' });
    setDialogOpen(true);
  }

  function openEdit(item: Municipality) {
    setEditing(item);
    setForm({ name: item.name, departmentId: String(item.departmentId) });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const departmentId = Number(form.departmentId);
    if (!form.name.trim() || !departmentId) {
      toast.error('Nombre y departamento son obligatorios');
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await municipalitiesApi.update(editing.id, { name: form.name.trim(), departmentId });
        toast.success('Actualizado correctamente');
      } else {
        await municipalitiesApi.create({ name: form.name.trim(), departmentId });
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

  async function handleToggle(item: Municipality) {
    try {
      await municipalitiesApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Desactivado' : 'Activado');
      load();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado');
    }
  }

  async function handleDelete(item: Municipality) {
    try {
      const count = await municipalitiesApi.referenceCount(item.id);
      if (!count.canDelete) {
        toast.error(`No se puede eliminar el municipio "${item.name}"`, {
          description: `Tiene ${count.total} prospecto(s) asociado(s). Desactívalo en su lugar.`,
        });
        return;
      }

      if (!confirm(`¿Eliminar el municipio "${item.name}"? Esta acción no se puede deshacer.`)) return;

      await municipalitiesApi.remove(item.id);
      toast.success('Eliminado correctamente');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Municipios</h3>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nuevo municipio
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar municipio..."
            className="pl-8"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Select value={departmentFilter} onValueChange={handleDepartmentFilterChange}>
          <SelectTrigger className="sm:w-[220px]">
            <SelectValue placeholder="Todos los departamentos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos los departamentos</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.id} value={String(d.id)}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : (
        <div className="rounded-md border bg-white">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Departamento</TableHead>
                <TableHead>Estado</TableHead>
                {(canWrite || canDelete) && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    No se encontraron resultados.
                  </TableCell>
                </TableRow>
              ) : (
                items.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {item.department?.name || '—'}
                    </TableCell>
                    <TableCell>
                      {item.isActive ? (
                        <Badge variant="outline" className="text-[10px] uppercase text-green-700 border-green-200 bg-green-50">
                          Activo
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[10px] uppercase text-destructive border-destructive/30">
                          Inactivo
                        </Badge>
                      )}
                    </TableCell>
                    {(canWrite || canDelete) && (
                      <TableCell>
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
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-muted-foreground">Total: {total} municipios.</span>
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">
            Página {page} de {pageCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Anterior
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            Siguiente
          </Button>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar municipio' : 'Nuevo municipio'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nombre"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              value={form.departmentId}
              onValueChange={(value) => setForm((f) => ({ ...f, departmentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un departamento" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={String(d.id)}>
                    {d.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
