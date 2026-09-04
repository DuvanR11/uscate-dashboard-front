import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

/**
 * Cliente para `/monitoring/*` (módulo "Monitoreo Predictivo" del backend,
 * `api-uscate-back/src/modules/monitoring/`) — Fases 1-9 ya implementadas y
 * verificadas ahí (ver memoria `monitoreo-predictivo-analisis`). Este
 * archivo es la Fase 10 (frontend): keywords/fuentes (admin) + analítica de
 * solo lectura (panel del analista + mapa).
 *
 * Mismo criterio de "eliminar = desactivar" que `lib/api/catalogs.ts`: el
 * DELETE físico solo tiene éxito si `referenceCount(id).canDelete` es
 * `true`.
 */

// --- Etiquetas (MonitoringKeyword) ---

export type AliasKind = 'INCLUDE' | 'EXCLUDE';
export type AliasMatchType = 'CONTAINS' | 'EXACT_PHRASE';
export type KeywordPriority = 'LOW' | 'MEDIUM' | 'HIGH';

export interface MonitoringKeywordAlias {
  id: string;
  keywordId: string;
  term: string;
  kind: AliasKind;
  matchType: AliasMatchType;
  createdAt: string;
}

export interface MonitoringKeyword {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  priority: KeywordPriority;
  category: string | null;
  createdAt: string;
  updatedAt: string;
  aliases: MonitoringKeywordAlias[];
}

export interface ReferenceCount {
  total: number;
  canDelete: boolean;
  breakdown: Record<string, number>;
}

export const keywordsApi = {
  list: (includeInactive = false) =>
    apiGet<MonitoringKeyword[]>(`/monitoring/keywords${includeInactive ? '?includeInactive=true' : ''}`),
  findOne: (id: string) => apiGet<MonitoringKeyword>(`/monitoring/keywords/${id}`),
  create: (data: { name: string; description?: string; priority?: KeywordPriority; category?: string }) =>
    apiPost<MonitoringKeyword>('/monitoring/keywords', data),
  update: (
    id: string,
    data: Partial<{ name: string; description: string; priority: KeywordPriority; category: string }>,
  ) => apiPatch<MonitoringKeyword>(`/monitoring/keywords/${id}`, data),
  toggleStatus: (id: string) => apiPatch<MonitoringKeyword>(`/monitoring/keywords/${id}/toggle-status`),
  remove: (id: string) => apiDelete<{ success: boolean }>(`/monitoring/keywords/${id}`),
  referenceCount: (id: string) => apiGet<ReferenceCount>(`/monitoring/keywords/${id}/reference-count`),
  addAlias: (id: string, data: { term: string; kind: AliasKind; matchType?: AliasMatchType }) =>
    apiPost<MonitoringKeywordAlias>(`/monitoring/keywords/${id}/aliases`, data),
  removeAlias: (id: string, aliasId: string) =>
    apiDelete<{ success: boolean }>(`/monitoring/keywords/${id}/aliases/${aliasId}`),
};

// --- Fuentes (MonitoringSource) ---

export type MonitoringSourceType = 'RSS' | 'GOOGLE_NEWS' | 'NEWS_PORTAL' | 'SOCIAL_MEDIA';
export type MonitoringSourceStatus = 'OK' | 'ERROR' | 'UNREACHABLE';
export type MonitoringRunStatus = 'RUNNING' | 'SUCCESS' | 'FAILED' | 'PARTIAL';

export interface MonitoringSource {
  id: string;
  name: string;
  type: MonitoringSourceType;
  url: string;
  isActive: boolean;
  frequencyMinutes: number;
  lastFetchedAt: string | null;
  lastStatus: MonitoringSourceStatus | null;
  consecutiveFailures: number;
  createdAt: string;
  updatedAt: string;
}

export interface MonitoringRunError {
  id: string;
  runId: string;
  source: string; // FETCH | PARSE | SSRF_BLOCKED | AI | GEO | DB
  url: string | null;
  message: string;
  code: string | null;
  createdAt: string;
}

export interface MonitoringRun {
  id: string;
  sourceId: string;
  status: MonitoringRunStatus;
  itemsFound: number;
  itemsProcessed: number;
  itemsSkipped: number;
  errorsCount: number;
  startedAt: string;
  finishedAt: string | null;
  errors: MonitoringRunError[];
  source: { id: string; name: string; type: MonitoringSourceType };
}

