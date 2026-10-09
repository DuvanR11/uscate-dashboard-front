'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
import api from '@/lib/api';

/** Meta y tarifas de la recolección de firmas de la organización (`/signatures/settings`). */
export interface SignatureSettings {
  /** Meta de firmas; `null` = la organización no ha definido una. */
  goal: number | null;
  /** Pago por una jornada completa de 8 horas. */
  baseValue: number;
  /** Pago por cada planilla completa. */
  planillaValue: number;
  signaturesPerPlanilla: number;
}

// Las mismas tarifas con las que responde el servidor cuando la organización
// no ha configurado nada. Solo se usan mientras llega la respuesta.
export const DEFAULT_SIGNATURE_SETTINGS: SignatureSettings = {
  goal: null,
  baseValue: 40000,
  planillaValue: 5000,
  signaturesPerPlanilla: 15,
};

function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  settings: SignatureSettings;
  onSaved: (settings: SignatureSettings) => void;
}

/**
 * Lo abre quien administra la nómina de firmas. Los cambios aplican a los
 * registros NUEVOS: lo ya anotado conserva los valores con los que se registró.
 */
export function SignatureSettingsDialog({ open, onOpenChange, settings, onSaved }: Props) {
  const [form, setForm] = useState({ goal: '', baseValue: '', planillaValue: '', signaturesPerPlanilla: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setForm({
      goal: settings.goal ? String(settings.goal) : '',
      baseValue: String(settings.baseValue),
      planillaValue: String(settings.planillaValue),
      signaturesPerPlanilla: String(settings.signaturesPerPlanilla),
    });
  }, [open, settings]);

  const save = async () => {
    const goal = form.goal.trim() === '' ? null : Number(form.goal);
    const baseValue = Number(form.baseValue);
    const planillaValue = Number(form.planillaValue);
    const signaturesPerPlanilla = Number(form.signaturesPerPlanilla);

    if (goal !== null && (!Number.isInteger(goal) || goal < 1)) {
      return toast.error('La meta debe ser un número entero mayor que cero, o quedar vacía.');
    }
    if (form.baseValue.trim() === '' || !Number.isFinite(baseValue) || baseValue < 0) {
      return toast.error('Escribe el valor de la jornada de 8 horas.');
    }
    if (form.planillaValue.trim() === '' || !Number.isFinite(planillaValue) || planillaValue < 0) {
      return toast.error('Escribe el valor por planilla.');
    }
    if (!Number.isInteger(signaturesPerPlanilla) || signaturesPerPlanilla < 1) {
      return toast.error('Las firmas por planilla deben ser un número entero mayor que cero.');
    }

    setSaving(true);
    try {
      const { data } = await api.put<SignatureSettings>('/signatures/settings', {
        goal,
        baseValue,
        planillaValue,
        signaturesPerPlanilla,
      });
      onSaved(data);
      toast.success('Meta y tarifas guardadas');
      onOpenChange(false);
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudieron guardar la meta y las tarifas.');
    } finally {
      setSaving(false);
    }
  };

  const field = (key: keyof typeof form) => ({
    value: form[key],
    onChange: (event: React.ChangeEvent<HTMLInputElement>) => setForm({ ...form, [key]: event.target.value }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Meta y tarifas</DialogTitle>
          <DialogDescription>
            Aplican a los registros nuevos. Lo que ya está anotado conserva los valores con los que se registró.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="signature-goal">Meta de firmas</Label>
            <Input id="signature-goal" type="number" min={1} step={1} placeholder="Sin meta" {...field('goal')} />
            <p className="text-xs text-slate-500">Déjala vacía si la campaña no tiene una meta.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="signature-base">Pago por jornada de 8 horas</Label>
            <Input id="signature-base" type="number" min={0} step={1000} {...field('baseValue')} />
            <p className="text-xs text-slate-500">Si la jornada es más corta se paga la parte proporcional.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="signature-planilla">Pago por planilla</Label>
              <Input id="signature-planilla" type="number" min={0} step={500} {...field('planillaValue')} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="signature-per-planilla">Firmas por planilla</Label>
              <Input id="signature-per-planilla" type="number" min={1} step={1} {...field('signaturesPerPlanilla')} />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
