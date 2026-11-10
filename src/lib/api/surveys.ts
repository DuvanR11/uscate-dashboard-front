'use client';

import { useEffect, useState } from 'react';
import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { CampaignAudience } from '@/lib/api/campaign-audience';

// Plan hacia la versión estable, Fase 4 (2026-11-10): encuestas (en visita,
// por llamada, desde la ficha o por enlace) y listas de llamadas
// (`modules/surveys`). Mientras el servidor las tenga apagadas
// (`SURVEYS_ENABLED`), `config` dice `enabled: false`, el módulo no aparece en
// los permisos de nadie y el panel no muestra nada de esto.

export type QuestionType = 'SINGLE' | 'MULTIPLE' | 'SCALE' | 'TEXT';
export type SurveyStatus = 'DRAFT' | 'ACTIVE' | 'CLOSED';
export type SurveyChannel = 'VISIT' | 'CALL' | 'PUBLIC' | 'STAFF';
export type CallOutcome =
  | 'NO_ANSWER'
  | 'WRONG_NUMBER'
  | 'ANSWERED'
  | 'SUPPORTS'
  | 'UNDECIDED'
  | 'OPPOSES'
  | 'DO_NOT_CALL';

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: 'Una opción',
  MULTIPLE: 'Varias opciones',
  SCALE: 'Escala',
  TEXT: 'Texto libre',
};

export const SURVEY_STATUS_LABEL: Record<SurveyStatus, string> = {
  DRAFT: 'Borrador',
  ACTIVE: 'Activa',
  CLOSED: 'Cerrada',
};

export const SURVEY_STATUS_TONE: Record<SurveyStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-700',
  ACTIVE: 'bg-green-100 text-green-800',
  CLOSED: 'bg-zinc-200 text-zinc-700',
};

export const SURVEY_CHANNEL_LABEL: Record<SurveyChannel, string> = {
  VISIT: 'En visita',
  CALL: 'Por llamada',
  PUBLIC: 'Por enlace',
  STAFF: 'Desde la ficha',
};

export const CALL_OUTCOME_ORDER: CallOutcome[] = [
  'NO_ANSWER',
  'WRONG_NUMBER',
  'ANSWERED',
  'SUPPORTS',
  'UNDECIDED',
  'OPPOSES',
  'DO_NOT_CALL',
];

export const CALL_OUTCOME_LABEL: Record<CallOutcome, string> = {
  NO_ANSWER: 'No contestó',
  WRONG_NUMBER: 'Número errado',
  ANSWERED: 'Contestó',
  SUPPORTS: 'Apoya',
  UNDECIDED: 'Indeciso',
  OPPOSES: 'No apoya',
  DO_NOT_CALL: 'Pidió no llamar',
};

/** Clases de la etiqueta de cada resultado (texto en tinta, nunca solo color). */
export const CALL_OUTCOME_TONE: Record<CallOutcome, string> = {
  NO_ANSWER: 'bg-slate-100 text-slate-700',
  WRONG_NUMBER: 'bg-slate-200 text-slate-800',
  ANSWERED: 'bg-sky-100 text-sky-800',
  SUPPORTS: 'bg-green-100 text-green-800',
  UNDECIDED: 'bg-amber-100 text-amber-800',
  OPPOSES: 'bg-red-100 text-red-800',
  DO_NOT_CALL: 'bg-zinc-800 text-white',
};

/** Con estos resultados la persona contestó: se puede aplicar la encuesta. */
export const ANSWERED_OUTCOMES: CallOutcome[] = ['ANSWERED', 'SUPPORTS', 'UNDECIDED', 'OPPOSES'];

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  prompt: string;
  required: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string | null;
  maxLabel?: string | null;
}

