import { apiGet, apiPost } from '@/lib/api';

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
  return apiPost<ContentGeneration>('/content-copilot/generate', input);
}

export function listContentGenerationHistory(page = 1): Promise<ContentGenerationHistory> {
  return apiGet<ContentGenerationHistory>(`/content-copilot/history?page=${page}`);
}

export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}
