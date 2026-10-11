import { apiGet, apiPost } from "@/lib/api";
export const SUPPORT_STATE = {
  NEW: "Nuevo",
  ASSIGNED: "Asignado",
  IN_PROGRESS: "En atención",
  WAITING_CUSTOMER: "Esperando al cliente",
  WAITING_PROVIDER: "Esperando a un proveedor",
  RESOLVED: "Resuelto",
  CLOSED: "Cerrado",
} as const;
export const SUPPORT_PRIORITY = {
  CRITICAL: "Crítica",
  HIGH: "Alta",
  NORMAL: "Normal",
} as const;
export const SUPPORT_CATEGORY = {
  ACCESS: "Acceso",
  BILLING: "Cobros",
  INCIDENT: "Falla de plataforma",
  TRAINING: "Capacitación",
  OTHER: "Otro",
} as const;
export interface SupportTicket {
  parentTicketId: string | null;
  id: string;
  organizationId: string;
  organizationName?: string;
  contactName: string;
  title: string;
  category: keyof typeof SUPPORT_CATEGORY;
  priority: keyof typeof SUPPORT_PRIORITY;
  state: keyof typeof SUPPORT_STATE;
  version: number;
  assigneeId: string | null;
  assigneeName: string | null;
  nextAction: string;
  followUpAt: string | null;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  closedAt: string | null;
  resolution: string | null;
  resolutionEvidence: string | null;
  createdAt: string;
  updatedAt: string;
}
export interface SupportDetail {
  ticket: SupportTicket;
  entries: {
    id: string;
    action: string;
    visibility: string;
    body: string;
    metadata: { resolutionEvidence?: string };
    actorName: string;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
}
export interface SupportList {
  items: SupportTicket[];
  total: number;
  page: number;
  pageSize: number;
}
const root = (platform: boolean) =>
  platform ? "/platform/support" : "/organization/support";
export const listSupport = (platform: boolean, query: URLSearchParams) =>
  apiGet<SupportList>(`${root(platform)}/tickets?${query}`);
export const detailSupport = (platform: boolean, id: string, page = 1) =>
  apiGet<SupportDetail>(
    `${root(platform)}/tickets/${id}?page=${page}&pageSize=25`,
  );
export const supportContacts = (org: string) =>
  apiGet<{ id: string; fullName: string }[]>(
    `/platform/support/organizations/${org}/contacts`,
  );
export const supportOperators = (org: string) =>
  apiGet<{ id: string; fullName: string }[]>(
    `/platform/support/organizations/${org}/operators`,
  );
export const createSupport = (
  platform: boolean,
  org: string | undefined,
  input: Record<string, unknown>,
) =>
  apiPost<SupportTicket>(
    platform
      ? `/platform/support/organizations/${org}/tickets`
      : "/organization/support/tickets",
    input,
  );
export const commandSupport = (
  platform: boolean,
  id: string,
  input: Record<string, unknown>,
) => apiPost<SupportTicket>(`${root(platform)}/tickets/${id}/actions`, input);

export interface SupportAttachment {
  resumeRequestKey?: string;
  id: string;
  entryId: string;
  fileName: string;
  contentType: string;
  bytes: number;
  state: "PENDING" | "STORED";
  visibility: "PUBLIC" | "INTERNAL";
  createdAt: string;
}
export const supportAttachments = (platform: boolean, id: string) =>
  apiGet<{ items: SupportAttachment[]; total: number }>(
    `${root(platform)}/tickets/${id}/attachments?pageSize=100`,
  );
export const uploadSupportAttachment = (
  platform: boolean,
  id: string,
  data: FormData,
) =>
  apiPost<SupportAttachment>(
    `${root(platform)}/tickets/${id}/attachments`,
    data,
  );
export const downloadSupportAttachment = (
  platform: boolean,
  id: string,
  attachmentId: string,
) =>
  apiGet<{ url: string; expiresInSeconds: number }>(
    `${root(platform)}/tickets/${id}/attachments/${attachmentId}/download`,
  );
export const supportLinks = (platform: boolean, id: string, page: number) =>
  apiGet<{
    parent: Pick<SupportTicket, "id" | "title" | "state"> | null;
    items: Pick<SupportTicket, "id" | "title" | "state">[];
    total: number;
    pageSize: number;
    canContinue: boolean;
  }>(`${root(platform)}/tickets/${id}/links?page=${page}&pageSize=25`);
