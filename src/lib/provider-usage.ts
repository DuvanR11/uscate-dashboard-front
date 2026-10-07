export const usageLabels: Record<string, string> = {
  PENDING: 'Pendiente', ACCEPTED: 'Aceptado', REJECTED: 'Rechazado', UNKNOWN: 'Incierto', SIMULATED: 'Simulado',
  ESTIMATED: 'Estimado', CONFIRMED: 'Confirmado por proveedor',
  ORGANIZATION: 'Organización', SHARED: 'Compartido', PLATFORM: 'Plataforma', UNATTRIBUTED: 'Sin atribución',
  PROVIDER_REPORTED: 'Reportado por proveedor', APPLICATION_MEASURED: 'Medido por aplicación',
  INPUT_TOKENS: 'Tokens de entrada', OUTPUT_TOKENS: 'Tokens de salida', CACHED_INPUT_TOKENS: 'Tokens de entrada en caché',
  EMBEDDING_TOKENS: 'Tokens de embeddings', SMS_SEGMENTS: 'Segmentos SMS',
  SEND_REQUESTS: 'Invocaciones de envío', ACCEPTED_SEND_REQUESTS: 'Invocaciones aceptadas',
};
export const usageLabel = (value: string) => usageLabels[value] ?? value;

// Preserve decimal precision and the distinction between unknown and a measured zero.
export function usageDecimal(value: string | null) {
  if (value === null) return 'Pendiente';
  const [integer, fraction] = value.split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction ? `,${fraction}` : '');
}

export function usageInterval(first: string, last: string) {
  const start = Date.parse(`${first}T00:00:00Z`);
  const end = Date.parse(`${last}T00:00:00Z`) + 86_400_000;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(first) || !/^\d{4}-\d{2}-\d{2}$/.test(last) ||
      !Number.isFinite(start) || !Number.isFinite(end) ||
      new Date(start).toISOString().slice(0, 10) !== first ||
      new Date(end - 86_400_000).toISOString().slice(0, 10) !== last || end <= start || end - start > 90 * 86_400_000) {
    throw new Error('Selecciona fechas válidas en orden, con un máximo de 90 días incluidos.');
  }
  return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
}
