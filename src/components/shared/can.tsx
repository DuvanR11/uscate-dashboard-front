import { ReactNode } from 'react';
import { usePermission, PermissionAction } from '@/hooks/use-permission';

interface CanProps {
  module: string;
  action?: PermissionAction;
  subModule?: string;
  fallback?: ReactNode;
  children: ReactNode;
}

/**
 * Gatea el render de `children` según los permisos efectivos del usuario
 * actual (`useAuthStore().user.permissions`). Ver `usePermission` para el
 * detalle de resolución.
 */
export function Can({ module, action = 'canRead', subModule, fallback = null, children }: CanProps) {
  const allowed = usePermission(module, action, subModule);
  return <>{allowed ? children : fallback}</>;
}