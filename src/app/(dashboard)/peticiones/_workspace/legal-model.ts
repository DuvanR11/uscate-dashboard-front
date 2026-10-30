export type LegalSource = { id: string; title: string; url: string };
export type LegalCase = {
  petitionId: string;
  subject: string;
  stage: string;
  applicantType: string;
  applicantIdentification?: string | null;
  recipient?: string | null;
  notificationAddress?: string | null;
  facts: string;
  legalBasis: string;
  requests: string;
  priority: string;
  visibility: string;
  version: number;
  legalDueAt?: string | null;
  originalDueAt?: string | null;
  competentReceivedAt?: string | null;
  filedAt?: string | null;
  internalDueAt?: string | null;
  suspendedAt?: string | null;
  supplementationDueAt?: string | null;
  responseAt?: string | null;
  responseText?: string | null;
  responseEvaluation?: string | null;
  reminderDays: number[];
  emailReminders: boolean;
  workingSaturdays: boolean;
  excludedDays: string[];
  calendarReason?: string | null;
};
export type LegalPetition = {
  id: string;
  petitioner: string;
  petitionerEmail?: string;
  radicado?: string;
  petitionType: string;
  petitionDirection: 'CREADA' | 'RESPUESTA';
  status: string;
  assignedLawyerId?: string;
  createdById?: string;
  receivedAt: string;
  deadlineAt?: string | null;
  signedAt?: string;
  generatedDraft: string;
  originalText: string;
  workspace: LegalCase | null;
  updatedAt: string;
};
export type LegalTask = {
  id: string;
  petitionId: string;
  title: string;
  description: string;
  assignedToId: string;
  createdById: string;
  status: string;
  priority: string;
  dueAt?: string | null;
  reminderAt?: string | null;
  parentId?: string | null;
  case?: { subject: string };
};
export type LegalAttachment = {
  id: string;
  category: string;
  documentId: string;
  document: {
    id: string;
    name: string;
    status: string;
    currentVersionNumber: number;
    currentVersion?: {
      mimeType: string;
      originalFileName: string;
      sizeBytes: number;
    };
  };
};
export type LegalEvent = {
  id: string;
  kind: string;
  detail: string;
  actorName?: string;
  happenedAt: string;
  createdAt: string;
  evidenceId?: string;
  metadata?: Record<string, unknown>;
};
export type LegalDetail = {
  pagination: Record<'tasks'|'documents'|'versions'|'history', {page:number;total:number;lastPage:number}>;
  petition: LegalPetition;
  tasks: LegalTask[];
  attachments: LegalAttachment[];
  versions: {
    id: string;
    note: string;
    actorName: string;
    createdAt: string;
  }[];
  history: {
    id: string;
    action: string;
    detail?: string;
    createdAt: string;
    user?: { fullName?: string };
  }[];
  legalSources: LegalSource[];
  daysLeft: number | null;
};
export type LegalPage<T> = {
  data: T[];
  meta: { total: number; page: number; lastPage: number };
};
export type LegalOptions = {
  users: { id: string; fullName: string }[];
  canSupervise: boolean;
  legalSources: LegalSource[];
};
export type LegalDashboard = {
  counts: Record<string, number>;
  agenda: LegalTask[];
  deadlines: {
    petitionId: string;
    subject: string;
    stage: string;
    legalDueAt: string;
    priority: string;
  }[];
  today: string;
  legalSources: LegalSource[];
};
export const stageLabels: Record<string, string> = {
  DRAFT: 'Por preparar',
  SENT: 'Enviada',
  FILED: 'Radicada',
  RECEIVED: 'Término activo',
  SUSPENDED: 'Requerimiento pendiente',
  RESPONSE_REVIEW: 'Respuesta por revisar',
  CLOSED: 'Cerrada',
  ARCHIVED: 'Archivada',
};
export const actionLabels: Record<string, string> = {
  NOTE: 'Comentario interno',
  SENT: 'Registrar envío',
  FILED: 'Registrar radicación',
  RECEIVED: 'Acreditar recepción competente',
  TRANSFERRED: 'Registrar traslado',
  REQUEST_INFORMATION: 'Requerimiento de información · art. 17',
  RESUMED: 'Acreditar entrega y reactivar término',
  EXTENDED: 'Registrar ampliación comunicada · art. 14',
  PARTIAL_RESPONSE: 'Respuesta parcial recibida',
  FINAL_RESPONSE: 'Respuesta definitiva recibida',
  EVALUATED: 'Evaluación jurídica de la respuesta',
  CLOSED: 'Cerrar expediente',
  ARCHIVED: 'Archivar expediente',
  REOPENED: 'Reabrir expediente',
  CREATED: 'Expediente creado',
  ADOPTED: 'Ficha jurídica incorporada',
  UPDATED: 'Ficha actualizada',
  TASK_CREATED: 'Tarea creada',
  TASK_UPDATED: 'Tarea actualizada',
  DOCUMENT_ATTACHED: 'Documento incorporado',
  ATTACHMENT_VERSION: 'Versión de anexo',
  DOCUMENT_VERSION: 'Versión del documento',
  AI_ANALYSIS: 'Asistencia revisable',
  DEADLINE_REMINDER: 'Aviso de término',
  TASK_REMINDER: 'Recordatorio de tarea',
};
export const priorities: Record<string, string> = {
  LOW: 'Baja',
  NORMAL: 'Normal',
  HIGH: 'Alta',
  URGENT: 'Urgente',
};
export const evaluations: Record<string, string> = {
  COMPLETE: 'Resuelve completamente',
  PARTIAL: 'Resuelve parcialmente',
  NO_SUBSTANTIVE_RESPONSE: 'No responde de fondo',
  CLARIFICATION: 'Requiere aclaración',
  NEW_ACTION: 'Requiere una nueva actuación',
};
export const taskStatuses: Record<string, string> = {
  TODO: 'Por hacer',
  IN_PROGRESS: 'En curso',
  DONE: 'Terminada',
  CANCELED: 'Cancelada',
};
export const documentCategories: Record<string, string> = {
  ANNEX: 'Anexo',
  FILING_RECEIPT: 'Comprobante de radicación',
  RECEIPT: 'Constancia de recepción',
  RESPONSE: 'Respuesta',
  LEGAL_ACT: 'Acto o comunicación jurídica',
  OTHER: 'Otro documento',
};

export function plainTextHtml(value: string) {
  const safe = value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  return safe
    .split(/\n\n+/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}
