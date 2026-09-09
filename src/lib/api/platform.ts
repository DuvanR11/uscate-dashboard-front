import { apiGet, apiPatch, apiPost } from '@/lib/api';

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

export interface PlatformOrganization {
  id: string;
  name: string;
  nit: string | null;
  plan: { code: string; name: string } | null;
  hasSubscription: boolean;
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
  smsLimit?: number;
  emailLimit?: number;
  whatsappLimit?: number;
  deepSearchWeeklyLimit?: number;
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
export type OrganizationOfficeType = 'CONCEJO' | 'ALCALDIA' | 'GOBERNACION' | 'CONGRESO';

export const LEGISLATING_OFFICE_TYPES: OrganizationOfficeType[] = ['CONCEJO', 'CONGRESO'];

export interface LegislativeBody {
  code: string;
  name: string;
  personaTitle: string;
  jurisdictionType: 'NACIONAL' | 'MUNICIPAL' | 'DEPARTAMENTAL';
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
  officeType?: OrganizationOfficeType;
  legislativeBodyId?: string;
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
    | 'CREATE_OSINT_SOURCE';
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
