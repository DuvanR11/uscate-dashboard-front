import { apiGet, apiPatch, apiPost } from '@/lib/api';

/**
 * Bandeja «Hoy» de Monitoreo de medios (`/monitoring/inbox`, Fase 1 del plan
 * del 2026-11-08). Una noticia por nota, con todas sus etiquetas, y lo que el
 * equipo hizo con ella.
 */

export type InboxPeriod = 'today' | '7d' | '30d';
export type InboxView = 'open' | 'starred' | 'mine' | 'dismissed' | 'all';
export type InboxSentiment = 'NEGATIVO' | 'NEUTRAL' | 'POSITIVO' | 'NONE';

export interface NewsReview {
  seen: boolean;
  dismissed: boolean;
  starred: boolean;
  assignedTo: { id: string; fullName: string } | null;
  note: string | null;
}

export interface InboxNews {
  newsKey: string;
  title: string;
  summary: string | null;
  url: string | null;
  outlet: string;
  publishedAt: string | null;
  fetchedAt: string;
  sentiment: 'NEGATIVO' | 'NEUTRAL' | 'POSITIVO' | null;
  urgencyScore: number | null;
  urgencyReason: string | null;
  entities: string[];
  locationNameRaw: string | null;
  keywords: { id: string; name: string }[];
  importance: number;
  review: NewsReview;
}

export interface InboxResponse {
  data: InboxNews[];
  total: number;
  page: number;
  pageCount: number;
  counts: Record<'open' | 'unseen' | 'starred' | 'mine' | 'dismissed' | 'all', number>;
  facets: {
    keywords: { id: string; name: string; count: number }[];
    outlets: { name: string; count: number }[];
    sentiments: Record<InboxSentiment, number>;
  };
  period: { key: InboxPeriod; since: string };
  hasKeywords: boolean;
  truncated: boolean;
}

export interface InboxQuery {
  period: InboxPeriod;
  view: InboxView;
  keywordId?: string;
  sentiment?: InboxSentiment;
  outlet?: string;
  page?: number;
  limit?: number;
}

export interface ExclusionSuggestion {
  keywordId: string;
  keywordName: string;
  term: string;
  count: number;
}

export type ReviewChange = Partial<{
  seen: boolean;
  dismissed: boolean;
  starred: boolean;
  assignedToId: string | null;
  note: string | null;
}>;

export const newsInboxApi = {
  list: (query: InboxQuery) => apiGet<InboxResponse>('/monitoring/inbox', { params: query }),
  assignees: () => apiGet<{ id: string; fullName: string }[]>('/monitoring/inbox/assignees'),
  review: (newsKey: string, change: ReviewChange) =>
    apiPatch<{ review: NewsReview; suggestion: ExclusionSuggestion | null }>(
      `/monitoring/inbox/${newsKey}/review`,
      change,
    ),
  markSeen: (newsKeys: string[]) => apiPost<{ updated: number }>('/monitoring/inbox/seen', { newsKeys }),
};
