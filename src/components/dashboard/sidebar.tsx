'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LifeBuoy, ChevronRight, X } from 'lucide-react';
import { useBrandingStore } from '@/store/branding-store';
import { DEFAULT_BRANDING } from '@/lib/api/branding';
import { useNavAccess } from '@/hooks/use-nav-access';
import { useAuthStore } from '@/store/auth-store';
import { landingPathFor } from '@/lib/landing';
import {
  NAVIGATION,
  findActiveItem,
  isGroup,
  type NavGroup,
  type NavItem,
} from '@/lib/navigation';

// Fase 2 "Menú y nombres" (2026-10-06): el contenido del menú vive en
// `lib/navigation.ts` y la regla de visibilidad en `hooks/use-nav-access.ts`
// (compartida con las pestañas de sección). Este componente solo dibuja.

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname() ?? '';
  // El logo lleva a la pantalla de inicio de CADA persona: quien no ve el
  // Tablero (voluntario, recolector de firmas) caía en "No tienes permisos".
  const user = useAuthStore((state) => state.user);
  const homePath = landingPathFor(user);
  const supportCustomer = useAuthStore(s => ['ADMIN', 'SUPER_ADMIN'].includes(s.user?.role?.code ?? ''));
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const { canSeeItem, hrefOf } = useNavAccess();

  // Personalización de Marca: para cuando este componente se monta,
  // `(dashboard)/layout.tsx` ya esperó a que el branding cargara; el `??` es
  // solo una red de seguridad.
  const branding = useBrandingStore((s) => s.branding);
  const logoUrl = branding?.logoUrl ?? DEFAULT_BRANDING.logoUrl;
  const applicationName = branding?.applicationName ?? DEFAULT_BRANDING.applicationName;

  // Un solo ítem activo: el de la coincidencia más larga con la ruta actual.
  const activeItem = useMemo(() => findActiveItem(pathname), [pathname]);

  const entries = useMemo(
    () =>
      NAVIGATION.map((entry) =>
        isGroup(entry)
          ? { ...entry, children: entry.children.filter(canSeeItem) }
          : entry,
      ).filter((entry) => (isGroup(entry) ? entry.children.length > 0 : canSeeItem(entry))),
    [canSeeItem],
  );

  // El grupo de la pantalla actual se muestra abierto; lo que el usuario
  // abre o cierra a mano se respeta por encima de eso.
  const activeGroupLabel = useMemo(
    () =>
      NAVIGATION.find(
        (entry): entry is NavGroup =>
          isGroup(entry) && activeItem !== null && entry.children.includes(activeItem),
      )?.label,
    [activeItem],
  );
  // En un portátil el menú no cabe entero y se desplaza: al entrar a una
  // pantalla se lleva a la vista su enlace, que podía quedar escondido abajo.
  const navRef = useRef<HTMLElement>(null);
  useEffect(() => {
    navRef.current
      ?.querySelector('[aria-current="page"]')
      ?.scrollIntoView({ block: 'nearest' });
  }, [pathname, entries.length]);

  const isGroupOpen = (label: string) => toggled[label] ?? label === activeGroupLabel;
  const toggleGroup = (label: string) => {
    setToggled((prev) => ({ ...prev, [label]: !(prev[label] ?? label === activeGroupLabel) }));
  };

  return (
    <div className="flex flex-col h-full bg-sidebar text-sidebar-foreground border-r border-sidebar-border">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
          className="absolute top-4 right-4 md:hidden text-slate-400 hover:text-white"
        >
          <X size={24} />
        </button>
      )}

      {/* En pantallas bajas (portátiles) el logo se achica para dejarle sitio al menú. */}
      <div className="px-6 py-6 [@media(max-height:820px)]:py-3">
        <Link href={homePath} className="flex items-center pl-2" onClick={onClose}>
          <Image
            src={logoUrl}
            alt={`Logo ${applicationName}`}
            width={200}
            height={50}
            unoptimized
            className="object-contain p-1 [@media(max-height:820px)]:max-h-24 [@media(max-height:820px)]:w-auto"
          />
        </Link>
      </div>

      <nav ref={navRef} aria-label="Principal" className="flex-1 px-4 overflow-y-auto py-2 space-y-1 scrollbar-hide">
        {entries.map((entry) =>
          isGroup(entry) ? (
            <GroupLinks
              key={entry.label}
              group={entry}
              isOpen={isGroupOpen(entry.label)}
              activeItem={activeItem}
              hrefOf={hrefOf}
              onToggle={() => toggleGroup(entry.label)}
              onNavigate={onClose}
            />
          ) : (
            <TopLink
              key={entry.label}
              item={entry}
              href={hrefOf(entry)}
              isActive={activeItem === entry}
              onNavigate={onClose}
            />
          ),
        )}
      </nav>

      {/* Un solo botón: la tarjeta anterior ocupaba unos 180 px y, en pantallas
          de portátil, dejaba el final del menú fuera de la vista. */}
      <div className="px-4 pb-3 pt-2 mt-auto">
        {supportCustomer && <Link href="/organization/support" onClick={onClose} className="mb-2 block rounded-lg border p-2 text-center text-sm">Mis solicitudes de soporte</Link>}
        <button
          onClick={() => window.open('https://wa.me/573203057406', '_blank')}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-red-600/50 bg-gradient-to-br from-red-700 to-red-900 px-3 py-2.5 text-xs font-bold uppercase tracking-wide text-white shadow-sm transition hover:from-red-600 hover:to-red-800 focus-visible:outline-2 focus-visible:outline-white cursor-pointer"
        >
          <LifeBuoy className="h-4 w-4" aria-hidden="true" />
          Soporte técnico
        </button>

        <p className="mt-2 text-center text-[10px] text-slate-500 font-mono">
          v1.2.0 • 2026
        </p>
      </div>
    </div>
  );
}

