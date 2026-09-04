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
  seats: SeatSummary | null;
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

export interface CreateOrganizationInput {
  name: string;
  slug: string;
  nit?: string;
  planId?: string | null;
  admin: {
    email: string;
    password: string;
    fullName: string;
  };
}

export interface CreateOrganizationResult {
  organization: { id: string; name: string; nit: string | null };
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
  action: 'CREATE_ORGANIZATION' | 'UPDATE_PLAN' | 'IMPERSONATE' | 'UPDATE_OSINT_SOURCE';
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

/** Extrae el `message` que arma Nest en sus excepciones (400/404) de un error de axios. */
export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}
