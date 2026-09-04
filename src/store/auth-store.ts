import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import Cookies from 'js-cookie';

// 1. Definición de Permisos y Usuario
//
// `user.permissions` es el conjunto EFECTIVO de permisos, no una tabla cruda:
// el backend lo resuelve mergeando 3 capas (plantilla base del sistema →
// override de la organización → excepción puntual del usuario, la excepción
// siempre gana) antes de devolverlo en `POST /auth/login`. El frontend nunca
// hace ese cálculo — solo lee el array ya resuelto, aquí y en cada
// `usePermission`/`<Can>` que lo consume.
//
// Ojo con el momento: mientras el backend no despliegue su Fase 8
// (`api-uscate-back`, `AuthService.login()` todavía sin el merge de 3 vías —
// ver spec/01_IMPLEMENTATION_PHASES.md), este array sigue siendo la tabla
// `UserPermission` cruda de cada usuario, tal como funciona hoy. La forma
// del array (`module`, `subModule?`, `canRead/Write/Delete`) no cambia en
// ningún momento — por eso ni este store ni `middleware.ts` ni
// `login/page.tsx` necesitan tocarse para la transición; cambia únicamente
// de dónde sale cada fila, no cómo se lee.
export interface UserPermission {
  id?: string;
  module: string;
  subModule?: string;
  canRead: boolean;
  canWrite: boolean;
  canDelete: boolean;
  /** Solo presente una vez que el backend despliegue su Fase 8 (merge de 3 vías). */
  source?: 'ROLE_BASE' | 'ROLE_ORG' | 'USER_OVERRIDE';
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

// "Ver como esta organización" — soporte, exclusivo de PLATFORM_OPERATOR
// (ver informe "Gating por Plan"). Guarda la sesión REAL del operador
// (token+user) para poder restaurarla al salir, sin necesitar un segundo
// login. `active` distingue "hay una sesión de operador guardada" de
// "null" (nunca se impersonó nada en este navegador).
export interface ImpersonationState {
  active: true;
  operatorToken: string;
  operatorUser: User;
  operatorEmail: string;
  targetOrganizationName: string;
}

// 2. Definición del Estado
interface AuthState {
  token: string | null;
  user: User | null;
  isHydrated: boolean;
  impersonation: ImpersonationState | null;
  setAuth: (token: string, user: User) => void;
  logout: () => void;
  setHydrated: () => void;
  startImpersonation: (
    newToken: string,
    newUser: User,
    meta: { operatorEmail: string; targetOrganizationName: string },
  ) => void;
  stopImpersonation: () => void;
}

// Escribe las MISMAS cookies que login/page.tsx — el middleware (Edge, sin
// acceso a localStorage) solo lee estas dos para decidir acceso, sin
// importar si el token es de un login real o de una impersonación.
function writeSessionCookies(token: string, user: User) {
  Cookies.set('auth-token', token, { expires: 1 });
  Cookies.set('user-permissions', (user.permissions?.length ?? 0) > 0 ? '1' : '0', { expires: 1 });
}

// 3. Creación del Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      user: null,
      isHydrated: false,
      impersonation: null,

      setAuth: (token, user) => set({ token, user }),

      startImpersonation: (newToken, newUser, meta) => {
        const current = get();
        if (!current.token || !current.user) return; // no hay sesión de operador que preservar
        writeSessionCookies(newToken, newUser);
        set({
          token: newToken,
          user: newUser,
          impersonation: {
            active: true,
            operatorToken: current.token,
            operatorUser: current.user,
            operatorEmail: meta.operatorEmail,
            targetOrganizationName: meta.targetOrganizationName,
          },
        });
      },

      stopImpersonation: () => {
        const { impersonation } = get();
        if (!impersonation) return;
        writeSessionCookies(impersonation.operatorToken, impersonation.operatorUser);
        set({
          token: impersonation.operatorToken,
          user: impersonation.operatorUser,
          impersonation: null,
        });
      },

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