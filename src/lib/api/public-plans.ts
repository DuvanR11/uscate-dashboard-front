import axios from 'axios';

// Cliente de la página pública /planes (sin sesión): no usa la instancia `api`
// con interceptor de JWT a propósito — un visitante no tiene token.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export type Candidacy = 'ACTIVO' | 'ASPIRANTE';
export type OfficeType = 'CONCEJO' | 'ASAMBLEA' | 'ALCALDIA' | 'GOBERNACION' | 'CONGRESO';
export type TerritorialScope = 'NONE' | 'MUNICIPAL' | 'DEPARTMENT' | 'CHAMBER' | 'NATIONAL';

// Catálogo territorial (2026-09-29, docs/comercial): la tarifa depende de la
// categoría de la Contaduría del municipio o departamento. Todos los precios
// los calcula el backend; aquí solo se muestran.
export interface PublicPlanRate {
  category: string;
  capacityFactor: number;
  monthly: Record<Candidacy, number>;
}

export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  officeType: OfficeType | null;
  scope: TerritorialScope;
  basePlanCode: string;
  fromMonthly: number;
  rates: PublicPlanRate[];
  termDiscounts: { termMonths: 3 | 6 | 12; discountPercent: number }[];
  // Cupos de la categoría de entrada, perfil en ejercicio.
  quotas: {
    users: number;
    prospects: number;
    storageGb: number;
    sms: number;
    email: number;
    supportHours: number;
  };
  // Cupos calculados por la API para el perfil seleccionado. Opcional
  // mientras se actualizan los despliegues anteriores del backend.
  quotasByCandidacy?: Record<Candidacy, PublicPlan['quotas']>;
  // Módulos reales del plan y corporaciones que su Radar Legislativo cubre
  // hoy para este cargo (vacío = próximamente).
  modules: string[];
  radarCoverage: string[];
}

export interface PublicQuote {
  plan: { code: string; name: string };
  candidacy: Candidacy;
  territory: { code: string; name: string; level: 'MUNICIPAL' | 'DEPARTMENT'; category: string } | null;
  category: string;
  capacityFactor: number;
  monthlyPrice: number;
  terms: { termMonths: 3 | 6 | 12; discountPercent: number; totalWithoutVat: number }[];
  quotas: {
    users: number;
    prospects: number;
    storageGb: number;
    sms: number;
    email: number;
    supportHours: number;
  };
}

export interface PublicTerritory {
  code: string;
  name: string;
  level: 'MUNICIPAL' | 'DEPARTMENT';
  departmentName: string | null;
  category: string | null;
  quotable: boolean;
  issue: string | null;
}

export interface LeadInput {
  fullName: string;
  email: string;
  phone?: string;
  officeType?: OfficeType;
  candidacy?: Candidacy;
  territory?: string;
  message?: string;
  commercialPlanCode?: string;
  source?: string;
  dataTreatment: boolean;
  website?: string; // trampa anti-bots, siempre vacía
}

export const getPublicPlans = () =>
  axios.get<PublicPlan[]>(`${API_URL}/public/plans`).then((r) => r.data);

export const getPublicQuote = (input: { plan: string; candidacy: Candidacy; territory?: string }) =>
  axios
    .get<PublicQuote>(`${API_URL}/public/plans/quote`, {
      params: { plan: input.plan, candidacy: input.candidacy, ...(input.territory ? { territory: input.territory } : {}) },
    })
    .then((r) => r.data);

export const searchPublicTerritories = (level: 'MUNICIPAL' | 'DEPARTMENT' | undefined, q: string) =>
  axios
    .get<PublicTerritory[]>(`${API_URL}/public/territories`, { params: { ...(level ? { level } : {}), q } })
    .then((r) => r.data);

export const getLeadConsent = () =>
  axios
    .get<{ version: string; text: string }>(`${API_URL}/public/lead-consent`)
    .then((r) => r.data);

export const submitLead = (input: LeadInput) =>
  axios.post<{ received: boolean }>(`${API_URL}/public/leads`, input).then((r) => r.data);
