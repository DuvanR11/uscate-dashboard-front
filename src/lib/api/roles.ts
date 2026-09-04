import { apiGet, apiPut } from '@/lib/api';

/**
 * Cliente para los endpoints de administración de roles/plantillas descritos
 * en `spec/00_IMPLEMENTATION_PLAN.md` (Backend Fase 9, sección "Endpoints
 * nuevos"). Backend Fase 9 ya está implementada (`api-uscate-back/src/modules/roles/`).
 */

export type PermissionSource = 'ROLE_BASE' | 'ROLE_ORG';

/** Un rol del catálogo global (`Role`). */
export interface Role {
  id: number;
  name: string;
  code: string;
}

/**
 * Una fila de la plantilla efectiva de un rol (merge de plantilla base del
 * sistema + override de la organización de quien llama). `source` indica de
 * cuál de las dos proviene esa fila específica.
 */
export interface RolePermissionEntry {
  module: string;
  subModule: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  source: PermissionSource;
  /**
   * Solo presente cuando `source === 'ROLE_ORG'`: los valores de la
   * plantilla BASE del sistema para este módulo, previos al override. Es lo
   * que permite implementar "restablecer a base" sin perder el dato — el
   * merge del backend descarta la fila base del array que devuelve en
   * cuanto hay un override, así que sin este campo no hay forma de
   * recuperarla desde el frontend.
   */
  base: { canRead: boolean; canWrite: boolean; canDelete: boolean } | null;
}

/** Fila enviada al hacer `PUT /roles/:id/permissions` (sin `source`: se escribe siempre como override de la organización de quien llama). */
export interface RolePermissionInput {
  module: string;
  subModule?: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface UpdateRolePermissionsPayload {
  permissions: RolePermissionInput[];
}

export interface UpdateRolePermissionsResponse {
  permissions: RolePermissionEntry[];
}

/** `GET /roles` — lista de roles del catálogo global. */
export function getRoles(): Promise<Role[]> {
  return apiGet<Role[]>('/roles');
}

/**
 * `GET /roles/:id/permissions` — plantilla efectiva de un rol para la
 * organización de quien llama (base del sistema + override de esa
 * organización, ya mergeados).
 */
export function getRolePermissions(roleId: number): Promise<RolePermissionEntry[]> {
  return apiGet<RolePermissionEntry[]>(`/roles/${roleId}/permissions`);
}

/**
 * `PUT /roles/:id/permissions` — crea/actualiza el override de la
 * organización de quien llama para ese rol. Nunca toca la plantilla base
 * del sistema (`organizationId = null`).
 */
export function updateRolePermissions(
  roleId: number,
  payload: UpdateRolePermissionsPayload,
): Promise<UpdateRolePermissionsResponse> {
  return apiPut<UpdateRolePermissionsResponse>(`/roles/${roleId}/permissions`, payload);
}