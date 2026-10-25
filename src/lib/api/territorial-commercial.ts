import api from "@/lib/api";
import type { TerritorialExplorerEntry } from "./territorial-explorer";

export const readinessLabels = {
  AVAILABLE_MUNICIPAL: "Disponible municipal",
  IN_REVIEW: "En revisión",
  PREPARING: "En preparación",
  ARCHIVED: "Archivado",
} as const;
export type ReadinessStatus = keyof typeof readinessLabels;
export function coverageScopeLabel(status: ReadinessStatus): string {
  if (status === "AVAILABLE_MUNICIPAL") return "Resultados e informes municipales verificados";
  if (status === "ARCHIVED") return "Conjunto archivado: no ofertado";
  return "Sin datos verificados para ofrecer";
}
export interface CommercialCoverageItem {
  code: string;
  name: string;
  election: { code: string; name: string };
  corporation: { code: string; name: string };
  territory: { code: string; name: string; level: string };
  constituencyCode: string;
  status: ReadinessStatus;
  sources: {
    registered: number;
    reviewed: number;
    origin: "LEGACY_BATCH" | "REGIONAL";
  };
  blockers: { code: string; message: string }[];
  publication: {
    number: number;
    publishedAt: string;
    granularity: "MUNICIPAL";
  } | null;
  monitoring: {
    enabled: boolean;
    workerEnabled: boolean;
    blockedReason: string | null;
    nextRunAt: string | null;
    responsible: { id: string; name: string; email: string | null } | null;
    lastStatus: string | null;
    lastFinishedAt: string | null;
    openAlerts: number;
  };
}
export interface CommercialCoveragePage {
  checkedAt: string;
  pageSize: 20;
  next: string | null;
  items: CommercialCoverageItem[];
  limitations: string[];
}
export interface CommercialOrganizationPage {
  datasetCode: string;
  checkedAt: string;
  pageSize: 10;
  next: string | null;
  note: string;
  items: {
    id: string;
    name: string;
    access: TerritorialExplorerEntry["access"];
    availability: string;
    canExplore: boolean;
    origins: string[];
  }[];
}
const record = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown): v is string => typeof v === "string";
const date = (v: unknown) => string(v) && Number.isFinite(Date.parse(v));
const nullableDate = (v: unknown) => v === null || date(v);
const count = (v: unknown) => Number.isSafeInteger(v) && Number(v) >= 0;
const code = (v: unknown) => string(v) && /^[A-Z][A-Z0-9_]{2,79}$/.test(v);
const fail = () => {
  throw Error(
    "No se pudo verificar la cobertura territorial. Actualiza la consulta.",
  );
};
export function validateCommercialCoverage(
  v: unknown,
): asserts v is CommercialCoveragePage {
  if (
    !record(v) ||
    !date(v.checkedAt) ||
    v.pageSize !== 20 ||
    !(v.next === null || code(v.next)) ||
    !Array.isArray(v.items) ||
    v.items.length > 20 ||
    !Array.isArray(v.limitations) ||
    !v.limitations.every(string)
  )
    return fail();
  const seen = new Set<string>();
  for (const r of v.items) {
    if (
      !record(r) ||
      !code(r.code) ||
      !string(r.name) ||
      seen.has(String(r.code)) ||
      !string(r.constituencyCode) ||
      !["election", "corporation", "territory"].every(
        (k) => record(r[k]) && string(r[k].name) && string(r[k].code),
      ) ||
      !record(r.territory) ||
      !string(r.territory.level) ||
      !string(r.status) ||
      !Object.hasOwn(readinessLabels, r.status) ||
      !record(r.sources) ||
      !count(r.sources.registered) ||
      !count(r.sources.reviewed) ||
      Number(r.sources.reviewed) > Number(r.sources.registered) ||
      !["LEGACY_BATCH", "REGIONAL"].includes(String(r.sources.origin)) ||
      !Array.isArray(r.blockers) ||
      !r.blockers.every((b) => record(b) && string(b.code) && string(b.message))
    )
      return fail();
    const m = r.monitoring;
    if (
      !record(m) ||
      typeof m.enabled !== "boolean" ||
      typeof m.workerEnabled !== "boolean" ||
      !nullableDate(m.nextRunAt) ||
      !nullableDate(m.lastFinishedAt) ||
      !(m.blockedReason === null || string(m.blockedReason)) ||
      !(m.lastStatus === null || string(m.lastStatus)) ||
      !count(m.openAlerts) ||
      !(
        m.responsible === null ||
        (record(m.responsible) &&
          string(m.responsible.id) &&
          string(m.responsible.name) &&
          (m.responsible.email === null || string(m.responsible.email)))
      )
    )
      return fail();
    if (r.status === "AVAILABLE_MUNICIPAL") {
      if (
        r.code !== "NEIVA_CONCEJO_2023" ||
        r.territory.code !== "41001" ||
        r.blockers.length ||
        !record(r.publication) ||
        !count(r.publication.number) ||
        Number(r.publication.number) < 1 ||
        !date(r.publication.publishedAt) ||
        r.publication.granularity !== "MUNICIPAL"
      )
        return fail();
    } else if (r.publication !== null || !r.blockers.length) return fail();
    seen.add(String(r.code));
  }
  if (v.next !== null && (v.items.length !== 20 || v.items[19].code !== v.next))
    return fail();
}
export function validateCommercialOrganizations(
  v: unknown,
): asserts v is CommercialOrganizationPage {
  if (
    !record(v) ||
    !code(v.datasetCode) ||
    !date(v.checkedAt) ||
    v.pageSize !== 10 ||
    !string(v.note) ||
    !(v.next === null || string(v.next)) ||
    !Array.isArray(v.items) ||
    v.items.length > 10
  )
    return fail();
  const ids = new Set<string>();
  for (const r of v.items) {
    if (
      !record(r) ||
      !string(r.id) ||
      !r.id ||
      ids.has(r.id) ||
      !string(r.name) ||
      !record(r.access) ||
      ![
        "ACTIVE",
        "READ_ONLY",
        "EXPIRED",
        "REVOKED",
        "PENDING",
        "UNVERIFIED",
        "NONE",
      ].includes(String(r.access.status)) ||
      ![null, "PAID", "DEMO"].includes(r.access.mode as string | null) ||
      !nullableDate(r.access.startsAt) ||
      !nullableDate(r.access.endsAt) ||
      typeof r.canExplore !== "boolean" ||
      !string(r.availability) ||
      ![
        "AVAILABLE",
        "CATALOG_UNAVAILABLE",
        "SOURCES_PENDING",
        "GEOGRAPHY_PENDING",
        "PUBLICATION_PENDING",
        "ACCESS_REQUIRED",
      ].includes(r.availability) ||
      r.canExplore !== (r.availability === "AVAILABLE") ||
      (r.canExplore &&
        !["ACTIVE", "READ_ONLY"].includes(String(r.access.status))) ||
      !Array.isArray(r.origins) ||
      !r.origins.every((o) =>
        ["CONTRACT", "PROFILE", "LEGACY_PILOT"].includes(String(o)),
      )
    )
      return fail();
    ids.add(r.id);
  }
  if (v.next !== null && (v.items.length !== 10 || v.items[9].id !== v.next))
    return fail();
}
export async function getCommercialCoverage(search = "", afterCode?: string) {
  const { data } = await api.get<unknown>(
    "/platform/territorial-data/commercial-coverage",
    { params: { search, afterCode }, timeout: 25000 },
  );
  validateCommercialCoverage(data);
  return data;
}
export async function getCommercialOrganizations(
  code: string,
  afterId?: string,
) {
  const { data } = await api.get<unknown>(
    `/platform/territorial-data/commercial-coverage/${encodeURIComponent(code)}/organizations`,
    { params: { afterId }, timeout: 25000 },
  );
  validateCommercialOrganizations(data);
  if (data.datasetCode !== code) return fail();
  return data;
}
export function coverageReportCsv(page: CommercialCoveragePage) {
  validateCommercialCoverage(page);
  const cell = (v: unknown) => {
    let s = String(v ?? "");
    if (/^[\s\u0000-\u001f]*[=+@-]/u.test(s)) s = "'" + s;
    return '"' + s.replaceAll('"', '""') + '"';
  };
  const rows = [
    [
      "INFORME INTERNO: COBERTURA TERRITORIAL — SOLO ESTA PÁGINA",
      page.checkedAt,
    ],
    [
      "Conjunto",
      "Territorio",
      "Código territorial",
      "Elección",
      "Cargo",
      "Circunscripción",
      "Disponibilidad de datos",
      "Fuentes registradas",
      "Fuentes revisadas",
      "Pendientes",
      "Alertas abiertas",
      "Responsable",
      "Última ejecución terminada",
      "Alcance verificable",
      "Detalle por comuna, corregimiento o puesto",
      "Demografía y participación por edad",
    ],
    ...page.items.map((r) => [
      r.code,
      r.territory.name,
      r.territory.code,
      r.election.name,
      r.corporation.name,
      r.constituencyCode,
      readinessLabels[r.status],
      r.sources.registered,
      r.sources.reviewed,
      r.blockers.map((b) => b.message).join(" | "),
      r.monitoring.openAlerts,
      r.monitoring.responsible?.name ?? "",
      r.monitoring.lastFinishedAt ?? "",
      coverageScopeLabel(r.status),
      "Fuera de esta entrega; requiere fuentes y correspondencias verificadas",
      "Fuera de esta entrega; requiere fuentes compatibles",
    ]),
    ...page.limitations.map((s) => ["Alcance", s]),
  ];
  return "\ufeff" + rows.map((row) => row.map(cell).join(";")).join("\r\n");
}
