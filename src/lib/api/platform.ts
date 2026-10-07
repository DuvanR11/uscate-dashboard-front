import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import type { OrganizationLifecycle } from '@/lib/api/billing';

/**
 * Cliente para `modules/platform` (backend) — administración CRUZADA de
 * organizaciones, exclusiva del rol PLATFORM_OPERATOR. Ver informe técnico
 * "Gating por Plan".
 */

export interface UsageMetric {
  used: number;
  limit: number;
  percentage: number;
}

export interface SeatSummary {
  used: number;
  limit: number;
}

/** Desglose real de cupo por rol — cuántos `code` tiene permitidos/usados esta organización. */
export interface SeatByRole {
  code: string;
  name: string;
  used: number;
  limit: number;
}

// "Puntaje de adopción por organización" (Track C de Ruta 2027,
// 2026-09-09) — transparente, nunca ML: BAJA (nunca logueado o >30 días),
// ALTA (login ≤7 días Y consumo real >0 en algún canal), MEDIA el resto.
export type AdoptionLabel = 'ALTA' | 'MEDIA' | 'BAJA';

export interface PlatformOrganization {
  contract?: { recordedStart: string | null; recordedEnd: string | null; termMonths: number | null; quotaPeriodStart: string | null; cancelledAt: string | null; cancellationReason: string | null; baseQuotas: Record<string, unknown> | null; modules: string[]; separateContractAvailable: boolean; lastConfirmedPayment: { id: string; paidAt: string; periodStart: string; periodEnd: string } | null } | null;
  id: string;
  name: string;
  nit: string | null;
  plan: { code: string; name: string } | null;
  hasSubscription: boolean;
  // Canal de WhatsApp por Baileys (no oficial): apagado por defecto (Fase 3).
  whatsappBotEnabled: boolean;
  // Fase C: cargo y corporación que sigue en el Radar Legislativo.
  officeType: OrganizationOfficeType | null;
  legislativeBodyId: string | null;
  // WhatsApp OFICIAL (Meta) con número propio (Fase B); `null` = sin conectar.
  whatsappMeta: { displayPhoneNumber: string } | null;
  // Estadísticas de redes: página de Facebook (+ Instagram) conectada.
  socialMeta: { pageName: string; instagramUsername: string | null } | null;
  // Vigencia de la suscripción (Fase 1 "Poder cobrar"); `null` sin Subscription.
  lifecycle: OrganizationLifecycle | null;
  // Catálogo territorial: plan vendido, perfil, territorio (categoría CGN) y
  // límites efectivos de ESTA organización.
  commercialPlan: { code: string; name: string } | null;
  candidacy: 'ACTIVO' | 'ASPIRANTE' | null;
  territory: {
    code: string;
    name: string;
    level: 'MUNICIPAL' | 'DEPARTMENT';
    category: string | null;
  } | null;
  limits: { users: number | null; prospects: number | null; storageGb: number | null } | null;
  lastActivityAt: string | null;
  adoptionLabel: AdoptionLabel;
  consumption: {
    sms: UsageMetric;
    email: UsageMetric;
    whatsapp: UsageMetric;
  } | null;
  deepSearchWeeklyLimit: number | null;
  seats: SeatSummary | null;
  // Catálogo COMPLETO de roles reales, cada uno con su cupo/uso — incluye
  // roles con `limit: 0` (nunca habilitados todavía) para que el operador
  // los pueda subir desde cero. `null` solo cuando la organización no
  // tiene Subscription.
  seatsByRole: SeatByRole[] | null;
}

export interface PlatformPlan {
  code: string;
  name: string;
}

/** `GET /platform/organizations` — todas las organizaciones + su plan y consumo. */
export function listPlatformOrganizations(): Promise<PlatformOrganization[]> {
  return apiGet<PlatformOrganization[]>('/platform/organizations');
}

export interface OrganizationPage {
  items: PlatformOrganization[];
  total: number;
  page: number;
  pageSize: number;
}

export function searchPlatformOrganizations(params: URLSearchParams): Promise<OrganizationPage> {
  return apiGet<OrganizationPage>(`/platform/organizations/search?${params.toString()}`);
}

