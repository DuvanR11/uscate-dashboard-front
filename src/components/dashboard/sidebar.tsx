'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import {
  LayoutDashboard,
  Users,
  Map,
  CalendarDays,
  FileText,
  Settings,
  ShieldAlert,
  LifeBuoy,
  ChevronRight,
  Briefcase,
  Megaphone,
  MessageCircle,
  Mail,
  MessageSquare,
  Database,
  Globe,
  Bird,
  Target,
  Eye,
  Settings2,
  HelpCircle,
  BarChart3,
  X,
  Network,
  Mic,
  Radar,
  Scale,
  BrainCircuit,
  Landmark,
  TrendingUp,
  Award,
  ClipboardList,
  KeyRound,
  FolderOpen,
  Gavel,
  Paintbrush,
  Building2,
  Link2,
  ScanLine,
  Fingerprint,
  UserSearch,
  Radio,
  History,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';
import { useBrandingStore } from '@/store/branding-store';
import { DEFAULT_BRANDING } from '@/lib/api/branding';
import { getPermissionModules, type PermissionModule } from '@/lib/api/permissions';

interface Route {
  label: string;
  icon: any;
  href?: string;
  /** Chequeo simple: el usuario necesita `canRead` exactamente en este módulo. */
  requiredModule?: string;
  /**
   * Chequeo "cualquiera de estos módulos" para hermanos sin padre común en el
   * catálogo (caso real hoy: los 4 `SOLICITUDES_*`). Lista explícita porque
   * la jerarquía de `GET /permissions/modules` no los agrupa.
   */
  requiredModules?: string[];
  /**
   * Chequeo "este módulo o cualquiera de sus hijos reales en el árbol"
   * (caso real hoy: `PRODUCTIVIDAD_GLOBAL`, que sí tiene descendientes en el
   * catálogo sembrado). Se resuelve recorriendo `GET /permissions/modules`.
   */
  requiredModuleOrChildren?: string;
  children?: Route[];
}

/**
 * Los 4 módulos de Solicitudes son hermanos sin padre común en el catálogo
 * sembrado (a propósito: `SOLICITUDES_GLOBAL` significa "todos los tipos",
 * no es un contenedor de menú) — no se pueden resolver recorriendo el árbol,
 * por eso viven como constante explícita en vez de con `requiredModuleOrChildren`.
 */
const SOLICITUDES_MODULES = [
  'SOLICITUDES_GLOBAL',
  'SOLICITUDES_INTERNAS',
  'SOLICITUDES_LEGISLATIVAS',
  'SOLICITUDES_SEGURIDAD',
];

