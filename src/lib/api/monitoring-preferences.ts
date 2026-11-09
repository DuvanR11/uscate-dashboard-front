import { apiGet, apiPost, apiPut } from '@/lib/api';

/**
 * «Mis avisos» de Monitoreo de medios (`/monitoring/preferences`, Fase 2 del
 * plan del 2026-11-08). Cada persona elige qué correos le llegan; no cambia
 * lo que se monitorea ni lo que reciben los demás.
 */

export interface MonitoringPreferences {
  dailyDigest: boolean;
  urgentAlerts: boolean;
  /** null = según la prioridad de cada etiqueta (Alta 6, Media 8, Baja 9). */
  alertMinUrgency: number | null;
  spikeAlerts: boolean;
}

/** Los umbrales propios que acepta el servidor (`PERSONAL_THRESHOLDS`). */
export const PERSONAL_THRESHOLDS = [6, 8, 9, 10] as const;

export const monitoringPreferencesApi = {
  mine: () => apiGet<MonitoringPreferences>('/monitoring/preferences/me'),
  update: (change: Partial<MonitoringPreferences>) =>
    apiPut<MonitoringPreferences>('/monitoring/preferences/me', change),
  sendDigestNow: () => apiPost<{ sent: boolean; news: number }>('/monitoring/preferences/digest-preview'),
};