export function getPlatformOrganization(id: string): Promise<PlatformOrganization> {
  return apiGet<PlatformOrganization>(`/platform/organizations/${encodeURIComponent(id)}`);
}

export function getPlatformOrganizationHistory(id: string): Promise<AuditLogEntry[]> {
  return apiGet<AuditLogEntry[]>(`/platform/organizations/${encodeURIComponent(id)}/history`);
}

/** `GET /platform/plans` — catálogo real de planes, para el selector. */
export function listPlatformPlans(): Promise<PlatformPlan[]> {
  return apiGet<PlatformPlan[]>('/platform/plans');
}

/**
 * `PATCH /platform/organizations/:id/plan` — asigna/cambia/quita
 * (`planId: null`) el plan de UNA organización cualquiera.
 */
export function updateOrganizationPlan(
  organizationId: string,
  planId: string | null,
): Promise<{ organizationId: string; plan: { code: string; name: string } | null }> {
  return apiPatch(`/platform/organizations/${organizationId}/plan`, { planId });
}

export interface UpdateOrganizationLimitsInput {
  reason?: string;
  smsLimit?: number;
  emailLimit?: number;
  whatsappLimit?: number;
  deepSearchWeeklyLimit?: number;
  // Catálogo territorial: tope de usuarios del equipo y de contactos de ESTA
  // organización (acuerdo puntual), sin cambiar su plan.
  usersLimit?: number;
  prospectsLimit?: number;
  // Solo los códigos de rol presentes acá se tocan (PATCH parcial real) —
  // ver `PlatformService.updateOrganizationLimits()`.
  roleLimits?: Record<string, number>;
}

export interface UpdateOrganizationLimitsResult {
  organizationId: string;
  smsLimit: number;
  emailLimit: number;
  whatsappLimit: number;
  deepSearchWeeklyLimit: number;
  usersLimit: number | null;
  prospectsLimit: number | null;
  roleLimits: Record<string, number>;
}

/**
 * `PATCH /platform/organizations/:id/limits` — Plan "Ampliación
 * PLATFORM_OPERATOR", Fase A. PATCH parcial real: solo se envían los
 * campos que cambian.
 */
export function updateOrganizationLimits(
  organizationId: string,
  input: UpdateOrganizationLimitsInput,
): Promise<UpdateOrganizationLimitsResult> {
  return apiPatch(`/platform/organizations/${organizationId}/limits`, input);
}

// "Kit de arranque por tipo de cargo" (Track C de Ruta 2027, 2026-09-08)
// — decide el set inicial de `Tag` de la organización; CONCEJO/CONGRESO
// además pueden traer una `legislativeBodyId` real de una vez al alta.
export type OrganizationOfficeType = 'CONCEJO' | 'ALCALDIA' | 'GOBERNACION' | 'CONGRESO' | 'ASAMBLEA';

export interface LegislativeBody {
  code: string;
  name: string;
  personaTitle: string;
  jurisdictionType: 'NACIONAL' | 'MUNICIPAL' | 'DEPARTAMENTAL';
}

// Fase C (2026-09-28): cada cargo sigue a una corporación de SU nivel en el
// Radar (un alcalde a su concejo, un gobernador a su asamblea). Espejo de
// `common/legislative/office-jurisdiction.ts` del backend, que es quien valida.
export const OFFICE_JURISDICTION: Record<OrganizationOfficeType, LegislativeBody['jurisdictionType']> = {
  CONCEJO: 'MUNICIPAL',
  ALCALDIA: 'MUNICIPAL',
  ASAMBLEA: 'DEPARTAMENTAL',
  GOBERNACION: 'DEPARTAMENTAL',
  CONGRESO: 'NACIONAL',
};

export const OFFICE_TYPE_LABEL: Record<OrganizationOfficeType, string> = {
  CONCEJO: 'Concejo',
  ALCALDIA: 'Alcaldía',
  GOBERNACION: 'Gobernación',
  CONGRESO: 'Congreso',
  ASAMBLEA: 'Asamblea (Diputados)',
};

