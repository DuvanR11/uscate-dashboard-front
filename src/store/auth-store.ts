import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

// 1. Definición del Usuario
// (Puedes importar el tipo UserRole de tu archivo de tipos si quieres ser más estricto)
interface User {
  id: string;
  email: string;
  fullName: string;
  organizationId: string;
  role: {
    id: number;
    name: string;
    code: string;
  }; 
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
        Cookies.remove('user-role'); // <--- ¡IMPORTANTE! Agregar esto
        
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