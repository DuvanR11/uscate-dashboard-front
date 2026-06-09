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
  Scale,
  BrainCircuit,
  Landmark,
  PenTool,
  TrendingUp,
  Award,
  ClipboardList,
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

interface Route {
  label: string;
  icon: any;
  href?: string;
  requiredModule?: string;
  children?: Route[];
}

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
      { label: 'Estadísticas', icon: BarChart3, href: '/inteligencia/estadisticas' },
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
      { label: 'Peticiones (Lista)', icon: Scale, href: '/peticiones', requiredModule: 'PETICIONES' },
      { label: 'Redactor IA', icon: PenTool, href: '/peticiones/crear', requiredModule: 'PETICIONES' },
      { label: 'Fichas Digitales', icon: Scale, href: '/projects', requiredModule: 'PETICIONES' },
      { label: 'Entrenar IA', icon: BrainCircuit, href: '/peticiones/memoria', requiredModule: 'ENTRENAR_IA' },
      { label: 'Solicitudes', icon: FileText, href: '/requests' },
    ],
  },
  {
    label: 'Productividad',
    icon: TrendingUp,
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
      { label: 'Plan', icon: Settings, href: '/organization/plan', requiredModule: 'PLAN' },
    ],
  },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const { user } = useAuthStore();
  const [openMenus, setOpenMenus] = useState<string[]>([]);

  const userPermissions = user?.permissions || [];

  const canAccessModule = useCallback(
    (moduleName?: string) => {
      if (!moduleName) return true;

      return userPermissions.some(
        (p: any) => p.module === moduleName && p.canRead === true,
      );
    },
    [userPermissions],
  );

  const canAccessAnySolicitud = useCallback(() => {
    return (
      canAccessModule('SOLICITUDES_INTERNAS') ||
      canAccessModule('SOLICITUDES_LEGISLATIVAS') ||
      canAccessModule('SOLICITUDES_SEGURIDAD') ||
      canAccessModule('SOLICITUDES_GLOBAL')
    );
  }, [canAccessModule]);

  const canAccessAnyProductivity = useCallback(() => {
    return (
      canAccessModule('PRODUCTIVIDAD') ||
      canAccessModule('PRODUCTIVIDAD_GLOBAL') ||
      canAccessModule('PRODUCTIVIDAD_REPORTES') ||
      canAccessModule('PRODUCTIVIDAD_RANKING')
    );
  }, [canAccessModule]);

  const canAccessRoute = useCallback(
    (route: Route, parentRequiredModule?: string) => {
      if (route.href === '/requests' || route.label === 'Solicitudes') {
        return canAccessAnySolicitud();
      }

      if (route.href?.startsWith('/productivity') || route.label === 'Productividad') {
        return canAccessAnyProductivity();
      }

      return canAccessModule(route.requiredModule || parentRequiredModule);
    },
    [canAccessModule, canAccessAnySolicitud, canAccessAnyProductivity],
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
          canAccessRoute(child, route.requiredModule),
        );

        return visibleChildren.length > 0;
      }

      return canAccessRoute(route);
    });
  }, [canAccessRoute]);

  return (
    <div className="flex flex-col h-full bg-[#1B2541] text-white border-r border-slate-800">
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
            src="/imgs/logo.png"
            alt="Logo Uscátegui"
            width={200}
            height={50}
            className="object-contain p-1"
          />
        </Link>
      </div>

      <div className="flex-1 px-4 overflow-y-auto py-2 space-y-1 scrollbar-hide">
        {filteredRoutes.map((route) => {
          const visibleChildren = route.children
            ? route.children.filter((child) =>
                canAccessRoute(child, route.requiredModule),
              )
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
                        isParentActive || isOpen ? 'text-[#FFC400]' : 'text-slate-400',
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
                              ? 'bg-[#FFC400] text-[#1B2541] font-bold shadow-sm'
                              : 'text-slate-400 hover:text-white hover:bg-white/5',
                          )}
                        >
                          <child.icon
                            className={cn(
                              'h-4 w-4 mr-3',
                              isChildActive
                                ? 'text-[#1B2541]'
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
                  ? 'bg-[#FFC400] text-[#1B2541] shadow-lg shadow-black/20 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10',
              )}
            >
              <div className="flex items-center flex-1 z-10">
                <route.icon
                  className={cn(
                    'h-5 w-5 mr-3',
                    isActive ? 'text-[#1B2541]' : 'text-[#FFC400]',
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