export function bodiesForOffice(bodies: LegislativeBody[], officeType: OrganizationOfficeType | null | undefined) {
  return officeType ? bodies.filter((b) => b.jurisdictionType === OFFICE_JURISDICTION[officeType]) : [];
}

/** `PATCH /platform/organizations/:id/legislative-body` — cargo y corporación que sigue en el Radar. */
export function updateLegislativeBody(
  organizationId: string,
  input: { officeType?: OrganizationOfficeType; legislativeBodyId: string | null },
) {
  return apiPatch<{ organizationId: string; officeType: OrganizationOfficeType | null; legislativeBodyId: string | null }>(
    `/platform/organizations/${organizationId}/legislative-body`,
    input,
  );
}

/** `GET /platform/legislative-bodies` — catálogo real, para el selector de Concejo/Congreso. */
export function listLegislativeBodies(): Promise<LegislativeBody[]> {
  return apiGet<LegislativeBody[]>('/platform/legislative-bodies');
}

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  nit?: string;
  planId?: string | null;
  // Plan comercial del catálogo territorial: fija paquete de módulos, cargo,
  // categoría y cupos desde el alta.
  commercialPlanCode?: string;
  candidacy?: 'ACTIVO' | 'ASPIRANTE';
  officeType?: OrganizationOfficeType;
  legislativeBodyId?: string;
  // Municipio (5 dígitos) o departamento (2) DIVIPOLA: fija la tarifa del plan.
  territoryCode?: string;
  admin: {
    email: string;
    password: string;
    fullName: string;
  };
}

export interface CreateOrganizationResult {
  organization: {
    id: string;
    name: string;
    nit: string | null;
    officeType: OrganizationOfficeType | null;
    legislativeBodyId: string | null;
  };
  plan: { code: string; name: string } | null;
  commercialPlan: { code: string; name: string } | null;
  adminUser: { id: string; email: string };
}

/**
 * `POST /platform/organizations` — alta de una organización nueva de punta
 * a punta (Organization + Subscription con límites por defecto + primer
 * usuario ADMIN). Reemplaza lo que antes era 100% manual contra la BD.
 */
export function createOrganization(
  input: CreateOrganizationInput,
): Promise<CreateOrganizationResult> {
  return apiPost<CreateOrganizationResult>('/platform/organizations', input);
}

export interface PlatformMetrics {
  totalOrganizations: number;
  byPlan: Record<string, number>;
  atRisk: {
    organizationId: string;
    organizationName: string;
    channel: 'sms' | 'email' | 'whatsapp';
    percentage: number;
  }[];
  // "Puntaje de adopción" — organizaciones YA clientes (con Subscription
  // real) en adopción BAJA: riesgo real de abandono, antes de que se vayan.
  atRiskAdoption: {
    organizationId: string;
    organizationName: string;
    lastActivityAt: string | null;
  }[];
}

/**
 * `GET /platform/metrics` — resumen agregado: organizaciones por plan y
 * cuáles están cerca de su límite (≥80% en cualquier canal).
 */
export function getPlatformMetrics(): Promise<PlatformMetrics> {
  return apiGet<PlatformMetrics>('/platform/metrics');
}

export interface ProviderChannelHealth {
  sent: number;
  failed: number;
  successRate: number | null;
}

export interface ProvidersHealth {
  windowDays: number;
  channels: {
    email: ProviderChannelHealth;
    sms: ProviderChannelHealth;
    whatsappBot: ProviderChannelHealth;
    whatsappMeta: ProviderChannelHealth;
  };
  credentialsConfigured: {
    email: boolean;
    sms: boolean;
    whatsappMeta: boolean;
  };
}

/**
 * `GET /platform/providers/health` — Plan "Ampliación PLATFORM_OPERATOR",
 * Fase B. Global (las credenciales de SendGrid/Háblame/Meta son
 * compartidas por toda la plataforma, no hay desglose por-organización).
 */
export function getProvidersHealth(): Promise<ProvidersHealth> {
  return apiGet<ProvidersHealth>('/platform/providers/health');
}

