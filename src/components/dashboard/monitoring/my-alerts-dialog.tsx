'use client';

import { useEffect, useState } from 'react';
import { isAxiosError } from 'axios';
import { BellRing, Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { monitoringPreferencesApi, type MonitoringPreferences } from '@/lib/api/monitoring-preferences';

const BY_KEYWORD = 'keyword';

const THRESHOLDS: { value: string; label: string }[] = [
  { value: BY_KEYWORD, label: 'Según la prioridad de la etiqueta (recomendado)' },
  { value: '6', label: 'Desde nivel 6' },
  { value: '8', label: 'Desde nivel 8' },
  { value: '9', label: 'Nivel 9 o más' },
  { value: '10', label: 'Solo nivel 10' },
];

/**
 * «Mis avisos» (Fase 2 de Monitoreo de medios): qué correos le llegan a esta
 * persona. Lo ve todo el que lee Monitoreo; cada cambio se guarda solo.
 */
export function MyAlertsDialog({ press }: { press: boolean }) {
  const [open, setOpen] = useState(false);
  const [prefs, setPrefs] = useState<MonitoringPreferences | null>(null);
  const [failed, setFailed] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);
  const level = press ? 'relevancia' : 'urgencia';

  useEffect(() => {
    if (!open) return;
    setFailed(false);
    monitoringPreferencesApi
      .mine()
      .then(setPrefs)
      .catch(() => setFailed(true));
  }, [open]);

  const save = async (change: Partial<MonitoringPreferences>) => {
    if (!prefs) return;
    const previous = prefs;
    setPrefs({ ...prefs, ...change });
    setSaving(true);
    try {
      setPrefs(await monitoringPreferencesApi.update(change));
    } catch {
      setPrefs(previous);
      toast.error('No se pudo guardar. Intenta de nuevo.');
    } finally {
      setSaving(false);
    }
  };

  const sendNow = async () => {
    setSending(true);
    try {
      const { sent, news } = await monitoringPreferencesApi.sendDigestNow();
      if (sent) {
        toast.success(
          news === 0
            ? 'Te enviamos el resumen: en las últimas 24 horas no salió nada nuevo.'
            : `Te enviamos el resumen con ${news === 1 ? '1 noticia' : `${news} noticias`}. Revisa tu correo.`,
        );
      } else {
        toast.error('No se pudo enviar el resumen. Revisa que tu cuenta tenga correo.');
      }
    } catch (error) {
      toast.error(
        isAxiosError(error) && error.response?.status === 429
          ? 'Ya pediste el resumen varias veces en esta hora. Intenta más tarde.'
          : 'No se pudo enviar el resumen. Intenta de nuevo.',
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <BellRing className="mr-1 h-4 w-4" /> Mis avisos
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Mis avisos</DialogTitle>
            <DialogDescription>
              Qué te llega al correo. Solo cambia lo tuyo: el resto del equipo elige lo suyo.
            </DialogDescription>
          </DialogHeader>

          {failed && <p className="text-sm text-red-700">No se pudieron cargar tus avisos. Cierra y vuelve a abrir.</p>}
          {!prefs && !failed && (
            <div className="flex justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
            </div>
          )}

          {prefs && (
            <div className="min-w-0 space-y-5">
              <Option
                id="pref-daily-digest"
                title="Resumen diario, a las 7:00"
                description="Un párrafo con lo importante, las 5 noticias principales y qué cambió frente a ayer. Si no salió nada, también te lo dice."
                checked={prefs.dailyDigest}
                disabled={saving}
                onChange={(dailyDigest) => void save({ dailyDigest })}
              />

              <div className="space-y-2">
                <Option
                  id="pref-urgent-alerts"
                  title={press ? 'Alertas de noticias relevantes' : 'Alertas de noticias urgentes'}
                  description={`Un correo apenas llega una noticia con ${level} alta, a cualquier hora.`}
                  checked={prefs.urgentAlerts}
                  disabled={saving}
                  onChange={(urgentAlerts) => void save({ urgentAlerts })}
                />
                {prefs.urgentAlerts && (
                  <div className="ml-0 min-w-0 space-y-1 sm:ml-12">
                    <Label htmlFor="pref-alert-threshold" className="text-xs text-slate-600">
                      ¿Desde qué nivel de {level}?
                    </Label>
                    <Select
                      value={prefs.alertMinUrgency === null ? BY_KEYWORD : String(prefs.alertMinUrgency)}
                      disabled={saving}
                      onValueChange={(value) =>
                        void save({ alertMinUrgency: value === BY_KEYWORD ? null : Number(value) })
                      }
                    >
                      <SelectTrigger id="pref-alert-threshold" className="h-9 w-full min-w-0 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {THRESHOLDS.map((t) => (
                          <SelectItem key={t.value} value={t.value}>
                            {t.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-slate-500">
                      {prefs.alertMinUrgency === null
                        ? 'Etiquetas de prioridad Alta avisan desde 6, Media desde 8 y Baja solo con 9 o más.'
                        : 'Vale para todas tus etiquetas, sin importar su prioridad.'}
                    </p>
                  </div>
                )}
              </div>

              <Option
                id="pref-spike-alerts"
                title="Avisos de pico"
                description="Un correo cuando una etiqueta tiene muchas más noticias que de costumbre (el triple de su promedio y al menos 5), con una explicación de qué está pasando. Máximo uno por etiqueta al día."
                checked={prefs.spikeAlerts}
                disabled={saving}
                onChange={(spikeAlerts) => void save({ spikeAlerts })}
              />

              <div className="flex flex-col gap-2 border-t border-slate-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-slate-500">¿Quieres ver cómo se ve el resumen? Te llega solo a ti.</p>
                <Button variant="outline" size="sm" onClick={sendNow} disabled={sending}>
                  {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
                  Enviarme el resumen ahora
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

function Option({
  id,
  title,
  description,
  checked,
  disabled,
  onChange,
}: {
  id: string;
  title: string;
  description: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="flex items-start gap-3">
      <Switch id={id} checked={checked} disabled={disabled} onCheckedChange={onChange} className="mt-0.5" />
      <div className="min-w-0">
        <Label htmlFor={id} className="text-sm font-semibold text-slate-800">
          {title}
        </Label>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  );
}
