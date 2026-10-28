import { isAxiosError } from 'axios';

// Fase 5 del análisis de punta a punta (2026-10-28, TRV-25): el ayudante que
// saca el mensaje de un error de la API estaba copiado en ~30 archivos, en
// 12 versiones (unas solo leían texto, otras también listas, otras juntaban
// la lista). Ahora vive aquí; `lib/api/platform.ts` y los demás `lib/api/*`
// lo reexportan para no cambiar los ~100 imports que ya había.

/**
 * Todos los mensajes que mandó el servidor: el `message` de las excepciones
 * de Nest es un texto o, en las validaciones de los DTO, una lista.
 */
export function extractErrorMessages(error: unknown): string[] {
  if (typeof error !== 'object' || error === null || !('response' in error)) return [];
  const message = (error as { response?: { data?: { message?: unknown } } }).response?.data?.message;
  const list = Array.isArray(message) ? message : [message];
  return list.filter((item): item is string => typeof item === 'string' && item.length > 0);
}

/**
 * El mensaje del servidor (el primero, si es una lista), o `undefined` si no
 * mandó ninguno: cada pantalla pone entonces su propio texto.
 */
export function extractErrorMessage(error: unknown): string | undefined {
  return extractErrorMessages(error)[0];
}

/**
 * Texto en español para una petición que falló sin mensaje del servidor: se
 * venció el plazo de `lib/api.ts`, no hubo conexión o la respuesta no era de
 * la API (un 502 del proxy, por ejemplo). Sin esto se veía el texto de axios
 * en inglés («timeout of 30000ms exceeded», «Network Error»). `undefined` si
 * no es un error de axios o si la petición se canceló a propósito.
 */
export function requestFailureMessage(error: unknown): string | undefined {
  if (!isAxiosError(error) || error.code === 'ERR_CANCELED') return undefined;
  if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
    return 'El servidor tardó demasiado en responder. Inténtalo de nuevo en un momento.';
  }
  if (!error.response) {
    return 'No hubo conexión con el servidor. Revisa tu internet e inténtalo de nuevo.';
  }
  return `El servidor no pudo atender la solicitud (error ${error.response.status}). Inténtalo de nuevo en un momento.`;
}

/** El mensaje del servidor o, si no mandó ninguno, el de `requestFailureMessage`. */
export function apiErrorMessage(error: unknown): string | undefined {
  return extractErrorMessage(error) ?? requestFailureMessage(error);
}
