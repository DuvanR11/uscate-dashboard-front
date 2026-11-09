import { apiDelete, apiGet, apiPost, apiPut } from '@/lib/api';
import type { KeywordPriority } from '@/lib/api/monitoring';
import type { SetupPreview } from '@/lib/api/monitoring-setup';
import type { InboxNews } from '@/lib/api/news-inbox';

/**
 * Monitoreo de medios, Fase 5 (2026-11-09): seguir en medios un proyecto del
 * Radar Legislativo (`/monitoring/projects`). La búsqueda de Google News es
 * común para todas las organizaciones que lo siguen (la arma la IA la primera
 * vez); cada organización ajusta los términos de su etiqueta. Los proyectos
 * seguidos no gastan etiquetas del plan: tienen su propio tope.
 */

/** Una noticia del proyecto (como en Hoy, sin la revisión del equipo). */
export type ProjectNews = Omit<InboxNews, 'review' | 'importance'>;

export interface ProjectTerms {
  name: string;
  includes: string[];
  excludes: string[];
}

export interface ProjectMediaOverview {
  project: { id: string; uid: string };
  following: (ProjectTerms & {
    keywordId: string;
    priority: KeywordPriority;
    isActive: boolean;
  }) | null;
  query: { pressName: string; query: string; ai: boolean } | null;
  /** `max: null` = sin tope. */
  limit: { used: number; max: number | null };
  summary: {
    days: number;
    total: number;
    week: number;
    tone: { POSITIVO: number; NEUTRAL: number; NEGATIVO: number; SIN_TONO: number };
  };
  news: ProjectNews[];
}

export interface ProjectProposal {
  proposal: ProjectTerms & { query: string };
  ai: boolean;
  /** null si Google News no respondió. */
  preview: SetupPreview | null;
}

export interface FollowedProject {
  projectId: string;
  keywordId: string;
  name: string;
  isActive: boolean;
  /** Noticias de los últimos 7 días. */
  week: number;
}

/** Solo los campos que acepta el servidor (rechaza los demás con 400). */
const terms = (t: ProjectTerms) => ({ name: t.name, includes: t.includes, excludes: t.excludes });

export const projectMediaApi = {
  overview: (projectId: string) =>
    apiGet<ProjectMediaOverview>(`/monitoring/projects/${projectId}/media`),
  propose: (projectId: string) =>
    apiPost<ProjectProposal>(`/monitoring/projects/${projectId}/media/propose`, {}),
  preview: (projectId: string, data: ProjectTerms) =>
    apiPost<SetupPreview>(`/monitoring/projects/${projectId}/media/preview`, terms(data)),
  follow: (projectId: string, data: ProjectTerms & { priority: KeywordPriority }) =>
    apiPut<{ keywordId: string; sourceId: string }>(`/monitoring/projects/${projectId}/media`, {
      ...terms(data),
      priority: data.priority,
    }),
  unfollow: (projectId: string) =>
    apiDelete<{ stopped: boolean }>(`/monitoring/projects/${projectId}/media`),
  followed: () => apiGet<FollowedProject[]>('/monitoring/projects/followed'),
};
