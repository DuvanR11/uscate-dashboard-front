// Fase 2a del plan de finanzas y catálogo (2026-10-29, C4): el cupo de SMS se
// descuenta por parte. Esto solo alimenta el contador de la pantalla; los
// créditos reales los calcula el servidor en la confirmación, con las
// variables de cada destinatario ya reemplazadas.

export const SMS_SINGLE_PART_CHARS = 160;
export const SMS_CONCATENATED_PART_CHARS = 153;
export const SMS_MAX_PARTS = 3;
export const SMS_MAX_CHARS = SMS_CONCATENATED_PART_CHARS * SMS_MAX_PARTS; // 459

const GSM_EXTENDED = new Set(["^", "{", "}", "\\", "[", "]", "~", "|"]);

/** Partes de un texto ya limpio (sin tildes ni ñ, solo ASCII). */
export function smsParts(cleaned: string): number {
  let septets = 0;
  for (const ch of cleaned) septets += GSM_EXTENDED.has(ch) ? 2 : 1;
  if (septets <= SMS_SINGLE_PART_CHARS) return 1;
  return Math.ceil(septets / SMS_CONCATENATED_PART_CHARS);
}
