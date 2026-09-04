import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

/**
 * Cliente para `GET/POST/PATCH/DELETE /catalogs/*` (módulo de Administración
 * de Catálogos, backend en `api-uscate-back/src/modules/catalogs/`).
 *
 * "Eliminar" en la UI es desactivar (`toggleStatus`, invierte `isActive`) —
 * el `remove` físico solo tiene éxito si `referenceCount(id).canDelete` es
 * `true` (0 registros asociados); llamarlo igual sin chequear antes puede
 * devolver 409 (el backend lo protege como red de seguridad).
 */

export interface SimpleCatalogItem {
  id: number;
  name: string;
  isActive: boolean;
}

export interface ReferenceCount {
  total: number;
  canDelete: boolean;
  breakdown?: Record<string, number>;
}

function withIncludeInactive(resource: string, includeInactive: boolean) {
  return `/catalogs/${resource}${includeInactive ? '?includeInactive=true' : ''}`;
}

/** Extrae el `message` que arma Nest en sus excepciones (400/409) de un error de axios. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string } } }).response;
    return response?.data?.message;
  }
  return undefined;
}

/** Channel/Occupation/Segment/Tag comparten el mismo shape `{id,name,isActive}`. */
function buildSimpleCatalogClient<T extends SimpleCatalogItem>(resource: string) {
  return {
    list: (includeInactive = false) => apiGet<T[]>(withIncludeInactive(resource, includeInactive)),
    create: (data: { name: string }) => apiPost<T>(`/catalogs/${resource}`, data),
    update: (id: number, data: { name: string }) => apiPatch<T>(`/catalogs/${resource}/${id}`, data),
    toggleStatus: (id: number) => apiPatch<T>(`/catalogs/${resource}/${id}/toggle-status`),
    referenceCount: (id: number) => apiGet<ReferenceCount>(`/catalogs/${resource}/${id}/reference-count`),
    remove: (id: number) => apiDelete<void>(`/catalogs/${resource}/${id}`),
  };
}

export const channelsApi = buildSimpleCatalogClient<SimpleCatalogItem>('channels');
export const occupationsApi = buildSimpleCatalogClient<SimpleCatalogItem>('occupations');
export const segmentsApi = buildSimpleCatalogClient<SimpleCatalogItem>('segments');
export const tagsApi = buildSimpleCatalogClient<SimpleCatalogItem>('tags');

export interface Locality extends SimpleCatalogItem {
  lat: number;
  lng: number;
}

export const localitiesApi = {
  list: (includeInactive = false) => apiGet<Locality[]>(withIncludeInactive('localities', includeInactive)),
  create: (data: { name: string; lat: number; lng: number }) => apiPost<Locality>('/catalogs/localities', data),
  update: (id: number, data: Partial<{ name: string; lat: number; lng: number }>) =>
    apiPatch<Locality>(`/catalogs/localities/${id}`, data),
  toggleStatus: (id: number) => apiPatch<Locality>(`/catalogs/localities/${id}/toggle-status`),
  referenceCount: (id: number) => apiGet<ReferenceCount>(`/catalogs/localities/${id}/reference-count`),
  remove: (id: number) => apiDelete<void>(`/catalogs/localities/${id}`),
};

export interface Department extends SimpleCatalogItem {
  code: string | null;
  lat: number | null;
  lng: number | null;
}

export const departmentsApi = {
  list: (includeInactive = false) => apiGet<Department[]>(withIncludeInactive('departments', includeInactive)),
  create: (data: { name: string; code?: string; lat?: number; lng?: number }) =>
    apiPost<Department>('/catalogs/departments', data),
  update: (id: number, data: Partial<{ name: string; code: string; lat: number; lng: number }>) =>
    apiPatch<Department>(`/catalogs/departments/${id}`, data),
  toggleStatus: (id: number) => apiPatch<Department>(`/catalogs/departments/${id}/toggle-status`),
  referenceCount: (id: number) => apiGet<ReferenceCount>(`/catalogs/departments/${id}/reference-count`),
  remove: (id: number) => apiDelete<void>(`/catalogs/departments/${id}`),
};

export interface Municipality extends SimpleCatalogItem {
  departmentId: number;
  department?: { id: number; name: string };
}

export interface PaginatedMunicipalities {
  data: Municipality[];
  total: number;
  page: number;
  pageCount: number;
}

export interface MunicipalitiesQuery {
  page?: number;
  limit?: number;
  search?: string;
  departmentId?: number;
  includeInactive?: boolean;
}

export const municipalitiesApi = {
  list: (params: MunicipalitiesQuery = {}) => {
    const query = new URLSearchParams();
    if (params.page) query.set('page', String(params.page));
    if (params.limit) query.set('limit', String(params.limit));
    if (params.search) query.set('search', params.search);
    if (params.departmentId) query.set('departmentId', String(params.departmentId));
    if (params.includeInactive) query.set('includeInactive', 'true');
    const qs = query.toString();
    return apiGet<PaginatedMunicipalities>(`/catalogs/municipalities${qs ? `?${qs}` : ''}`);
  },
  create: (data: { name: string; departmentId: number }) => apiPost<Municipality>('/catalogs/municipalities', data),
  update: (id: number, data: Partial<{ name: string; departmentId: number }>) =>
    apiPatch<Municipality>(`/catalogs/municipalities/${id}`, data),
  toggleStatus: (id: number) => apiPatch<Municipality>(`/catalogs/municipalities/${id}/toggle-status`),
  referenceCount: (id: number) => apiGet<ReferenceCount>(`/catalogs/municipalities/${id}/reference-count`),
  remove: (id: number) => apiDelete<void>(`/catalogs/municipalities/${id}`),
};
