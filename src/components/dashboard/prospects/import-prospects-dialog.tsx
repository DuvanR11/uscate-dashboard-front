'use client';

// Fase 1 "Importar contactos" (2026-10-06): toda campaña arranca con sus
// listas en Excel. Tres pasos: archivo → columnas y autorización → revisión.
// Nada se guarda hasta el último botón; antes se muestra exactamente qué va a
// entrar, qué se omite y por qué.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  FileSpreadsheet,
  Loader2,
  ShieldCheck,
  Upload,
} from 'lucide-react';
import api from '@/lib/api';
import { extractErrorMessage, type SimpleCatalogItem } from '@/lib/api/catalogs';
import {
  IMPORT_FIELDS,
  IMPORT_FIELD_LABEL,
  downloadImportIssues,
  downloadImportTemplate,
  previewProspectImport,
  runProspectImport,
  type ImportConsentMode,
  type ImportField,
  type ImportMapping,
  type ImportPreview,
  type ImportResult,
} from '@/lib/api/prospect-imports';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';

interface ImportProspectsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama cuando sí se crearon contactos, para refrescar la lista. */
  onImported: () => void;
}

type Step = 'file' | 'setup' | 'review' | 'done';
const NONE = '__none__';
const number = (value: number) => new Intl.NumberFormat('es-CO').format(value);

const CONSENT_OPTIONS: { value: ImportConsentMode; title: string; detail: string }[] = [
  {
    value: 'NONE',
    title: 'No tengo la autorización de estas personas',
    detail:
      'Los contactos se guardan, pero no recibirán SMS ni correos hasta que cada uno autorice.',
  },
  {
    value: 'ALL',
    title: 'Todas las personas de la lista autorizaron',
    detail: 'Declaras que cuentas con la autorización de tratamiento de datos de todas.',
  },
  {
    value: 'COLUMN',
    title: 'La autorización viene en una columna del archivo',
    detail: 'Solo quedan autorizadas las filas que digan "Sí" (o "X") en esa columna.',
  },
];

