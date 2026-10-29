import { apiGet, apiPut } from '@/lib/api';

// CRM-13 (2026-10-27): quién puede quedar como responsable de una solicitud.
// `GET /requests/assignable-users` lo responde a quien puede modificar
// solicitudes de ese tipo, sin necesitar el módulo de Usuarios (antes el
// selector pedía `GET /users` y quedaba vacío para Secretaría y Legislativo).

export interface AssignableUser {
  id: string;
  fullName: string;
  role: { code: string; name: string };
}

/** Cuentas activas de la organización que pueden recibir una solicitud de este tipo. */
export function getAssignableUsers(type: string): Promise<AssignableUser[]> {
  return apiGet<AssignableUser[]>(
    `/requests/assignable-users?type=${encodeURIComponent(type)}`,
  );
}

// Decisiones del 2026-10-29 (CRM-24): la sigla con la que empiezan los códigos
// de solicitud (`VD26-INT-0001`). La ve quien ve las solicitudes de todo el
// equipo; la cambia quien además puede escribir en ese módulo.
export interface RequestCodeSettings {
  /** La elegida por la organización; `null` = la automática. */
  prefix: string | null;
  /** La que sale del nombre corto de la organización. */
  automatic: string | null;
  /** Cómo se ve el próximo código de una solicitud interna. */
  example: string | null;
}

export function getRequestCodeSettings(): Promise<RequestCodeSettings> {
  return apiGet<RequestCodeSettings>('/requests/code-settings');
}

/** `null` o vacío vuelve a la sigla automática. */
export function updateRequestCodeSettings(
  prefix: string | null,
): Promise<RequestCodeSettings> {
  return apiPut<RequestCodeSettings>('/requests/code-settings', { prefix });
}
