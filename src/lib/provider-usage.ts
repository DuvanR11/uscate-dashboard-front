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

// Fase 4 del análisis de punta a punta (2026-10-28, PLT-12): el historial de
// intentos mostraba el módulo, el servicio y la operación con el código que
// les pone el servidor (`createMeteredOpenAI(usage, 'CONTENT_COPILOT')`,
// `sendUsageInput(...)`). El código queda en el `title` de la celda: es el que
// se escribe en los filtros.
const usageModuleLabels: Record<string, string> = {
  CAMPAIGNS: 'Difusiones', EMAIL_TRANSACTIONAL: 'Correos del sistema', SMS_TRANSACTIONAL: 'SMS del sistema',
  EMAIL: 'Correo', SMS: 'SMS', WHATSAPP_BOT: 'WhatsApp no oficial', WHATSAPP_META: 'WhatsApp oficial (Meta)',
  AI_CHAT: 'IA (respuestas)', AI_EMBEDDING: 'IA (vectores semánticos)',
  CONTENT_COPILOT: 'Copiloto de contenido', GOVERNMENT_PLAN: 'Plan de gobierno', PETITIONS: 'Derechos de petición',
  PROJECTS: 'Radar Legislativo', SOCIAL_STATS: 'Estadísticas de redes', INVESTIGATION: 'OSINT',
  INVESTIGATION_DECOMPOSITION: 'Deep Search (plan de búsqueda)', INVESTIGATION_SYNTHESIS: 'Deep Search (dossier)',
  MONITORING_CLASSIFICATION: 'Monitoreo (clasificación)', MONITORING_ENRICHMENT: 'Monitoreo (análisis de menciones)',
  MONITORING_SPEECH: 'Monitoreo (discursos)', COMMON_EMBEDDINGS: 'Búsqueda semántica',
  PLATFORM_HEALTH: 'Salud de proveedores', OPERATIONAL_ALERTS: 'Alertas operativas', SALES_LEADS: 'Interesados comerciales',
};
const usageActionLabels: Record<string, string> = {
  CHAT_COMPLETION: 'Respuesta de IA', EMBEDDING: 'Vector semántico', SEND: 'Envío',
  EMAIL_SEND: 'Envío de correo', SMS_SEND: 'Envío de SMS', WHATSAPP_SEND: 'Envío de WhatsApp',
  NOTICE_EMAIL: 'Aviso por correo', SALES_NOTIFICATION: 'Aviso al equipo comercial',
};
export const usageModuleLabel = (value: string, fallback = 'Otro módulo') => usageModuleLabels[value] ?? fallback;
export const usageActionLabel = (value: string) => usageActionLabels[value] ?? 'Otra operación';

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
