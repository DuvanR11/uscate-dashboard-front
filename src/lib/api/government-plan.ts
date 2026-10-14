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

/** Casos y tasa por 100.000 habitantes de un territorio en un año. */
export interface CasePoint {
  cases: number | null;
  rate: number | null;
}

/**
 * Plan de gobierno, Fase 1 "Seguridad y movilidad" (2026-10-14): un delito o
 * siniestro vial del territorio (Policía Nacional vía datos.gov.co).
 */
export interface CaseIndicatorSummary {
  code: string;
  name: string;
  dimension: 'SEGURIDAD' | 'MOVILIDAD' | string;
  description: string;
  available: boolean;
  /** Primer y último mes con datos ("2026-08"). */
  coverage: { from: string; to: string } | null;
  /** Último año con los 12 meses publicados. */
  lastYear: number | null;
  current: {
    year: number;
    cases: number | null;
    rate: number | null;
    previousCases: number | null;
    previousRate: number | null;
    /** Cambio porcentual de los casos frente al año anterior. */
    change: number | null;
    department: CasePoint | null;
    country: CasePoint;
  } | null;
  ytd: {
    year: number;
    throughMonth: number;
    cases: number;
    previousCases: number;
    change: number | null;
  } | null;
  series: { year: number; cases: number; rate: number | null }[];
  monthly: { year: number; month: number; cases: number }[];
  units: Record<string, CasePoint>;
}

export type SecurityProfileResponse =
  | {
      configured: true;
      territory: {
        code: string;
        name: string;
        level: 'MUNICIPALITY' | 'DEPARTMENT';
        departmentCode: string;
        departmentName: string | null;
      };
      indicators: CaseIndicatorSummary[];
      unitNames: Record<string, string>;
      map: { departmentCode: string; highlightCode: string | null };
      sources: { code: string; name: string; publisher: string; url: string }[];
    }
  | { configured: false; reason: 'NO_TERRITORY' };

export function getSecurityProfile(): Promise<SecurityProfileResponse> {
  return apiGet<SecurityProfileResponse>('/government-plan/security');
}
