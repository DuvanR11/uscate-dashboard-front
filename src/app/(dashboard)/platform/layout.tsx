'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/store/auth-store';
import { PlatformAccessProvider, usePlatformAccess } from '@/components/platform/access-context';

const sections = [
  ['/platform', 'Inicio'],
  ['/platform/organizations', 'Organizaciones'],
  ['/platform/activity', 'Uso'],
  ['/platform/billing', 'Cobros y catálogo'],
  ['/platform/management', 'Gestiones'],
  ['/platform/exceptions', 'Excepciones'],
  ['/platform/access', 'Equipo y permisos'],
  ['/platform/settings', 'Gestión y configuración'],
] as const;

function PlatformContent({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const access = usePlatformAccess();
  const user = useAuthStore((s) => s.user);
  if (!user?.permissions?.some((p) => p.module === 'PLATAFORMA' && p.canRead)) {
    return <div className="p-8">No tienes permiso para consultar la administración de plataforma.</div>;
  }
  return <>
    <nav aria-label="Administración de plataforma" className="flex flex-wrap gap-2 border-b px-6 py-4">
      {sections.filter(([href]) => href === '/platform/access' ? access?.principal : href === '/platform/settings' ? !access?.enabled || access.principal : href === '/platform/billing' ? access?.capabilities.some((cap) => ['BILLING_READ', 'CATALOG_MANAGE'].includes(cap)) : true).map(([href, label]) => {
        const active = href === '/platform' ? pathname === href : pathname.startsWith(href);
        return <Link key={href} href={href} aria-current={active ? 'page' : undefined}
          className={`rounded-lg px-4 py-2 text-sm font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/70'}`}>{label}</Link>;
      })}
    </nav>
    {children}
  </>;
}

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  return <PlatformAccessProvider><PlatformContent>{children}</PlatformContent></PlatformAccessProvider>;
}
