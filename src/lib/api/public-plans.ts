import axios from 'axios';
import { API_URL } from '@/lib/api-url';

// Cliente de la página pública /planes (sin sesión): no usa la instancia `api`
// con interceptor de JWT a propósito — un visitante no tiene token.

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

// Cupos que publica la API. Los planes por nivel (entrega 4c, 2026-11-06)
// traen además lo que los distingue; `null` = sin tope propio del plan.
export interface PublicQuotas {
  users: number;
  prospects: number;
  storageGb: number;
  sms: number;
  email: number;
  supportHours: number;
  aiCredits?: number;
  journeys?: number | null;
  deepSearchWeekly?: number | null;
  ocrPages?: number | null;
  monitoringSources?: number | null;
  onboardingHours?: number;
}

export interface PublicPlan {
  code: string;
  name: string;
  description: string | null;
  officeType: OfficeType | null;
  scope: TerritorialScope;
  basePlanCode: string;
  /** Catálogo por nivel (A0–A4 en ejercicio, B0–B4 campañas) o territorial. */
  pricingModel?: 'TERRITORIAL' | 'LEVEL';
  /** Perfil fijo de un plan por nivel. */
  candidacy?: Candidacy | null;
  /** Cuota de alta, una sola vez por organización (planes B). */
  setupFee?: number;
  fromMonthly: number;
  rates: PublicPlanRate[];
  termDiscounts: { termMonths: number; discountPercent: number }[];
  // Cupos de la categoría de entrada, perfil en ejercicio.
  quotas: PublicQuotas;
  // Cupos calculados por la API para el perfil seleccionado. Opcional
  // mientras se actualizan los despliegues anteriores del backend.
  quotasByCandidacy?: Record<Candidacy, PublicPlan['quotas']>;
  // Módulos reales del plan y corporaciones que su Radar Legislativo cubre
  // hoy para este cargo (vacío = próximamente).
  modules: string[];
  /** Plan de gobierno, Fase 7: complementos que activan un módulo, con su precio mensual sin IVA. */
  moduleAddons?: { type: string; module: string; label: string; monthlyPrice: number }[];
  radarCoverage: string[];
}

export interface PublicQuote {
  plan: { code: string; name: string };
  candidacy: Candidacy;
  territory: { code: string; name: string; level: 'MUNICIPAL' | 'DEPARTMENT'; category: string } | null;
  category: string;
  capacityFactor: number;
  monthlyPrice: number;
  setupFee?: number;
  /** Tarea 3.9 (2026-11-07): la suscripción va sin IVA; solo la cuota de alta lo lleva. */
  vatRate?: number;
  setupVatAmount?: number;
  terms: {
    termMonths: number;
    discountPercent: number;
    /** Valor del plazo (sin IVA: la suscripción no lo lleva). */
    totalWithoutVat: number;
    subscriptionAmount?: number;
    /** Primer pago: plazo + cuota de alta + IVA de la cuota de alta. */
    firstPaymentTotal?: number;
  }[];
  quotas: PublicQuotas;
}

/** Cargo con el que la API sugiere un plan por nivel. */
export type LevelOffice = 'EDIL' | 'CONCEJO' | 'ASAMBLEA' | 'ALCALDIA' | 'GOBERNACION' | 'CAMARA' | 'SENADO';

export interface PublicSuggestion {
  /** Plan sugerido, o `null` si va por licencia institucional. */
  code: string | null;
  alternative: string | null;
  reason: string;
}

/** Paquete o complemento que se vende aparte, con su precio sin IVA. */
export interface PublicAddon {
  type: string;
  label: string;
  unitPrice: number;
  monthly: boolean;
  unit: string;
  resource?: 'SMS' | 'EMAIL' | 'AI_CREDITS' | 'DEEP_SEARCH';
  units?: number;
  capacity?: { limit: string; amount: number };
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

export const getPublicSuggestion = (input: { office: LevelOffice; candidacy: Candidacy; territory?: string }) =>
  axios
    .get<{ suggestion: PublicSuggestion | null }>(`${API_URL}/public/plans/suggestion`, {
      params: { office: input.office, candidacy: input.candidacy, ...(input.territory ? { territory: input.territory } : {}) },
    })
    .then((r) => r.data.suggestion);

export const getPublicAddons = () =>
  axios.get<PublicAddon[]>(`${API_URL}/public/plans/addons`).then((r) => r.data);

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
