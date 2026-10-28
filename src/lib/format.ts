// Números para mostrar en el panel, con coma decimal (es-CO).
//
// Fase 4 del análisis de punta a punta (2026-10-28): cada pantalla usaba
// `toFixed()` y salían "97.0 %", "6.3/10" o "12.50 minutos". Mismo criterio
// que las pantallas que ya lo hacían bien (Plan de gobierno, Tablero): como
// mucho un decimal, sin ceros de relleno, y "—" cuando no hay valor.

const decimalFormats = new Map<number, Intl.NumberFormat>();

function decimalFormat(maxDigits: number): Intl.NumberFormat {
  let format = decimalFormats.get(maxDigits);
  if (!format) {
    format = new Intl.NumberFormat('es-CO', { maximumFractionDigits: maxDigits });
    decimalFormats.set(maxDigits, format);
  }
  return format;
}

function isNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** "4,3", "1.250" (miles con punto, decimales con coma). Sin valor: "—". */
export function formatDecimal(value: number | null | undefined, maxDigits = 1): string {
  return isNumber(value) ? decimalFormat(maxDigits).format(value) : '—';
}

/**
 * "97 %", "12,5 %". Recibe el porcentaje ya calculado (de 0 a 100, como lo
 * manda el servidor), no la fracción. Sin valor: "—".
 */
export function formatPercent(value: number | null | undefined, maxDigits = 1): string {
  return isNumber(value) ? `${decimalFormat(maxDigits).format(value)} %` : '—';
}

/** "6,3/10". Sin valor: "—" (no "/10" suelto). */
export function formatScore(value: number | null | undefined, outOf = 10, maxDigits = 1): string {
  return isNumber(value) ? `${decimalFormat(maxDigits).format(value)}/${outOf}` : '—';
}
