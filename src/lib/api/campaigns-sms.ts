// src/lib/api/campaigns-sms.ts
//
// Auditoría de SMS en Difusiones, Fase 4 (2026-09-04): cliente tipado para
// el sub-módulo SMS de Difusiones — mismo patrón que `campaigns-email.ts`
// (y el resto de `lib/api/*.ts` de este proyecto): funciones tipadas +
// `extractErrorMessage()` propio (duplicado a propósito, es el patrón ya
// establecido en cada archivo de este directorio).
import api from '@/lib/api';

export interface SmsBroadcastPreview {
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

export async function previewSmsBroadcast(
  csvFile: File,
): Promise<SmsBroadcastPreview> {
  const formData = new FormData();
  formData.append('csvFile', csvFile);
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
