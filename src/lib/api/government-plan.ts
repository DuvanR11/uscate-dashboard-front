import api, { apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';

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

/**
 * Plan de gobierno, Fase 2 (2026-10-14): un indicador de educación, salud,
 * pobreza, vivienda o finanzas públicas del territorio.
 */
export interface ValueIndicatorSummary {
  code: string;
  name: string;
  unit: 'PORCENTAJE' | 'PUNTAJE' | 'POR_100' | 'POR_10K';
  better: 'HIGHER' | 'LOWER' | 'NEUTRAL';
  description: string;
  aggregationNote: string | null;
  sourceCode: string;
  available: boolean;
  year: number | null;
  value: number | null;
  previous: { year: number; value: number } | null;
  /** Diferencia con el año anterior con dato, en las mismas unidades. */
  change: number | null;
  department: number | null;
  country: number | null;
  series: { year: number; value: number }[];
  units: Record<string, number | null>;
}

export type SocialProfileResponse =
  | {
      configured: true;
      territory: {
        code: string;
        name: string;
        level: 'MUNICIPALITY' | 'DEPARTMENT';
        departmentCode: string;
        departmentName: string | null;
      };
      dimensions: { code: string; name: string; indicators: ValueIndicatorSummary[] }[];
      unitNames: Record<string, string>;
      map: { departmentCode: string; highlightCode: string | null };
      sources: { code: string; name: string; publisher: string; url: string }[];
    }
  | { configured: false; reason: 'NO_TERRITORY' };

export function getSocialProfile(): Promise<SocialProfileResponse> {
  return apiGet<SocialProfileResponse>('/government-plan/social');
}

/**
 * Plan de gobierno, Fase 3 "Diagnóstico" (2026-10-14): semáforo de cada
 * indicador frente a los territorios pares, tendencia, prioridades y lo que
 * la campaña registró en el CRM. Sin IA: reglas fijas del servidor.
 */
export type DiagnosisStatus = 'RED' | 'YELLOW' | 'GREEN';

export interface DiagnosisIndicator {
  code: string;
  name: string;
  dimension: string;
  kind: 'CASES' | 'VALUE';
  unit: 'POR_100K' | 'PORCENTAJE' | 'PUNTAJE' | 'POR_100' | 'POR_10K';
  better: 'HIGHER' | 'LOWER';
  year: number;
  value: number;
  cases: number | null;
  lowCount: boolean;
  department: number | null;
  country: number | null;
  peers: { count: number; median: number; betterCount: number } | null;
  /** 0 = el mejor de sus pares, 1 = el peor. */
  position: number | null;
  status: DiagnosisStatus | null;
  trend: {
    direction: 'IMPROVING' | 'WORSENING' | 'STABLE';
    fromYear: number;
    toYear: number;
    annualChange: number;
  } | null;
}

export interface DiagnosisDimension {
  code: string;
  name: string;
  status: DiagnosisStatus | null;
  counts: Record<DiagnosisStatus, number>;
  indicators: number;
}

export interface CitizenVoice {
  since: string;
  requests: {
    total: number;
    open: number;
    byType: { type: 'INTERNAL' | 'LEGISLATIVE' | 'SECURITY_APP'; count: number }[];
    topZones: { name: string; count: number }[];
  } | null;
  complaints: {
    total: number;
    open: number;
    byType: { type: 'DENUNCIA' | 'DEMANDA'; count: number }[];
  } | null;
  mentions: {
    since: string;
    total: number;
    negative: number;
    topics: { name: string; total: number; negative: number }[];
  } | null;
  /** Fase 6: la consulta ciudadana (respuestas visibles). */
  consultation: ConsultationSummary | null;
}

export type DiagnosisResponse =
  | {
      configured: true;
      territory: {
        code: string;
        name: string;
        level: 'MUNICIPALITY' | 'DEPARTMENT';
        departmentName: string | null;
        category: string | null;
      };
      peerGroup: {
        basis: 'CATEGORY' | 'DEPARTMENT' | 'ALL_DEPARTMENTS';
        level: 'MUNICIPALITY' | 'DEPARTMENT';
        category: string | null;
        departmentName: string | null;
        count: number;
      };
      dimensions: DiagnosisDimension[];
      indicators: DiagnosisIndicator[];
      priorities: string[];
      strengths: string[];
      citizenVoice: CitizenVoice;
    }
  | { configured: false; reason: 'NO_TERRITORY' };

export function getDiagnosis(): Promise<DiagnosisResponse> {
  return apiGet<DiagnosisResponse>('/government-plan/diagnosis');
}

/**
 * Plan de gobierno, Fase 4 "Redacción con IA" (2026-10-15): borrador del
 * programa. El texto lo escribe la IA; la línea base y la meta de cada
 * propuesta las pone el servidor con los datos del diagnóstico.
 */
export interface ProposalGoal {
  indicatorCode: string;
  indicatorName: string;
  unit: DiagnosisIndicator['unit'];
  better: 'HIGHER' | 'LOWER';
  baseline: { value: number; year: number };
  target: number;
  targetYear: number;
  rule: 'PEER_MEDIAN' | 'IMPROVE';
}

export interface DraftContent {
  officeLabel: string;
  agenda: 'EXECUTIVE' | 'LEGISLATIVE';
  vision: string;
  principles: string[];
  axes: {
    dimension: string;
    name: string;
    title: string;
    problem: string;
    proposals: { id: string; title: string; description: string; actions: string[]; goal: ProposalGoal | null }[];
  }[];
  removedSentences: number;
  /** Fase 5: portada del documento. */
  document?: { candidateName: string | null; party: string | null; slogan: string | null };
  edited?: { at: string; by: string | null } | null;
  /** Mientras sea null, el PDF y el Word salen marcados "Borrador para revisión". */
  reviewed?: { at: string; by: string | null } | null;
}

export interface PlanDraft {
  id: string;
  status: 'GENERATING' | 'READY' | 'FAILED';
  focus: string[];
  notes: string | null;
  content: DraftContent | null;
  error: string | null;
  createdAt: string;
  finishedAt: string | null;
  createdBy: string | null;
}

export type ProposalsResponse =
  | {
      configured: true;
      /** El último borrador listo. */
      draft: PlanDraft | null;
      /** Un intento más nuevo que el borrador listo: en curso o fallido. */
      attempt: PlanDraft | null;
      outdated: boolean;
    }
  | { configured: false; reason: 'NO_TERRITORY' };

export function getProposals(): Promise<ProposalsResponse> {
  return apiGet<ProposalsResponse>('/government-plan/proposals');
}

export function generateProposals(body: {
  focus: string[];
  notes?: string;
  force?: boolean;
}): Promise<{ draft: PlanDraft; reused: boolean }> {
  return apiPost<{ draft: PlanDraft; reused: boolean }>('/government-plan/proposals', body);
}

/** Plan de gobierno, Fase 5: lo que la campaña corrige antes de exportar (sin metas). */
export interface DraftEdit {
  vision: string;
  principles: string[];
  axes: {
    dimension: string;
    title: string;
    problem: string;
    proposals: { id?: string; title: string; description: string; actions: string[] }[];
  }[];
  document: { candidateName?: string; party?: string; slogan?: string };
  reviewed: boolean;
}

export function updateProposals(id: string, body: DraftEdit): Promise<PlanDraft> {
  return apiPatch<PlanDraft>(`/government-plan/proposals/${id}`, body);
}

/**
 * El programa en PDF o Word. El nombre del archivo lo pone quien llama: la
 * API vive en otro dominio y no expone `Content-Disposition` al navegador.
 */
export async function downloadPlanDocument(id: string, format: 'pdf' | 'docx'): Promise<Blob> {
  const response = await api.get<Blob>(`/government-plan/proposals/${id}/document`, {
    params: { format },
    responseType: 'blob',
  });
  return response.data;
}

/**
 * Plan de gobierno, Fase 6 (2026-10-15): consulta ciudadana anónima. Cada
 * persona elige hasta 3 temas en orden (3, 2 y 1 puntos).
 */
export interface ThemeRank {
  code: string;
  name: string;
  score: number;
  firstChoice: number;
  mentions: number;
  /** Parte de las respuestas que eligió el tema (0-100). */
  share: number;
}

export interface ConsultationSummary {
  total: number;
  from: string | null;
  to: string | null;
  themes: ThemeRank[];
}

export interface ConsultationAdmin {
  consultation: {
    status: 'OPEN' | 'CLOSED';
    open: boolean;
    title: string;
    intro: string | null;
    closesAt: string | null;
    updatedAt: string;
  } | null;
  publicPath: string | null;
  results: {
    total: number;
    hidden: number;
    themes: ThemeRank[];
    byZone: { name: string; count: number }[];
    recent: { id: string; priorities: string[]; proposal: string | null; zone: string | null; hidden: boolean; createdAt: string }[];
  } | null;
}

export function getConsultation(): Promise<ConsultationAdmin> {
  return apiGet<ConsultationAdmin>('/government-plan/consultation');
}

export function saveConsultation(body: {
  status: 'OPEN' | 'CLOSED';
  title: string;
  intro?: string | null;
  closesAt?: string | null;
}): Promise<ConsultationAdmin> {
  return apiPut<ConsultationAdmin>('/government-plan/consultation', body);
}

export function hideConsultationResponse(id: string, hidden: boolean): Promise<{ id: string; hidden: boolean }> {
  return apiPatch(`/government-plan/consultation/responses/${id}`, { hidden });
}

export type PublicConsultation =
  | { open: false; organizationName: string }
  | {
      open: true;
      organizationName: string;
      title: string;
      intro: string | null;
      closesAt: string | null;
      themes: { code: string; name: string }[];
      zones: { id: number; name: string }[];
    };

export async function getPublicConsultation(slug: string): Promise<PublicConsultation> {
  const response = await api.get<PublicConsultation>(`/public/organizations/${encodeURIComponent(slug)}/plan-consultation`);
  return response.data;
}

export async function sendConsultationResponse(
  slug: string,
  body: { priorities: string[]; proposal?: string; localityId?: number; website?: string },
): Promise<void> {
  await api.post(`/public/organizations/${encodeURIComponent(slug)}/plan-consultation/responses`, body);
}
