import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { MonitoringSourceStatus } from '@/lib/api/monitoring';
import type { SetupRole } from '@/lib/api/monitoring-setup';

/**
 * Catálogo de medios (2026-11-09): medios colombianos con su feed ya
 * verificado. Cada organización elige los suyos (`/monitoring/catalog`) en vez
 * de buscar la dirección del RSS; no cuentan para el tope de fuentes del plan.
 * El operador lo mantiene en `/platform/media-catalog`.
 */

export type MediaMedium = 'PRENSA' | 'TV' | 'RADIO' | 'DIGITAL';
export type MediaLevel = 'NACIONAL' | 'REGIONAL' | 'LOCAL';
export type CatalogSourceType = 'RSS' | 'GOOGLE_NEWS';

export const MEDIUM_LABEL: Record<MediaMedium, string> = {
  PRENSA: 'Prensa',
  TV: 'Televisión',
  RADIO: 'Radio',
  DIGITAL: 'Digital',
};

export const LEVEL_LABEL: Record<MediaLevel, string> = {
  NACIONAL: 'Nacional',
  REGIONAL: 'Regional',
  LOCAL: 'Local',
};

export interface CatalogEntry {
  id: string;
  name: string;
  section: string | null;
  medium: MediaMedium;
  level: MediaLevel;
  departmentCode: string | null;
  departmentName: string | null;
  type: CatalogSourceType;
  homeUrl: string | null;
  featured: boolean;
  lastStatus: MonitoringSourceStatus | null;
  lastCheckedAt: string | null;
  selected: boolean;
  suggested: boolean;
  sourceId: string | null;
}

export interface OrganizationCatalog {
  role: SetupRole;
  departmentCode: string | null;
  departmentName: string | null;
  hasChosen: boolean;
  entries: CatalogEntry[];
}

export interface SaveSelectionResult {
  added: number;
  removed: number;
  selected: number;
}

export const mediaCatalogApi = {
  list: (role?: SetupRole) =>
    apiGet<OrganizationCatalog>('/monitoring/catalog', { params: role ? { role } : undefined }),
  save: (entryIds: string[]) => apiPut<SaveSelectionResult>('/monitoring/catalog/selection', { entryIds }),
};

/** «El Tiempo — Política». */
export function entryLabel(entry: { name: string; section: string | null }) {
  return entry.section ? `${entry.name} — ${entry.section}` : entry.name;
}

// ─── Operador ────────────────────────────────────────────────────────────

export interface OperatorCatalogEntry {
  id: string;
  name: string;
  section: string | null;
  medium: MediaMedium;
  level: MediaLevel;
  departmentCode: string | null;
  departmentName: string | null;
  type: CatalogSourceType;
  url: string;
  homeUrl: string | null;
  isActive: boolean;
  featured: boolean;
  sortOrder: number;
  lastCheckedAt: string | null;
  lastStatus: MonitoringSourceStatus | null;
  lastItems: number | null;
  lastError: string | null;
  organizationsUsing: number;
}

export interface CatalogEntryInput {
  name: string;
  section: string | null;
  medium: MediaMedium;
  level: MediaLevel;
  departmentCode: string | null;
  type: CatalogSourceType;
  url: string;
  homeUrl: string | null;
  featured: boolean;
}

export interface CatalogCheckResult {
  status: MonitoringSourceStatus;
  items: number;
  newestHours: number | null;
  sample: string[];
  error: string | null;
}

export const operatorCatalogApi = {
  list: () => apiGet<OperatorCatalogEntry[]>('/platform/media-catalog'),
  create: (input: CatalogEntryInput) => apiPost<OperatorCatalogEntry>('/platform/media-catalog', input),
  update: (id: string, input: Partial<CatalogEntryInput> & { isActive?: boolean }) =>
    apiPatch<OperatorCatalogEntry>(`/platform/media-catalog/${id}`, input),
  remove: (id: string) => apiDelete<{ success: boolean }>(`/platform/media-catalog/${id}`),
  check: (id: string) => apiPost<CatalogCheckResult>(`/platform/media-catalog/${id}/check`),
  probe: (url: string) => apiPost<CatalogCheckResult>('/platform/media-catalog/probe', { url }),
};

/** La búsqueda de Google News con lo que publica un dominio (igual que el servidor). */
export function googleNewsSiteUrl(domain: string) {
  const clean = domain
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/\/.*$/, '')
    .replace(/^www\./, '');
  return `https://news.google.com/rss/search?q=site:${clean}&hl=es-419&gl=CO&ceid=CO:es-419`;
}

/** El dominio de una búsqueda `site:` de Google News, para editarla. */
export function siteDomainOf(url: string): string | null {
  const match = /[?&]q=site:([^&\s]+)/.exec(url);
  return match ? decodeURIComponent(match[1]) : null;
}
