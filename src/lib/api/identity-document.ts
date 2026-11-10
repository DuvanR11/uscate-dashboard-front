import { apiPost } from '@/lib/api';

/**
 * Plan hacia la versión estable, Fase 2 (2026-11-10): la cédula completa de
 * un contacto, una persona del equipo o el titular de una solicitud de Habeas
 * Data. Cada consulta queda registrada en el servidor (quién, cuándo, de
 * quién). Sin permiso responde 403; si no existe o es de otra organización,
 * 404.
 */
export type DocumentSubject = 'prospect' | 'user' | 'habeas-data-request';

const PATHS: Record<DocumentSubject, (id: string) => string> = {
  prospect: (id) => `/prospects/${id}/document`,
  user: (id) => `/users/${id}/document`,
  'habeas-data-request': (id) => `/habeas-data/requests/${id}/document`,
};

export function revealDocument(
  subject: DocumentSubject,
  id: string,
): Promise<{ documentNumber: string | null }> {
  return apiPost<{ documentNumber: string | null }>(PATHS[subject](id));
}
