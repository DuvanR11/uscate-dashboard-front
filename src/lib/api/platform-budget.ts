import api, { apiGet, apiPatch, apiPut } from "@/lib/api";

// Fase 6c del plan de finanzas y catálogo (2026-11-07): presupuesto mensual
// con semáforo, proyección del cierre y exportación al libro del modelo. El
// servidor calcula lo real, los desvíos y la proyección; aquí solo se lee y se
// envía lo que escribe el operador.
export type BudgetRubro = "infrastructure" | "administration" | "team" | "variable" | "income";
export type BudgetLight = "GREEN" | "YELLOW" | "RED" | "NO_BUDGET" | "PENDING";
export type BudgetMethod = "ACTUAL" | "RUN_RATE" | "BUDGET" | "TO_DATE" | "CONTRACTED";

export const LIGHT_LABEL: Record<BudgetLight, string> = {
  GREEN: "En rango",
  YELLOW: "Vigilar",
  RED: "Fuera de rango",
  NO_BUDGET: "Sin presupuesto",
  PENDING: "Sin dato",
};

export const METHOD_LABEL: Record<BudgetMethod, string> = {
  ACTUAL: "Real",
  RUN_RATE: "Al ritmo del mes",
  BUDGET: "Presupuesto (falta la factura o el dato)",
  TO_DATE: "Hasta hoy",
  CONTRACTED: "Devengado contratado",
};

export const STATUS_LABEL = { CLOSED: "Cerrado", CURRENT: "En curso", FUTURE: "Futuro" } as const;

export interface BudgetRubroRow {
  rubro: BudgetRubro;
  label: string;
  budgetCop: number | null;
  actualCop: number | null;
  /** Lo que se compara: el real, o en el mes en curso, lo llevado a fin de mes. */
  comparedCop: number | null;
  method: BudgetMethod | null;
  deviation: number | null;
  light: BudgetLight;
  favorable: boolean | null;
  needsExplanation: boolean;
}

export interface BudgetMonthRow {
  month: string;
  label: string;
  status: keyof typeof STATUS_LABEL;
  elapsedShare: number;
  hasBudget: boolean;
  expectedOrganizations: number | null;
  oneTimeBudgetCop: number | null;
  light: BudgetLight;
  rubros: BudgetRubroRow[];
  budgetResultCop: number | null;
  resultCop: number | null;
  incomeCashCop: number | null;
  withholdingCop: number | null;
  variableEstimatedCop: number | null;
  invoices: number | null;
  invoicesWithoutCop: string[];
  estimated: { provider: string; service: string; cop: number }[];
  needsExplanation: boolean;
  missingExplanation: boolean;
  deviationNote: string | null;
  deviationNoteByEmail: string | null;
  deviationNoteAt: string | null;
  source: string | null;
  setByEmail: string | null;
  updatedAt: string | null;
}

export interface BudgetReport {
  from: string;
  to: string;
  currentMonth: string;
  deviationLimit: number;
  months: BudgetMonthRow[];
  summary: {
    monthsWithBudget: number;
    monthsWithoutBudget: string[];
    missingExplanations: string[];
    red: string[];
  };
}

export interface BudgetProjectionRow {
  month: string;
  label: string;
  incomeCop: number;
  contractedCop: number;
  variableCop: number;
  fixedCop: number | null;
  fixedFrom: "BUDGET" | "PREVIOUS_BUDGET" | "NONE";
  resultCop: number | null;
  cumulativeCop: number | null;
  budgetIncomeCop: number | null;
  budgetResultCop: number | null;
  cumulativeBudgetCop: number | null;
}

export interface BudgetProjection {
  from: string;
  to: string;
  mrrCop: number;
  variableRunRateCop: number;
  variableRunRateMethod: "CURRENT_MONTH" | "PREVIOUS_MONTH";
  months: BudgetProjectionRow[];
  totals: {
    incomeCop: number;
    contractedCop: number;
    resultCop: number | null;
    budgetResultCop: number | null;
  };
}

export interface BudgetMonthInput {
  month: string;
  expectedOrganizations: number | null;
  infrastructureCop: number;
  administrationCop: number;
  teamCop: number;
  oneTimeCop: number;
  variableCop: number;
  incomeCop: number;
}

export interface BudgetChange {
  id: string;
  month: string;
  kind: "BUDGET" | "TEAM_ACTUAL" | "NOTE";
  operatorEmail: string;
  reason: string;
  before: Record<string, unknown> | null;
  after: Record<string, unknown>;
  createdAt: string;
}

