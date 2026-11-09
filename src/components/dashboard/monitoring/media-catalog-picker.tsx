'use client';

import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, Newspaper, Search, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { extractErrorMessage } from '@/lib/api-error';
import {
  CatalogEntry,
  entryLabel,
  LEVEL_LABEL,
  MediaMedium,
  mediaCatalogApi,
  MEDIUM_LABEL,
  OrganizationCatalog,
} from '@/lib/api/media-catalog';

interface MediaCatalogPickerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved?: () => void;
}

const fold = (text: string) =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

/**
 * Catálogo de medios (2026-11-09): la lista de medios colombianos con su
 * dirección ya verificada. Se marcan los que se quieren leer y se guardan de
 * una vez; la primera vez vienen marcados los que sugiere el servidor según el
 * cargo y el departamento. No cuentan para el límite de fuentes del plan.
 */
export function MediaCatalogPicker({ open, onOpenChange, onSaved }: MediaCatalogPickerProps) {
  const [catalog, setCatalog] = useState<OrganizationCatalog | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [query, setQuery] = useState('');
  const [medium, setMedium] = useState<'ALL' | MediaMedium>('ALL');
  const [region, setRegion] = useState<string>('ALL');

  useEffect(() => {
    if (!open) return;
    let alive = true;
    setLoading(true);
    setQuery('');
    setMedium('ALL');
    setRegion('ALL');
    mediaCatalogApi
      .list()
      .then((data) => {
        if (!alive) return;
        setCatalog(data);
        setChecked(
          new Set(data.entries.filter((e) => (data.hasChosen ? e.selected : e.suggested)).map((e) => e.id)),
        );
      })
      .catch((error) => {
        toast.error(extractErrorMessage(error) || 'No se pudo cargar el catálogo de medios');
        onOpenChange(false);
      })
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, [open, onOpenChange]);

  // Departamentos con medios, el de la organización primero.
  const departments = useMemo(() => {
    const names = new Map<string, string>();
    for (const e of catalog?.entries ?? []) {
      if (e.departmentCode && e.departmentName) names.set(e.departmentCode, e.departmentName);
    }
    return [...names.entries()].sort(([a, an], [b, bn]) =>
      a === catalog?.departmentCode ? -1 : b === catalog?.departmentCode ? 1 : an.localeCompare(bn, 'es'),
    );
  }, [catalog]);

  const visible = useMemo(() => {
    const q = fold(query.trim());
    return (catalog?.entries ?? []).filter(
      (e) =>
        (medium === 'ALL' || e.medium === medium) &&
        (region === 'ALL' ||
          (region === 'NACIONAL' ? e.level === 'NACIONAL' : e.departmentCode === region)) &&
        (!q || fold(`${entryLabel(e)} ${e.departmentName ?? ''}`).includes(q)),
    );
  }, [catalog, query, medium, region]);

  const groups = useMemo(() => {
    const national = visible.filter((e) => e.level === 'NACIONAL');
    const byDepartment = departments
      .map(([code, name]) => ({ key: code, title: name, items: visible.filter((e) => e.departmentCode === code) }))
      .filter((g) => g.items.length);
    return [
      ...(national.length ? [{ key: 'NACIONAL', title: 'Nacionales', items: national }] : []),
      ...byDepartment,
    ];
  }, [visible, departments]);

  const toggle = (id: string, on: boolean) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const original = useMemo(
    () => new Set((catalog?.entries ?? []).filter((e) => e.selected).map((e) => e.id)),
    [catalog],
  );
  const changed =
    !catalog?.hasChosen || checked.size !== original.size || [...checked].some((id) => !original.has(id));

  async function save() {
    setSaving(true);
    try {
      const result = await mediaCatalogApi.save([...checked]);
      toast.success(
        result.selected === 0
          ? 'Quitaste todos los medios del catálogo.'
          : `Listo: lees ${result.selected} ${result.selected === 1 ? 'medio' : 'medios'} del catálogo.`,
        {
          description: result.added
            ? 'Las primeras noticias llegan en unos minutos, en Hoy.'
            : undefined,
        },
      );
      onOpenChange(false);
      onSaved?.();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudieron guardar los medios');
    } finally {
      setSaving(false);
    }
  }

  const suggestedCount = catalog?.entries.filter((e) => e.suggested).length ?? 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Newspaper className="h-5 w-5" /> Elegir medios
          </DialogTitle>
          <DialogDescription>
            Marca los medios que quieres leer. Ya tienen su dirección lista y no cuentan para el límite de fuentes de
            tu plan.
          </DialogDescription>
        </DialogHeader>

        {loading || !catalog ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Cargando medios…
          </div>
        ) : (
          <div className="min-w-0 space-y-3">
            {!catalog.hasChosen && (
              <p className="flex items-start gap-2 rounded-md border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  Te marcamos los grandes medios nacionales
                  {catalog.departmentName && (catalog.role === 'CANDIDATE' || catalog.role === 'COUNCIL')
                    ? ` y los de ${catalog.departmentName}`
                    : ''}
                  . Quita o agrega los que quieras antes de guardar.
                </span>
              </p>
            )}

            <div className="grid gap-2 sm:grid-cols-[1fr_10rem_12rem]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="catalog-search"
                  aria-label="Buscar un medio"
                  placeholder="Buscar un medio o un departamento"
                  className="pl-8"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <Select value={medium} onValueChange={(v) => setMedium(v as typeof medium)}>
                <SelectTrigger id="catalog-medium" aria-label="Tipo de medio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todos los tipos</SelectItem>
                  {(Object.keys(MEDIUM_LABEL) as MediaMedium[]).map((m) => (
                    <SelectItem key={m} value={m}>
                      {MEDIUM_LABEL[m]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger id="catalog-region" aria-label="Región">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">Todo el país</SelectItem>
                  <SelectItem value="NACIONAL">Solo nacionales</SelectItem>
                  {departments.map(([code, name]) => (
                    <SelectItem key={code} value={code}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="max-h-[50dvh] space-y-4 overflow-y-auto rounded-md border p-3">
              {groups.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  Ningún medio coincide. Si el tuyo no está, agrégalo como fuente propia con su RSS o escríbenos para
                  sumarlo al catálogo.
                </p>
              ) : (
                groups.map((group) => (
                  <section key={group.key} aria-label={group.title}>
                    <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {group.title}
                      {group.key === catalog.departmentCode ? ' · tu departamento' : ''}
                    </h4>
                    <ul className="grid gap-1 sm:grid-cols-2">
                      {group.items.map((entry) => (
                        <EntryRow
                          key={entry.id}
                          entry={entry}
                          checked={checked.has(entry.id)}
                          onChange={(on) => toggle(entry.id, on)}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>
          </div>
        )}

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <span aria-live="polite">
              {checked.size} {checked.size === 1 ? 'medio marcado' : 'medios marcados'}
            </span>
            {catalog && suggestedCount > 0 && (
              <Button
                type="button"
                variant="link"
                size="sm"
                className="h-auto p-0"
                onClick={() => setChecked(new Set(catalog.entries.filter((e) => e.suggested).map((e) => e.id)))}
              >
                Volver a los sugeridos
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={saving || loading || !catalog || !changed}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar medios
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EntryRow({
  entry,
  checked,
  onChange,
}: {
  entry: CatalogEntry;
  checked: boolean;
  onChange: (on: boolean) => void;
}) {
  const id = `catalog-entry-${entry.id}`;
  const failing = entry.lastStatus === 'ERROR' || entry.lastStatus === 'UNREACHABLE';
  return (
    <li className="flex items-start gap-2 rounded-md px-2 py-1.5 hover:bg-muted/50">
      <Checkbox id={id} checked={checked} onCheckedChange={(v) => onChange(v === true)} className="mt-0.5" />
      <label htmlFor={id} className="min-w-0 flex-1 cursor-pointer text-sm leading-tight">
        <span className="font-medium">{entryLabel(entry)}</span>
        <span className="block text-xs text-muted-foreground">
          {MEDIUM_LABEL[entry.medium]}
          {entry.level !== 'NACIONAL' ? ` · ${LEVEL_LABEL[entry.level]}` : ''}
          {entry.suggested ? ' · sugerido' : ''}
        </span>
        {failing && (
          <span className="mt-0.5 flex items-center gap-1 text-xs text-amber-700 dark:text-amber-400">
            <AlertTriangle className="h-3 w-3" /> No respondió en la última revisión
          </span>
        )}
      </label>
    </li>
  );
}