export const sourcesApi = {
  list: (includeInactive = false) =>
    apiGet<MonitoringSource[]>(`/monitoring/sources${includeInactive ? '?includeInactive=true' : ''}`),
  findOne: (id: string) => apiGet<MonitoringSource>(`/monitoring/sources/${id}`),
  create: (data: { name: string; type: MonitoringSourceType; url: string; frequencyMinutes?: number }) =>
    apiPost<MonitoringSource>('/monitoring/sources', data),
  update: (
    id: string,
    data: Partial<{ name: string; type: MonitoringSourceType; url: string; frequencyMinutes: number }>,
  ) => apiPatch<MonitoringSource>(`/monitoring/sources/${id}`, data),
  toggleStatus: (id: string) => apiPatch<MonitoringSource>(`/monitoring/sources/${id}/toggle-status`),
  remove: (id: string) => apiDelete<{ success: boolean }>(`/monitoring/sources/${id}`),
  referenceCount: (id: string) => apiGet<ReferenceCount>(`/monitoring/sources/${id}/reference-count`),
  getRuns: (id: string) => apiGet<MonitoringRun[]>(`/monitoring/sources/${id}/runs`),
  triggerSync: (id: string) => apiPost<{ success: boolean; message: string }>(`/monitoring/sources/${id}/sync`),
};

// --- Analítica de solo lectura (MonitoringAnalyticsService, Fase 9) ---

export type ActivityTrend = 'UP' | 'STABLE' | 'DOWN';

export interface ActivityFactor {
  factor: string;
  message: string;
  score: number;
}

export interface KeywordActivityOverviewItem {
  keywordId: string;
  keywordName: string;
  mentionCount: number;
  sourceCount: number;
  activityScore: number;
  trend: ActivityTrend;
  windowStart: string | null;
  windowEnd: string | null;
}

export interface KeywordActivitySummary {
  keywordId: string;
  keywordName: string;
  windowHours: number;
  mentionCount: number;
  previousMentionCount: number;
  variationPct: number | null;
  sourceCount: number;
  latestSnapshot: {
    windowStart: string;
    windowEnd: string;
    activityScore: number;
    trend: ActivityTrend;
    factors: ActivityFactor[];
  } | null;
}

export interface TerritoryActivity {
  locationName: string;
  mentionCount: number;
  latitude: number | null;
  longitude: number | null;
  locationConfidence: number | null;
}

export interface MentionListItem {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  sourceId: string;
  sourceName: string;
  publishedAt: string | null;
  fetchedAt: string;
  locationNameRaw: string | null;
  latitude: number | null;
  longitude: number | null;
  sentiment: string | null;
  relevance: number | null;
}

export interface PaginatedMentions {
  data: MentionListItem[];
  total: number;
  page: number;
  pageCount: number;
}

export interface MonitoringActivitySnapshot {
  id: string;
  keywordId: string;
  windowStart: string;
  windowEnd: string;
  mentionCount: number;
  sourceCount: number;
  topMunicipalityId: number | null;
  activityScore: number;
  trend: ActivityTrend;
  factors: ActivityFactor[] | null;
  createdAt: string;
}

export const monitoringAnalyticsApi = {
  getOverview: () => apiGet<KeywordActivityOverviewItem[]>('/monitoring/analytics/overview'),
  getKeywordActivity: (keywordId: string, hours = 24) =>
    apiGet<KeywordActivitySummary>(`/monitoring/analytics/keywords/${keywordId}/activity?hours=${hours}`),
  getTopTerritories: (keywordId: string, hours = 24, limit = 10) =>
    apiGet<TerritoryActivity[]>(
      `/monitoring/analytics/keywords/${keywordId}/territories?hours=${hours}&limit=${limit}`,
    ),
  getRecentMentions: (keywordId: string, hours = 24, page = 1, limit = 20) =>
    apiGet<PaginatedMentions>(
      `/monitoring/analytics/keywords/${keywordId}/mentions?hours=${hours}&page=${page}&limit=${limit}`,
    ),
  getSnapshots: (keywordId: string, hours = 24) =>
    apiGet<MonitoringActivitySnapshot[]>(`/monitoring/analytics/keywords/${keywordId}/snapshots?hours=${hours}`),
};

/** Extrae el `message` que arma Nest en sus excepciones (400/409) de un error de axios. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}