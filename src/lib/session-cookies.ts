import Cookies from 'js-cookie';

// Revisión técnica, Fase 1 (2026-10-15): las dos cookies de sesión que lee el
// middleware (Edge, sin acceso a localStorage) se escribían sin `secure` ni
// `sameSite` y con un día de vida aunque el token vence a las 8 horas. Ahora:
// solo viajan por HTTPS (salvo en desarrollo local), `sameSite=lax` (no se
// mandan en peticiones que origina otro sitio) y vencen con el token.
// Único lugar que las escribe: inicio de sesión y "ver como".

const FALLBACK_LIFETIME_MS = 8 * 60 * 60 * 1000;

/** Vencimiento del JWT (claim `exp`), o 8 horas si no se puede leer. */
export function tokenExpiry(token: string, now: Date = new Date()): Date {
  try {
    const payload = token.split('.')[1];
    const json = JSON.parse(
      atob(payload.replace(/-/g, '+').replace(/_/g, '/')),
    ) as { exp?: unknown };
    if (typeof json.exp === 'number' && json.exp * 1000 > now.getTime()) {
      return new Date(json.exp * 1000);
    }
  } catch {
    // token sin el formato esperado: se usa el valor por defecto
  }
  return new Date(now.getTime() + FALLBACK_LIFETIME_MS);
}

function cookieOptions(token: string): Cookies.CookieAttributes {
  return {
    expires: tokenExpiry(token),
    path: '/',
    sameSite: 'lax',
    secure:
      typeof window !== 'undefined' && window.location.protocol === 'https:',
  };
}

export function writeSessionCookies(token: string, hasPermissions: boolean) {
  const options = cookieOptions(token);
  Cookies.set('auth-token', token, options);
  Cookies.set('user-permissions', hasPermissions ? '1' : '0', options);
}

export function clearSessionCookies() {
  Cookies.remove('auth-token', { path: '/' });
  Cookies.remove('user-permissions', { path: '/' });
  Cookies.remove('user-role', { path: '/' }); // sesiones viejas
}
