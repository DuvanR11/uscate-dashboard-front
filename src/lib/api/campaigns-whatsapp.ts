// src/lib/api/campaigns-whatsapp.ts
//
// Auditoría de WhatsApp en Difusiones, Fase 5 (2026-09-05): cliente tipado
// para AMBOS canales de WhatsApp (bot Baileys + Meta oficial) — mismo
// patrón que `campaigns-email.ts`/`campaigns-sms.ts`. A diferencia de esos
// dos, el bot vive bajo el prefijo `/api` (módulo `WhatsappController`,
// histórico) mientras Meta vive bajo `/campaigns/meta` (junto a
// `CampaignsController`) — este archivo esconde esa diferencia detrás de un
// solo parámetro `channel`, para que la pantalla de reportes no tenga que
// conocer las 2 rutas distintas.
import api from '@/lib/api';

export type WhatsappSubChannel = 'bot' | 'meta';

function reportBasePath(channel: WhatsappSubChannel, campaignId: string): string {
  return channel === 'bot'
    ? `/api/report/${campaignId}`
    : `/campaigns/meta/report/${campaignId}`;
}

export function whatsappListPath(channel: WhatsappSubChannel): string {
  return channel === 'bot' ? '/api/history' : '/campaigns/meta/list';
}

export async function getWhatsappCampaignStats(
  channel: WhatsappSubChannel,
  campaignId: string,
  page: number,
  pageSize: number,
) {
  const { data } = await api.get(reportBasePath(channel, campaignId), {
    params: { page, pageSize },
  });
  return data;
}

export async function exportWhatsappCampaignReport(
  channel: WhatsappSubChannel,
  campaignId: string,
) {
  const res = await api.get(`${reportBasePath(channel, campaignId)}/export`, {
    responseType: 'blob',
  });
  return res.data as Blob;
}

export async function retryFailedWhatsapp(
  channel: WhatsappSubChannel,
  campaignId: string,
) {
  const { data } = await api.post(
    `${reportBasePath(channel, campaignId)}/retry-failed`,
  );
  return data;
}

export async function cancelScheduledWhatsappCampaign(
  channel: WhatsappSubChannel,
  campaignId: string,
) {
  const { data } = await api.post(
    `${reportBasePath(channel, campaignId)}/cancel-schedule`,
  );
  return data;
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
