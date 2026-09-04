'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  History,
  Loader2,
  MoreHorizontal,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  Trash2,
  XCircle,
} from 'lucide-react';
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
  sourcesApi,
  MonitoringSource,
  MonitoringSourceType,
  MonitoringRun,
  extractErrorMessage,
} from '@/lib/api/monitoring';

interface SourceManagerProps {
  canWrite: boolean;
  canDelete: boolean;
}

const emptyForm = { name: '', type: 'RSS' as MonitoringSourceType, url: '', frequencyMinutes: '60' };

const TYPE_LABEL: Record<MonitoringSourceType, string> = {
  RSS: 'RSS',
  GOOGLE_NEWS: 'Google News',
  NEWS_PORTAL: 'Portal de noticias',
  SOCIAL_MEDIA: 'Redes sociales',
};

function formatRelative(iso: string | null) {
  if (!iso) return 'nunca';
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'hace instantes';
  if (minutes < 60) return `hace ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `hace ${hours} h`;
  return `hace ${Math.round(hours / 24)} d`;
}

/**
 * Administra `MonitoringSource` (RSS/Google News) — la URL se valida por
 * formato acá y por SSRF en el backend (`UrlGuardService.assertSafeUrl`,
 * Fase 3/11), así que un 400 al guardar puede ser un rechazo real de
 * seguridad, no solo un typo.
 */
export function SourceManager({ canWrite, canDelete }: SourceManagerProps) {
  const [items, setItems] = useState<MonitoringSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<MonitoringSource | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [runsSource, setRunsSource] = useState<MonitoringSource | null>(null);
  const [runs, setRuns] = useState<MonitoringRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await sourcesApi.list(true);
      setItems(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudieron cargar las fuentes');
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

  function openEdit(item: MonitoringSource) {
    setEditing(item);
    setForm({
      name: item.name,
      type: item.type,
      url: item.url,
      frequencyMinutes: String(item.frequencyMinutes),
    });
    setDialogOpen(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const frequencyMinutes = Number(form.frequencyMinutes);
    if (!form.name.trim() || !form.url.trim() || Number.isNaN(frequencyMinutes)) {
      toast.error('Nombre, URL y frecuencia son obligatorios');
      return;
    }

    setSaving(true);
    try {
      const payload = { name: form.name.trim(), type: form.type, url: form.url.trim(), frequencyMinutes };
      if (editing) {
        await sourcesApi.update(editing.id, payload);
        toast.success('Fuente actualizada');
      } else {
        await sourcesApi.create(payload);
        toast.success('Fuente creada');
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al guardar (puede ser un rechazo de seguridad de la URL)');
    } finally {
      setSaving(false);
    }
  }

  async function handleToggle(item: MonitoringSource) {
    try {
      await sourcesApi.toggleStatus(item.id);
      toast.success(item.isActive ? 'Fuente desactivada' : 'Fuente activada');
      load();
    } catch (error) {
      console.error(error);
      toast.error('Error al cambiar el estado');
    }
  }

  async function handleDelete(item: MonitoringSource) {
    try {
      const count = await sourcesApi.referenceCount(item.id);
      if (!count.canDelete) {
        toast.error(`No se puede eliminar la fuente "${item.name}"`, {
          description: `Tiene ${count.total} registro(s) asociado(s) (menciones/corridas). Desactívala en su lugar.`,
        });
        return;
      }

      if (!confirm(`¿Eliminar la fuente "${item.name}"? Esta acción no se puede deshacer.`)) return;

      await sourcesApi.remove(item.id);
      toast.success('Fuente eliminada');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al eliminar');
    }
  }

  async function handleSync(item: MonitoringSource) {
    setSyncingId(item.id);
    try {
      const res = await sourcesApi.triggerSync(item.id);
      toast.success(res.message);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Error al encolar la sincronización');
    } finally {
      setSyncingId(null);
    }
  }

  async function openRuns(item: MonitoringSource) {
    setRunsSource(item);
    setLoadingRuns(true);
    try {
      const data = await sourcesApi.getRuns(item.id);
      setRuns(data);
    } catch (error) {
      console.error(error);
      toast.error('No se pudo cargar el historial de corridas');
    } finally {
      setLoadingRuns(false);
    }
  }

  function statusBadge(item: MonitoringSource) {
    if (!item.lastStatus) {
      return (
        <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
          <Clock className="h-3 w-3 mr-1" /> Sin corridas
        </Badge>
      );
    }
    if (item.lastStatus === 'OK') {
      return (
        <Badge variant="outline" className="text-[10px] uppercase text-green-700 border-green-300 bg-green-50">
          <CheckCircle2 className="h-3 w-3 mr-1" /> OK
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] uppercase text-red-700 border-red-300 bg-red-50">
        <XCircle className="h-3 w-3 mr-1" /> {item.lastStatus === 'UNREACHABLE' ? 'Inalcanzable' : 'Error'}
        {item.consecutiveFailures > 1 ? ` (${item.consecutiveFailures}x)` : ''}
      </Badge>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-primary">Fuentes de monitoreo</h3>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" /> Nueva fuente
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">Sin fuentes todavía.</p>
      ) : (
        <div className="rounded-md border divide-y bg-white">
          {items.map((item) => (
            <div key={item.id} className="flex items-center justify-between px-4 py-3 gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{item.name}</span>
                  <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
                    {TYPE_LABEL[item.type]}
                  </Badge>
                  {statusBadge(item)}
                  {!item.isActive && (
                    <Badge variant="outline" className="text-[10px] uppercase text-destructive border-destructive/30">
                      Inactiva
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">{item.url}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Cada {item.frequencyMinutes} min · última corrida: {formatRelative(item.lastFetchedAt)}
                </p>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {canWrite && item.isActive && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleSync(item)}
                    disabled={syncingId === item.id}
                  >
                    <RefreshCw className={`h-3.5 w-3.5 mr-1 ${syncingId === item.id ? 'animate-spin' : ''}`} />
                    Sincronizar
                  </Button>
                )}

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <span className="sr-only">Abrir menú</span>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>

                    <DropdownMenuItem onClick={() => openRuns(item)}>
                      <History className="mr-2 h-4 w-4" /> Ver corridas
                    </DropdownMenuItem>

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
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Crear/editar fuente */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar fuente' : 'Nueva fuente'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              autoFocus
              placeholder="Nombre (ej. El Tiempo - Bogotá)"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              value={form.type}
              onValueChange={(value) => setForm((f) => ({ ...f, type: value as MonitoringSourceType }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Tipo de fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="RSS">RSS</SelectItem>
                <SelectItem value="GOOGLE_NEWS">Google News</SelectItem>
                <SelectItem value="NEWS_PORTAL">Portal de noticias</SelectItem>
              </SelectContent>
            </Select>
            <Input
              placeholder="https://ejemplo.com/rss/seccion.xml"
              value={form.url}
              onChange={(e) => setForm((f) => ({ ...f, url: e.target.value }))}
            />
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">
                Frecuencia de revisión (minutos, 15-1440)
              </label>
              <Input
                type="number"
                min={15}
                max={1440}
                value={form.frequencyMinutes}
                onChange={(e) => setForm((f) => ({ ...f, frequencyMinutes: e.target.value }))}
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

      {/* Historial de corridas */}
      <Sheet open={!!runsSource} onOpenChange={(open) => !open && setRunsSource(null)}>
        <SheetContent className="sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>Corridas de &ldquo;{runsSource?.name}&rdquo;</SheetTitle>
          </SheetHeader>
          <div className="px-4 space-y-3 overflow-y-auto">
            {loadingRuns ? (
              <div className="flex items-center justify-center gap-2 py-10 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" /> Cargando...
              </div>
            ) : runs.length === 0 ? (
              <p className="py-10 text-center text-sm text-slate-500">Sin corridas registradas todavía.</p>
            ) : (
              runs.map((run) => (
                <div key={run.id} className="rounded-md border px-3 py-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant="outline"
                      className={`text-[10px] uppercase ${
                        run.status === 'SUCCESS'
                          ? 'text-green-700 border-green-300 bg-green-50'
                          : run.status === 'FAILED'
                            ? 'text-red-700 border-red-300 bg-red-50'
                            : run.status === 'PARTIAL'
                              ? 'text-amber-700 border-amber-300 bg-amber-50'
                              : 'text-blue-700 border-blue-300 bg-blue-50'
                      }`}
                    >
                      {run.status}
                    </Badge>
                    <span className="text-[11px] text-slate-400">{formatRelative(run.startedAt)}</span>
                  </div>
                  <p className="text-xs text-slate-600">
                    {run.itemsFound} encontrados · {run.itemsProcessed} procesados · {run.itemsSkipped} omitidos
                    {run.errorsCount > 0 ? ` · ${run.errorsCount} error(es)` : ''}
                  </p>
                  {run.errors.length > 0 && (
                    <div className="space-y-1 pt-1">
                      {run.errors.map((err) => (
                        <div key={err.id} className="flex items-start gap-1.5 text-[11px] text-red-600">
                          <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                          <span>
                            <span className="font-mono uppercase">{err.source}</span>: {err.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}