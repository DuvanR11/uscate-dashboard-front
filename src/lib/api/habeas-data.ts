import { apiGet, apiPatch } from '@/lib/api';

/**
 * Cliente para `modules/habeas-data` (backend) — cola interna de
 * solicitudes ARCO (Ley 1581 de 2012). Autenticado, permiso propio
 * `HABEAS_DATA` bajo Configuración.
 */

export type DataSubjectRequestType =
  | 'ACCESO'
  | 'RECTIFICACION'
  | 'CANCELACION'
  | 'OPOSICION';

export type DataSubjectRequestStatus =
  | 'PENDIENTE'
  | 'EN_REVISION'
  | 'RESUELTA'
  | 'RECHAZADA';

export interface DataSubjectRequest {
  id: string;
  publicCode: string;
  documentNumber: string;
  contactEmail: string | null;
  contactPhone: string | null;
  requestType: DataSubjectRequestType;
  details: string;
  status: DataSubjectRequestStatus;
  submittedAt: string;
  dueAt: string;
  extendedDueAt: string | null;
  extensionReason: string | null;
  resolvedAt: string | null;
  resolutionNotes: string | null;
  prospect: { firstName: string; lastName: string } | null;
}

/** `GET /habeas-data/requests` — todas las solicitudes de la organización. */
export function listDataSubjectRequests(): Promise<DataSubjectRequest[]> {
  return apiGet<DataSubjectRequest[]>('/habeas-data/requests');
}

/** `PATCH /habeas-data/requests/:id/review` — marca EN_REVISION. */
export function markDataSubjectRequestInReview(
  id: string,
): Promise<DataSubjectRequest> {
  return apiPatch<DataSubjectRequest>(`/habeas-data/requests/${id}/review`);
}

/** `PATCH /habeas-data/requests/:id/resolve` — CANCELACION anonimiza, OPOSICION suprime contacto. */
export function resolveDataSubjectRequest(
  id: string,
  resolutionNotes: string,
): Promise<DataSubjectRequest> {
  return apiPatch<DataSubjectRequest>(`/habeas-data/requests/${id}/resolve`, {
    resolutionNotes,
  });
}

/** `PATCH /habeas-data/requests/:id/reject` */
export function rejectDataSubjectRequest(
  id: string,
  resolutionNotes: string,
): Promise<DataSubjectRequest> {
  return apiPatch<DataSubjectRequest>(`/habeas-data/requests/${id}/reject`, {
    resolutionNotes,
  });
}

/** `PATCH /habeas-data/requests/:id/extend` — prórroga real (5/8 días hábiles según Ley 1581). */
export function extendDataSubjectRequest(
  id: string,
  extensionReason: string,
): Promise<DataSubjectRequest> {
  return apiPatch<DataSubjectRequest>(`/habeas-data/requests/${id}/extend`, {
    extensionReason,
  });
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