function TopLink({
  item,
  href,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  href: string;
  isActive: boolean;
  onNavigate?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onNavigate}
      aria-current={isActive ? 'page' : undefined}
      className={cn(
        'text-sm group flex p-3 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200 relative overflow-hidden',
        isActive
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-black/20 font-bold'
          : 'text-slate-300 hover:text-white hover:bg-white/10',
      )}
    >
      <div className="flex items-center flex-1 z-10">
        <item.icon
          className={cn(
            'h-5 w-5 mr-3',
            isActive ? 'text-sidebar-primary-foreground' : 'text-sidebar-ring',
          )}
        />
        {item.label}
      </div>

      {isActive && <div className="absolute right-0 top-0 h-full w-1 bg-white/20" />}
    </Link>
  );
}

function GroupLinks({
  group,
  isOpen,
  activeItem,
  hrefOf,
  onToggle,
  onNavigate,
}: {
  group: NavGroup;
  isOpen: boolean;
  activeItem: NavItem | null;
  hrefOf: (item: NavItem) => string;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const hasActiveChild = activeItem !== null && group.children.includes(activeItem);

  return (
    <div className="space-y-1">
      <button
        onClick={onToggle}
        aria-expanded={isOpen}
        className={cn(
          'text-sm group flex p-3 w-full items-center justify-between font-medium cursor-pointer rounded-lg transition-all duration-200 hover:bg-white/10',
          hasActiveChild ? 'text-white bg-white/5' : 'text-slate-300',
        )}
      >
        <div className="flex items-center">
          <group.icon
            className={cn(
              'h-5 w-5 mr-3',
              hasActiveChild || isOpen ? 'text-sidebar-ring' : 'text-slate-400',
            )}
          />
          {group.label}
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
          {group.children.map((child) => {
            const isActive = activeItem === child;

            return (
              <Link
                key={child.label}
                href={hrefOf(child)}
                onClick={onNavigate}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'text-sm group flex p-2 w-full justify-start font-medium cursor-pointer rounded-lg transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                <child.icon
                  className={cn(
                    'h-4 w-4 mr-3',
                    isActive
                      ? 'text-sidebar-primary-foreground'
                      : 'text-slate-500 group-hover:text-white',
                  )}
                />
                {child.label}
                {child.ai && (
                  <span className="ml-auto rounded bg-ai px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-ai-foreground">
                    IA
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
