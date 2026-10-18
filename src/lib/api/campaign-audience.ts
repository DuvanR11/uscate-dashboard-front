// Fase 1C del recorrido de alta (2026-10-17): difundir a los contactos que la
// campaña ya tiene en el sistema, sin exportar y volver a subir un archivo.
import api from '@/lib/api';

export type AudienceChannel = 'email' | 'sms';

/** Dentro de cada lista basta con uno; entre listas, todos. Vacío = todos. */
export interface CampaignAudience {
  localityIds?: number[];
  leaderIds?: string[];
  tagIds?: number[];
  segmentIds?: number[];
}

export interface AudienceOptions {
  zones: { id: number; name: string }[];
  leaders: { id: string; fullName: string }[];
  tags: { id: number; name: string }[];
  segments: { id: number; name: string }[];
}

export interface AudiencePreview {
  total: number;
  withoutConsent: number;
  withoutContact: number;
  /** En la lista de exclusión (oposición, rebotes, contactos ficticios de una demo). */
  excluded: number;
  sendable: number;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    remainingAfterSend: number;
    enough: boolean;
  };
}

export async function getAudienceOptions(): Promise<AudienceOptions> {
  const { data } = await api.get('/campaigns/audience/options');
  return data;
}

export async function previewAudience(
  channel: AudienceChannel,
  audience: CampaignAudience,
): Promise<AudiencePreview> {
  const { data } = await api.post('/campaigns/audience/preview', {
    channel,
    audience,
  });
  return data;
}

export async function sendEmailToAudience(params: {
  audience: CampaignAudience;
  campaignName: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  sendAt?: string;
}) {
  const { data } = await api.post('/campaigns/email/audience', params);
  return data;
}

export async function sendSmsToAudience(params: {
  audience: CampaignAudience;
  campaignName: string;
  message: string;
  flash?: boolean;
  priority?: boolean;
  sendAt?: string;
}) {
  const { data } = await api.post('/campaigns/sms/audience', params);
  return data;
}

/** Nombre corto de la difusión en los informes, según los filtros elegidos. */
export function describeAudience(
  audience: CampaignAudience,
  options: AudienceOptions | null,
): string {
  const names = (ids: (number | string)[] | undefined, list: { id: number | string; name?: string; fullName?: string }[] = []) =>
    (ids ?? []).map((id) => {
      const item = list.find((x) => x.id === id);
      return item?.name ?? item?.fullName ?? '';
    }).filter(Boolean);
  const parts = [
    ...names(audience.localityIds, options?.zones),
    ...names(audience.leaderIds, options?.leaders),
    ...names(audience.tagIds, options?.tags),
    ...names(audience.segmentIds, options?.segments),
  ];
  const label = parts.length ? `Contactos · ${parts.join(', ')}` : 'Contactos · todos';
  return label.length > 50 ? `${label.slice(0, 47)}...` : label;
}

export const isEmptyAudience = (a: CampaignAudience) =>
  !a.localityIds?.length && !a.leaderIds?.length && !a.tagIds?.length && !a.segmentIds?.length;
