// Deuda técnica menor (2026-09-16) — forma real de `POST /investigation/search/jobs`
// (job completado) y `GET /investigation/:id` (reabrir archivada), usadas en
// `(dashboard)/inteligencia/expedientes/page.tsx`. Los registros de cada
// fuente OSINT (`sources.<KEY>.records`) vienen tal cual de APIs externas
// reales (SECOP/Procuraduría/Contraloría/etc.) — cada una con su propio
// esquema de campos, verificado real en el propio código de renderizado
// (nunca inventado) pero deliberadamente `Record<string, unknown>`: exigir
// una interfaz exacta por fuente requeriría verificar el contrato real de
// cada API gubernamental aparte, fuera del alcance de este cierre.
export type OsintSourceRecord = Record<string, unknown>;

export interface OsintRiskFactor {
  category?: string;
  score?: number;
  message?: string;
  [key: string]: unknown;
}

export interface OsintRisk {
  score: number;
  level: string;
  factors: OsintRiskFactor[];
  summary: string;
}

export interface OsintGraphNode {
  id: string;
  label?: string;
  type?: string;
  source?: string;
  risk?: string;
  properties?: Record<string, unknown>;
}

export interface OsintGraphLink {
  source: string;
  target: string;
  type?: string;
  weight?: number;
  properties?: Record<string, unknown>;
}

export interface OsintTimelineEvent {
  id?: string;
  source?: string;
  type?: string;
  date: string;
  title?: string;
  description?: string;
}

export interface OsintSummary {
  totalNodes?: number;
  totalLinks?: number;
  sources?: OsintSourceSummary;
}

export interface OsintSourceSummary {
  secop?: number;
  news?: number;
  police?: number;
  procuraduria?: number;
  contraloria?: number;
  supersociedades?: number;
  sigep?: number;
  sic?: number;
  superfinanciera?: number;
  webSearch?: number;
  whois?: number;
  intlSanctions?: number;
}

export interface Investigation {
  query: string;
  archived?: boolean;
  archivedAt?: string;
  // El endpoint real de reapertura (`GET /investigation/:id`) incluye el
  // usuario dueño de la investigación completo — solo se usa `fullName`.
  archivedBy?: { fullName?: string } | null;
  // Reabierta: string libre (columna real de la BD). Búsqueda en vivo: el
  // conteo real por fuente que arma `InvestigationService.investigate()`.
  summary?: string | OsintSummary;
  risk?: OsintRisk;
  timeline?: { events: OsintTimelineEvent[] };
  graph?: { nodes: OsintGraphNode[]; links: OsintGraphLink[] };
  sources?: Record<string, { records: OsintSourceRecord[] } | undefined>;
}
