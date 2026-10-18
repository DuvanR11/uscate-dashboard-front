// Recorrido de alta (Fase 3, 2026-10-17): un aviso que sobrevive al cierre de
// sesión y se muestra UNA vez en la pantalla de inicio de sesión. Al cambiar
// la contraseña la sesión se cerraba de golpe (la versión del token cambia y
// la siguiente petición responde 401) sin decir por qué.
const KEY = 'login-notice';

const MESSAGES = {
  'password-changed': 'Tu contraseña cambió. Inicia sesión con la nueva.',
} as const;

export type LoginNotice = keyof typeof MESSAGES;

export function setLoginNotice(notice: LoginNotice) {
  try {
    sessionStorage.setItem(KEY, notice);
  } catch {
    // Sin almacenamiento (modo privado): solo se pierde el aviso.
  }
}

/** Devuelve el texto del aviso pendiente (si hay) y lo borra. */
export function takeLoginNotice(): string | null {
  try {
    const value = sessionStorage.getItem(KEY);
    sessionStorage.removeItem(KEY);
    return value && value in MESSAGES ? MESSAGES[value as LoginNotice] : null;
  } catch {
    return null;
  }
}
