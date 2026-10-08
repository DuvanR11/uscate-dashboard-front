'use client';

// Fase 4 "Líderes y celular" (2026-10-06): registrar un votante en pocos
// pasos desde el celular. Solo pide lo que el líder tiene a la mano en la
// calle; municipio, canal y ocupación los pone la plataforma, y el contacto
// se puede completar después desde Prospectos.
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { extractErrorMessage } from '@/lib/api/catalogs';
import { leaderApi } from '@/lib/api/leaders';
import { pollingStationsApi, type PollingStation } from '@/lib/api/polling-stations';
import { useZones } from '@/hooks/use-zones';

interface QuickCaptureSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Se llama cada vez que un votante queda guardado. */
  onCreated: () => void;
}

const emptyForm = {
  firstName: '',
  lastName: '',
  documentNumber: '',
  phone: '',
  zone: '',
  votingStation: '',
  votingTable: '',
  dataTreatment: false,
};

export function QuickCaptureSheet({ open, onOpenChange, onCreated }: QuickCaptureSheetProps) {
  const { zones } = useZones();
  const [stations, setStations] = useState<PollingStation[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [savedCount, setSavedCount] = useState(0);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    pollingStationsApi
      .list()
      .then((data) => {
        if (!cancelled) setStations(Array.isArray(data) ? data : []);
      })
      // Sin catálogo el puesto se escribe a mano.
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [open]);

  const set = <K extends keyof typeof emptyForm>(key: K, value: (typeof emptyForm)[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(emptyForm);
      setError('');
      setSavedCount(0);
    }
    onOpenChange(next);
  };

  async function save(keepOpen: boolean) {
    const firstName = form.firstName.trim();
    const lastName = form.lastName.trim();
    if (!firstName || !lastName) {
      setError('Escribe el nombre y el apellido.');
      return;
    }
    if (!form.documentNumber.trim() && !form.phone.trim()) {
      setError('Escribe la cédula o el celular.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      await leaderApi.quickCapture({
        firstName,
        lastName,
        documentNumber: form.documentNumber.trim() || undefined,
        phone: form.phone.trim() || undefined,
        localityId: form.zone ? Number(form.zone) : undefined,
        votingStation: form.votingStation.trim() || undefined,
        votingTable: form.votingTable.trim() || undefined,
        dataTreatment: form.dataTreatment,
      });
      toast.success(`${firstName} ${lastName} quedó registrado`);
      onCreated();
      if (keepOpen) {
        // Para una fila de personas del mismo sector: se conservan la zona y el puesto.
        setForm({ ...emptyForm, zone: form.zone, votingStation: form.votingStation });
        setSavedCount((count) => count + 1);
        firstField.current?.focus();
      } else {
        handleOpenChange(false);
      }
    } catch (err) {
      setError(extractErrorMessage(err) || 'No se pudo guardar. Revisa tu conexión e inténtalo de nuevo.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="max-h-[92dvh] overflow-y-auto rounded-t-2xl sm:mx-auto sm:max-w-lg">
        <SheetHeader className="text-left">
          <SheetTitle className="flex items-center gap-2 text-foreground">
            <UserPlus className="h-5 w-5" /> Registrar votante
          </SheetTitle>
          <SheetDescription>
            Nombre y un dato de contacto bastan. Lo demás lo puedes completar después.
            {savedCount > 0 ? ` Llevas ${savedCount} en esta tanda.` : ''}
          </SheetDescription>
        </SheetHeader>

        <form
          className="space-y-4 px-4 pb-2"
          onSubmit={(event) => {
            event.preventDefault();
            save(false);
          }}
        >
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-first-name">Nombres</Label>
              <Input
                id="qc-first-name"
                ref={firstField}
                autoComplete="off"
                autoCapitalize="words"
                maxLength={80}
                className="h-12 text-base"
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-last-name">Apellidos</Label>
              <Input
                id="qc-last-name"
                autoComplete="off"
                autoCapitalize="words"
                maxLength={80}
                className="h-12 text-base"
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qc-document">Cédula</Label>
              <Input
                id="qc-document"
                inputMode="numeric"
                autoComplete="off"
                maxLength={15}
                className="h-12 text-base"
                value={form.documentNumber}
                onChange={(e) => set('documentNumber', e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-phone">Celular</Label>
              <Input
                id="qc-phone"
                type="tel"
                inputMode="tel"
                autoComplete="off"
                maxLength={16}
                placeholder="3001234567"
                className="h-12 text-base"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-slate-500">Escribe al menos uno de los dos: cédula o celular.</p>

          {zones.length > 0 && (
            <div className="space-y-1.5">
              <Label htmlFor="qc-zone">Zona (opcional)</Label>
              <select
                id="qc-zone"
                className="h-12 w-full rounded-md border border-input bg-background px-3 text-base focus-visible:outline-2 focus-visible:outline-primary"
                value={form.zone}
                onChange={(e) => set('zone', e.target.value)}
              >
                <option value="">Sin zona</option>
                {zones.map((zone) => (
                  <option key={zone.id} value={zone.id}>
                    {zone.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="qc-station">Puesto de votación (opcional)</Label>
              <Input
                id="qc-station"
                list={stations.length > 0 ? 'qc-stations' : undefined}
                autoComplete="off"
                maxLength={120}
                className="h-12 text-base"
                value={form.votingStation}
                onChange={(e) => set('votingStation', e.target.value)}
              />
              {stations.length > 0 && (
                <datalist id="qc-stations">
                  {stations.map((station) => (
                    <option key={station.id} value={station.name} />
                  ))}
                </datalist>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qc-table">Mesa</Label>
              <Input
                id="qc-table"
                inputMode="numeric"
                autoComplete="off"
                maxLength={20}
                className="h-12 text-base"
                value={form.votingTable}
                onChange={(e) => set('votingTable', e.target.value)}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-3">
            <Checkbox
              id="qc-consent"
              className="mt-0.5 h-5 w-5"
              checked={form.dataTreatment}
              onCheckedChange={(checked) => set('dataTreatment', checked === true)}
            />
            <Label htmlFor="qc-consent" className="text-sm font-normal leading-snug text-slate-700">
              La persona autorizó el tratamiento de sus datos.
              <span className="mt-0.5 block text-xs text-slate-500">
                Sin autorización el contacto se guarda, pero no recibe mensajes ni correos.
              </span>
            </Label>
          </div>

          {error && (
            <p role="alert" className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </p>
          )}

          <SheetFooter className="flex-col gap-2 px-0 sm:flex-col">
            <Button type="submit" className="h-12 w-full text-base" disabled={saving}>
              {saving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : null}
              Guardar
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-12 w-full text-base"
              disabled={saving}
              onClick={() => save(true)}
            >
              Guardar y registrar otro
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
