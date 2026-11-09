import { apiGet, apiPost } from '@/lib/api';
import type { KeywordKind, KeywordPriority } from '@/lib/api/monitoring';

/**
 * Asistente de Monitoreo de medios (`/monitoring/setup`, Fase 4 del plan del
 * 2026-11-08). El servidor propone las etiquetas (con IA o, sin ella, la
 * frase tal cual), arma la búsqueda de Google News, cuenta cuántas noticias
 * habrían llegado en 7 días y crea todo de una vez con los topes del plan.
 */

export type SetupRole = 'CANDIDATE' | 'COUNCIL' | 'CONGRESS' | 'PRESS';

export const SETUP_ROLES: SetupRole[] = ['CANDIDATE', 'COUNCIL', 'CONGRESS', 'PRESS'];

export const SETUP_ROLE_LABEL: Record<SetupRole, string> = {
  CANDIDATE: 'Candidato',
  COUNCIL: 'Concejal o diputado',
  CONGRESS: 'Congresista',
  PRESS: 'Periodista',
};

export interface SetupContext {
  role: SetupRole;
  speaker: string | null;
  office: string | null;
  territory: string | null;
}

export interface SetupProposal {
  name: string;
  kind: KeywordKind;
  includes: string[];
  excludes: string[];
  query: string;
  /** Por qué la propuso la IA (solo para mostrar; no se envía al crear). */
  reason?: string | null;
}

export interface PreviewItem {
  title: string;
  outlet: string | null;
  url: string;
  publishedAt: string | null;
}

export interface SetupPreview {
  query: string;
  /** Noticias de Google News de los últimos 7 días para esa búsqueda. */
  found: number;
  /** Las que pasan el filtro de la etiqueta (las que llegarían a Hoy). */
  matched: number;
  /** Las que habrían pasado pero descarta un término de «Excluir». */
  excluded: number;
  sample: PreviewItem[];
}

export interface AppliedSetup {
  keywords: { id: string; name: string; kind: KeywordKind }[];
  sources: { id: string; name: string }[];
}

/** Solo los campos que acepta el servidor (rechaza los demás con 400). */
function body(p: SetupProposal & { priority?: KeywordPriority }) {
  return {
    name: p.name,
    kind: p.kind,
    includes: p.includes,
    excludes: p.excludes,
    query: p.query,
    ...(p.priority ? { priority: p.priority } : {}),
  };
}

export const monitoringSetupApi = {
  context: () => apiGet<SetupContext>('/monitoring/setup/context'),
  suggest: (data: { role: SetupRole; text: string; kind: KeywordKind }) =>
    apiPost<{ proposals: SetupProposal[]; ai: boolean }>('/monitoring/setup/suggest', data),
  preview: (proposal: SetupProposal) =>
    apiPost<SetupPreview>('/monitoring/setup/preview', body(proposal)),
  apply: (proposals: SetupProposal[]) =>
    apiPost<AppliedSetup>('/monitoring/setup/apply', { proposals: proposals.map(body) }),
};
