import { apiGet } from '@/lib/api';

/**
 * Cliente para los endpoints de catálogo de módulos y permisos efectivos por
 * usuario descritos en `spec/00_IMPLEMENTATION_PLAN.md` (Backend Fase 9,
 * sección "Endpoints nuevos").
 *
 * `getPermissionModules()` / `GET /permissions/modules` YA EXISTE en el
 * backend — confirmado en `src/modules/permissions/{permissions.controller,
 * permissions.service}.ts`, sirve el árbol desde la tabla `Module` (poblada
 * por `MODULES_CATALOG` en `prisma/seed.ts`/`seed-prod.ts`). Es lo que usa
 * `sidebar.tsx` para resolver `requiredModuleOrChildren`.
 *
 * `getUserEffectivePermissions()` / `GET /users/:id/permissions/effective`
 * también existe (merge de 3 vías), pero no se consume todavía desde
 * ningún componente del dashboard — solo desde `/roles/*` (edición de
 * plantillas). No confirmado si sigue exactamente esta forma en la
 * práctica, a diferencia de `getPermissionModules()` que sí se verificó.
 */

export type EffectivePermissionSource = 'ROLE_BASE' | 'ROLE_ORG' | 'USER_OVERRIDE';

/** Un nodo del catálogo jerárquico de módulos (`GET /permissions/modules`). */
export interface PermissionModule {
  code: string;
  name: string;
  parentCode: string | null;
  order: number;
  children: PermissionModule[];
}

/**
 * Una fila del merge de 3 vías (plantilla base → override de organización →
 * excepción de usuario) para un usuario puntual.
 */
export interface EffectivePermission {
  module: string;
  subModule: string | null;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  source: EffectivePermissionSource;
}

/**
 * `GET /permissions/modules` — catálogo de módulos en árbol. Reemplaza
 * `AVAILABLE_MODULES`/`requiredModule` hardcodeados en el frontend. Requiere
 * sesión, sin permiso específico.
 */
export function getPermissionModules(): Promise<PermissionModule[]> {
  return apiGet<PermissionModule[]>('/permissions/modules');
}

/**
 * `GET /users/:id/permissions/effective` — merge de 3 vías (base + override
 * de organización + excepciones) de un usuario puntual.
 */
export function getUserEffectivePermissions(userId: string): Promise<EffectivePermission[]> {
  return apiGet<EffectivePermission[]>(`/users/${userId}/permissions/effective`);
}