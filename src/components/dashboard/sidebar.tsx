'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { LifeBuoy, ChevronRight, X } from 'lucide-react';
import { useBrandingStore } from '@/store/branding-store';
import { DEFAULT_BRANDING } from '@/lib/api/branding';
import { useNavAccess } from '@/hooks/use-nav-access';
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
  const isGroupOpen = (label: string) => toggled[label] ?? label === activeGroupLabel;
  const toggleGroup = (label: string) => {
    setToggled((prev) => ({ ...prev, [label]: !(prev[label] ?? label === activeGroupLabel) }));
  };

  return (
    <div className="flex flex-col h-full bg-primary text-white border-r border-slate-800">
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Cerrar menú"
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

      <nav aria-label="Principal" className="flex-1 px-4 overflow-y-auto py-2 space-y-1 scrollbar-hide">
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
            v1.2.0 • 2026
          </p>
        </div>
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
          ? 'bg-secondary text-secondary-foreground shadow-lg shadow-black/20 font-bold'
          : 'text-slate-300 hover:text-white hover:bg-white/10',
      )}
    >
      <div className="flex items-center flex-1 z-10">
        <item.icon
          className={cn(
            'h-5 w-5 mr-3',
            isActive ? 'text-secondary-foreground' : 'text-secondary',
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
              hasActiveChild || isOpen ? 'text-secondary' : 'text-slate-400',
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
                    ? 'bg-secondary text-secondary-foreground font-bold shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-white/5',
                )}
              >
                <child.icon
                  className={cn(
                    'h-4 w-4 mr-3',
                    isActive
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
