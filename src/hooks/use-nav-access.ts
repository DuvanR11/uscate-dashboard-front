'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getPermissionModules, type PermissionModule } from '@/lib/api/permissions';
import type { NavAccess, NavItem, NavTab } from '@/lib/navigation';

// Fase 2 "Menú y nombres" (2026-10-06): la misma regla de visibilidad para
// la barra lateral y para las pestañas de cada sección. Es solo para MOSTRAR
// u ocultar enlaces: quien decide de verdad es el backend en cada endpoint.

// El catálogo de módulos se pide una sola vez por sesión del navegador,
// aunque lo usen la barra lateral (escritorio y móvil) y las pestañas.
let moduleTreeRequest: Promise<PermissionModule[]> | null = null;
const loadModuleTree = () => {
  moduleTreeRequest ??= getPermissionModules().catch(() => {
    // Sin catálogo (error de red): se navega con los permisos del usuario;
    // se reintenta en el siguiente montaje.
    moduleTreeRequest = null;
    return [];
  });
  return moduleTreeRequest;
};

function findModuleNode(tree: PermissionModule[], code: string): PermissionModule | undefined {
  for (const node of tree) {
    if (node.code === code) return node;
    const found = node.children?.length ? findModuleNode(node.children, code) : undefined;
    if (found) return found;
  }
  return undefined;
}

function collectDescendantCodes(node: PermissionModule): string[] {
  return (node.children ?? []).flatMap((child) => [child.code, ...collectDescendantCodes(child)]);
}

export function useNavAccess() {
  const storePermissions = useAuthStore((s) => s.user?.permissions);
  const permissions = useMemo(() => storePermissions ?? [], [storePermissions]);
  const [moduleTree, setModuleTree] = useState<PermissionModule[]>([]);

  useEffect(() => {
    let cancelled = false;
    loadModuleTree().then((tree) => {
      if (!cancelled) setModuleTree(tree);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canRead = useCallback(
    (module: string) => permissions.some((p) => p.module === module && p.canRead === true),
    [permissions],
  );

  const canReadModuleOrChildren = useCallback(
    (parentCode: string) => {
      const node = findModuleNode(moduleTree, parentCode);
      const codes = [parentCode, ...(node ? collectDescendantCodes(node) : [])];
      return codes.some(canRead);
    },
    [moduleTree, canRead],
  );

  /** Sin ningún requisito declarado, el enlace es visible para cualquier sesión. */
  const passes = useCallback(
    (access: NavAccess) => {
      if (access.requiredAllModules) return access.requiredAllModules.every(canRead);
      if (access.requiredModules) return access.requiredModules.some(canRead);
      if (access.requiredModuleOrChildren) {
        return canReadModuleOrChildren(access.requiredModuleOrChildren);
      }
      return access.requiredModule ? canRead(access.requiredModule) : true;
    },
    [canRead, canReadModuleOrChildren],
  );

  const canSeeTab = useCallback(
    (item: NavItem, tab: NavTab) =>
      passes(tab) ||
      // Permiso "paraguas" de la sección (caso real: PRODUCTIVIDAD_GLOBAL da
      // acceso a Ranking y Reportes aunque no se tenga el módulo puntual).
      (item.requiredModuleOrChildren !== undefined &&
        canReadModuleOrChildren(item.requiredModuleOrChildren)),
    [passes, canReadModuleOrChildren],
  );

  const visibleTabs = useCallback(
    (item: NavItem) => (item.tabs ?? []).filter((tab) => canSeeTab(item, tab)),
    [canSeeTab],
  );

  /** Una sección con pestañas se ve si pasa su requisito y le queda alguna pestaña. */
  const canSeeItem = useCallback(
    (item: NavItem) => passes(item) && (!item.tabs || visibleTabs(item).length > 0),
    [passes, visibleTabs],
  );

  /** A dónde lleva el enlace de la barra lateral: su `href` o la primera pestaña visible. */
  const hrefOf = useCallback(
    (item: NavItem) => item.href ?? visibleTabs(item)[0]?.href ?? '#',
    [visibleTabs],
  );

  return { canSeeItem, canSeeTab, visibleTabs, hrefOf };
}
