import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  clearSessionCookies,
  writePermissionsCookie,
  tokenExpiry,
} from '@/lib/session-cookies';
import { API_URL } from '@/lib/api-url';

// Revisión técnica, Fase 1B (2026-10-18): la sesión vive en una cookie
// httpOnly que pone la API (`zy-session`); el código de la página ya no ve el
// token. `token` solo queda para sesiones abiertas ANTES del cambio (se sigue
// mandando como `Authorization` hasta que venzan). `sessionId` identifica la
// sesión actual para las pantallas que comparaban el token.
const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : String(Date.now()) + Math.random().toString(36).slice(2);
const postSession = (path: string) =>
  fetch(`${API_URL}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-zyron-request': '1' },
  });

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
  /** Solo en sesiones de "ver como" iniciadas antes del cambio a cookie. */
  operatorToken?: string;
  operatorUser: User;
  operatorEmail: string;
  targetOrganizationName: string;
}

// 2. Definición del Estado
interface AuthState {
  /** Token de una sesión anterior al cambio a cookie; null en las nuevas. */
  token: string | null;
  sessionId: string | null;
  user: User | null;
  isHydrated: boolean;
  impersonation: ImpersonationState | null;
  setAuth: (token: string | null, user: User) => void;
  refreshSession: (
    user: User,
    meta: { expiresAt?: string; impersonating?: boolean },
  ) => void;
  logout: () => void;
  setHydrated: () => void;
  startImpersonation: (
    newUser: User,
    meta: { operatorEmail: string; targetOrganizationName: string },
  ) => void;
  stopImpersonation: () => Promise<void>;
}

const hasPermissions = (user: User) => (user.permissions?.length ?? 0) > 0;
const IMPERSONATION_LIFETIME_MS = 60 * 60 * 1000;
const SESSION_LIFETIME_MS = 8 * 60 * 60 * 1000;
// TRV-01 (2026-10-27): con la sesión vencida, una pantalla que pide varias
// cosas a la vez (el Tablero, 9) recibía 9 respuestas 401 y cerraba la sesión
// 9 veces. La recarga a /login reinicia esta bandera.
let loggingOut = false;

// 3. Creación del Store
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token: null,
      sessionId: null,
      user: null,
      isHydrated: false,
      impersonation: null,

      // Un inicio de sesión nunca es un "ver como": si la sesión anterior
      // venció sin pasar por `logout()` (páginas de servidor del Radar), su
      // aviso de soporte no debe sobrevivir.
      setAuth: (token, user) =>
        set({ token, user, sessionId: newSessionId(), impersonation: null }),

      // Fase 0 del análisis de punta a punta (2026-10-28, TRV-02): los
      // permisos quedaban congelados desde el login (hasta 8 h). Lo llama
      // `useSessionRefresh` con lo que responde `GET /auth/session`. No es
      // `setAuth`: un "ver como" en curso se conserva. Solo se quita si la
      // API dice que la sesión ya no es de soporte (se salió de "ver como" en
      // otra pestaña y la cookie ya es la del operador).
      refreshSession: (user, { expiresAt, impersonating }) => {
        const current = get();
        if (!current.user) return; // la sesión ya se cerró en esta pestaña
        // `middleware.ts` (Edge) solo ve esta cookie: «¿tiene algún permiso?».
        const expires = expiresAt ? new Date(expiresAt) : null;
        writePermissionsCookie(
          expires && !Number.isNaN(expires.getTime())
            ? expires
            : new Date(Date.now() + SESSION_LIFETIME_MS),
          hasPermissions(user),
        );
        set({
          user,
          // Otra cuenta en la misma cookie (se entró con otra en otra
          // pestaña): las pantallas que comparan la sesión deben notarlo.
          ...(current.user.id !== user.id ? { sessionId: newSessionId() } : {}),
          ...(impersonating === false && current.impersonation
            ? { impersonation: null }
            : {}),
        });
      },

      // La API ya guardó la sesión del operador y puso la de la organización
      // (cookies httpOnly); aquí solo se recuerda al operador para el aviso.
      startImpersonation: (newUser, meta) => {
        const current = get();
        if (!current.user) return; // no hay sesión de operador que preservar
        writePermissionsCookie(
          new Date(Date.now() + IMPERSONATION_LIFETIME_MS),
          hasPermissions(newUser),
        );
        set({
          token: null,
          user: newUser,
          sessionId: newSessionId(),
          impersonation: {
            active: true,
            ...(current.token ? { operatorToken: current.token } : {}),
            operatorUser: current.user,
            operatorEmail: meta.operatorEmail,
            targetOrganizationName: meta.targetOrganizationName,
          },
        });
      },

      stopImpersonation: async () => {
        const { impersonation } = get();
        if (!impersonation) return;
        // Sesión de "ver como" abierta antes del cambio: el token del operador
        // está guardado aquí.
        if (impersonation.operatorToken) {
          writePermissionsCookie(
            tokenExpiry(impersonation.operatorToken),
            hasPermissions(impersonation.operatorUser),
          );
          set({
            token: impersonation.operatorToken,
            user: impersonation.operatorUser,
            sessionId: newSessionId(),
            impersonation: null,
          });
          return;
        }
        const response = await postSession('/auth/impersonation/stop').catch(() => null);
        if (!response?.ok) {
          get().logout();
          return;
        }
        writePermissionsCookie(
          new Date(Date.now() + SESSION_LIFETIME_MS),
          hasPermissions(impersonation.operatorUser),
        );
        set({
          token: null,
          user: impersonation.operatorUser,
          sessionId: newSessionId(),
          impersonation: null,
        });
      },

      logout: () => {
        if (loggingOut) return;
        loggingOut = true;

        // A. Borramos las cookies que escribe la página, el localStorage y el
        // estado en memoria.
        clearSessionCookies();
        localStorage.removeItem('auth-storage');
        set({ token: null, user: null, sessionId: null, impersonation: null });

        // B. La cookie de sesión es httpOnly: solo la API la puede borrar. Se
        // espera su respuesta (máximo 2 s) antes de recargar, para que el
        // inicio de sesión no encuentre la cookie vieja.
        const cleared = postSession('/auth/logout').catch(() => undefined);
        const timeout = new Promise((resolve) => setTimeout(resolve, 2000));

        // C. Recarga COMPLETA a propósito (no router.push): descarta todo el
        // estado en memoria de la sesión que se cierra. Único punto de salida
        // — los demás llamadores solo invocan `logout()`.
        void Promise.race([cleared, timeout]).then(() => {
          // eslint-disable-next-line @next/next/no-location-assign-relative-destination
          window.location.href = '/login';
        });
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