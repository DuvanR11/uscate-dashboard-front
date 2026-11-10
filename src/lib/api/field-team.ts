import { apiGet, apiPut } from '@/lib/api';

// Plan hacia la versión estable, Fase 3a (2026-11-10): el territorio de un
// Coordinador y el Coordinador a cargo de un líder o voluntario. Solo para
// administradores (`/field-team`).

export interface NamedPlace {
  id: number;
  name: string;
}

export interface FieldTeamState {
  coordinator: { id: string; fullName: string } | null;
  /** Líderes y voluntarios a cargo (si la persona es Coordinador). */
  teamSize: number;
  municipalities: NamedPlace[];
  localities: NamedPlace[];
  pollingStations: NamedPlace[];
}

export interface CoordinatorOption {
  id: string;
  fullName: string;
  _count: { coordinatedUsers: number; territories: number };
}

export interface TerritoryInput {
  municipalityIds: number[];
  localityIds: number[];
  pollingStationIds: number[];
}

export const fieldTeamApi = {
  get: (userId: string) => apiGet<FieldTeamState>(`/field-team/users/${userId}`),
  coordinators: () => apiGet<CoordinatorOption[]>('/field-team/coordinators'),
  setTerritories: (userId: string, data: TerritoryInput) =>
    apiPut<FieldTeamState>(`/field-team/users/${userId}/territories`, data),
  setCoordinator: (userId: string, coordinatorId: string | null) =>
    apiPut<FieldTeamState>(`/field-team/users/${userId}/coordinator`, { coordinatorId }),
};
