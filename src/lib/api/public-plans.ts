import axios from 'axios';

// Cliente de la página pública /planes (sin sesión): no usa la instancia `api`
// con interceptor de JWT a propósito — un visitante no tiene token.
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100';

export type Candidacy = 'ACTIVO' | 'ASPIRANTE';
export type OfficeType = 'CONCEJO' | 'ASAMBLEA' | 'ALCALDIA' | 'GOBERNACION' | 'CONGRESO';

export interface PublicPlanTerm {
  termMonths: 3 | 6 | 12;
  listTotal: number;
  listDiscountPercent: number;
  founderTotal: number;
}

export interface PublicPlanPrices {
  listMonthly: number;
  founderMonthly: number;
  terms: PublicPlanTerm[];
}

export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  officeType: OfficeType | null;
  basePlanCode: string;
  // Fase C (2026-09-28): módulos reales del plan y corporaciones que su
  // Radar Legislativo cubre hoy para este cargo (vacío = próximamente).
  modules: string[];
  radarCoverage: string[];
  founderSlots: number;
  founderSlotsRemaining: number;
  founderAvailable: boolean;
  quotas: {
    users: number | null;
    prospects: number | null;
    whatsapp: number;
    sms: number;
    email: number;
  };
  prices: Record<Candidacy, PublicPlanPrices>;
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

export const getLeadConsent = () =>
  axios
    .get<{ version: string; text: string }>(`${API_URL}/public/lead-consent`)
    .then((r) => r.data);

export const submitLead = (input: LeadInput) =>
  axios.post<{ received: boolean }>(`${API_URL}/public/leads`, input).then((r) => r.data);
