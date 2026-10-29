// src/lib/api/campaigns-sms.ts
//
// Auditoría de SMS en Difusiones, Fase 4 (2026-09-04): cliente tipado para
// el sub-módulo SMS de Difusiones — mismo patrón que `campaigns-email.ts`
// (y el resto de `lib/api/*.ts` de este proyecto): funciones tipadas +
// `extractErrorMessage()` (desde la Fase 5 del análisis de punta a punta,
// 2026-10-28, uno solo en `lib/api-error.ts`).
import api from '@/lib/api';

export interface SmsBroadcastPreview {
  totalRows: number;
  totalUnique: number;
  /** Créditos que descuenta el envío: una parte de SMS por cada 160/153 caracteres (Fase 2a, C4). */
  totalParts?: number;
  duplicatesOrEmpty: number;
  /** Con lo que empieza cada SMS: «Nombre: » (Fase 3, control 3.6). */
  senderPrefix?: string;
  quota: {
    used: number;
    limit: number;
    remaining: number;
    remainingAfterSend: number;
    enough: boolean;
  };
}

// Fase 3 del plan de finanzas (2026-10-29, controles 3.5 y 3.6): con qué
// empieza cada SMS de la organización y en qué horario salen.
export interface SmsSettings {
  senderPrefix: string;
  sendWindow: string;
}

export async function getSmsSettings(): Promise<SmsSettings> {
  const { data } = await api.get<SmsSettings>('/campaigns/sms/settings');
  return data;
}

export async function previewSmsBroadcast(
  csvFile: File,
  message?: string,
): Promise<SmsBroadcastPreview> {
  const formData = new FormData();
  formData.append('csvFile', csvFile);
  if (message) formData.append('message', message);
  const { data } = await api.post('/campaigns/sms/preview', formData);
  return data;
}

export interface SendSmsBroadcastParams {
  csvFile: File;
  message: string;
  fileName?: string;
  flash?: boolean;
  priority?: boolean;
  sendAt?: string; // ISO 8601 — si se manda, el envío se programa en vez de disparar ya.
}

export async function sendSmsBroadcast(params: SendSmsBroadcastParams) {
  const formData = new FormData();
  formData.append('csvFile', params.csvFile);
  formData.append('message', params.message);
  if (params.fileName) formData.append('fileName', params.fileName);
  formData.append('flash', String(params.flash ?? false));
  formData.append('priority', String(params.priority ?? false));
  if (params.sendAt) formData.append('sendAt', params.sendAt);
  const { data } = await api.post('/campaigns/sms/broadcast', formData);
  return data;
}

export async function cancelScheduledSmsCampaign(campaignId: string) {
  const { data } = await api.post(
    `/campaigns/sms/report/${campaignId}/cancel-schedule`,
  );
  return data;
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
