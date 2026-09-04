'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, ListPlus, MoreHorizontal, Pencil, Plus, Power, Tag, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  keywordsApi,
  MonitoringKeyword,
  KeywordPriority,
  AliasKind,
  AliasMatchType,
  extractErrorMessage,
} from '@/lib/api/monitoring';

interface KeywordManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const emptyForm = { name: '', description: '', priority: 'MEDIUM' as KeywordPriority, category: '' };
const emptyAliasForm = { term: '', kind: 'INCLUDE' as AliasKind, matchType: 'CONTAINS' as AliasMatchType };

const PRIORITY_LABEL: Record<KeywordPriority, string> = {
  LOW: 'Baja',
  MEDIUM: 'Media',
  HIGH: 'Alta',
};

const PRIORITY_CLASS: Record<KeywordPriority, string> = {
  LOW: 'text-slate-600 border-slate-300 bg-slate-50',
  MEDIUM: 'text-amber-700 border-amber-300 bg-amber-50',
  HIGH: 'text-red-700 border-red-300 bg-red-50',
};

/**
 * Administra `MonitoringKeyword` (+ sus alias INCLUDE/EXCLUDE) — el filtro
 * determinístico que `MentionClassifierService` usa antes de gastar IA (ver
 * memoria `monitoreo-predictivo-analisis`, Fase 6). El nombre de la etiqueta
 * ya cuenta como alias INCLUDE implícito CONTAINS — los alias explícitos
 * acá son para reforzar (sinónimos) o excluir falsos positivos.
 */
