'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { useBrandingStore } from '@/store/branding-store';
import { Loader2 } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { ApplyTheme } from '@/components/branding/apply-theme';
import { ImpersonationBanner } from '@/components/dashboard/impersonation-banner';
import { ConsumptionUpgradeBanner } from '@/components/dashboard/consumption-upgrade-banner';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAuthStore();
  const brandingLoaded = useBrandingStore((s) => s.isLoaded);
  const loadBranding = useBrandingStore((s) => s.load);
  const [mounted, setMounted] = useState(false);

  // 1. Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    // Patrón "isMounted" ya existente en este archivo (evita el mismatch
    // de hidratación de Next.js) — no es un loop de renders en cascada.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
    // Dispara el fetch acá (no dentro de ApplyTheme) para poder gatear el
    // primer render de todo el layout hasta que resuelva — evita el
    // "flash" del tema por defecto seguido de un salto al de la
    // organización (ver §7 del informe "Personalización de Marca").
    loadBranding();
  }, [loadBranding]);

  // ApplyTheme se monta en AMBAS ramas (spinner y contenido real) — es lo
  // que empuja las variables CSS apenas `branding` llega al store, sin
  // depender de en qué rama del render estemos.
  if (!mounted || !isHydrated || !brandingLoaded) {
    return (
      <>
        <ApplyTheme />
        <div className="flex h-screen w-full items-center justify-center bg-slate-50">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
        </div>
      </>
    );
  }

  return (
    <div className="h-full relative bg-gray-100">
      <ApplyTheme />

      {/* --- SIDEBAR DESKTOP --- */}
      {/* Se mantiene hidden en md, visible en desktop */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
        <Sidebar />
      </div>

      {/* --- SIDEBAR MOBILE (OVERLAY) --- */}
      {/* Fondo oscuro (Backdrop) */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-[90] bg-black/50 md:hidden animate-in fade-in duration-200"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Menú Deslizante */}
      <div className={`
        fixed inset-y-0 left-0 z-[100] w-72 bg-primary transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Pasamos la función onClose para que los links cierren el menú */}
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="md:pl-72 pb-10 min-h-screen">
        <ImpersonationBanner />
        {/* Pasamos la función para ABRIR el menú al Header */}
        <Header onOpenMobile={() => setIsMobileMenuOpen(true)} />
        <div className="p-4 sm:p-8 space-y-4">
           <ConsumptionUpgradeBanner />
           {children}
        </div>
      </main>
      
    </div>
  );
}