import { apiGet } from '@/lib/api';

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
