import axios, { type AxiosRequestConfig } from 'axios';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/auth-store';

// Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): la instancia no
// tenía `timeout`. Si la API no respondía, cada pantalla (y el marco del
// panel, que espera la marca) quedaba cargando para siempre.
export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
/** Generación con IA y consultas a fuentes externas: se pasa en la llamada. */
export const LONG_REQUEST_TIMEOUT_MS = 180_000;
/**
 * Subidas de archivos (`FormData`) y descargas (`blob`/`arraybuffer`:
 * exportaciones, PDF, ZIP). Dependen también de la conexión de quien las
 * hace; el interceptor de abajo lo aplica solo.
 */
export const TRANSFER_TIMEOUT_MS = 300_000;

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3100', // el build de producción exige NEXT_PUBLIC_API_URL; un dominio ajeno de respaldo enviaría tokens a un host equivocado
  // Revisión técnica, Fase 1B (2026-10-18): la sesión viaja en la cookie
  // httpOnly `zy-session`, y la cabecera de abajo le dice a la API que la
  // petición viene de la aplicación (un sitio ajeno no puede ponerla).
  withCredentials: true,
  headers: { 'x-zyron-request': '1' },
  timeout: DEFAULT_REQUEST_TIMEOUT_MS,
});

function isFileTransfer(config: AxiosRequestConfig): boolean {
  return (
    (typeof FormData !== 'undefined' && config.data instanceof FormData) ||
    config.responseType === 'blob' ||
    config.responseType === 'arraybuffer'
  );
}

// Interceptor de Solicitud (Request)
api.interceptors.request.use((config) => {
  // Solo sesiones abiertas antes del cambio a cookie traen un token guardado.
  const token = useAuthStore.getState().token;

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // TRV-25: una subida o descarga que no trae su propio plazo usa el de
  // transferencia (el de la instancia ya viene mezclado en `config`).
  if (config.timeout === DEFAULT_REQUEST_TIMEOUT_MS && isFileTransfer(config)) {
    config.timeout = TRANSFER_TIMEOUT_MS;
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
    // Entrega 2b del plan de finanzas (2026-10-29): un tope del plan (fuentes
    // de monitoreo, almacenamiento, SMS en la prueba) responde 402 con
    // `plan_limit_reached` y su motivo, que se avisa igual que una regla de
    // negocio del 403.
    const planLimit = error.response?.status === 402 && code === 'plan_limit_reached';
    if (
      (error.response?.status === 403 || planLimit) &&
      method !== 'get' &&
      !(typeof code === 'string' && code.startsWith('SUBSCRIPTION_'))
    ) {
      const raw = error.response.data?.message;
      const message: unknown = Array.isArray(raw) ? raw[0] : raw;
      if (!planLimit && (typeof message !== 'string' || !message || PERMISSION_DENIED_MESSAGES.includes(message))) {
        toast.error('No tienes permiso para esta acción', {
          id: 'action-forbidden',
          description: 'Pídele a un administrador de tu organización que te lo habilite.',
        });
      } else if (typeof message === 'string' && message) {
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
            toast.error(planLimit ? 'Límite de tu plan' : 'No se pudo completar la acción', {
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

// `config` (opcional) permite, por ejemplo, un `timeout` propio (TRV-25).
export async function apiGet<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  // Axios automáticamente parsea el JSON y lo guarda en la propiedad .data
  const response = await api.get<T>(path, config);
  return response.data;
}

export async function apiPost<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.post<T>(path, body, config);
  return response.data;
}

export async function apiPatch<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.patch<T>(path, body, config);
  return response.data;
}

export async function apiPut<T>(path: string, body?: unknown, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.put<T>(path, body, config);
  return response.data;
}

export async function apiDelete<T>(path: string, config?: AxiosRequestConfig): Promise<T> {
  const response = await api.delete<T>(path, config);
  return response.data;
}

export default api;