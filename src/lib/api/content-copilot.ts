import { apiGet, apiPost, LONG_REQUEST_TIMEOUT_MS } from '@/lib/api';

/**
 * Cliente para `modules/content-copilot` (backend) — genera texto de
 * difusiones (SMS/Email/WhatsApp), redes sociales (Twitter-X/Facebook/
 * Instagram) y comunicados/discursos con OpenAI. Cada generación queda en
 * el historial de la organización automáticamente.
 */

export type ContentGenerationType =
  | 'SMS'
  | 'EMAIL'
  | 'WHATSAPP'
  | 'TWITTER'
  | 'FACEBOOK'
  | 'INSTAGRAM'
  | 'COMUNICADO_PRENSA'
  | 'DISCURSO';

export type ContentGenerationTone =
  | 'CERCANO'
  | 'FORMAL'
  | 'URGENTE'
  | 'INSPIRADOR'
  | 'INFORMATIVO';

export interface ContentVariant {
  subject?: string;
  body: string;
}

export interface ContentGeneration {
  id: string;
  contentType: ContentGenerationType;
  tone: ContentGenerationTone;
  topic: string;
  keyPoints: string | null;
  callToAction: string | null;
  audience: string | null;
  variants: ContentVariant[];
  createdAt: string;
  createdByUser?: { fullName: string };
}

export interface ContentGenerationHistory {
  items: ContentGeneration[];
  total: number;
  page: number;
  pageSize: number;
}

export function generateContent(input: {
  contentType: ContentGenerationType;
  tone: ContentGenerationTone;
  topic: string;
  keyPoints?: string;
  callToAction?: string;
  audience?: string;
}): Promise<ContentGeneration> {
  // Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): la generación
  // con IA pasa del plazo general de 30 s.
  return apiPost<ContentGeneration>('/content-copilot/generate', input, {
    timeout: LONG_REQUEST_TIMEOUT_MS,
  });
}

export function listContentGenerationHistory(page = 1): Promise<ContentGenerationHistory> {
  return apiGet<ContentGenerationHistory>(`/content-copilot/history?page=${page}`);
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