export function ImportProspectsDialog({
  open,
  onOpenChange,
  onImported,
}: ImportProspectsDialogProps) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<Step>('file');
  const [busy, setBusy] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [mapping, setMapping] = useState<ImportMapping>({});
  const [consentMode, setConsentMode] = useState<ImportConsentMode>('NONE');
  const [consentSource, setConsentSource] = useState('');
  const [segmentId, setSegmentId] = useState(NONE);
  const [tagId, setTagId] = useState(NONE);
  const [leaderId, setLeaderId] = useState(NONE);
  const [review, setReview] = useState<ImportResult | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [catalogs, setCatalogs] = useState<{
    segments: SimpleCatalogItem[];
    tags: SimpleCatalogItem[];
    leaders: { id: string; fullName: string }[];
  }>({ segments: [], tags: [], leaders: [] });

  // Catálogos opcionales para clasificar toda la lista. Si alguno falla (por
  // permisos), el diálogo funciona igual sin esa opción.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const list = async <T,>(url: string): Promise<T[]> => {
      try {
        const { data } = await api.get(url);
        return Array.isArray(data) ? data : (data?.data ?? []);
      } catch {
        return [];
      }
    };
    Promise.all([
      list<SimpleCatalogItem>('/catalogs/segments'),
      list<SimpleCatalogItem>('/catalogs/tags'),
      list<{ id: string; fullName: string }>('/users?roles=LEADER'),
    ]).then(([segments, tags, leaders]) => {
      if (!cancelled) setCatalogs({ segments, tags, leaders });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);

  const reset = () => {
    setStep('file');
    setFile(null);
    setPreview(null);
    setMapping({});
    setConsentMode('NONE');
    setConsentSource('');
    setSegmentId(NONE);
    setTagId(NONE);
    setLeaderId(NONE);
    setReview(null);
    setResult(null);
    if (fileInput.current) fileInput.current.value = '';
  };

  const close = (next: boolean) => {
    if (busy) return;
    if (!next) {
      if (result && result.created > 0) onImported();
      reset();
    }
    onOpenChange(next);
  };

  const handleFile = async (selected: File | undefined) => {
    if (!selected) return;
    setBusy(true);
    try {
      const data = await previewProspectImport(selected);
      setFile(selected);
      setPreview(data);
      setMapping(data.suggestedMapping);
      setStep('setup');
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo leer el archivo.');
      if (fileInput.current) fileInput.current.value = '';
    } finally {
      setBusy(false);
    }
  };

  const setColumn = (field: ImportField, value: string) => {
    setMapping((current) => {
      const next = { ...current };
      if (value === NONE) delete next[field];
      else next[field] = Number(value);
      return next;
    });
  };

  const options = (dryRun: boolean) => ({
    mapping,
    consentMode,
    consentSource: consentMode === 'NONE' ? undefined : consentSource.trim(),
    segmentId: segmentId === NONE ? undefined : Number(segmentId),
    tagId: tagId === NONE ? undefined : Number(tagId),
    leaderId: leaderId === NONE ? undefined : leaderId,
    dryRun,
  });

  const handleReview = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setReview(await runProspectImport(file, options(true)));
      setStep('review');
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo revisar el archivo.');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async () => {
    if (!file) return;
    setBusy(true);
    try {
      const data = await runProspectImport(file, options(false));
      setResult(data);
      setStep('done');
      if (data.created > 0) toast.success(`Se importaron ${number(data.created)} contactos.`);
    } catch (error) {
      toast.error(extractErrorMessage(error) || 'No se pudo completar la importación.');
    } finally {
      setBusy(false);
    }
  };

  const usedColumns = new Set(Object.values(mapping));
  const sampleOf = (field: ImportField) => {
    const index = mapping[field];
    if (index === undefined || !preview) return '';
    return preview.sample.map((row) => row[index]).find((value) => value) ?? '';
  };
  // La columna de autorización solo se pide si se eligió esa opción.
  const visibleFields = IMPORT_FIELDS.filter(
    (field) => field !== 'consent' || consentMode === 'COLUMN',
  );
  const summary = step === 'done' ? result : review;
  const skipped = summary
    ? summary.duplicatesInFile + summary.duplicatesExisting + summary.rejected + summary.overQuota
    : 0;

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="sm:max-w-2xl max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-primary">
            <FileSpreadsheet className="h-5 w-5 text-secondary" />
            Importar contactos
          </DialogTitle>
          <DialogDescription>
            {step === 'file' && 'Sube tu lista en Excel (.xlsx) o CSV. Nada se guarda hasta que lo confirmes.'}
            {step === 'setup' && `${preview?.fileName} · ${number(preview?.totalRows ?? 0)} filas. Indica qué trae cada columna.`}
            {step === 'review' && 'Revisa el resultado antes de guardar.'}
            {step === 'done' && 'Importación terminada.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'file' && (
          <div className="space-y-4 py-2">
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={busy}
              className="flex w-full flex-col items-center gap-2 rounded-lg border-2 border-dashed border-slate-300 px-4 py-10 text-center transition-colors hover:border-primary hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-60"
            >
              {busy ? (
                <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
              ) : (
                <Upload className="h-8 w-8 text-slate-400" />
              )}
              <span className="font-semibold text-slate-700">
                {busy ? 'Leyendo el archivo…' : 'Elegir archivo'}
              </span>
              <span className="text-xs text-slate-500">
                Excel (.xlsx) o CSV · hasta 10.000 contactos y 5 MB por archivo
              </span>
            </button>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.csv,.txt"
              className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])}
            />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-600">
              <span>La primera fila debe traer los nombres de las columnas.</span>
              <Button type="button" variant="link" className="h-auto p-0" onClick={downloadImportTemplate}>
                <Download className="mr-1 h-4 w-4" /> Descargar plantilla
              </Button>
            </div>
          </div>
        )}

        {step === 'setup' && preview && (
          <div className="space-y-5 py-2">
            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Columnas del archivo</h3>
              <div className="space-y-2">
                {visibleFields.map((field) => (
                  <div key={field} className="grid grid-cols-1 gap-1 sm:grid-cols-[150px_1fr_1fr] sm:items-center sm:gap-3">
                    <Label className="text-sm">{IMPORT_FIELD_LABEL[field]}</Label>
                    <Select
                      value={mapping[field] === undefined ? NONE : String(mapping[field])}
                      onValueChange={(value) => setColumn(field, value)}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={NONE}>No viene en el archivo</SelectItem>
                        {preview.headers.map((header, index) => (
                          <SelectItem
                            key={index}
                            value={String(index)}
                            disabled={usedColumns.has(index) && mapping[field] !== index}
                          >
                            {header}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="truncate text-xs text-slate-500">
                      {sampleOf(field) ? `Ej.: ${sampleOf(field)}` : ''}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-slate-500">
                Hace falta nombre y apellido (o una columna con el nombre completo) y al menos cédula, celular o correo.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="flex items-center gap-2 text-sm font-bold text-slate-700">
                <ShieldCheck className="h-4 w-4" /> Autorización de datos (Ley 1581)
              </h3>
              <div className="space-y-2" role="radiogroup" aria-label="Autorización de datos">
                {CONSENT_OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className={`flex cursor-pointer gap-3 rounded-lg border p-3 text-sm transition-colors ${
                      consentMode === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="consent-mode"
                      className="mt-1"
                      checked={consentMode === option.value}
                      onChange={() => setConsentMode(option.value)}
                    />
                    <span>
                      <span className="block font-semibold text-slate-800">{option.title}</span>
                      <span className="block text-slate-600">{option.detail}</span>
                    </span>
                  </label>
                ))}
              </div>
              {consentMode !== 'NONE' && (
                <div className="space-y-1.5">
                  <Label htmlFor="consent-source">¿Cómo se obtuvo la autorización?</Label>
                  <Textarea
                    id="consent-source"
                    rows={2}
                    maxLength={500}
                    value={consentSource}
                    onChange={(e) => setConsentSource(e.target.value)}
                    placeholder="Ej.: planillas firmadas en el encuentro del 12 de octubre en Timanco"
                  />
                  <p className="text-xs text-slate-500">
                    Queda guardado con tu usuario y la fecha, como respaldo si alguien pregunta de dónde salieron sus datos.
                  </p>
                </div>
              )}
            </section>

            <section className="space-y-2">
              <h3 className="text-sm font-bold text-slate-700">Clasificar toda la lista (opcional)</h3>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <OptionalSelect label="Segmento" value={segmentId} onChange={setSegmentId}
                  items={catalogs.segments.map((s) => ({ value: String(s.id), label: s.name }))} />
                <OptionalSelect label="Etiqueta" value={tagId} onChange={setTagId}
                  items={catalogs.tags.map((t) => ({ value: String(t.id), label: t.name }))} />
                <OptionalSelect label="Líder responsable" value={leaderId} onChange={setLeaderId}
                  items={catalogs.leaders.map((l) => ({ value: l.id, label: l.fullName }))} />
              </div>
            </section>

            {preview.quota && preview.quota.limit !== null && (
              <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Tu plan incluye {number(preview.quota.limit)} contactos y ya tienes {number(preview.quota.used)}:
                {' '}caben {number(preview.quota.remaining ?? 0)} más.
              </p>
            )}
          </div>
        )}

        {(step === 'review' || step === 'done') && summary && (
          <div className="space-y-4 py-2">
            <div className={`flex items-start gap-3 rounded-lg border p-4 ${
              step === 'done' ? 'border-emerald-200 bg-emerald-50' : 'border-slate-200 bg-slate-50'
            }`}>
              <CheckCircle2 className={`mt-0.5 h-5 w-5 ${step === 'done' ? 'text-emerald-600' : 'text-slate-500'}`} />
              <div>
                <p className="text-lg font-bold text-slate-800">
                  {step === 'done'
                    ? `${number(summary.created)} contactos importados`
                    : `Se van a crear ${number(summary.toCreate)} contactos`}
                </p>
                <p className="text-sm text-slate-600">de {number(summary.totalRows)} filas del archivo.</p>
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Stat label="Con autorización de datos" value={summary.withConsent} />
              <Stat label="Sin autorización (no reciben envíos)" value={summary.withoutConsent} warn={summary.withoutConsent > 0} />
              <Stat label="Ya existían" value={summary.duplicatesExisting} />
              <Stat label="Repetidas en el archivo" value={summary.duplicatesInFile} />
              <Stat label="Rechazadas por datos inválidos" value={summary.rejected} warn={summary.rejected > 0} />
              <Stat label="Sin cupo en el plan" value={summary.overQuota} warn={summary.overQuota > 0} />
            </dl>

            {summary.withoutConsent > 0 && (
              <p className="flex gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  {number(summary.withoutConsent)} contactos quedan sin autorización: no recibirán SMS, correos ni
                  mensajes automáticos. Se desbloquean cuando la persona se inscribe por un enlace público o cuando
                  editas el contacto y marcas que autorizó.
                </span>
              </p>
            )}
            {summary.unknownMunicipalities > 0 && (
              <p className="text-xs text-slate-500">
                {number(summary.unknownMunicipalities)} filas traían un municipio que no se reconoció; quedaron con el municipio de tu organización.
              </p>
            )}
            {(summary.newZones?.length ?? 0) > 0 && (
              <p className="text-xs text-slate-500">
                {summary.dryRun ? 'Se crearán' : 'Se crearon'} {number(summary.newZones.length)} zonas nuevas a partir
                de la columna de zona: {summary.newZones.slice(0, 8).join(', ')}
                {summary.newZones.length > 8 ? ` y ${number(summary.newZones.length - 8)} más` : ''}. Puedes
                revisarlas en Configuración → Catálogos → Zonas.
              </p>
            )}
            {(summary.zonesNotCreated ?? 0) > 0 && (
              <p className="text-xs text-amber-700">
                La columna de zona trae demasiados valores distintos: {number(summary.zonesNotCreated)} no se crean
                y esos contactos quedan sin zona.
              </p>
            )}
            {(summary.linkedToPollingStation ?? 0) > 0 && (
              <p className="text-xs text-slate-500">
                {number(summary.linkedToPollingStation)} contactos quedan enlazados a un puesto de tu catálogo de
                puestos de votación.
              </p>
            )}

            {skipped > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="text-sm font-bold text-slate-700">Filas que no entran ({number(skipped)})</h3>
                  <Button type="button" variant="outline" size="sm" onClick={() => downloadImportIssues(summary)}>
                    <Download className="mr-1 h-4 w-4" /> Descargar lista
                  </Button>
                </div>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border border-slate-200 p-2 text-xs text-slate-600">
                  {summary.issues.slice(0, 50).map((issue) => (
                    <li key={`${issue.row}-${issue.kind}`}>
                      <span className="font-mono text-slate-500">Fila {issue.row}</span> · {issue.name}: {issue.reason}
                    </li>
                  ))}
                </ul>
                {(summary.issues.length > 50 || summary.issuesTruncated) && (
                  <p className="text-xs text-slate-500">Se muestran las primeras 50; descarga la lista para verlas todas.</p>
                )}
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'file' && (
            <Button variant="outline" onClick={() => close(false)} disabled={busy}>Cancelar</Button>
          )}
          {step === 'setup' && (
            <>
              <Button variant="outline" onClick={reset} disabled={busy}>Cambiar archivo</Button>
              <Button onClick={handleReview} disabled={busy}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Revisar
              </Button>
            </>
          )}
          {step === 'review' && review && (
            <>
              <Button variant="outline" onClick={() => setStep('setup')} disabled={busy}>Volver</Button>
              <Button onClick={handleImport} disabled={busy || review.toCreate === 0}>
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {review.toCreate === 0 ? 'Nada para importar' : `Importar ${number(review.toCreate)} contactos`}
              </Button>
            </>
          )}
          {step === 'done' && <Button onClick={() => close(false)}>Cerrar</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, warn }: { label: string; value: number; warn?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-slate-100 pb-1">
      <dt className="text-slate-600">{label}</dt>
      <dd className={`font-semibold tabular-nums ${warn ? 'text-amber-700' : 'text-slate-800'}`}>
        {number(value)}
      </dd>
    </div>
  );
}

function OptionalSelect({
  label,
  value,
  onChange,
  items,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  items: { value: string; label: string }[];
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange} disabled={items.length === 0}>
        <SelectTrigger className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>Sin asignar</SelectItem>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
