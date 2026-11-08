import { apiGet, apiPost } from '@/lib/api';

// Borrar organización (2026-11-07): programado a 7 días por el administrador
// principal. La regla vive en el servidor; aquí solo se consulta y se pide.

export type DeletionStatus = 'SCHEDULED' | 'CANCELLED' | 'RUNNING' | 'COMPLETED' | 'FAILED';
export type DeletionMode = 'FULL' | 'KEEP_FINANCIAL';

export interface OrganizationDeletionRequest {
  id: string;
  targetOrganizationId: string;
  organizationName: string;
  organizationSlug: string;
  organizationNit: string | null;
  reason: string;
  requestedByEmail: string;
  requestedAt: string;
  scheduledFor: string;
  status: DeletionStatus;
  mode: DeletionMode | null;
  cancelledByEmail: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  attempts: number;
  completedAt: string | null;
  result: {
    mode?: DeletionMode;
    totalRows?: number;
    anonymizedUsers?: number;
    files?: { skipped: boolean; deleted: number };
  } | null;
  error: string | null;
}

export interface DeletionPreview {
  organization: { id: string; name: string; slug: string; nit: string | null; isDemo: boolean };
  mode: DeletionMode;
  ledger: Record<string, number>;
  deletes: Record<string, number>;
  totalRows: number;
  users: number;
  blockers: string[];
  request: OrganizationDeletionRequest | null;
  scheduledFor: string;
}

export const getDeletionPreview = (organizationId: string) =>
  apiGet<DeletionPreview>(`/platform/organizations/${encodeURIComponent(organizationId)}/deletion`);

export const scheduleOrganizationDeletion = (organizationId: string, input: { confirmSlug: string; reason: string }) =>
  apiPost<OrganizationDeletionRequest>(`/platform/organizations/${encodeURIComponent(organizationId)}/deletion`, input);

export const cancelOrganizationDeletion = (requestId: string, reason: string) =>
  apiPost<{ id: string; status: 'CANCELLED'; reactivatedUsers: number; slugRestored: boolean }>(
    `/platform/organization-deletions/${encodeURIComponent(requestId)}/cancel`,
    { reason },
  );

export const listOrganizationDeletions = () => apiGet<OrganizationDeletionRequest[]>('/platform/organization-deletions');

export const DELETION_STATUS_LABEL: Record<DeletionStatus, string> = {
  SCHEDULED: 'Borrado programado',
  CANCELLED: 'Borrado anulado',
  RUNNING: 'Borrando ahora',
  COMPLETED: 'Borrada',
  FAILED: 'El borrado falló (se reintenta)',
};

export const DELETION_MODE_LABEL: Record<DeletionMode, string> = {
  FULL: 'Borrado completo: no queda nada de la organización',
  KEEP_FINANCIAL: 'Se borran los datos y queda la historia contable',
};

/** Nombres en español de las tablas más comunes; el resto se agrupa. */
export const TABLE_LABEL: Record<string, string> = {
  Prospect: 'Contactos',
  ProspectSocialContact: 'Redes de contactos',
  ProspectImport: 'Importaciones de contactos',
  Event: 'Eventos',
  Request: 'Solicitudes',
  Complaint: 'Denuncias',
  ComplaintAttachment: 'Adjuntos de denuncias',
  Petition: 'Derechos de petición',
  PetitionCase: 'Casos de petición',
  OfficeDocument: 'Documentos',
  OfficeDocumentVersion: 'Versiones de documentos',
  SmsLog: 'SMS enviados',
  SmsCampaign: 'Difusiones por SMS',
  EmailLog: 'Correos enviados',
  EmailCampaign: 'Difusiones por correo',
  WhatsappLog: 'Mensajes de WhatsApp',
  WhatsappCampaign: 'Difusiones por WhatsApp',
  Journey: 'Automatizaciones',
  InvestigationCase: 'Casos OSINT',
  Entity: 'Entidades OSINT',
  MonitoringKeyword: 'Palabras de monitoreo',
  CampaignContribution: 'Aportes de campaña',
  CampaignExpense: 'Gastos de campaña',
  SignatureLog: 'Firmas',
  ModuleActivity: 'Medición de uso',
  ProductivityEvent: 'Productividad',
  UserPermission: 'Permisos por usuario',
  RolePermission: 'Permisos por rol',
  DataSubjectRequest: 'Solicitudes de Habeas Data',
  GovernmentPlanDraft: 'Plan de gobierno',
  Payment: 'Pagos',
  PaymentInvoiceRecord: 'Facturas registradas',
  CollectionOrder: 'Órdenes de cobro',
  CommercialQuote: 'Cotizaciones',
  CommercialApplication: 'Aplicaciones de pago',
  OnlinePaymentAttempt: 'Intentos de pago en línea',
  VerifiedOnlineReceipt: 'Ingresos en línea verificados',
  VerifiedBankReceipt: 'Ingresos bancarios verificados',
  TransferReviewRequest: 'Revisiones de transferencia',
  LegalAcceptance: 'Aceptaciones legales',
  TerritorialCoverageContract: 'Contratos de cobertura',
  SupportTicket: 'Tickets de soporte',
  SupportSession: 'Sesiones de soporte',
  SupportBalance: 'Saldos de soporte',
  SupportBalanceMovement: 'Movimientos de soporte',
  ProviderUsageOperation: 'Consumos de proveedores (SMS, correo, IA)',
};
