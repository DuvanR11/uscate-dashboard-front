'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { getPermissionModules, type PermissionModule } from '@/lib/api/permissions';
import { getOwnDemoStatus } from '@/lib/api/demos';
import { findActiveItem, findActiveTab, findUnlistedRoute } from '@/lib/navigation';
import type { NavAccess, NavItem, NavTab } from '@/lib/navigation';

/** Qué hacer con una dirección: mostrarla, bloquearla o esperar al catálogo de módulos. */
export type RouteAccess = 'allowed' | 'denied' | 'pending';

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

// ¿La organización es una demo comercial? Solo para los enlaces `demoOnly`.
// Una vez por sesión del navegador; ante un error el enlace no se ofrece.
let demoStatusRequest: Promise<boolean> | null = null;
const loadIsDemo = () => {
  demoStatusRequest ??= getOwnDemoStatus()
    .then((status) => status.isDemo === true)
    .catch(() => {
      demoStatusRequest = null;
      return false;
    });
  return demoStatusRequest;
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
  const roleCode = useAuthStore((s) => s.user?.role?.code);
  const permissions = useMemo(() => storePermissions ?? [], [storePermissions]);
  const [moduleTree, setModuleTree] = useState<PermissionModule[]>([]);
  const [treeLoaded, setTreeLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadModuleTree().then((tree) => {
      if (!cancelled) {
        setModuleTree(tree);
        setTreeLoaded(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // El operador de la plataforma no tiene organización propia (igual que en
  // `DemoBanner`, no se pregunta).
  const [isDemo, setIsDemo] = useState(false);
  useEffect(() => {
    if (!roleCode || roleCode === 'PLATFORM_OPERATOR') return;
    let cancelled = false;
    loadIsDemo().then((value) => {
      if (!cancelled) setIsDemo(value);
    });
    return () => {
      cancelled = true;
    };
  }, [roleCode]);

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
      if (access.roles && !(roleCode && access.roles.includes(roleCode))) return false;
      if (access.demoOnly && !isDemo) return false;
      if (access.requiredAllModules) return access.requiredAllModules.every(canRead);
      if (access.requiredModules) return access.requiredModules.some(canRead);
      if (access.requiredModuleOrChildren) {
        return canReadModuleOrChildren(access.requiredModuleOrChildren);
      }
      return access.requiredModule ? canRead(access.requiredModule) : true;
    },
    [canRead, canReadModuleOrChildren, roleCode, isDemo],
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

  /**
   * ¿Puede la persona ABRIR esta dirección? Misma regla del menú, salvo el
   * filtro por rol (`roles`), que solo decide qué enlaces se ofrecen: "Mi
   * panel" no se le ofrece a un administrador, pero puede abrirlo.
   * Una dirección que no pertenece a ninguna sección del menú se deja pasar.
   */
  const routeAccess = useCallback(
    (pathname: string): RouteAccess => {
      const item = findActiveItem(pathname);

      const allows = (access: NavAccess): RouteAccess | boolean => {
        if (access.requiredAllModules) return access.requiredAllModules.every(canRead);
        if (access.requiredModules) return access.requiredModules.some(canRead);
        if (access.requiredModuleOrChildren) {
          // Hace falta el catálogo para conocer los módulos hijos. Si no se
          // pudo cargar, no se bloquea a ciegas: decide el servidor.
          if (!treeLoaded) return 'pending';
          if (moduleTree.length === 0) return true;
          return canReadModuleOrChildren(access.requiredModuleOrChildren);
        }
        return access.requiredModule ? canRead(access.requiredModule) : true;
      };

      if (!item) {
        const unlisted = findUnlistedRoute(pathname);
        return !unlisted || allows(unlisted) === true ? 'allowed' : 'denied';
      }

      const itemAccess = allows(item);
      if (itemAccess === 'pending') return 'pending';
      if (!itemAccess) return 'denied';

      const tab = findActiveTab(item, pathname);
      if (!tab) return 'allowed';
      // Igual que en el menú: dentro de una sección que se abre por el módulo
      // padre o cualquiera de sus hijos, las pestañas quedan todas visibles.
      if (item.requiredModuleOrChildren !== undefined) return 'allowed';
      return allows(tab) ? 'allowed' : 'denied';
    },
    [canRead, canReadModuleOrChildren, moduleTree, treeLoaded],
  );

  return { canSeeItem, canSeeTab, visibleTabs, hrefOf, routeAccess };
}
