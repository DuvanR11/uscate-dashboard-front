import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

// 1. Definición de Permisos y Usuario
export interface UserPermission {
  id?: string;
  module: string;
  subModule?: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
}

export interface User {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  // Mantenemos el rol como opcional por si lo necesitas para mostrar etiquetas visuales
  role?: {
    id: number;
    name: string;
    code: string;
  }; 
  permissions: UserPermission[]; // <--- NUEVO: Array de permisos granulares
}

// 2. Definición del Estado
interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setHydrated: () => void;
}

// 3. Creación del Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      isHydrated: false,

      setAuth: (token, user) => set({ token, user }),

      logout: () => {
        // A. Borramos TODAS las cookies de sesión
        Cookies.remove('auth-token');
        Cookies.remove('user-permissions'); // <--- Limpieza de la nueva cookie
        Cookies.remove('user-role'); // Se mantiene por retrocompatibilidad con sesiones viejas
        
        // B. Borramos el localStorage (para Zustand)
        localStorage.removeItem('auth-storage');
        
        // C. Reseteamos el estado en memoria
        set({ token: null, user: null });

        // D. Forzamos la recarga a la página de login
        window.location.href = '/login';
      },

      setHydrated: () => set({ isHydrated: true }),
    }),
    {
      name: 'auth-storage', // Nombre en localStorage
      storage: createJSONStorage(() => localStorage),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    }
  )
);