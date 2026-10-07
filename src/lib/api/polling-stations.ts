import api, { apiDelete, apiGet, apiPatch, apiPost } from '@/lib/api';

// Fase 3 "Territorio para cualquier municipio" (2026-10-06) — cliente de
// `/polling-stations`: el catálogo de puestos de votación de la organización.

export interface PollingStation {
  id: number;
  name: string;
  address: string | null;
  tables: number | null;
  /** Potencial electoral: personas habilitadas para votar en el puesto. */
  registeredVoters: number | null;
  lat: number | null;
  lng: number | null;
  isActive: boolean;
  localityId: number | null;
  zoneName: string | null;
  municipalityId: number | null;
  municipalityName: string | null;
  /** Contactos de la organización que votan en este puesto. */
  contacts: number;
  /** De ellos, cuántos ya tienen el voto confirmado. */
  confirmed: number;
}

export interface PollingStationInput {
  name: string;
  address?: string;
  localityId?: number | null;
  tables?: number | null;
  registeredVoters?: number | null;
}

export interface PollingStationImportResult {
  total: number;
  created: number;
  updated: number;
  skipped: { row: number; reason: string }[];
  skippedCount: number;
  unknownZones: string[];
  linkedProspects: number;
}

export const pollingStationsApi = {
  list: (includeInactive = false) =>
    apiGet<PollingStation[]>(`/polling-stations${includeInactive ? '?includeInactive=true' : ''}`),
  create: (data: PollingStationInput) =>
    apiPost<PollingStation & { linkedProspects: number }>('/polling-stations', data),
  update: (id: number, data: Partial<PollingStationInput>) =>
    apiPatch<PollingStation>(`/polling-stations/${id}`, data),
  toggleStatus: (id: number) => apiPatch<PollingStation>(`/polling-stations/${id}/toggle-status`),
  remove: (id: number) =>
    apiDelete<{ deleted: boolean; unlinkedContacts: number }>(`/polling-stations/${id}`),
  importFile: async (file: File) => {
    const form = new FormData();
    form.append('file', file);
    const { data } = await api.post<PollingStationImportResult>('/polling-stations/import', form);
    return data;
  },
};
