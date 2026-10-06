'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useNavAccess } from '@/hooks/use-nav-access';
import { findActiveItem, findActiveTab } from '@/lib/navigation';

// Fase 2 "Menú y nombres" (2026-10-06): las pantallas de una misma sección
// (antes cada una con su enlace en el menú) se recorren con estas pestañas.
// Se dibuja una sola vez en `(dashboard)/layout.tsx`, a partir de la ruta
// actual, así que ninguna página tuvo que cambiar.
export function SectionTabs() {
  const pathname = usePathname() ?? '';
  const { visibleTabs } = useNavAccess();

  const item = findActiveItem(pathname);
  if (!item?.tabs) return null;

  const tabs = visibleTabs(item);
  // Con una sola pestaña visible no hay nada entre qué elegir.
  if (tabs.length < 2) return null;

  const active = findActiveTab(item, pathname);

  return (
    <nav
      aria-label={item.label}
      className="-mx-4 overflow-x-auto border-b border-slate-200 px-4 sm:mx-0 sm:px-0"
    >
      <ul className="flex min-w-max gap-1">
        {tabs.map((tab) => {
          const isActive = tab === active;
          return (
            <li key={tab.href}>
              <Link
                href={tab.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  '-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-primary',
                  isActive
                    ? 'border-primary text-primary'
                    : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800',
                )}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