export function KeywordManager({ canWrite, canDelete }: KeywordManagerProps) {
  const [items, setItems] = useState<MonitoringKeyword[]>([]);
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringKeyword | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [aliasSheetKeyword, setAliasSheetKeyword] = useState<MonitoringKeyword | null>(null);
  const [aliasForm, setAliasForm] = useState(emptyAliasForm);
  const [savingAlias, setSavingAlias] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await keywordsApi.list(true);
      setItems(data);
      // Si el sheet de alias está abierto, refresca su contenido con la fila actualizada.
      setAliasSheetKeyword((current) =>
        current ? data.find((k) => k.id === current.id) ?? null : null,
      );
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las etiquetas');
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

  function openEdit(item: MonitoringKeyword) {
    setEditing(item);
    setForm({
      name: item.name,
      description: item.description ?? '',
      priority: item.priority,
      category: item.category ?? '',
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('El nombre es obligatorio');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
      };
      if (editing) {
        await keywordsApi.update(editing.id, payload);
        toast.success('Etiqueta actualizada');
      } else {
        await keywordsApi.create(payload);
        toast.success('Etiqueta creada');
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al guardar');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: MonitoringKeyword) {
    try {
      await keywordsApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Etiqueta desactivada' : 'Etiqueta activada');
      load();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado');
    }
  }

  async function handleDelete(item: MonitoringKeyword) {
    try {
      const count = await keywordsApi.referenceCount(item.id);
      if (!count.canDelete) {
        toast.error(`No se puede eliminar la etiqueta "${item.name}"`, {
          description: `Tiene ${count.total} registro(s) asociado(s) (menciones/agregados). Desactívala en su lugar.`,
        });
        return;
      }

      if (!confirm(`¿Eliminar la etiqueta "${item.name}"? Esta acción no se puede deshacer.`)) return;

      await keywordsApi.remove(item.id);
      toast.success('Etiqueta eliminada');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar');
    }
  }

  async function handleAddAlias(e: React.FormEvent) {
    e.preventDefault();
    if (!aliasSheetKeyword || !aliasForm.term.trim()) {
      toast.error('El término es obligatorio');
      return;
    }
    setSavingAlias(true);
    try {
      await keywordsApi.addAlias(aliasSheetKeyword.id, {
        term: aliasForm.term.trim(),
        kind: aliasForm.kind,
        matchType: aliasForm.matchType,
      });
      toast.success('Alias agregado');
      setAliasForm(emptyAliasForm);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al agregar el alias');
    } finally {
      setSavingAlias(false);
    }
  }

  async function handleRemoveAlias(aliasId: string) {
    if (!aliasSheetKeyword) return;
    try {
      await keywordsApi.removeAlias(aliasSheetKeyword.id, aliasId);
      toast.success('Alias eliminado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar el alias');
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Etiquetas de monitoreo</h3>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nueva etiqueta
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Sin etiquetas todavía.</p>
      ) : (
        <div className="rounded-md border divide-y bg-white">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className={`text-[10px] uppercase ${PRIORITY_CLASS[item.priority]}`}>
                    {PRIORITY_LABEL[item.priority]}
                  </Badge>
                  {item.category && (
                    <Badge variant="outline" className="text-[10px] text-slate-500">
                      {item.category}
                    </Badge>
                  )}
                  <button
                    onClick={() => setAliasSheetKeyword(item)}
                    className="text-[10px] text-slate-500 hover:text-primary underline decoration-dotted flex items-center gap-1"
                  >
                    <Tag className="h-3 w-3" /> {item.aliases.length} alias
                  </button>
                  {!item.isActive && (
                    <Badge variant="outline" className="text-[10px] uppercase text-destructive border-destructive/30">
                      Inactiva
                    </Badge>
                  )}
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground mt-1 truncate">{item.description}</p>
                )}
              </div>

              {(canWrite || canDelete) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
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
                      <DropdownMenuItem onClick={() => setAliasSheetKeyword(item)}>
                        <ListPlus className="mr-2 h-4 w-4" /> Gestionar alias
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

      {/* Crear/editar etiqueta */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar etiqueta' : 'Nueva etiqueta'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nombre (ej. Seguridad, Corrupción)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Textarea
              placeholder="Descripción (opcional)"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-3">
              <Select
                value={form.priority}
                onValueChange={(value) => setForm((f) => ({ ...f, priority: value as KeywordPriority }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="LOW">Baja</SelectItem>
                  <SelectItem value="MEDIUM">Media</SelectItem>
                  <SelectItem value="HIGH">Alta</SelectItem>
                </SelectContent>
              </Select>
              <Input
                placeholder="Categoría (opcional)"
                value={form.category}
                onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
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

      {/* Gestión de alias (INCLUDE/EXCLUDE) */}
      <Sheet open={!!aliasSheetKeyword} onOpenChange={(open) => !open && setAliasSheetKeyword(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Alias de &ldquo;{aliasSheetKeyword?.name}&rdquo;</SheetTitle>
          </SheetHeader>

          <div className="px-4 space-y-4 overflow-y-auto">
            <p className="text-xs text-muted-foreground">
              El nombre de la etiqueta ya funciona como alias INCLUDE implícito. Agrega sinónimos
              (INCLUDE) o términos que deben descartar una mención aunque matchee (EXCLUDE, siempre
              gana sobre INCLUDE).
            </p>

            {aliasSheetKeyword?.aliases.length === 0 ? (
              <p className="text-sm text-slate-500 py-4 text-center">Sin alias explícitos todavía.</p>
            ) : (
              <div className="space-y-2">
                {aliasSheetKeyword?.aliases.map((alias) => (
                  <div
                    key={alias.id}
                    className="flex items-center justify-between gap-2 rounded-md border px-3 py-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Badge
                        variant="outline"
                        className={`text-[10px] uppercase ${
                          alias.kind === 'INCLUDE'
                            ? 'text-green-700 border-green-300 bg-green-50'
                            : 'text-red-700 border-red-300 bg-red-50'
                        }`}
                      >
                        {alias.kind === 'INCLUDE' ? 'Incluir' : 'Excluir'}
                      </Badge>
                      <span className="font-medium truncate">{alias.term}</span>
                      <Badge variant="outline" className="text-[10px] text-slate-500 shrink-0">
                        {alias.matchType === 'EXACT_PHRASE' ? 'frase exacta' : 'contiene'}
                      </Badge>
                    </div>
                    {canWrite && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 shrink-0"
                        onClick={() => handleRemoveAlias(alias.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {canWrite && (
              <form onSubmit={handleAddAlias} className="space-y-3 border-t pt-4">
                <Input
                  placeholder="Término"
                  value={aliasForm.term}
                  onChange={(e) => setAliasForm((f) => ({ ...f, term: e.target.value }))}
                />
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={aliasForm.kind}
                    onValueChange={(value) => setAliasForm((f) => ({ ...f, kind: value as AliasKind }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INCLUDE">Incluir</SelectItem>
                      <SelectItem value="EXCLUDE">Excluir</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select
                    value={aliasForm.matchType}
                    onValueChange={(value) =>
                      setAliasForm((f) => ({ ...f, matchType: value as AliasMatchType }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CONTAINS">Contiene</SelectItem>
                      <SelectItem value="EXACT_PHRASE">Frase exacta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button type="submit" size="sm" className="w-full" disabled={savingAlias}>
                  {savingAlias && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  <Plus className="h-4 w-4 mr-1" /> Agregar alias
                </Button>
              </form>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}