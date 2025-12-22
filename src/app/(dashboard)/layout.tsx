'use client';

import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/auth-store';
import { Loader2 } from 'lucide-react';

// Importamos los nuevos componentes
import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isHydrated } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Esperamos a que el cliente cargue para evitar parpadeos
  if (!mounted || !isHydrated) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="h-full relative bg-gray-100">
      
      {/* SIDEBAR: Oculto en móvil, fijo y ancho 72 (approx 300px) en escritorio */}
      <div className="hidden h-full md:flex md:w-72 md:flex-col md:fixed md:inset-y-0 z-[80] bg-gray-900">
        <Sidebar />
      </div>

      {/* CONTENIDO PRINCIPAL: Deja un margen a la izquierda igual al ancho del sidebar */}
      <main className="md:pl-72 pb-10">
        <Header />
        <div className="p-8">
           {children}
        </div>
      </main>
      
    </div>
  );
}