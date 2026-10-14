import { apiGet } from '@/lib/api';

/**
 * Cliente para `modules/government-plan` (backend) — Plan de gobierno.
 * Fase 0 "Cimientos del territorio" (2026-10-14): el territorio al que aspira
 * la organización con sus datos base del DANE (población, superficie). La
 * organización sale de la sesión; nunca se manda como parámetro.
 */

export interface TerritorySummary {
  code: string;
  name: string;
  population: number | null;
  urbanPopulation: number | null;
  ruralPopulation: number | null;
  /** Porcentaje de la población fuera de la cabecera. */
  ruralShare: number | null;
  areaKm2: number | null;
  /** Habitantes por km². */
  density: number | null;
}

export interface TerritoryProfile {
  configured: true;
  level: 'MUNICIPALITY' | 'DEPARTMENT';
  territory: {
    code: string;
    name: string;
    departmentCode: string;
    departmentName: string | null;
    category: string | null;
    categoryYear: number;
  };
  year: number;
  summary: TerritorySummary;
  department: TerritorySummary | null;
  country: TerritorySummary;
  populationSeries: { year: number; total: number; urban: number; rural: number }[];
  units: TerritorySummary[];
  map: { departmentCode: string; highlightCode: string | null };
  sources: { code: string; name: string; publisher: string; url: string }[];
}

export type TerritoryProfileResponse =
  | TerritoryProfile
  | { configured: false; reason: 'NO_TERRITORY' };

export function getTerritoryProfile(): Promise<TerritoryProfileResponse> {
  return apiGet<TerritoryProfileResponse>('/government-plan/territory');
}

/**
 * Contornos oficiales (DANE, MGN 2025), simplificados, servidos como archivos
 * del propio panel (`public/geo/mgn2025`). Cada figura trae `code` (DIVIPOLA).
 */
export const municipalitiesGeoUrl = (departmentCode: string) =>
  `/geo/mgn2025/municipios-${departmentCode}.json`;
export const DEPARTMENTS_GEO_URL = '/geo/mgn2025/departamentos.json';
