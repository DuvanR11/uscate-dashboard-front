// src/lib/api/campaigns-email.ts
//
// Auditoría de Email en Difusiones, Fase 5 (2026-09-03): cliente tipado para
// el sub-módulo Email de Difusiones — mismo patrón que el resto de
// `lib/api/*.ts` de este proyecto (platform.ts, osint.ts, branding.ts...):
// funciones tipadas + `extractErrorMessage()` (desde la Fase 5 del análisis
// de punta a punta, 2026-10-28, uno solo en `lib/api-error.ts`).
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
  // Fase 3 (2026-10-29, control 3.4): va al registro de la difusión.
  aiAssisted?: boolean;
}

export async function sendEmailBroadcast(params: SendEmailBroadcastParams) {
  const formData = new FormData();
  formData.append('csvFile', params.csvFile);
  formData.append('subject', params.subject);
  formData.append('htmlContent', params.htmlContent);
  if (params.textContent) formData.append('textContent', params.textContent);
  if (params.sendAt) formData.append('sendAt', params.sendAt);
  if (params.aiAssisted) formData.append('aiAssisted', 'true');
  const { data } = await api.post('/campaigns/email/broadcast', formData);
  return data;
}

export async function cancelScheduledEmailCampaign(campaignId: string) {
  const { data } = await api.post(
    `/campaigns/email/report/${campaignId}/cancel-schedule`,
  );
  return data;
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
