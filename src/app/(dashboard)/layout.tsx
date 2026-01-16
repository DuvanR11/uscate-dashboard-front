'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);
  
  // 1. Estado para controlar el menú móvil
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted || !isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full relative bg-gray-100">
      
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
        fixed inset-y-0 left-0 z-[100] w-72 bg-[#1B2541] transform transition-transform duration-300 ease-in-out md:hidden
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Pasamos la función onClose para que los links cierren el menú */}
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* --- CONTENIDO PRINCIPAL --- */}
      <main className="md:pl-72 pb-10 min-h-screen">
        {/* Pasamos la función para ABRIR el menú al Header */}
        <Header onOpenMobile={() => setIsMobileMenuOpen(true)} />
        <div className="p-4 sm:p-8">
           {children}
        </div>
      </main>
      
    </div>
  );
}