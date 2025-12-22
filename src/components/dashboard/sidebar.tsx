'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, Users, Map, CalendarDays, 
  FileText, Settings, ShieldAlert, LifeBuoy,
  ChevronDown, ChevronRight, Briefcase,
  Megaphone, MessageCircle, Mail, MessageSquare, 
  Database, Globe
} from 'lucide-react';
import { useAuthStore } from '@/store/auth-store';

// Tipos de roles permitidos
type Role = 'SUPER_ADMIN' | 'ADMIN' | 'SECRETARY' | 'LEGISLATIVE' | 'LEADER';

interface Route {
  label: string;
  icon: any;
  href?: string;
  allowedRoles: Role[];
  children?: Route[];
}

// --- CONFIGURACIÓN DE RUTAS CON ICONOS CORREGIDOS ---
const routes: Route[] = [
  { 
    label: 'Dashboard', 
    icon: LayoutDashboard, 
    href: '/dashboard',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN'] 
  },
  { 
    label: 'Operación',
    icon: Briefcase,
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'LEGISLATIVE', 'LEADER'],
    children: [
        { 
            label: 'Prospectos', 
            icon: Users, 
            href: '/prospects',
            allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'LEGISLATIVE', 'LEADER'] 
        },
        { 
            label: 'Agenda', 
            icon: CalendarDays, 
            href: '/calendar',
            allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY'] 
        },
        { 
            label: 'Mapa', 
            icon: Map, 
            href: '/map',
            allowedRoles: ['SUPER_ADMIN', 'ADMIN'] 
        },
    ]
  },
  { 
    label: 'Solicitudes', 
    icon: FileText, 
    href: '/requests',
    allowedRoles: ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'LEGISLATIVE'] 
  },
  { 
    label: 'Difusiones', 
    icon: Megaphone, // Icono de Megáfono
    allowedRoles:  ['SUPER_ADMIN', 'ADMIN'],
    children: [
        { 
            label: 'WhatsApp', 
            icon: MessageCircle, 
            href: '/campaigns/whatsapp', 
            allowedRoles: ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'Meta API', 
            icon: Globe, 
            href: '/campaigns/whatsapp-meta', 
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'Correos', 
            icon: Mail, 
            href: '/campaigns/email', 
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'SMS', 
            icon: MessageSquare, 
            href: '/campaigns/sms', 
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'Informes', 
            icon: MessageSquare, 
            href: '/campaigns/reports', 
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN'] 
        },
    ]
  },
  { 
    label: 'Administración', 
    icon: Settings,
    allowedRoles:  ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'LEGISLATIVE', 'LEADER'],
    children: [
        { 
            label: 'Usuarios', 
            icon: ShieldAlert, 
            href: '/users', 
            allowedRoles: ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'Catálogos', 
            icon: Database, 
            href: '/catalogs', 
            allowedRoles: ['SUPER_ADMIN', 'ADMIN'] 
        },
        { 
            label: 'Perfil', 
            icon: Settings, 
            href: '/profile',
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN', 'SECRETARY', 'LEGISLATIVE', 'LEADER'] 
        },
        { 
            label: 'Plan', 
            icon: Settings, 
            href: '/organization/plan',
            allowedRoles:  ['SUPER_ADMIN', 'ADMIN'] 
        },
    ]
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuthStore();
  
  // Cambiamos el estado a un array de strings para permitir múltiples abiertos
  const [openMenus, setOpenMenus] = useState<string[]>([]); 
  
  const userRole = user?.role?.code as Role;

  // Función para alternar submenús (Modo: Múltiples abiertos)
  const toggleMenu = (label: string) => {
    setOpenMenus(prev => 
      prev.includes(label) 
        ? prev.filter(item => item !== label) // Si está abierto, lo cierra
        : [...prev, label] // Si está cerrado, lo agrega (abre)
    );
  };

  // Efecto: Abrir automáticamente el menú donde está la ruta actual
  useEffect(() => {
    if (!pathname) return;
    
    const newOpenMenus = new Set(openMenus); // Usamos Set para evitar duplicados
    let changed = false;

    for (const route of routes) {
        if (route.children) {
            // Verificar si algún hijo coincide con la ruta actual
            const isChildActive = route.children.some(child => 
                child.href === pathname || pathname.startsWith(child.href!)
            );
            
            if (isChildActive && !newOpenMenus.has(route.label)) {
                newOpenMenus.add(route.label);
                changed = true;
            }
        }
    }

    if (changed) {
        setOpenMenus(Array.from(newOpenMenus));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]); // Solo se ejecuta si cambia la ruta

  // Filtro de seguridad por Rol
  const filteredRoutes = routes.filter(route => {
      // 1. Permiso del Padre
      const hasPermission = userRole ? route.allowedRoles.includes(userRole) : false;
      if (!hasPermission) return false;

      // 2. Si tiene hijos, filtrar hijos y verificar que quede al menos uno
      if (route.children) {
          const visibleChildren = route.children.filter(child => 
              userRole ? child.allowedRoles.includes(userRole) : false
          );
          return visibleChildren.length > 0;
      }

      return true;
  });

  return (
    <div className="flex flex-col h-full bg-[#1B2541] text-white border-r border-slate-800">
      
      {/* --- HEADER --- */}
      <div className="px-6 py-6">
        <Link href="/dashboard" className="flex items-center pl-2">
          <div className="relative w-10 h-10 mr-3 bg-white rounded-xl flex items-center justify-center text-[#1B2541] font-black text-xl shadow-[0_0_15px_rgba(255,196,0,0.3)]">
            U
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold tracking-wider uppercase leading-none">
              Uscátegui
            </h1>
            <span className="text-[10px] font-bold text-[#FFC400] tracking-widest uppercase mt-0.5">
              Equipo de Seguridad
            </span>
          </div>
        </Link>
      </div>

      {/* --- NAVEGACIÓN --- */}
      <div className="flex-1 px-4 overflow-y-auto py-2 space-y-1 scrollbar-hide">
        {filteredRoutes.map((route) => {
          
          // Lógica para filtrar hijos nuevamente al renderizar
          const visibleChildren = route.children 
            ? route.children.filter(child => userRole && child.allowedRoles.includes(userRole))
            : [];

          // CASO A: TIENE SUBMÓDULOS
          if (visibleChildren.length > 0) {
             const isOpen = openMenus.includes(route.label);
             const isParentActive = visibleChildren.some(child => child.href === pathname);

             return (
                <div key={route.label} className="space-y-1">
                    {/* Botón Padre (Collapsible) */}
                    <button
                        onClick={() => toggleMenu(route.label)}
                        className={cn(
                            "text-sm group flex p-3 w-full items-center justify-between font-medium cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/10",
                            isParentActive 
                                ? "text-white bg-white/5" 
                                : "text-slate-300"
                        )}
                    >
                        <div className="flex items-center">
                            <route.icon className={cn("h-5 w-5 mr-3", (isParentActive || isOpen) ? "text-[#FFC400]" : "text-slate-400")} />
                            {route.label}
                        </div>
                        {/* Flecha con rotación animada */}
                        <ChevronRight size={16} className={cn("transition-transform duration-200 text-slate-500", isOpen && "rotate-90")} />
                    </button>

                    {/* Lista de Hijos */}
                    {isOpen && (
                        <div className="space-y-1 ml-3 pl-3 border-l border-white/10 animate-in slide-in-from-left-2 duration-300">
                            {visibleChildren.map((child) => {
                                const isChildActive = pathname === child.href;
                                return (
                                    <Link
                                        key={child.href}
                                        href={child.href!}
                                        className={cn(
                                            "text-sm group flex p-2 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200",
                                            isChildActive 
                                                ? "bg-[#FFC400] text-[#1B2541] font-bold shadow-sm" 
                                                : "text-slate-400 hover:text-white hover:bg-white/5"
                                        )}
                                    >
                                        <child.icon className={cn("h-4 w-4 mr-3", isChildActive ? "text-[#1B2541]" : "text-slate-500 group-hover:text-white")} />
                                        {child.label}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>
             );
          }

          // CASO B: RUTA NORMAL (SIN HIJOS)
          const isActive = pathname === route.href || pathname.startsWith(`${route.href}/`);
          
          return (
            <Link
              key={route.href}
              href={route.href!}
              className={cn(
                "text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200 relative overflow-hidden",
                isActive 
                  ? "bg-[#FFC400] text-[#1B2541] shadow-lg shadow-black/20 font-bold" 
                  : "text-slate-300 hover:text-white hover:bg-white/10"
              )}
            >
              <div className="flex items-center flex-1 z-10">
                <route.icon className={cn("h-5 w-5 mr-3", isActive ? "text-[#1B2541]" : "text-[#FFC400]")} />
                {route.label}
              </div>
              
              {isActive && (
                  <div className="absolute right-0 top-0 h-full w-1 bg-white/20" />
              )}
            </Link>
          )
        })}
      </div>
      
      {/* --- FOOTER --- */}
      <div className="p-4 mt-auto">
        <div className="bg-gradient-to-br from-red-700 to-red-900 rounded-xl p-4 text-center border border-red-600/50 shadow-lg">
            <div className="bg-white/10 w-8 h-8 rounded-full flex items-center justify-center mx-auto mb-2">
                <LifeBuoy className="h-4 w-4 text-white" />
            </div>
            <p className="text-xs text-white/90 font-medium mb-3">
                ¿Necesitas soporte?
            </p>
            <button 
                onClick={() => window.open('https://wa.me/573000000000', '_blank')}
                className="text-[10px] bg-white text-red-800 font-bold py-2 px-3 rounded-lg w-full hover:bg-red-50 transition shadow-sm uppercase tracking-wide"
            >
                Contactar Técnica
            </button>
        </div>
        
        <div className="mt-4 flex justify-center">
            <p className="text-[10px] text-slate-500 font-mono">
                v1.0.4 • 2025
            </p>
        </div>
      </div>

    </div>
  );
}