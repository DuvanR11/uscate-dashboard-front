import axios from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100', // el build de producción exige NEXT_PUBLIC_API_URL; un dominio ajeno de respaldo enviaría tokens a un host equivocado
  // Revisión técnica, Fase 1B (2026-10-18): la sesión viaja en la cookie
  // httpOnly `zy-session`, y la cabecera de abajo le dice a la API que la
  // petición viene de la aplicación (un sitio ajeno no puede ponerla).
  withCredentials: true,
  headers: { 'x-zyron-request': '1' },
});

// Interceptor de Solicitud (Request)
api.interceptors.request.use((config) => {
  // Solo sesiones abiertas antes del cambio a cookie traen un token guardado.
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// TRV-01 (2026-10-27): rutas que no usan la sesión. Su 401 es la respuesta
// misma («Credenciales inválidas»), no una sesión vencida: cerrar sesión ahí
// recargaba /login, borraba el aviso y el correo escrito.
const SESSIONLESS_AUTH_PATH = /^\/auth\/(login|forgot-password|reset-password)(\?|$)/;

// Textos del 403 de los guards de permisos del servidor: `PermissionsGuard`
// y, cuando `RolesGuard` rechaza, el que pone Nest por defecto. Cualquier
// otro 403 es una regla de negocio («Límite alcanzado. Tu plan permite
// máximo N usuarios», rol no asignable…) y su mensaje ya dice qué pasó.
const PERMISSION_DENIED_MESSAGES = [
  'No tienes los permisos necesarios para realizar esta acción.',
  'Forbidden resource',
];

// Interceptor de Respuesta (Response)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Si el backend dice "Token vencido o inválido" (401), cerramos sesión automáticamente
    if (
      error.response?.status === 401 &&
      !SESSIONLESS_AUTH_PATH.test(String(error.config?.url ?? ''))
    ) {
      // `logout()` limpia la sesión y redirige a /login (una sola vez).
      useAuthStore.getState().logout();
    }
    // Fase 1 "Poder cobrar": el backend bloquea escrituras (solo lectura) o
    // todo acceso (suspendida/cancelada) por vencimiento. Se avisa una sola
    // vez con el mensaje real del servidor, en vez de dejar que cada
    // pantalla muestre un "error genérico".
    const code = error.response?.data?.code;
    if (error.response?.status === 403 && typeof code === 'string' && code.startsWith('SUBSCRIPTION_')) {
      toast.error('Suscripción vencida', {
        id: 'subscription-blocked',
        description: error.response.data.message,
      });
    }
    // Una ACCIÓN (guardar, enviar, eliminar) rechazada por permisos: se dice
    // con claridad, en vez del "Error al guardar" genérico de cada pantalla.
    // Las lecturas no avisan aquí: las pantallas sin permiso ya se bloquean
    // antes de pedir nada (`RouteGuard`).
    const method = String(error.config?.method ?? 'get').toLowerCase();
    if (
      error.response?.status === 403 &&
      method !== 'get' &&
      !(typeof code === 'string' && code.startsWith('SUBSCRIPTION_'))
    ) {
      const raw = error.response.data?.message;
      const message: unknown = Array.isArray(raw) ? raw[0] : raw;
      if (typeof message !== 'string' || !message || PERMISSION_DENIED_MESSAGES.includes(message)) {
        toast.error('No tienes permiso para esta acción', {
          id: 'action-forbidden',
          description: 'Pídele a un administrador de tu organización que te lo habilite.',
        });
      } else {
        // TRV-03: regla de negocio, con el motivo real del servidor. Casi
        // todas las pantallas ya lo muestran en su propio aviso
        // (`extractErrorMessage`): se espera a que la pantalla maneje el
        // error y solo se avisa si ningún aviso abierto lo dice ya.
        setTimeout(() => {
          const alreadyShown = toast.getToasts().some(
            (shown) =>
              !('dismiss' in shown) &&
              shown.id !== 'action-forbidden' &&
              [shown.title, shown.description].some(
                (text) => typeof text === 'string' && text.includes(message),
              ),
          );
          if (!alreadyShown) {
            toast.error('No se pudo completar la acción', {
              id: 'action-forbidden',
              description: message,
            });
          }
        }, 0);
      }
    }
    return Promise.reject(error);
  }
);

// =========================================================================
// WRAPPERS PARA COMPATIBILIDAD CON TUS COMPONENTES (apiGet, apiPost, etc.)
// =========================================================================

export async function apiGet<T>(path: string): Promise<T> {
  // Axios automáticamente parsea el JSON y lo guarda en la propiedad .data
  const response = await api.get<T>(path);
  return response.data;
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.post<T>(path, body);
  return response.data;
}

export async function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.patch<T>(path, body);
  return response.data;
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const response = await api.put<T>(path, body);
  return response.data;
}

export async function apiDelete<T>(path: string): Promise<T> {
  const response = await api.delete<T>(path);
  return response.data;
}

export default api;