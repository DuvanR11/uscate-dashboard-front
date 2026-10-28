// Fechas "de calendario" (el día de una jornada, de un aporte, de un gasto):
// no tienen hora y el servidor las guarda a mediodía de Colombia.
//
// Dos errores que esto evita (Fase 1, 2026-10-12):
// - `new Date().toISOString().slice(0, 10)` da el día en UTC: después de las
//   7:00 p. m. en Colombia el formulario proponía la fecha de MAÑANA.
// - `new Date('2026-10-10').toLocaleDateString()` pinta el 9: la medianoche
//   UTC es la tarde del día anterior en Colombia.

/** Hoy, según el reloj de quien usa la pantalla, como AAAA-MM-DD. */
export function todayISO(now: Date = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

/** El AAAA-MM-DD de una fecha de calendario que llega del servidor. */
export function calendarDayISO(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

/**
 * Texto de una fecha de calendario, sin correrla de día: se lee en UTC, que
 * es el mismo día tanto para las guardadas a mediodía de Colombia como para
 * las antiguas guardadas a medianoche UTC.
 */
export function formatCalendarDay(
  value: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'numeric', year: 'numeric' },
): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('es-CO', { ...options, timeZone: 'UTC' });
}

/**
 * Valor de un `<input type="datetime-local">` (AAAA-MM-DDTHH:mm) en la hora de
 * quien usa la pantalla. Fase 3 del análisis de punta a punta (2026-10-28):
 * `toISOString().slice(0, 16)` da la hora UTC, 5 horas adelante de Colombia;
 * como `min` de «programar envío» no dejaba elegir las próximas 5 horas, y al
 * editar una misión cada guardado la corría 5 horas.
 */
export function localDateTimeInput(value: string | Date | null | undefined = new Date()): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

/** Día del mes (1–31) de una fecha de calendario. */
export function calendarDayOfMonth(value: string | Date | null | undefined): number | null {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.getUTCDate();
}
