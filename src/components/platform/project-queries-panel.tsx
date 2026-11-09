'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ExternalLink, Loader2, Pencil, RefreshCw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { extractErrorMessage } from '@/lib/api-error';
import type { SetupPreview } from '@/lib/api/monitoring-setup';
import { projectQueriesAdminApi, type CommonProjectQuery, type QuerySource } from '@/lib/api/project-media';
import { usePlatformCapability } from './access-context';

// Piloto de Zyron Prensa, Fase B (2026-11-09): Plataforma → Medios. La
// búsqueda de Google News de cada proyecto del Radar es una sola para todas
// las organizaciones que lo siguen; la arma la IA. Cuando no acierta, el
// operador la escribe a mano aquí (con vista previa) y cambia para todas.

// Igual que `QUERY_MAX` del servidor.
const QUERY_MAX = 200;

const SOURCE_LABEL: Record<QuerySource, string> = {
  AI: 'La armó la IA',
  RULES: 'Sin IA: solo el número',
  OPERATOR: 'Escrita a mano',
};

const DAY_FORMAT = new Intl.DateTimeFormat('es-CO', {
  day: 'numeric',
  month: 'short',
  timeZone: 'America/Bogota',
});

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function ProjectQueriesPanel() {
  const canWrite = usePlatformCapability('INTEGRATIONS_MANAGE');
  const [rows, setRows] = useState<CommonProjectQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CommonProjectQuery | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await projectQueriesAdminApi.list());
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudieron cargar las búsquedas de los proyectos.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="space-y-4 px-6 pb-6" aria-labelledby="project-queries-title">
      <div>
        <h2 id="project-queries-title" className="text-xl font-semibold">
          Búsquedas de proyectos del Radar
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          La búsqueda de Google News de cada proyecto que alguien sigue en medios. Es una sola para todas las
          organizaciones que lo siguen. Si la IA no acierta, escríbela a mano: cambia para todas.
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" /> Cargando…
        </div>
      ) : rows.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">Todavía nadie sigue un proyecto en medios.</p>
      ) : (
        <ul className="divide-y rounded-md border bg-card">
          {rows.map((row) => (
            <li key={row.projectUid} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium">{row.pressName}</span>
                  <Badge variant="outline" className="text-[10px]">
                    {SOURCE_LABEL[row.source] ?? row.source}
                  </Badge>
                  <Badge variant="outline" className="text-[10px]">
                    {row.followers === 0
                      ? 'Nadie lo sigue ahora'
                      : `Lo ${row.followers === 1 ? 'sigue' : 'siguen'} ${plural(row.followers, 'organización', 'organizaciones')}`}
                  </Badge>
                </div>
                <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                  {[row.body, row.projectNumber ? `N.º ${row.projectNumber}` : null, row.title].filter(Boolean).join(' · ')}
                </p>
                <p className="mt-1 break-words font-mono text-[11px] text-slate-700">{row.query}</p>
                <p className="text-[11px] text-muted-foreground/80">
                  Cambió el {DAY_FORMAT.format(new Date(row.updatedAt))}
                </p>
              </div>
              {canWrite && (
                <Button
                  size="sm"
                  variant="outline"
                  className="shrink-0"
                  aria-label={`Editar la búsqueda de ${row.pressName}`}
                  onClick={() => setEditing(row)}
                >
                  <Pencil className="mr-1 h-3.5 w-3.5" /> Editar
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {editing && (
        <EditQueryDialog
          row={editing}
          onClose={() => setEditing(null)}
          onSaved={async () => {
            setEditing(null);
            await load();
          }}
        />
      )}
    </section>
  );
}

function EditQueryDialog({
  row,
  onClose,
  onSaved,
}: {
  row: CommonProjectQuery;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const [query, setQuery] = useState(row.query);
  const [preview, setPreview] = useState<SetupPreview | null>(null);
  const [counted, setCounted] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [saving, setSaving] = useState(false);
  const clean = query.trim();
  const changed = clean !== row.query;

  async function count() {
    setPreviewing(true);
    try {
      setPreview(await projectQueriesAdminApi.preview(row.projectId, clean));
      setCounted(clean);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'Google News no respondió. Inténtalo de nuevo.');
    } finally {
      setPreviewing(false);
    }
  }

  async function save() {
    if (
      row.followers > 0 &&
      !(await confirmDialog(
        `La búsqueda cambia para ${plural(row.followers, 'organización que sigue', 'organizaciones que siguen')} este proyecto. ¿Guardar?`,
      ))
    )
      return;
    setSaving(true);
    try {
      const result = await projectQueriesAdminApi.save(row.projectId, clean);
      toast.success(`Listo: guardaste la búsqueda. Se actualizaron ${plural(result.sources, 'fuente', 'fuentes')}.`);
      await onSaved();
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo guardar la búsqueda.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Búsqueda de «{row.pressName}»</DialogTitle>
          <DialogDescription>
            Frases entre comillas unidas con OR. En un Concejo o una Asamblea, pon el lugar una sola vez al final: Google
            News une primero los OR y exige el lugar a toda la búsqueda («&quot;a&quot; OR &quot;b&quot; Bogotá»). La IA
            ya no la rehace.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="project-query-text">Búsqueda en Google News</Label>
            <Textarea
              id="project-query-text"
              value={query}
              maxLength={QUERY_MAX}
              rows={3}
              className="font-mono text-xs"
              onChange={(e) => setQuery(e.target.value)}
            />
            <p className="text-right text-[11px] text-muted-foreground">
              {clean.length}/{QUERY_MAX}
            </p>
          </div>

          <div className="rounded-lg border bg-slate-50 p-3" aria-live="polite">
            {previewing ? (
              <p className="flex items-center gap-2 text-sm text-slate-600">
                <Loader2 className="h-4 w-4 animate-spin" /> Revisando Google News de los últimos 7 días…
              </p>
            ) : preview && counted === clean ? (
              <div className="space-y-2">
                <p className="text-sm text-slate-800">
                  En 7 días trae <strong>{plural(preview.found, 'noticia', 'noticias')}</strong>;{' '}
                  {plural(preview.matched, 'pasa', 'pasan')} los términos comunes del proyecto.
                </p>
                {preview.sample.length > 0 && (
                  <ul className="space-y-1.5 border-t border-slate-200 pt-2">
                    {preview.sample.map((item) => (
                      <li key={item.url} className="text-xs">
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-start gap-1 font-medium text-slate-700 hover:underline"
                        >
                          <span className="line-clamp-2">{item.title}</span>
                          <ExternalLink className="mt-0.5 h-3 w-3 shrink-0" aria-hidden />
                        </a>
                        {item.outlet && <span className="block text-slate-500">{item.outlet}</span>}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm text-slate-600">Cuenta las noticias antes de guardar.</p>
                <Button type="button" variant="outline" size="sm" onClick={count} disabled={clean.length < 2}>
                  <RefreshCw className="mr-1 h-3.5 w-3.5" /> Contar noticias
                </Button>
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!changed || saving || counted !== clean}>
            {saving && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Guardar para todos
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
