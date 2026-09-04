import { useMemo } from 'react';
import { useAuthStore } from '@/store/auth-store';

export type PermissionAction = 'canRead' | 'canWrite' | 'canDelete';

/**
 * Lee `user.permissions` del auth store (forma plana actual del backend:
 * `{ module, subModule?, canRead, canWrite, canDelete }[]`) y resuelve si el
 * usuario tiene la acción solicitada sobre el módulo (y, opcionalmente,
 * subMódulo) indicados.
 *
 * NOTA: hoy `user.permissions` es la matriz cruda por usuario. Cuando el
 * backend active su Fase 6 (guard unificado con `RolePermission` + merge de
 * 3 vías, ver spec/01_IMPLEMENTATION_PHASES.md), seguirá entregando
 * exactamente esta misma forma plana ya resuelta (`effectivePermissions`),
 * así que este hook no necesita cambios.
 */
export function usePermission(
  module: string,
  action: PermissionAction = 'canRead',
  subModule?: string,
): boolean {
  const permissions = useAuthStore((s) => s.user?.permissions);

  return useMemo(() => {
    if (!permissions) return false;
    return permissions.some(
      (p) => p.module === module && (!subModule || p.subModule === subModule) && p[action],
    );
  }, [permissions, module, action, subModule]);
}