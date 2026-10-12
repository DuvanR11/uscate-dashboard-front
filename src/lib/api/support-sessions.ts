import { apiGet, apiPost } from "@/lib/api";
export const SESSION_KIND = {
  PLATFORM_FIX: "Corrección de falla",
  ACCESS: "Acceso",
  BILLING: "Cobros",
  ORIENTATION: "Orientación inicial",
  TRAINING: "Capacitación",
  PERSONALIZED: "Asistencia personalizada",
} as const;
export const SESSION_STATE = {
  PLANNED: "Programada",
  COMPLETED: "Realizada",
  CANCELLED: "Cancelada",
  NO_SHOW: "Inasistencia",
} as const;
export const SESSION_CHANNEL = {
  VIDEO: "Videollamada",
  PHONE: "Teléfono",
  IN_PERSON: "Presencial",
  CHAT: "Chat",
} as const;
export const SESSION_ACCOUNTING = {
  DEBITED: "Minutos efectivos descontados con reserva y confirmación previa",
  NOT_APPLIED: "Sin consumo registrado",
  NO_CHARGE: "Atención sin cargo",
  PENDING_RECONCILIATION:
    "Minutos pendientes de conciliación; sin descuento aplicado",
} as const;
export interface SupportSession {
  id: string;
  organizationId: string;
  organizationName?: string;
  ticketId: string | null;
  title: string;
  kind: keyof typeof SESSION_KIND;
  state: keyof typeof SESSION_STATE;
  contactName: string;
  assigneeId: string;
  assigneeName: string;
  plannedStart: string;
  plannedEnd: string;
  channel: keyof typeof SESSION_CHANNEL;
  instructions: string;
  actualStart: string | null;
  actualEnd: string | null;
  effectiveSeconds: number | null;
  accountingState: keyof typeof SESSION_ACCOUNTING;
  outcome: string | null;
  evidence: string | null;
  nextSteps: string | null;
  version: number;
}
export interface SessionList {
  items: SupportSession[];
  total: number;
  page: number;
  pageSize: number;
  summary: {
    completed: number;
    effectiveSeconds: number;
    pendingReconciliation: number;
  };
  cutoff: string;
}
export interface SessionDetail {
  session: SupportSession;
  events: {
    id: string;
    action: string;
    body: string;
    actorName: string;
    createdAt: string;
    internalNote?: string | null;
    metadata?: { before?: SupportSession; after?: SupportSession };
  }[];
  total: number;
  page: number;
  pageSize: number;
}
const root = (platform: boolean) =>
  platform ? "/platform/support" : "/organization/support";
export const listSessions = (platform: boolean, q: URLSearchParams) =>
  apiGet<SessionList>(`${root(platform)}/sessions?${q}`);
export const detailSession = (platform: boolean, id: string, page: number) =>
  apiGet<SessionDetail>(
    `${root(platform)}/sessions/${id}?page=${page}&pageSize=25`,
  );
export const createSession = (org: string, input: Record<string, unknown>) =>
  apiPost<SupportSession>(
    `/platform/support/organizations/${org}/sessions`,
    input,
  );
export const commandSession = (id: string, input: Record<string, unknown>) =>
  apiPost<SupportSession>(`/platform/support/sessions/${id}/actions`, input);
