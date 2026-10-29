import api, { apiGet, apiPut } from "@/lib/api";

// Fase 1 del plan de finanzas y catálogo (2026-10-29): cierre del mes para el
// contador y TRM de cada mes.
export interface MonthlyCloseSummary {
  month: string;
  trm: { month: string; copPerUsd: number } | null;
  payments: {
    count: number;
    confirmed: number;
    excluded: number;
    incomeBaseCop: number;
    vatCop: number;
    totalCop: number;
  };
  costs: {
    invoices: number;
    invoicesCop: number;
    invoicesWithoutCop: number;
    usageEstimatedCop: number;
    usageWithoutEstimate: number;
  };
  operatingProfitCop: number;
  incomeTaxProvisionCop: number;
  withholdingCop: number | null;
}
export interface ExchangeRate {
  month: string;
  copPerUsd: string;
  source: string;
  setByEmail: string | null;
  updatedAt: string;
}

export const getMonthlyClose = (month: string) =>
  apiGet<MonthlyCloseSummary>(
    `/platform/billing/monthly-close?month=${encodeURIComponent(month)}`,
  );
export const getExchangeRates = () =>
  apiGet<ExchangeRate[]>("/platform/infrastructure/exchange-rates");
export const setExchangeRate = (
  month: string,
  body: { copPerUsd: number; source: string },
) =>
  apiPut<ExchangeRate>(
    `/platform/infrastructure/exchange-rates/${encodeURIComponent(month)}`,
    body,
  );

export async function downloadMonthlyCloseCsv(
  kind: "payments" | "costs",
  month: string,
) {
  const response = await api.get<Blob>(
    `/platform/billing/monthly-close/${kind}/csv?month=${encodeURIComponent(month)}`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `${kind === "payments" ? "pagos" : "costos"}-${month}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Mes anterior al de hoy en Colombia, que es el que se cierra. */
export function previousColombiaMonth(now = new Date()) {
  const bogota = new Date(now.getTime() - 5 * 3600_000);
  const d = new Date(Date.UTC(bogota.getUTCFullYear(), bogota.getUTCMonth() - 1, 1));
  return d.toISOString().slice(0, 7);
}

export const pesos = (value: number) =>
  `$${new Intl.NumberFormat("es-CO", { maximumFractionDigits: 0 }).format(Math.round(value))}`;