const routes: Route[] = [
  {
    label: 'Dashboard',
    icon: LayoutDashboard,
    href: '/dashboard',
    requiredModule: 'DASHBOARD',
  },
  {
    label: 'Prospectos',
    icon: Users,
    href: '/prospects',
    requiredModule: 'PROSPECTOS',
  },
  {
    label: 'Operación',
    icon: Briefcase,
    requiredModule: 'OPERACION',
    children: [
      { label: 'Agenda', icon: CalendarDays, href: '/calendar', requiredModule: 'AGENDA' },
      // Gap post-M4 cerrado (ver memoria `deuda-multitenant-crm`): generador
      // de links/QR de check-in por evento. Mismo módulo que 'Agenda' — opera
      // sobre el mismo `Event`, no es un permiso nuevo.
      { label: 'Logística', icon: ScanLine, href: '/dashboard/logistics', requiredModule: 'AGENDA' },
      { label: 'Mapa', icon: Map, href: '/map', requiredModule: 'MAPA' },
      { label: 'Contabilidad', icon: Users, href: '/signatures', requiredModule: 'CONTABILIDAD' },
    ],
  },
  {
    label: 'Predictivas IA',
    icon: BrainCircuit,
    requiredModule: 'INTELIGENCIA',
    children: [
      { label: 'Mapa Predictivo', icon: Map, href: '/inteligencia' },
      {
        label: 'Monitoreo de Etiquetas',
        icon: Radar,
        href: '/inteligencia/monitoreo',
        requiredModule: 'MONITOREO_PREDICTIVO',
      },
      { label: 'Estadísticas', icon: BarChart3, href: '/inteligencia/estadisticas' },
      {
        label: 'Estadísticas de redes',
        icon: BarChart3,
        href: '/estadisticas-redes',
        requiredModule: 'ESTADISTICAS_REDES',
      },
      { label: 'Mapa de vínculos', icon: Network, href: '/inteligencia/redes' },
      { label: 'Ingesta manual', icon: Database, href: '/inteligencia/ingesta' },
      { label: 'Parámetros de discurso', icon: Mic, href: '/inteligencia/plenarias' },
      { label: 'Búsquedas', icon: Users, href: '/inteligencia/expedientes' },
    ],
  },
  {
    label: 'Campaña - Oficina',
    icon: Landmark,
    requiredModule: 'OFICINA',
    children: [
      // Plan "Cadena de Firma", Fase 5 (2026-09-03) — decisión de producto
      // confirmada con el usuario: "Redactor IA" (/peticiones/crear →
      // /peticiones/[id]) se retira del sidebar. Cubría el mismo dominio
      // que esta pantalla pero nunca llegó a tener firma ni aprobar/
      // rechazar — "Peticiones (Lista)" ya cubre el flujo completo
      // (crear/editar/firmar/aprobar), así que queda como la única
      // pantalla real del módulo.
      { label: 'Derechos de Petición', icon: Scale, href: '/peticiones', requiredModule: 'PETICIONES' },
      { label: 'Fichas Digitales', icon: Scale, href: '/projects', requiredModule: 'PROYECTOS_LEY' },
      { label: 'Entrenar IA', icon: BrainCircuit, href: '/peticiones/memoria', requiredModule: 'ENTRENAR_IA' },
      { label: 'Gestión Documental', icon: FolderOpen, href: '/documentos', requiredModule: 'GESTION_DOCUMENTAL' },
      { label: 'Denuncias y Demandas', icon: Gavel, href: '/denuncias', requiredModule: 'DENUNCIAS_DEMANDAS' },
      { label: 'Solicitudes', icon: FileText, href: '/requests', requiredModules: SOLICITUDES_MODULES },
    ],
  },
  {
    label: 'Productividad',
    icon: TrendingUp,
    requiredModuleOrChildren: 'PRODUCTIVIDAD_GLOBAL',
    children: [
      {
        label: 'Ranking',
        icon: Award,
        href: '/users/productivity/ranking',
        requiredModule: 'PRODUCTIVIDAD_RANKING',
      },
      {
        label: 'Reportes',
        icon: BarChart3,
        href: '/users/productivity/reports',
        requiredModule: 'PRODUCTIVIDAD_REPORTES',
      },
      // {
      //   label: 'Seguimiento',
      //   icon: ClipboardList,
      //   href: '/users/users',
      //   requiredModule: 'PRODUCTIVIDAD',
      // },
    ],
  },
  {
    label: 'Buhos',
    icon: Bird,
    requiredModule: 'GAMIFICACION',
    children: [
      { label: 'Dashboard', icon: LayoutDashboard, href: '/gamification/dashboard' },
      { label: 'Administración', icon: Settings2, href: '/gamification/admin', requiredModule: 'GAMIFICACION_ADMIN' },
      { label: 'Auditoria', icon: Eye, href: '/gamification/audit', requiredModule: 'GAMIFICACION_AUDITORIA' },
      { label: 'Misiones', icon: Target, href: '/gamification', requiredModule: 'MISIONES' },
      { label: 'Historico', icon: Target, href: '/gamification/historico' },
      { label: 'Preguntas', icon: HelpCircle, href: '/gamification/questions' },
    ],
  },
  {
    label: 'Difusiones',
    icon: Megaphone,
    requiredModule: 'DIFUSIONES',
    children: [
      { label: 'WhatsApp', icon: MessageCircle, href: '/campaigns/whatsapp' },
      { label: 'Meta API', icon: Globe, href: '/campaigns/whatsapp-meta' },
      { label: 'Email Marketing', icon: Mail, href: '/campaigns/email' },
      { label: 'SMS - SMS Flash', icon: MessageSquare, href: '/campaigns/sms' },
      { label: 'Estadísticas difusión', icon: BarChart3, href: '/campaigns/reports' },
    ],
  },
  {
    label: 'Administración',
    icon: Settings,
    requiredModule: 'CONFIGURACION',
    children: [
      { label: 'Usuarios', icon: ShieldAlert, href: '/users', requiredModule: 'USUARIOS' },
      { label: 'Catálogos', icon: Database, href: '/catalogs', requiredModule: 'CATALOGOS' },
      { label: 'Perfil', icon: Users, href: '/profile' },
      // Sin `requiredModule` a propósito, mismo criterio que 'Perfil': el
      // backend (`GET /organization/profile`) no exige ningún permiso
      // especial, solo una organización válida en el JWT (gap post-M4, ver
      // memoria `deuda-multitenant-crm`).
      { label: 'Enlaces públicos', icon: Link2, href: '/organization/links' },
      { label: 'Plan', icon: Settings, href: '/organization/plan', requiredModule: 'PLAN' },
      {
        label: 'Personalización',
        icon: Paintbrush,
        href: '/organization/branding',
        requiredModule: 'PERSONALIZACION',
      },
      // `/roles` protegido directo con `CONFIGURACION` (no un submódulo
      // nuevo): así es como el backend guarda de verdad los endpoints de
      // `RolesController` (ver `RequirePermissions({ module: 'CONFIGURACION' })`
      // en `api-uscate-back/src/modules/roles/roles.controller.ts`).
      { label: 'Roles y Plantillas', icon: KeyRound, href: '/roles', requiredModule: 'CONFIGURACION' },
    ],
  },
  // Panel de administración de plataforma — cruzado de organización, solo
  // visible para el rol PLATFORM_OPERATOR (módulo PLATAFORMA, ver informe
  // "Gating por Plan"). Raíz propia, no un submenú de "Administración": esa
  // sección es autoservicio de la PROPIA organización, esto administra
  // CUALQUIER organización.
  {
    label: 'Plataforma',
    icon: Building2,
    href: '/platform',
    requiredModule: 'PLATAFORMA',
  },
  // Arquitectura OSINT Investigativo — las 10 fases de backend (Casos,
  // Evidencia, Resolución de entidades con embeddings, Relaciones, Grafo,
  // Indicadores, Monitores/Alertas) ya están cerradas; esta es su primera
  // UI real. Raíz propia, no submenú de "Predictivas IA": ese grupo ya
  // tiene su propio INVESTIGACION histórico (búsquedas ad-hoc en
  // /inteligencia/expedientes), que sigue existiendo sin tocarse — este es
  // un sistema de casos distinto, con su propio par de permisos exclusivos
  // de SUPER_ADMIN (`OSINT_CASOS`/`OSINT_ENTITY_RESOLUTION`, ver
  // scripts/backfill-role-permissions.ts).
  {
    label: 'Investigación OSINT',
    icon: Fingerprint,
    requiredModules: ['OSINT_CASOS', 'OSINT_ENTITY_RESOLUTION'],
    children: [
      { label: 'Casos', icon: Briefcase, href: '/osint/casos', requiredModule: 'OSINT_CASOS' },
      {
        label: 'Resolución de entidades',
        icon: UserSearch,
        href: '/osint/entidades',
        requiredModule: 'OSINT_ENTITY_RESOLUTION',
      },
      // Solo lectura — la edición real del catálogo global vive en
      // "Plataforma" (exclusivo PLATFORM_OPERATOR, ver OsintSourceService).
      { label: 'Fuentes', icon: Radio, href: '/osint/fuentes', requiredModule: 'OSINT_CASOS' },
      { label: 'Auditoría', icon: History, href: '/osint/auditoria', requiredModule: 'OSINT_CASOS' },
    ],
  },
];

