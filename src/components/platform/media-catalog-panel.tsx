'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Loader2, Pencil, Plus, Power, RefreshCw, Search, Trash2, XCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { extractErrorMessage } from '@/lib/api-error';
import {
  CatalogCheckResult,
  CatalogEntryInput,
  CatalogSourceType,
  entryLabel,
  googleNewsSiteUrl,
  LEVEL_LABEL,
  MediaLevel,
  MediaMedium,
  MEDIUM_LABEL,
  OperatorCatalogEntry,
  operatorCatalogApi,
  siteDomainOf,
} from '@/lib/api/media-catalog';
import { usePlatformCapability } from './access-context';

// Catálogo de medios (2026-11-09): Plataforma → Medios. El operador agrega,
// corrige y apaga los medios que eligen las organizaciones; cambiar la
// dirección de uno la cambia en las fuentes de todas las que lo eligieron.
// Una revisión diaria (6:15 a. m.) anota si cada medio responde.

const DEPARTMENTS: [string, string][] = [
  ['05', 'Antioquia'], ['08', 'Atlántico'], ['11', 'Bogotá, D.C.'], ['13', 'Bolívar'], ['15', 'Boyacá'],
  ['17', 'Caldas'], ['18', 'Caquetá'], ['19', 'Cauca'], ['20', 'Cesar'], ['23', 'Córdoba'],
  ['25', 'Cundinamarca'], ['27', 'Chocó'], ['41', 'Huila'], ['44', 'La Guajira'], ['47', 'Magdalena'],
  ['50', 'Meta'], ['52', 'Nariño'], ['54', 'Norte de Santander'], ['63', 'Quindío'], ['66', 'Risaralda'],
  ['68', 'Santander'], ['70', 'Sucre'], ['73', 'Tolima'], ['76', 'Valle del Cauca'], ['81', 'Arauca'],
  ['85', 'Casanare'], ['86', 'Putumayo'], ['88', 'San Andrés y Providencia'], ['91', 'Amazonas'],
  ['94', 'Guainía'], ['95', 'Guaviare'], ['97', 'Vaupés'], ['99', 'Vichada'],
];

type Filter = 'ALL' | 'PROBLEMS' | 'INACTIVE';

interface FormState {
  name: string;
  section: string;
  medium: MediaMedium;
  level: MediaLevel;
  departmentCode: string;
  type: CatalogSourceType;
  url: string;
  domain: string;
  homeUrl: string;
  featured: boolean;
}

const emptyForm: FormState = {
  name: '',
  section: '',
  medium: 'PRENSA',
  level: 'NACIONAL',
  departmentCode: '',
  type: 'RSS',
  url: '',
  domain: '',
  homeUrl: '',
  featured: false,
};

const when = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })
    : 'sin revisar';

function StatusBadge({ entry }: { entry: OperatorCatalogEntry }) {
  if (!entry.lastStatus) {
    return (
      <Badge variant="outline" className="text-[10px] uppercase text-slate-500">
        <Clock className="mr-1 h-3 w-3" /> Sin revisar
      </Badge>
    );
  }
  if (entry.lastStatus === 'OK') {
    return (
      <Badge variant="outline" className="border-green-300 bg-green-50 text-[10px] uppercase text-green-700">
        <CheckCircle2 className="mr-1 h-3 w-3" /> Responde · {entry.lastItems ?? 0} notas
      </Badge>
    );
  }
  return (
    <Badge variant="outline" className="border-red-300 bg-red-50 text-[10px] uppercase text-red-700">
      <XCircle className="mr-1 h-3 w-3" /> {entry.lastStatus === 'UNREACHABLE' ? 'No responde' : 'Con problemas'}
    </Badge>
  );
}

