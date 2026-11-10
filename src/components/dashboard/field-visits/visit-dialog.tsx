'use client';

// Plan hacia la versión estable, Fase 3c (2026-11-10): registrar una visita
// puerta a puerta desde el celular. A un contacto (ya elegido, o buscándolo)
// o a una puerta sin contacto (con la zona). La ubicación es opcional: se
// toma una vez, si la persona la comparte.
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { DoorOpen, Loader2, LocateFixed, MapPin, Search, X } from 'lucide-react';
import api from '@/lib/api';
import { apiErrorMessage } from '@/lib/api-error';
import { useZones } from '@/hooks/use-zones';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  VISIT_RESULT_LABEL,
  VISIT_RESULT_ORDER,
  fieldVisitsApi,
  type FieldVisit,
  type VisitResult,
} from '@/lib/api/field-visits';
import { surveysApi, useSurveysEnabled } from '@/lib/api/surveys';
import { usePermission } from '@/hooks/use-permission';
import { SurveyResponseDialog } from '@/components/dashboard/surveys/survey-response-dialog';

export interface VisitTarget {
  id: string;
  fullName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** El contacto ya elegido (desde su ficha o el portal del líder). */
  prospect?: VisitTarget | null;
  onSaved?: (visit: FieldVisit) => void;
}

interface Position {
  latitude: number;
  longitude: number;
  accuracyMeters: number;
}

interface SearchRow {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  locality?: { name?: string | null } | null;
}

/** Con estos resultados alguien abrió la puerta: se puede aplicar una encuesta. */
const SURVEY_RESULTS: VisitResult[] = ['ATTENDED', 'SUPPORTS', 'UNDECIDED', 'OPPOSES'];

interface SurveyAfterVisit {
  prospect: VisitTarget;
  visitId: string;
}

/**
 * Fase 4 (2026-11-10): al guardar la visita a un contacto que abrió la
 * puerta, si hay una encuesta activa para visitas, se ofrece aplicarla.
 */
export function VisitDialog(props: Props) {
  const [surveyFor, setSurveyFor] = useState<SurveyAfterVisit | null>(null);
  return (
    <>
      <VisitForm {...props} onAskSurvey={setSurveyFor} />
      {surveyFor && (
        <SurveyResponseDialog
          open
          onOpenChange={(next) => !next && setSurveyFor(null)}
          prospect={surveyFor.prospect}
          fieldVisitId={surveyFor.visitId}
        />
      )}
    </>
  );
}

