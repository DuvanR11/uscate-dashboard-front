'use client';

import { useAuthStore } from '@/store/auth-store';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, User } from 'lucide-react';

interface HeaderProps {
  onOpenMobile?: () => void;
}

export function Header({ onOpenMobile }: HeaderProps) {
  const { user, logout } = useAuthStore();

  // Obtener inicial para el avatar
  const initial = user?.fullName?.charAt(0).toUpperCase() || 'U';

  return (
    <header className="sticky top-0 z-30 w-full bg-white border-b border-slate-200 shadow-sm h-16">
      <div className="h-full px-4 sm:px-8 flex items-center justify-between">
        
        {/* --- IZQUIERDA: MENÚ MÓVIL Y TÍTULO --- */}
        <div className="flex items-center gap-4">
          {/* Botón menú móvil (visible solo en celulares) */}
          <div className="md:hidden">
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={onOpenMobile}
                className="text-[#1B2541] hover:bg-[#1B2541]/10"
            >
              <Menu size={24} />
            </Button>
          </div>

          {/* Título de la sección */}
          <div className="hidden md:flex flex-col">
            <h2 className="font-bold text-lg text-[#1B2541] leading-none">
              Panel de Control
            </h2>
            <span className="text-xs text-slate-400 font-medium">
              Bienvenido de nuevo
            </span>
          </div>
        </div>

        {/* --- DERECHA: USUARIO Y ACCIONES --- */}
        <div className="flex items-center gap-x-4">
          
          {/* Información del Usuario (Texto) */}
          <div className="hidden md:block text-right">
            <p className="text-sm font-bold text-[#1B2541]">
              {user?.fullName || 'Usuario'}
            </p>
            <div className="flex items-center justify-end gap-1">
                <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse"></span>
                <p className="text-xs text-slate-500 font-medium capitalize">
                {user?.role?.name || 'Rol'}
                </p>
            </div>
          </div>
          
          {/* Avatar Personalizado (Amarillo/Azul) */}
          <div className="h-10 w-10 rounded-full bg-[#FFCC00] flex items-center justify-center text-[#002244] font-bold border-2 border-white shadow-md ring-1 ring-slate-100">
             {initial}
          </div>

          {/* Separador vertical */}
          <div className="h-8 w-px bg-slate-200 mx-1 hidden sm:block"></div>

          {/* Botón Salir */}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={logout}
            className="text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
            title="Cerrar Sesión"
          >
            <LogOut className="h-5 w-5 sm:mr-2" />
            <span className="hidden sm:inline font-medium">Salir</span>
          </Button>
        </div>

      </div>
    </header>
  );
}