const range = (from: string, to: string) =>
  from === to
    ? `month=${encodeURIComponent(from)}`
    : `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

export const getBudgetReport = (from: string, to: string) =>
  apiGet<BudgetReport>(`/platform/billing/budget?${range(from, to)}`);

export const getBudgetProjection = (months = 12) =>
  apiGet<BudgetProjection>(`/platform/billing/budget/projection?months=${months}`);

export const getBudgetChanges = (month: string) =>
  apiGet<BudgetChange[]>(`/platform/billing/budget/${encodeURIComponent(month)}/changes`);

export const setBudget = (body: { source: string; reason: string; months: BudgetMonthInput[] }) =>
  apiPut<{ saved: string[]; unchanged: string[] }>("/platform/billing/budget", body);

export const setBudgetTeamActual = (month: string, teamActualCop: number | null, reason: string) =>
  apiPatch<{ month: string; teamActualCop: number | null }>(
    `/platform/billing/budget/${encodeURIComponent(month)}/team-actual`,
    { teamActualCop, reason },
  );

export const setBudgetNote = (month: string, note: string) =>
  apiPatch(`/platform/billing/budget/${encodeURIComponent(month)}/note`, { note });

export async function downloadBudgetExport(from: string, to: string) {
  const response = await api.get<Blob>(`/platform/billing/budget/export?${range(from, to)}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `presupuesto-real-${from === to ? from : `${from}_${to}`}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** El mes `offset` meses después de `month` (AAAA-MM). */
export function shiftMonth(month: string, offset: number) {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber - 1 + offset, 1)).toISOString().slice(0, 7);
}

/** Mes de Colombia en curso. */
export function currentColombiaMonth(now = new Date()) {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 7);
}

// Columnas del archivo que genera
// docs/reestructuracion-comercial/exportar-presupuesto-para-panel.py.
const UPLOAD_COLUMNS = [
  "mes",
  "organizaciones",
  "infraestructura",
  "administracion",
  "equipo",
  "inversion_unica",
  "variables",
  "ingresos",
] as const;

/**
 * Lee el archivo del libro (CSV con «;»). Solo transporta: devuelve las filas
 * o el primer problema que impide enviarlas; el servidor valida todo de nuevo.
 */
export function parseBudgetFile(text: string): { months: BudgetMonthInput[] } | { error: string } {
  const lines = text
    .replace(/^﻿/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length < 2) return { error: "El archivo no trae meses." };
  const head = lines[0].split(";").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const index = UPLOAD_COLUMNS.map((c) => head.indexOf(c));
  const missing = UPLOAD_COLUMNS.filter((_, i) => index[i] < 0);
  if (missing.length)
    return {
      error: `Faltan las columnas ${missing.join(", ")}: usa el archivo de exportar-presupuesto-para-panel.py.`,
    };
  const months: BudgetMonthInput[] = [];
  for (const [n, line] of lines.slice(1).entries()) {
    const cells = line.split(";").map((c) => c.trim().replace(/^"|"$/g, ""));
    const cell = (column: (typeof UPLOAD_COLUMNS)[number]) => cells[index[UPLOAD_COLUMNS.indexOf(column)]] ?? "";
    const number = (column: (typeof UPLOAD_COLUMNS)[number]) => {
      const raw = cell(column).replace(/\s/g, "");
      const value = raw === "" ? 0 : Number(raw);
      return Number.isFinite(value) ? Math.round(value * 100) / 100 : NaN;
    };
    const row: BudgetMonthInput = {
      month: cell("mes"),
      expectedOrganizations: cell("organizaciones") === "" ? null : Math.round(Number(cell("organizaciones"))),
      infrastructureCop: number("infraestructura"),
      administrationCop: number("administracion"),
      teamCop: number("equipo"),
      oneTimeCop: number("inversion_unica"),
      variableCop: number("variables"),
      incomeCop: number("ingresos"),
    };
    const bad = Object.entries(row).find(
      ([key, value]) => key !== "month" && value !== null && (typeof value !== "number" || Number.isNaN(value)),
    );
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(row.month)) return { error: `Fila ${n + 2}: el mes va como AAAA-MM.` };
    if (bad) return { error: `Fila ${n + 2} (${row.month}): «${bad[0]}» no es un número.` };
    months.push(row);
  }
  return { months };
}