function VisitForm({
  open,
  onOpenChange,
  prospect,
  onSaved,
  onAskSurvey,
}: Props & { onAskSurvey: (value: SurveyAfterVisit) => void }) {
  const { zones } = useZones();
  const surveysEnabled = useSurveysEnabled();
  const canAnswerSurveys = usePermission('ENCUESTAS', 'canWrite');
  const [mode, setMode] = useState<'contact' | 'door'>('contact');
  const [chosen, setChosen] = useState<VisitTarget | null>(null);
  const [query, setQuery] = useState('');
  const [found, setFound] = useState<VisitTarget[]>([]);
  const [searching, setSearching] = useState(false);
  const [zone, setZone] = useState('');
  const [address, setAddress] = useState('');
  const [result, setResult] = useState<VisitResult | null>(null);
  const [note, setNote] = useState('');
  const [position, setPosition] = useState<Position | null>(null);
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setMode('contact');
    setChosen(prospect ?? null);
    setQuery('');
    setFound([]);
    setZone('');
    setAddress('');
    setResult(null);
    setNote('');
    setPosition(null);
    // Se reinicia al abrir o al cambiar de contacto, no cada vez que el padre
    // arma un objeto nuevo con el mismo contacto.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, prospect?.id]);

  // Búsqueda entre los contactos que la persona ve (el servidor aplica su alcance).
  useEffect(() => {
    if (!open || mode !== 'contact' || chosen) return;
    const text = query.trim();
    if (text.length < 2) {
      setFound([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const { data } = await api.get('/prospects', { params: { search: text, limit: 8 } });
        const rows: SearchRow[] = Array.isArray(data?.data) ? data.data : [];
        if (!cancelled)
          setFound(
            rows.map((row) => ({
              id: row.id,
              fullName:
                `${row.firstName ?? ''} ${row.lastName ?? ''}`.trim() +
                (row.locality?.name ? ` · ${row.locality.name}` : ''),
            })),
          );
      } catch {
        if (!cancelled) setFound([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query, open, mode, chosen]);

  const locate = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.error('Este navegador no comparte la ubicación.');
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          accuracyMeters: Math.round(pos.coords.accuracy),
        });
        setLocating(false);
      },
      (error) => {
        setLocating(false);
        toast.error(
          error.code === error.PERMISSION_DENIED
            ? 'No diste permiso para usar tu ubicación. La visita se puede guardar sin ella.'
            : 'No se pudo obtener tu ubicación. La visita se puede guardar sin ella.',
        );
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 },
    );
  };

  const target = mode === 'contact' ? chosen : null;
  const ready = !!result && (mode === 'contact' ? !!target : !!zone);

  const save = async () => {
    if (!ready || !result) return;
    setSaving(true);
    try {
      const visit = await fieldVisitsApi.create({
        result,
        ...(target ? { prospectId: target.id } : { localityId: Number(zone) }),
        ...(mode === 'door' && address.trim() ? { addressLabel: address.trim() } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
        ...(position ?? {}),
      });
      toast.success('Visita registrada.');
      onSaved?.(visit);
      onOpenChange(false);
      // Solo si hay alguna encuesta activa para visitas (si no, no se interrumpe).
      if (surveysEnabled && canAnswerSurveys && target && SURVEY_RESULTS.includes(result))
        surveysApi
          .available('VISIT')
          .then((list) => list.length > 0 && onAskSurvey({ prospect: target, visitId: visit.id }))
          .catch(() => undefined);
    } catch (error) {
      toast.error(apiErrorMessage(error) ?? 'No se pudo registrar la visita.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !saving && onOpenChange(next)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DoorOpen className="h-5 w-5 text-primary" /> Registrar visita
          </DialogTitle>
          <DialogDescription>
            {prospect ? `Visita a ${prospect.fullName}.` : 'A un contacto o a una puerta sin contacto.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-1">
          {!prospect && (
            <div className="grid grid-cols-2 gap-2" role="group" aria-label="A quién visitaste">
              <Button
                type="button"
                variant={mode === 'contact' ? 'default' : 'outline'}
                aria-pressed={mode === 'contact'}
                onClick={() => setMode('contact')}
              >
                Un contacto
              </Button>
              <Button
                type="button"
                variant={mode === 'door' ? 'default' : 'outline'}
                aria-pressed={mode === 'door'}
                onClick={() => setMode('door')}
              >
                Puerta sin contacto
              </Button>
            </div>
          )}

          {!prospect && mode === 'contact' && (
            <div className="space-y-2">
              <Label htmlFor="visit-search">Contacto</Label>
              {chosen ? (
                <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-sm">
                  <span className="truncate font-medium">{chosen.fullName}</span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8"
                    aria-label="Elegir otro contacto"
                    onClick={() => setChosen(null)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="visit-search"
                      className="pl-9"
                      placeholder="Nombre, celular o cédula"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      autoComplete="off"
                    />
                  </div>
                  {searching && <p className="text-xs text-muted-foreground">Buscando…</p>}
                  {found.length > 0 && (
                    <ul className="max-h-48 divide-y overflow-y-auto rounded-lg border">
                      {found.map((row) => (
                        <li key={row.id}>
                          <button
                            type="button"
                            className="w-full px-3 py-2.5 text-left text-sm hover:bg-muted focus-visible:bg-muted focus-visible:outline-none"
                            onClick={() => setChosen(row)}
                          >
                            {row.fullName}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                  {!searching && query.trim().length >= 2 && found.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      No aparece entre tus contactos. Regístralo primero o marca «Puerta sin contacto».
                    </p>
                  )}
                </>
              )}
            </div>
          )}

          {mode === 'door' && (
            <div className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="visit-zone">Zona</Label>
                <select
                  id="visit-zone"
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  value={zone}
                  onChange={(e) => setZone(e.target.value)}
                >
                  <option value="">Elige la zona</option>
                  {zones.map((z) => (
                    <option key={z.id} value={z.id}>
                      {z.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="visit-address">Referencia de la puerta (opcional)</Label>
                <Input
                  id="visit-address"
                  maxLength={200}
                  placeholder="Casa esquinera, portón verde"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-sm font-medium">¿Cómo te fue?</legend>
            <div className="grid grid-cols-2 gap-2">
              {VISIT_RESULT_ORDER.map((value) => (
                <Button
                  key={value}
                  type="button"
                  variant={result === value ? 'default' : 'outline'}
                  aria-pressed={result === value}
                  className="h-12"
                  onClick={() => setResult(value)}
                >
                  {VISIT_RESULT_LABEL[value]}
                </Button>
              ))}
            </div>
          </fieldset>

          <div className="space-y-2">
            <Label htmlFor="visit-note">Nota (opcional)</Label>
            <Textarea
              id="visit-note"
              rows={3}
              maxLength={1000}
              placeholder="Qué le preocupa, a qué hora encontrarlo, quién más vive ahí…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            {position ? (
              <div className="flex items-center justify-between gap-2 rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <span className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-primary" /> Ubicación lista (± {position.accuracyMeters} m)
                </span>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPosition(null)}>
                  Quitar
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" className="w-full" onClick={locate} disabled={locating}>
                {locating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LocateFixed className="mr-2 h-4 w-4" />}
                Agregar mi ubicación (opcional)
              </Button>
            )}
            <p className="text-xs text-muted-foreground">
              Se toma una sola vez, con esta visita, y solo la ve el equipo que ve este contacto. No se sigue tu
              ubicación.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={!ready || saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar visita
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
