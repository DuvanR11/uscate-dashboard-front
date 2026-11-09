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
  query: { pressName: string; query: string; ai: boolean; source: QuerySource } | null;
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

/** Quién armó la búsqueda común: la IA, las reglas (sin IA) o el equipo de Zyron a mano. */
export type QuerySource = 'AI' | 'RULES' | 'OPERATOR';

export interface ProjectProposal {
  proposal: ProjectTerms & { query: string };
  ai: boolean;
  source: QuerySource;
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

/**
 * «Proponer otra búsqueda» (piloto de Zyron Prensa, Fase B, 2026-11-09): la
 * nueva reemplaza la común solo si trae más noticias; una vez al día por
 * proyecto.
 */
export interface RequeryResult {
  replaced: boolean;
  query: string;
  /** Términos que propone la IA con la búsqueda nueva (vacío si no cambió). */
  includes: string[];
  before: { found: number; matched: number } | null;
  after: { found: number; matched: number } | null;
  /** Fuentes actualizadas, de todas las organizaciones que lo siguen. */
  sources: number;
}

/** La búsqueda común de un proyecto, para el operador (`/platform/medios`). */
export interface CommonProjectQuery {
  projectUid: string;
  projectId: string;
  title: string;
  projectNumber: string | null;
  body: string | null;
  pressName: string;
  query: string;
  source: QuerySource;
  /** Organizaciones que lo siguen ahora. */
  followers: number;
  updatedAt: string;
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
  requery: (projectId: string) =>
    apiPost<RequeryResult>(`/monitoring/projects/${projectId}/media/requery`, {}),
};

export const projectQueriesAdminApi = {
  list: () => apiGet<CommonProjectQuery[]>('/platform/project-media-queries'),
  preview: (projectId: string, query: string) =>
    apiPost<SetupPreview>(`/platform/project-media-queries/${projectId}/preview`, { query }),
  save: (projectId: string, query: string) =>
    apiPut<{ query: string; sources: number }>(`/platform/project-media-queries/${projectId}`, { query }),
};
