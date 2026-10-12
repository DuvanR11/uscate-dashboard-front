// Regla de toda contraseña que una persona elige o que un administrador
// asigna. Es la misma del servidor (`common/security/password-policy.ts`), que
// es quien la hace cumplir; aquí solo se avisa antes de enviar.
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 72;

export const PASSWORD_HINT = `Mínimo ${PASSWORD_MIN} caracteres, con al menos una letra y un número.`;

export const isStrongPassword = (value: string): boolean =>
  value.length >= PASSWORD_MIN &&
  value.length <= PASSWORD_MAX &&
  /[A-Za-z]/.test(value) &&
  /\d/.test(value);