export interface QuestionDraft {
  id?: string;
  type: QuestionType;
  prompt: string;
  required?: boolean;
  options?: string[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string;
  maxLabel?: string;
}

export interface AnswerInput {
  questionId: string;
  optionIndex?: number;
  optionIndexes?: number[];
  value?: number;
  text?: string;
}

export interface SurveySummary {
  id: string;
  title: string;
  description: string | null;
  status: SurveyStatus;
  onVisit: boolean;
  onCall: boolean;
  onPublic: boolean;
  publicToken: string | null;
  /** `/<enlace>/encuesta/<token>`, solo con enlace activo. */
  publicPath: string | null;
  questionCount: number;
  responses: number;
  createdAt: string;
  updatedAt: string;
  closedAt: string | null;
}

export interface SurveyDetail extends SurveySummary {
  questions: SurveyQuestion[];
  /** Con respuestas: las preguntas ya no cambian. */
  locked: boolean;
}

export interface SaveSurvey {
  title: string;
  description?: string;
  onVisit: boolean;
  onCall: boolean;
  onPublic: boolean;
  questions: QuestionDraft[];
}

export interface AvailableSurvey {
  id: string;
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
}

export interface QuestionResult {
  id: string;
  type: QuestionType;
  prompt: string;
  answered: number;
  options?: { label: string; count: number }[];
  scaleMin?: number;
  scaleMax?: number;
  minLabel?: string | null;
  maxLabel?: string | null;
  average?: number | null;
  distribution?: { value: number; count: number }[];
  texts?: string[];
}

export interface SurveyResults {
  id: string;
  title: string;
  scope: 'ORGANIZATION' | 'TEAM';
  total: number;
  channels: Record<SurveyChannel, number>;
  questions: QuestionResult[];
}

export interface ProspectSurveyResponse {
  id: string;
  survey: { id: string; title: string };
  channel: SurveyChannel;
  channelLabel: string;
  recordedBy: { id: string; fullName: string } | null;
  createdAt: string;
  canDelete: boolean;
  answers: { questionId: string; prompt: string; value: string }[];
}

export interface ProspectCall {
  id: string;
  outcome: CallOutcome;
  outcomeLabel: string;
  note: string | null;
  calledAt: string;
  caller: { id: string; fullName: string } | null;
  list: { id: string; name: string };
}

export interface CallListSummary {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  survey: { id: string; title: string } | null;
  createdBy: { id: string; fullName: string } | null;
  createdAt: string;
  total: number;
  done: number;
}

export interface CallListDetail {
  id: string;
  name: string;
  status: 'ACTIVE' | 'CLOSED';
  total: number;
  survey: { id: string; title: string } | null;
  createdAt: string;
  closedAt: string | null;
  assignees: { id: string; fullName: string; pending: number; done: number }[];
  outcomes: { outcome: CallOutcome; label: string; count: number }[];
}

export interface CallListOptions {
  zones: { id: number; name: string }[];
  leaders: { id: string; fullName: string }[];
  tags: { id: number; name: string }[];
  segments: { id: number; name: string }[];
  callers: { id: string; fullName: string; role: string }[];
}

export interface CallEntry {
  id: string;
  attempts: number;
  lastOutcome: CallOutcome | null;
  lastCalledAt: string | null;
  list: { id: string; name: string };
  prospect: { id: string; fullName: string; phone: string | null; locality: string | null };
  survey: AvailableSurvey | null;
}

export interface MyCalls {
  pending: number;
  callsLast24h: number;
  entries: CallEntry[];
}

export interface PublicSurvey {
  title: string;
  description: string | null;
  questions: SurveyQuestion[];
}

export const surveysApi = {
  config: () => apiGet<{ enabled: boolean }>('/surveys/config'),
  list: () => apiGet<SurveySummary[]>('/surveys'),
  get: (id: string) => apiGet<SurveyDetail>(`/surveys/${id}`),
  create: (input: SaveSurvey) => apiPost<SurveyDetail>('/surveys', input),
  update: (id: string, input: SaveSurvey) => apiPut<SurveyDetail>(`/surveys/${id}`, input),
  setStatus: (id: string, status: SurveyStatus) => apiPatch<SurveyDetail>(`/surveys/${id}/status`, { status }),
  rotateLink: (id: string) => apiPost<SurveyDetail>(`/surveys/${id}/rotate-link`),
  duplicate: (id: string) => apiPost<SurveyDetail>(`/surveys/${id}/duplicate`),
  remove: (id: string) => apiDelete<{ id: string; deleted: boolean }>(`/surveys/${id}`),
  results: (id: string) => apiGet<SurveyResults>(`/surveys/${id}/results`),
  available: (channel: 'VISIT' | 'CALL' | 'STAFF') =>
    apiGet<AvailableSurvey[]>('/surveys/available', { params: { channel } }),
  record: (surveyId: string, input: { prospectId: string; fieldVisitId?: string; answers: AnswerInput[] }) =>
    apiPost<{ id: string; channel: SurveyChannel }>(`/surveys/${surveyId}/responses`, input),
  forProspect: (prospectId: string) =>
    apiGet<{ responses: ProspectSurveyResponse[]; calls: ProspectCall[] }>(`/surveys/prospect/${prospectId}`),
  removeResponse: (id: string) => apiDelete<{ id: string; deleted: boolean }>(`/surveys/responses/${id}`),
};

export const callListsApi = {
  options: () => apiGet<CallListOptions>('/call-lists/options'),
  preview: (audience: CampaignAudience) =>
    apiPost<{ eligible: number; truncated: boolean; max: number }>('/call-lists/preview', audience),
  list: () => apiGet<CallListSummary[]>('/call-lists'),
  detail: (id: string) => apiGet<CallListDetail>(`/call-lists/${id}`),
  create: (input: { name: string; audience: CampaignAudience; surveyId?: string; assigneeIds: string[] }) =>
    apiPost<CallListDetail>('/call-lists', input),
  close: (id: string) => apiPost<CallListDetail>(`/call-lists/${id}/close`),
  reassign: (id: string, fromUserId: string, toUserId: string) =>
    apiPost<{ moved: number }>(`/call-lists/${id}/reassign`, { fromUserId, toUserId }),
  mine: () => apiGet<MyCalls>('/call-lists/mine'),
  record: (entryId: string, input: { outcome: CallOutcome; note?: string; answers?: AnswerInput[] }) =>
    apiPost<{ id: string; outcome: CallOutcome; entryStatus: 'PENDING' | 'DONE'; attempts: number }>(
      `/call-lists/entries/${entryId}/calls`,
      input,
    ),
};

export const publicSurveysApi = {
  get: (orgSlug: string, token: string) =>
    apiGet<PublicSurvey>(
      `/public/organizations/${encodeURIComponent(orgSlug)}/surveys/${encodeURIComponent(token)}`,
    ),
  respond: (
    orgSlug: string,
    token: string,
    input: {
      answers: AnswerInput[];
      documentNumber?: string;
      firstName?: string;
      lastName?: string;
      phone?: string;
      dataTreatment?: boolean;
      website?: string;
    },
  ) =>
    apiPost<{ ok: boolean }>(
      `/public/organizations/${encodeURIComponent(orgSlug)}/surveys/${encodeURIComponent(token)}/responses`,
      input,
    ),
};

// Una sola consulta de la configuración por carga de la página.
let configPromise: Promise<boolean> | null = null;

/** `true` solo cuando el servidor tiene las encuestas encendidas; `null` mientras pregunta. */
export function useSurveysEnabled(): boolean | null {
  const [enabled, setEnabled] = useState<boolean | null>(null);
  useEffect(() => {
    let cancelled = false;
    configPromise ??= surveysApi
      .config()
      .then((config) => config.enabled === true)
      .catch(() => {
        configPromise = null;
        return false;
      });
    configPromise.then((value) => {
      if (!cancelled) setEnabled(value);
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return enabled;
}

/** Dirección completa del enlace público de una encuesta. */
export function publicSurveyUrl(publicPath: string): string {
  const origin = typeof window === 'undefined' ? '' : window.location.origin;
  return `${origin}${publicPath}`;
}

/** Un celular colombiano para `wa.me` (57 + 10 dígitos), o null. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  const digits = (phone ?? '').replace(/\D/g, '');
  if (digits.length === 10) return `57${digits}`;
  if (digits.length === 12 && digits.startsWith('57')) return digits;
  return null;
}

/** Faltan respuestas obligatorias (para habilitar el botón de guardar). */
export function missingRequired(questions: SurveyQuestion[], answers: Record<string, AnswerInput>): boolean {
  return questions.some((q) => {
    if (!q.required) return false;
    const a = answers[q.id];
    if (!a) return true;
    if (q.type === 'SINGLE') return a.optionIndex === undefined;
    if (q.type === 'MULTIPLE') return !a.optionIndexes?.length;
    if (q.type === 'SCALE') return a.value === undefined;
    return !a.text?.trim();
  });
}

/** Las respuestas para enviar: sin las vacías. */
export function answersToSend(answers: Record<string, AnswerInput>): AnswerInput[] {
  return Object.values(answers).filter(
    (a) =>
      a.optionIndex !== undefined ||
      (a.optionIndexes?.length ?? 0) > 0 ||
      a.value !== undefined ||
      (a.text?.trim() ?? '') !== '',
  );
}