/** Busca un nodo por `code` en el árbol jerárquico, recursivo. */
function findModuleNode(tree: PermissionModule[], code: string): PermissionModule | undefined {
  for (const node of tree) {
    if (node.code === code) return node;
    if (node.children?.length) {
      const found = findModuleNode(node.children, code);
      if (found) return found;
    }
  }
  return undefined;
}

/** Junta los `code` de todos los descendientes de un nodo, recursivo. */
function collectDescendantCodes(node: PermissionModule): string[] {
  const codes: string[] = [];
  for (const child of node.children || []) {
    codes.push(child.code);
    codes.push(...collectDescendantCodes(child));
  }
  return codes;
}

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openMenus, setOpenMenus] = useState<string[]>([]);
  const [moduleTree, setModuleTree] = useState<PermissionModule[]>([]);

  // Lectura única de los permisos del store — NUNCA leer con `usePermission`
  // (hook) dentro de un recorrido/`.map()` sobre el árbol de rutas.
  const permissions = useAuthStore((s) => s.user?.permissions) || [];

  // Personalización de Marca (Fase 8 — integración global, Tier 1): para
  // cuando este componente se monta, `(dashboard)/layout.tsx` ya esperó a
  // que el branding cargara (ver Fase 5), así que `branding` normalmente NO
  // es null acá — el `??` es solo una red de seguridad extra, no el
  // mecanismo real de fallback (ese vive en el backend, ver §7 del informe).
  const branding = useBrandingStore((s) => s.branding);
  const logoUrl = branding?.logoUrl ?? DEFAULT_BRANDING.logoUrl;
  const applicationName = branding?.applicationName ?? DEFAULT_BRANDING.applicationName;

  useEffect(() => {
    let cancelled = false;

    getPermissionModules()
      .then((tree) => {
        if (!cancelled) setModuleTree(tree);
      })
      .catch(() => {
        // Catálogo aún no disponible (Backend Fase 9 no desplegada, o error
        // de red): el sidebar sigue navegable con lo que ya haya en
        // `permissions`; `canAccessModuleOrChildren` simplemente no
        // encontrará descendientes hasta que el árbol cargue.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const canAccessModule = useCallback(
    (moduleName?: string) => {
      if (!moduleName) return true;

      return permissions.some((p) => p.module === moduleName && p.canRead === true);
    },
    [permissions],
  );

  /** Primitivo genérico real: ¿tiene el usuario `canRead` en alguno de estos módulos? */
  const canAccessAnyOf = useCallback(
    (moduleCodes: string[]) => moduleCodes.some((code) => canAccessModule(code)),
    [canAccessModule],
  );

  /**
   * Caso particular de `canAccessAnyOf` que arma la lista recorriendo el
   * árbol: ¿tiene el usuario `canRead` en `parentCode` o en cualquiera de
   * sus descendientes reales del catálogo (`GET /permissions/modules`)?
   */
  const canAccessModuleOrChildren = useCallback(
    (parentCode: string) => {
      const node = findModuleNode(moduleTree, parentCode);
      const descendantCodes = node ? collectDescendantCodes(node) : [];
      return canAccessAnyOf([parentCode, ...descendantCodes]);
    },
    [moduleTree, canAccessAnyOf],
  );

  const canAccessRoute = useCallback(
    (route: Route, parentRoute?: Route) => {
      if (route.requiredModules) {
        return canAccessAnyOf(route.requiredModules);
      }

      if (route.requiredModuleOrChildren) {
        return canAccessModuleOrChildren(route.requiredModuleOrChildren);
      }

      // Si el grupo padre agrupa un módulo con hijos reales (p. ej.
      // Productividad/PRODUCTIVIDAD_GLOBAL), un hijo también es accesible
      // cuando el usuario tiene el permiso "paraguas" del padre, además de
      // su propio `requiredModule` puntual.
      if (parentRoute?.requiredModuleOrChildren) {
        return (
          canAccessModule(route.requiredModule) ||
          canAccessModuleOrChildren(parentRoute.requiredModuleOrChildren)
        );
      }

      return canAccessModule(route.requiredModule || parentRoute?.requiredModule);
    },
    [canAccessModule, canAccessAnyOf, canAccessModuleOrChildren],
  );

  const toggleMenu = (label: string) => {
    setOpenMenus((prev) =>
      prev.includes(label)
        ? prev.filter((item) => item !== label)
        : [...prev, label],
    );
  };

  useEffect(() => {
    if (!pathname) return;

    const newOpenMenus = new Set(openMenus);
    let changed = false;

    for (const route of routes) {
      if (!route.children) continue;

      const isChildActive = route.children.some(
        (child) =>
          child.href === pathname ||
          (child.href && pathname.startsWith(`${child.href}/`)),
      );

      if (isChildActive && !newOpenMenus.has(route.label)) {
        newOpenMenus.add(route.label);
        changed = true;
      }
    }

    if (changed) {
      setOpenMenus(Array.from(newOpenMenus));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const filteredRoutes = useMemo(() => {
    return routes.filter((route) => {
      if (route.children) {
        const visibleChildren = route.children.filter((child) =>
          canAccessRoute(child, route),
        );

        return visibleChildren.length > 0;
      }

      return canAccessRoute(route);
    });
  }, [canAccessRoute]);

  return (
    <div className="flex flex-col h-full bg-primary text-white border-r border-slate-800">
      {onClose && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>
      )}

      <div className="px-6 py-6">
        <Link href="/dashboard" className="flex items-center pl-2" onClick={onClose}>
          <Image
            src={logoUrl}
            alt={`Logo ${applicationName}`}
            width={200}
            height={50}
            unoptimized
            className="object-contain p-1"
          />
        </Link>
      </div>

      <div className="flex-1 px-4 overflow-y-auto py-2 space-y-1 scrollbar-hide">
        {filteredRoutes.map((route) => {
          const visibleChildren = route.children
            ? route.children.filter((child) => canAccessRoute(child, route))
            : [];

          if (visibleChildren.length > 0) {
            const isOpen = openMenus.includes(route.label);

            const isParentActive = visibleChildren.some(
              (child) =>
                child.href === pathname ||
                (child.href && pathname.startsWith(`${child.href}/`)),
            );

            return (
              <div key={route.label} className="space-y-1">
                <button
                  onClick={() => toggleMenu(route.label)}
                  className={cn(
                    'text-sm group flex p-3 w-full items-center justify-between font-medium cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/10',
                    isParentActive ? 'text-white bg-white/5' : 'text-slate-300',
                  )}
                >
                  <div className="flex items-center">
                    <route.icon
                      className={cn(
                        'h-5 w-5 mr-3',
                        isParentActive || isOpen ? 'text-secondary' : 'text-slate-400',
                      )}
                    />
                    {route.label}
                  </div>

                  <ChevronRight
                    size={16}
                    className={cn(
                      'transition-transform duration-200 text-slate-500',
                      isOpen && 'rotate-90',
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="space-y-1 ml-3 pl-3 border-l border-white/10 animate-in slide-in-from-left-2 duration-300">
                    {visibleChildren.map((child) => {
                      const isChildActive =
                        pathname === child.href ||
                        (child.href && pathname.startsWith(`${child.href}/`));

                      return (
                        <Link
                          key={child.href}
                          href={child.href!}
                          onClick={onClose}
                          className={cn(
                            'text-sm group flex p-2 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200',
                            isChildActive
                              ? 'bg-secondary text-secondary-foreground font-bold shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5',
                          )}
                        >
                          <child.icon
                            className={cn(
                              'h-4 w-4 mr-3',
                              isChildActive
                                ? 'text-secondary-foreground'
                                : 'text-slate-500 group-hover:text-white',
                            )}
                          />
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          const isActive =
            pathname === route.href ||
            (route.href && pathname.startsWith(`${route.href}/`));

          return (
            <Link
              key={route.href}
              href={route.href!}
              onClick={onClose}
              className={cn(
                'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200 relative overflow-hidden',
                isActive
                  ? 'bg-secondary text-secondary-foreground shadow-lg shadow-black/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10',
              )}
            >
              <div className="flex items-center flex-1 z-10">
                <route.icon
                  className={cn(
                    'h-5 w-5 mr-3',
                    isActive ? 'text-secondary-foreground' : 'text-secondary',
                  )}
                />
                {route.label}
              </div>

              {isActive && (
                <div className="absolute right-0 top-0 h-full w-1 bg-white/20" />
              )}
            </Link>
          );
        })}
      </div>

      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-xl p-4 text-center border border-red-600/50 shadow-lg">
          <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
            <LifeBuoy className="h-4 w-4 text-white" />
          </div>

          <p className="text-xs text-white/90 font-medium mb-3">
            ¿Necesitas soporte técnico?
          </p>

          <button
            onClick={() => window.open('https://wa.me/573203057406', '_blank')}
            className="text-[10px] bg-white text-red-800 font-bold py-2 px-3 rounded-lg w-full hover:bg-red-50 transition shadow-sm uppercase tracking-wide cursor-pointer"
          >
            Contactar Técnica
          </button>
        </div>

        <div className="mt-4 flex justify-center">
          <p className="text-[10px] text-slate-500 font-mono">
            v1.1.0 • 2026
          </p>
        </div>
      </div>
    </div>
  );
}