function CheckSummary({ result }: { result: CatalogCheckResult }) {
  return (
    <div
      className={`rounded-md border px-3 py-2 text-sm ${
        result.status === 'OK' ? 'border-green-300 bg-green-50 text-green-900' : 'border-red-300 bg-red-50 text-red-900'
      }`}
    >
      <p className="font-medium">
        {result.status === 'OK'
          ? `Responde: ${result.items} noticias, la más reciente de hace ${result.newestHours ?? '?'} h.`
          : result.error || 'No respondió.'}
      </p>
      {result.sample.length > 0 && (
        <ul className="mt-1 list-disc pl-5 text-xs">
          {result.sample.map((title) => (
            <li key={title}>{title}</li>
          ))}
        </ul>
      )}
    </div>
  );
}

export function MediaCatalogPanel() {
  const canWrite = usePlatformCapability('INTEGRATIONS_MANAGE');
  const [entries, setEntries] = useState<OperatorCatalogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ALL');
  const [busyId, setBusyId] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<OperatorCatalogEntry | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [probing, setProbing] = useState(false);
  const [probe, setProbe] = useState<CatalogCheckResult | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setEntries(await operatorCatalogApi.list());
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo cargar el catálogo de medios');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const problems = entries.filter((e) => e.isActive && e.lastStatus && e.lastStatus !== 'OK').length;
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return entries.filter(
      (e) =>
        (filter === 'ALL' ||
          (filter === 'PROBLEMS' ? e.isActive && !!e.lastStatus && e.lastStatus !== 'OK' : !e.isActive)) &&
        (!q || `${entryLabel(e)} ${e.departmentName ?? ''} ${e.url}`.toLowerCase().includes(q)),
    );
  }, [entries, query, filter]);

  const feedUrl = form.type === 'GOOGLE_NEWS' ? (form.domain.trim() ? googleNewsSiteUrl(form.domain) : '') : form.url.trim();

  function openCreate() {
    setEditing(null);
    setForm(emptyForm);
    setProbe(null);
    setDialogOpen(true);
  }

  function openEdit(entry: OperatorCatalogEntry) {
    setEditing(entry);
    const domain = entry.type === 'GOOGLE_NEWS' ? siteDomainOf(entry.url) : null;
    setForm({
      name: entry.name,
      section: entry.section ?? '',
      medium: entry.medium,
      level: entry.level,
      departmentCode: entry.departmentCode ?? '',
      // Una búsqueda de Google News que no es «site:» se edita como dirección.
      type: entry.type === 'GOOGLE_NEWS' && !domain ? 'RSS' : entry.type,
      url: entry.url,
      domain: domain ?? '',
      homeUrl: entry.homeUrl ?? '',
      featured: entry.featured,
    });
    setProbe(null);
    setDialogOpen(true);
  }

  async function runProbe() {
    if (!feedUrl) return toast.error('Escribe la dirección del feed o el dominio.');
    setProbing(true);
    try {
      setProbe(await operatorCatalogApi.probe(feedUrl));
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo probar la dirección');
    } finally {
      setProbing(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !feedUrl) return toast.error('El nombre y la dirección son obligatorios.');
    const input: CatalogEntryInput = {
      name: form.name.trim(),
      section: form.section.trim() || null,
      medium: form.medium,
      level: form.level,
      departmentCode: form.level === 'NACIONAL' ? null : form.departmentCode || null,
      // Si se editaba como dirección una búsqueda de Google News, sigue siéndolo.
      type: editing?.type === 'GOOGLE_NEWS' && form.type === 'RSS' && feedUrl.includes('news.google.com') ? 'GOOGLE_NEWS' : form.type,
      url: feedUrl,
      homeUrl: form.homeUrl.trim() || null,
      featured: form.featured,
    };
    if (input.level !== 'NACIONAL' && !input.departmentCode) return toast.error('Elige el departamento del medio.');
    setSaving(true);
    try {
      if (editing) {
        await operatorCatalogApi.update(editing.id, input);
        toast.success(
          editing.organizationsUsing > 0 && editing.url !== input.url
            ? `Medio actualizado. La dirección nueva llega a ${editing.organizationsUsing} organización(es).`
            : 'Medio actualizado',
        );
      } else {
        await operatorCatalogApi.create(input);
        toast.success('Medio agregado al catálogo');
      }
      setDialogOpen(false);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar el medio');
    } finally {
      setSaving(false);
    }
  }

  async function check(entry: OperatorCatalogEntry) {
    setBusyId(entry.id);
    try {
      const result = await operatorCatalogApi.check(entry.id);
      if (result.status === 'OK') toast.success(`${entryLabel(entry)} responde: ${result.items} noticias.`);
      else toast.error(`${entryLabel(entry)}: ${result.error || 'no respondió'}`);
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo revisar el medio');
    } finally {
      setBusyId(null);
    }
  }

  async function toggle(entry: OperatorCatalogEntry) {
    if (
      entry.isActive &&
      entry.organizationsUsing > 0 &&
      !(await confirmDialog(
        `¿Desactivar «${entryLabel(entry)}»? Se apaga en las ${entry.organizationsUsing} organización(es) que lo eligieron y deja de aparecer en la lista.`,
      ))
    )
      return;
    setBusyId(entry.id);
    try {
      await operatorCatalogApi.update(entry.id, { isActive: !entry.isActive });
      toast.success(entry.isActive ? 'Medio desactivado' : 'Medio activado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo cambiar el medio');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(entry: OperatorCatalogEntry) {
    if (!(await confirmDialog(`¿Borrar «${entryLabel(entry)}» del catálogo? No se puede deshacer.`))) return;
    try {
      await operatorCatalogApi.remove(entry.id);
      toast.success('Medio borrado');
      load();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo borrar el medio');
    }
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">Catálogo de medios</h2>
          <p className="max-w-2xl text-sm text-muted-foreground">
            Los medios que las organizaciones eligen en Monitoreo en vez de buscar el RSS. No cuentan para el límite de
            fuentes del plan. Cada mañana se revisa que respondan.
          </p>
        </div>
        {canWrite && (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Agregar medio
          </Button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            aria-label="Buscar un medio"
            placeholder="Buscar un medio"
            className="pl-8"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(
          [
            ['ALL', `Todos (${entries.length})`],
            ['PROBLEMS', `Con problemas (${problems})`],
            ['INACTIVE', `Desactivados (${entries.filter((e) => !e.isActive).length})`],
          ] as [Filter, string][]
        ).map(([value, label]) => (
          <Button
            key={value}
            size="sm"
            variant={filter === value ? 'default' : 'outline'}
            aria-pressed={filter === value}
            onClick={() => setFilter(value)}
          >
            {label}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
        </div>
      ) : visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Ningún medio en esta vista.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {visible.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{entryLabel(entry)}</span>
                  {entry.featured && (
                    <Badge variant="outline" className="text-[10px] uppercase">
                      Destacado
                    </Badge>
                  )}
                  <StatusBadge entry={entry} />
                  {!entry.isActive && (
                    <Badge variant="outline" className="border-destructive/30 text-[10px] uppercase text-destructive">
                      Desactivado
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {MEDIUM_LABEL[entry.medium]} · {LEVEL_LABEL[entry.level]}
                  {entry.departmentName ? ` · ${entry.departmentName}` : ''} ·{' '}
                  {entry.type === 'GOOGLE_NEWS' ? 'Google News por dominio' : 'RSS propio'} · lo usan{' '}
                  {entry.organizationsUsing} organización(es) · revisado {when(entry.lastCheckedAt)}
                </p>
                <p className="truncate text-[11px] text-muted-foreground/80">{entry.url}</p>
                {entry.lastError && entry.lastStatus !== 'OK' && (
                  <p className="text-[11px] text-red-700">{entry.lastError}</p>
                )}
              </div>
              {canWrite && (
                <div className="flex shrink-0 flex-wrap gap-1">
                  <Button size="sm" variant="outline" onClick={() => check(entry)} disabled={busyId === entry.id}>
                    <RefreshCw className={`mr-1 h-3.5 w-3.5 ${busyId === entry.id ? 'animate-spin' : ''}`} /> Revisar
                  </Button>
                  <Button size="sm" variant="ghost" aria-label={`Editar ${entryLabel(entry)}`} onClick={() => openEdit(entry)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`${entry.isActive ? 'Desactivar' : 'Activar'} ${entryLabel(entry)}`}
                    onClick={() => toggle(entry)}
                    disabled={busyId === entry.id}
                  >
                    <Power className="h-4 w-4" />
                  </Button>
                  {entry.organizationsUsing === 0 && (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      aria-label={`Borrar ${entryLabel(entry)}`}
                      onClick={() => remove(entry)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar medio' : 'Agregar medio'}</DialogTitle>
            <DialogDescription>
              Pruébalo antes de guardar. Si el medio no tiene RSS, usa Google News con su dominio.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={save} className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="media-name">Nombre</Label>
                <Input id="media-name" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="El Tiempo" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="media-section">Sección (opcional)</Label>
                <Input id="media-section" value={form.section} onChange={(e) => setForm((f) => ({ ...f, section: e.target.value }))} placeholder="Política" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="media-medium">Tipo de medio</Label>
                <Select value={form.medium} onValueChange={(v) => setForm((f) => ({ ...f, medium: v as MediaMedium }))}>
                  <SelectTrigger id="media-medium"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(MEDIUM_LABEL) as MediaMedium[]).map((m) => <SelectItem key={m} value={m}>{MEDIUM_LABEL[m]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="media-level">Alcance</Label>
                <Select value={form.level} onValueChange={(v) => setForm((f) => ({ ...f, level: v as MediaLevel }))}>
                  <SelectTrigger id="media-level"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(LEVEL_LABEL) as MediaLevel[]).map((l) => <SelectItem key={l} value={l}>{LEVEL_LABEL[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {form.level !== 'NACIONAL' && (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="media-department">Departamento</Label>
                  <Select value={form.departmentCode} onValueChange={(v) => setForm((f) => ({ ...f, departmentCode: v }))}>
                    <SelectTrigger id="media-department"><SelectValue placeholder="Elige el departamento" /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(([code, name]) => <SelectItem key={code} value={code}>{name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="media-type">Cómo se lee</Label>
                <Select value={form.type} onValueChange={(v) => { setForm((f) => ({ ...f, type: v as CatalogSourceType })); setProbe(null); }}>
                  <SelectTrigger id="media-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="RSS">Su propio RSS</SelectItem>
                    <SelectItem value="GOOGLE_NEWS">Google News con su dominio</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {form.type === 'GOOGLE_NEWS' ? (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="media-domain">Dominio del medio</Label>
                  <Input id="media-domain" value={form.domain} onChange={(e) => { setForm((f) => ({ ...f, domain: e.target.value })); setProbe(null); }} placeholder="noticiascaracol.com" />
                </div>
              ) : (
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="media-url">Dirección del feed</Label>
                  <Input id="media-url" value={form.url} onChange={(e) => { setForm((f) => ({ ...f, url: e.target.value })); setProbe(null); }} placeholder="https://www.medio.com/rss/politica.xml" />
                </div>
              )}
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="media-home">Portada (opcional)</Label>
                <Input id="media-home" value={form.homeUrl} onChange={(e) => setForm((f) => ({ ...f, homeUrl: e.target.value }))} placeholder="https://www.medio.com" />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox id="media-featured" checked={form.featured} onCheckedChange={(v) => setForm((f) => ({ ...f, featured: v === true }))} />
                <Label htmlFor="media-featured" className="font-normal">
                  Destacado: se sugiere a todas las organizaciones (solo los grandes nacionales)
                </Label>
              </div>
            </div>
            {editing && editing.organizationsUsing > 0 && feedUrl && feedUrl !== editing.url && (
              <p className="text-xs text-amber-700">
                La dirección nueva cambia las fuentes de las {editing.organizationsUsing} organización(es) que lo eligieron.
              </p>
            )}
            {probe && <CheckSummary result={probe} />}
            <DialogFooter className="gap-2">
              <Button type="button" variant="outline" onClick={runProbe} disabled={probing || !feedUrl}>
                {probing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Probar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Guardar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
