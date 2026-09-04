// src/lib/api/campaigns-email.ts
//
// Auditoría de Email en Difusiones, Fase 5 (2026-09-03): cliente tipado para
// el sub-módulo Email de Difusiones — mismo patrón que el resto de
// `lib/api/*.ts` de este proyecto (platform.ts, osint.ts, branding.ts...):
// funciones tipadas + `extractErrorMessage()` propio (duplicado a
// propósito, es el patrón ya establecido en cada archivo de este directorio).
import api from '@/lib/api';

export interface EmailBroadcastPreview {
  totalRows: number;
  totalUnique: number;
  duplicatesOrEmpty: number;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    remainingAfterSend: number;
    enough: boolean;
  };
}

export async function previewEmailBroadcast(
  csvFile: File,
): Promise<EmailBroadcastPreview> {
  const formData = new FormData();
  formData.append('csvFile', csvFile);
  const { data } = await api.post('/campaigns/email/preview', formData);
  return data;
}

export interface SendEmailBroadcastParams {
  csvFile: File;
  subject: string;
  htmlContent: string;
  textContent?: string;
  sendAt?: string; // ISO 8601 — si se manda, el envío se programa en vez de disparar ya.
}

export async function sendEmailBroadcast(params: SendEmailBroadcastParams) {
  const formData = new FormData();
  formData.append('csvFile', params.csvFile);
  formData.append('subject', params.subject);
  formData.append('htmlContent', params.htmlContent);
  if (params.textContent) formData.append('textContent', params.textContent);
  if (params.sendAt) formData.append('sendAt', params.sendAt);
  const { data } = await api.post('/campaigns/email/broadcast', formData);
  return data;
}

export async function cancelScheduledEmailCampaign(campaignId: string) {
  const { data } = await api.post(
    `/campaigns/email/report/${campaignId}/cancel-schedule`,
  );
  return data;
}

export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (
      error as { response?: { data?: { message?: string | string[] } } }
    ).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}
