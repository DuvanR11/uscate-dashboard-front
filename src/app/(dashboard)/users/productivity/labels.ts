// Fase 4 del análisis de punta a punta (2026-10-28, CRM-23): nombres para
// mostrar de los códigos que devuelve `/productivity/*` (antes salían crudos:
// `PROSPECTO_CREADO`, `LEADER`, `BAJO`). El nombre de cada acción viene del
// catálogo del servidor (`GET /productivity/rules`, mismo permiso que estas
// pantallas); aquí quedan el rol, el nivel y el respaldo para un código que
// no esté en el catálogo (por ejemplo, un evento manual).

/** Mismos nombres que siembra el servidor (`prisma/seed-prod.ts`). */
const ROLE_LABEL: Record<string, string> = {
  SUPER_ADMIN: 'Super administrador',
  ADMIN: 'Administrador',
  SECRETARY: 'Secretaría',
  LEADER: 'Líder',
  LEGISLATIVE: 'Abogado',
  CITIZEN: 'Ciudadano',
  BUHO: 'Voluntario',
  RECOLECTOR: 'Recolector de firmas',
  SYSTEM_INTEGRATION: 'Integración de sistemas',
  PLATFORM_OPERATOR: 'Operador de plataforma',
};

/** Niveles de `ProductivityService#calculateLevel()`. */
const LEVEL_LABEL: Record<string, string> = {
  EXCELENTE: 'Excelente',
  BUENO: 'Bueno',
  MEDIO: 'Medio',
  BAJO: 'Bajo',
};

/** `PROSPECTO_CREADO` → «Prospecto creado». Solo para códigos sin nombre. */
function humanizeCode(code: string): string {
  const text = code.replace(/_/g, ' ').trim().toLowerCase();
  return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
}

export function roleLabel(code: string | null | undefined): string {
  if (!code) return 'Sin rol';
  return ROLE_LABEL[code] ?? humanizeCode(code);
}

export function levelLabel(code: string | null | undefined): string {
  if (!code) return '—';
  return LEVEL_LABEL[code] ?? humanizeCode(code);
}

/** Nombre de una acción: el del catálogo del servidor o, si no está, el código legible. */
export function eventTypeLabel(code: string, catalog: ReadonlyMap<string, string>): string {
  return catalog.get(code) ?? humanizeCode(code);
}