export interface ImpersonationResult {
  access_token: string;
  user: {
    id: string;
    email: string;
    fullName: string;
    role?: { id: number; name: string; code: string };
    organizationId: string;
    permissions: {
      module: string;
      subModule?: string;
      canRead: boolean;
      canWrite: boolean;
      canDelete: boolean;
      source?: 'ROLE_BASE' | 'ROLE_ORG' | 'USER_OVERRIDE';
    }[];
  };
  impersonation: { operatorEmail: string; targetOrganizationName: string };
}

/**
 * `POST /platform/organizations/:id/impersonate` — "Ver como esta
 * organización": sesión real de 1h para un usuario de esa organización
 * (por defecto, su primer ADMIN activo), sin conocer su contraseña.
 */
export function impersonateOrganization(
  organizationId: string,
  userId?: string,
): Promise<ImpersonationResult> {
  return apiPost<ImpersonationResult>(
    `/platform/organizations/${organizationId}/impersonate`,
    userId ? { userId } : {},
  );
}

export interface ImpersonationLogEntry {
  id: string;
  operatorEmail: string;
  targetEmail: string;
  organizationName: string;
  createdAt: string;
}

/** `GET /platform/impersonation-logs` — auditoría real de quién vio qué organización, cuándo. */
export function listImpersonationLogs(): Promise<ImpersonationLogEntry[]> {
  return apiGet<ImpersonationLogEntry[]>('/platform/impersonation-logs');
}

