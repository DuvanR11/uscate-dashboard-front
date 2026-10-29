'use client';

import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Archive, Loader2, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  extractErrorMessage,
  mentionRetentionApi,
  type MentionRetentionSettings,
} from '@/lib/api/monitoring';

interface Props {
  /** Solo quien puede borrar en el módulo cambia el plazo. */
  canDelete: boolean;
}

const formatCutoff = (iso: string) =>
  new Date(iso).toLocaleDateString('es-CO', {
    timeZone: 'America/Bogota',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

const count = (n: number, one: string, many: string) =>
  `${n.toLocaleString('es-CO')} ${n === 1 ? one : many}`;

/**
 * Decisiones del 2026-10-29: cuántos meses conserva la organización las
 * menciones del monitoreo. Al elegir otro plazo se ve cuántas se borrarían
 * antes de guardarlo.
 */
export function MentionRetentionSettingsCard({ canDelete }: Props) {
  const [settings, setSettings] = useState<MentionRetentionSettings | null>(null);
  const [savedMonths, setSavedMonths] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (months?: number) => {
    try {
      const data = await mentionRetentionApi.get(months);
      setSettings(data);
      if (months === undefined) setSavedMonths(data.months);
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudo cargar la conservación de menciones.');
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const save = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const data = await mentionRetentionApi.update(settings.months);
      setSettings(data);
      setSavedMonths(data.months);
      toast.success(`Las menciones se conservan ahora ${data.months} meses`);
    } catch (error) {
      toast.error(extractErrorMessage(error) ?? 'No se pudo guardar el plazo.');
    } finally {
      setSaving(false);
    }
  };

  if (!settings) {
    return (
      <div className="flex justify-center py-12 text-slate-500">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  const changed = savedMonths !== null && settings.months !== savedMonths;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Archive className="h-5 w-5" /> Conservación de menciones
        </CardTitle>
        <CardDescription>
          Las menciones capturadas hace más del plazo se borran solas. Se conservan siempre las que
          estén citadas en una evidencia de un caso de OSINT, y no se borra ninguna mientras haya un
          caso en retención legal.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5 sm:max-w-xs">
          <Label htmlFor="mention-retention-months">Conservar las menciones</Label>
          <Select
            value={String(settings.months)}
            onValueChange={(value) => load(Number(value))}
            disabled={!canDelete || saving}
          >
            <SelectTrigger id="mention-retention-months">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {settings.options.map((months) => (
                <SelectItem key={months} value={String(months)}>
                  {months} meses
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {!canDelete && (
            <p className="text-xs text-slate-500">Solo quien puede eliminar en el monitoreo cambia el plazo.</p>
          )}
        </div>

        {settings.legalHold ? (
          <p className="flex items-start gap-2 rounded-md bg-amber-50 p-3 text-sm text-amber-800">
            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
            Hay un caso en retención legal: mientras siga así no se borra ninguna mención.
          </p>
        ) : (
          <p className="text-sm text-slate-600">
            Con {settings.months} meses se borrarían{' '}
            <strong>{count(settings.expiring, 'mención', 'menciones')}</strong> capturadas antes del{' '}
            {formatCutoff(settings.cutoff)}
            {settings.protectedByCitation > 0 &&
              `; se conservan ${count(settings.protectedByCitation, 'citada', 'citadas')} en evidencias`}
            .
          </p>
        )}

        {!settings.active && (
          <p className="text-xs text-slate-500">
            La limpieza automática todavía no está encendida en Zyron: por ahora no se borra nada.
          </p>
        )}

        {canDelete && (
          <div className="flex gap-2">
            <Button onClick={save} disabled={!changed || saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Guardar
            </Button>
            {changed && (
              <Button variant="outline" onClick={() => load(savedMonths ?? undefined)} disabled={saving}>
                Cancelar
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
