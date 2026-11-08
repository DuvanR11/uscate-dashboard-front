import api, { apiGet } from "@/lib/api";

// Fase 6a del plan de finanzas y catálogo (2026-11-07): visibilidad
// financiera del operador. Todo lo calcula el servidor; aquí solo se lee.
export type FinanceSegment = "A" | "B" | "PRESS" | "TERRITORIAL" | "CUSTOM" | "NONE";
export const SEGMENT_LABEL: Record<FinanceSegment, string> = {
  A: "Representantes (A)",
  B: "Campañas (B)",
  PRESS: "Zyron Prensa (P)",
  TERRITORIAL: "Catálogo territorial",
  CUSTOM: "Institucional y a la medida",
  NONE: "Sin suscripción pagada",
};
export type FinanceRevenueType = "SUBSCRIPTION" | "SETUP" | "PACK" | "HOURS" | "ADDON";

export interface FinanceMoney {
  cashCop: number;
  accruedCop: number;
  variableCostCop: number;
  marginCop: number;
  /** Margen sobre lo devengado, entre 0 y 1 (null sin ingreso). */
  marginRate: number | null;
}
export interface FinancePlanRow extends FinanceMoney {
  planCode: string;
  planName: string;
  segment: FinanceSegment;
  organizations?: number;
}
export interface FinanceOrganizationRow extends FinanceMoney {
  organizationId: string;
  name: string;
  planCode: string;
  planName: string;
  segment: FinanceSegment;
  costRatio: number | null;
  overCost: boolean;
  modules: { module: string; costCop: number }[];
}
export interface FinanceOverview {
  from: string;
  to: string;
  months: string[];
  basis: "ACCRUED";
  totals: FinanceMoney & {
    taxableCashCop: number;
    exemptCashCop: number;
    platformVariableCostCop: number;
    demoVariableCostCop: number;
    marginAfterPlatformCop: number;
    paymentsCounted: number;
    excludedPayments: number;
    attemptsWithoutEstimate: number;
  };
  byPlan: FinancePlanRow[];
  bySegment: (FinanceMoney & { segment: FinanceSegment; label: string })[];
  byType: { type: FinanceRevenueType; label: string; cashCop: number; accruedCop: number }[];
  byMonth: {
    month: string;
    totals: FinanceMoney;
    platformCostCop: number;
    demoCostCop: number;
    plans: FinancePlanRow[];
  }[];
  costByModule: {
    module: string;
    organizationCostCop: number;
    platformCostCop: number;
    demoCostCop: number;
    totalCostCop: number;
    attempts: number;
  }[];
  costByProvider: {
    provider: string;
    service: string;
    costCop: number;
    attempts: number;
    withoutEstimate: number;
  }[];
  organizations: FinanceOrganizationRow[];
  overCost: FinanceOrganizationRow[];
}

const range = (from: string, to: string) =>
  from === to
    ? `month=${encodeURIComponent(from)}`
    : `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

export const getFinanceOverview = (from: string, to: string) =>
  apiGet<FinanceOverview>(`/platform/billing/finance?${range(from, to)}`);

export async function downloadFinanceCsv(from: string, to: string) {
  const response = await api.get<Blob>(`/platform/billing/finance/csv?${range(from, to)}`, {
    responseType: "blob",
  });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `finanzas-${from === to ? from : `${from}_${to}`}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Porcentaje con coma decimal: 0,253 → «25,3 %». */
export const percent = (value: number | null) =>
  value === null
    ? "—"
    : `${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 1 }).format(value * 100)} %`;