export interface AuditLogEntry {
  id: string;
  action:
    | 'CREATE_ORGANIZATION'
    | 'UPDATE_PLAN'
    | 'UPDATE_LIMITS'
    | 'IMPERSONATE'
    | 'UPDATE_OSINT_SOURCE'
    | 'CREATE_OSINT_SOURCE'
    // Fase 1 "Poder cobrar" (2026-09-26)
    | 'REGISTER_PAYMENT'
    | 'VOID_PAYMENT'
    | 'SET_PERIOD'
    | 'CANCEL_SUBSCRIPTION'
    | 'REACTIVATE_SUBSCRIPTION'
    | 'SUBSCRIPTION_STATE_CHANGED'
    | 'PAY_COMMISSION_INSTALLMENT'
    | 'ORGANIZATION_DATA_EXPORTED'
    | 'PASSWORD_RESET_LINK_CREATED'
    | 'UPDATE_WHATSAPP_BOT'
    | 'UPDATE_COMMERCIAL_PLAN'
    | 'UPDATE_SALES_LEAD'
    | 'CREATE_MANAGEMENT'
    | 'UPDATE_MANAGEMENT';
  operatorEmail: string;
  organizationName: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

/**
 * `GET /platform/audit-logs` — línea de tiempo ÚNICA de todo lo que hace un
 * PLATFORM_OPERATOR (alta de organización, cambio de plan, impersonación,
 * edición del catálogo global de fuentes OSINT).
 */
export function listAuditLog(): Promise<AuditLogEntry[]> {
  return apiGet<AuditLogEntry[]>('/platform/audit-logs');
}

// --- Catálogo global de fuentes OSINT (`OsintSource`) ---
// Sin organizationId: la única edición real vive acá (PLATFORM_OPERATOR),
// la vista de solo lectura por-organización vive en `lib/api/osint.ts`
// (`GET /osint/sources`). Ver memoria `osint-plataforma-arquitectura`.

export type OsintSourceReliability = 'OFFICIAL' | 'SEMI_OFFICIAL' | 'THIRD_PARTY';

export interface PlatformOsintSource {
  id: string;
  key: string;
  name: string;
  description: string | null;
  accessType: string;
  isActive: boolean;
  official: boolean;
  reliabilityLevel: OsintSourceReliability;
  lastVerifiedAt: string | null;
}

/** `GET /platform/osint-sources` — incluye inactivas, a diferencia de la vista de solo lectura. */
export function listPlatformOsintSources(): Promise<PlatformOsintSource[]> {
  return apiGet<PlatformOsintSource[]>('/platform/osint-sources');
}

/** `PATCH /platform/osint-sources/:id` — nunca acepta `key`/`accessType` (estructurales). */
export function updatePlatformOsintSource(
  sourceId: string,
  input: {
    name?: string;
    description?: string;
    isActive?: boolean;
    official?: boolean;
    reliabilityLevel?: OsintSourceReliability;
  },
): Promise<PlatformOsintSource> {
  return apiPatch<PlatformOsintSource>(`/platform/osint-sources/${sourceId}`, input);
}

// Plan "Ampliación PLATFORM_OPERATOR" (2026-09-05), Fase C — publicar una
// fuente que YA tiene adaptador de código real, sin depender de correr
// scripts/backfill-osint-sources.ts a mano por SSH.

export const OSINT_SOURCE_ACCESS_TYPES = [
  'SOCRATA_API',
  'RSS',
  'WEB_SCRAPING',
  'MANUAL',
  'SEARCH_API',
  'RDAP_API',
  'OFFICIAL_LIST',
] as const;

export type OsintSourceAccessType = (typeof OSINT_SOURCE_ACCESS_TYPES)[number];

/** `GET /platform/osint-sources/available` — claves con adaptador de código real, sin fila en el catálogo todavía. */
export function listAvailableOsintSourceKeys(): Promise<string[]> {
  return apiGet<string[]>('/platform/osint-sources/available');
}

export interface CreateOsintSourceInput {
  key: string;
  name: string;
  description?: string;
  accessType: OsintSourceAccessType;
  official: boolean;
  reliabilityLevel: OsintSourceReliability;
}

/** `POST /platform/osint-sources` — rechaza cualquier `key` sin adaptador real registrado. */
export function createOsintSource(
  input: CreateOsintSourceInput,
): Promise<PlatformOsintSource> {
  return apiPost<PlatformOsintSource>('/platform/osint-sources', input);
}

/** Extrae el `message` que arma Nest en sus excepciones (400/404) de un error de axios. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}

/** Estado del WhatsApp oficial (Meta) de una organización. El token nunca viaja: solo sus 4 últimos. */
export interface WhatsappMetaStatus {
  configured: boolean;
  phoneNumberId?: string;
  businessAccountId?: string;
  tokenLast4?: string;
  displayPhoneNumber?: string | null;
  verifiedName?: string | null;
  verifiedAt?: string | null;
}

export function getWhatsappMeta(organizationId: string) {
  return apiGet<WhatsappMetaStatus>(`/platform/organizations/${organizationId}/whatsapp-meta`);
}

/** Valida las credenciales contra Meta antes de guardarlas (el backend responde 400 con el motivo de Meta). */
export function saveWhatsappMeta(
  organizationId: string,
  input: { phoneNumberId: string; businessAccountId: string; accessToken: string },
) {
  return apiPut<WhatsappMetaStatus>(`/platform/organizations/${organizationId}/whatsapp-meta`, input);
}

/** Página de Facebook (+ Instagram vinculado) de una organización, para Estadísticas de redes. */
export interface SocialMetaStatus {
  configured: boolean;
  pageId?: string;
  pageName?: string | null;
  instagramUsername?: string | null;
  tokenLast4?: string;
  verifiedAt?: string | null;
}

export function getSocialMeta(organizationId: string) {
  return apiGet<SocialMetaStatus>(`/platform/organizations/${organizationId}/social-meta`);
}

export function saveSocialMeta(organizationId: string, input: { pageId: string; accessToken: string }) {
  return apiPut<SocialMetaStatus>(`/platform/organizations/${organizationId}/social-meta`, input);
}

export function removeSocialMeta(organizationId: string) {
  return apiDelete<SocialMetaStatus>(`/platform/organizations/${organizationId}/social-meta`);
}

export function removeWhatsappMeta(organizationId: string) {
  return apiDelete<WhatsappMetaStatus>(`/platform/organizations/${organizationId}/whatsapp-meta`);
}

/** `PATCH /platform/organizations/:id/whatsapp-bot` — enciende/apaga el canal no oficial (Baileys). */
export function updateWhatsappBot(organizationId: string, enabled: boolean) {
  return apiPatch<{ organizationId: string; whatsappBotEnabled: boolean }>(
    `/platform/organizations/${organizationId}/whatsapp-bot`,
    { enabled },
  );
}
