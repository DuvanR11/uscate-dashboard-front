import api, { apiGet, apiPost } from "@/lib/api";
import type { FinanceSegment } from "@/lib/api/finance-overview";

// Fase 6b del plan de finanzas y catálogo (2026-11-07): finanzas por cliente,
// saldos prepagos con vencimiento y facturas emitidas fuera del sistema. El
// servidor calcula todo; aquí solo se lee y se envía el número de factura.
export type PrepaidKind = "SUBSCRIPTION" | "ADDON" | "PACK" | "HOURS";
export type PrepaidRecognition = "DEFERRED" | "AT_CASH";
export type InvoicingStatus = "PENDING" | "ISSUED" | "ALL";

export const INVOICING_STATUS_LABEL: Record<InvoicingStatus, string> = {
  PENDING: "Sin factura",
  ISSUED: "Con factura",
  ALL: "Todos",
};

export const RECOGNITION_LABEL: Record<PrepaidRecognition, string> = {
  DEFERRED: "Falta por devengar",
  AT_CASH: "Reconocido al cobrar",
};

export interface ClientRow {
  organizationId: string;
  name: string;
  planName: string | null;
  segment: FinanceSegment | null;
  accruedCop: number;
  variableCostCop: number;
  marginCop: number;
  marginRate: number | null;
  overCost: boolean;
  prepaidValueCop: number;
  nextExpiry: { label: string; endsAt: string; daysLeft: number } | null;
  pendingInvoices: number;
  pendingInvoiceTotalCop: number;
  outstandingCop: number;
  overdueCop: number;
}

export interface ClientsReport {
  month: string;
  asOf: string;
  summary: {
    organizations: number;
    overCost: number;
    accruedCop: number;
    variableCostCop: number;
    marginCop: number;
    prepaidValueCop: number;
    pendingInvoices: number;
    pendingInvoiceTotalCop: number;
    outstandingCop: number;
    overdueCop: number;
  };
  rows: ClientRow[];
}

export interface PrepaidRow {
  kind: PrepaidKind;
  kindLabel: string;
  recognition: PrepaidRecognition;
  organizationId: string;
  organizationName: string;
  paymentId: string | null;
  balanceId: string | null;
  label: string;
  unit: string;
  total: number | null;
  consumed: number | null;
  remaining: number | null;
  endsAt: string;
  daysLeft: number;
  expiresSoon: boolean;
  valued: boolean;
  valueCop: number;
}

export interface PrepaidReport {
  asOf: string;
  expiryWindowDays: number;
  summary: {
    unearnedCop: number;
    unconsumedCop: number;
    totalCop: number;
    expiringSoonCop: number;
    expiringSoon: number;
    organizations: number;
    byKind: { kind: PrepaidKind; label: string; count: number; valueCop: number }[];
  };
  rows: PrepaidRow[];
}

export interface EffectiveInvoice {
  invoiceNumber: string;
  issuedOn: string | null;
  source: "PAYMENT" | "RECORD";
  recordId: string | null;
  corrections: number;
}

export interface InvoicingRow {
  paymentId: string;
  organizationId: string;
  organizationName: string;
  paidAt: string;
  concept: string;
  method: string;
  reference: string | null;
  taxableCop: number;
  exemptCop: number;
  vatCop: number;
  totalCop: number;
  withholdingCop: number;
  withholdingNote: string | null;
  receivedCop: number;
  invoice: EffectiveInvoice | null;
  daysWithoutInvoice: number | null;
}

export interface InvoicingReport {
  from: string;
  to: string;
  status: InvoicingStatus;
  asOf: string;
  summary: {
    payments: number;
    issued: number;
    pending: number;
    pendingTaxableCop: number;
    pendingExemptCop: number;
    pendingVatCop: number;
    pendingTotalCop: number;
    pendingWithholdingCop: number;
    oldestPendingDays: number | null;
    pendingBeforeRange: number;
  };
  rows: InvoicingRow[];
}

export interface InvoiceRecord {
  id: string;
  invoiceNumber: string;
  issuedOn: string;
  replacesId: string | null;
  reason: string | null;
  recordedByEmail: string;
  createdAt: string;
}

export interface InvoiceHistory {
  paymentId: string;
  typedAtRegistration: string | null;
  current: EffectiveInvoice | null;
  records: InvoiceRecord[];
}

const range = (from: string, to: string) =>
  from === to
    ? `month=${encodeURIComponent(from)}`
    : `from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`;

export const getClientsReport = (month: string) =>
  apiGet<ClientsReport>(`/platform/billing/finance/clients?month=${encodeURIComponent(month)}`);

export const getPrepaidReport = () => apiGet<PrepaidReport>("/platform/billing/finance/prepaid");

export const getInvoicingReport = (from: string, to: string, status: InvoicingStatus) =>
  apiGet<InvoicingReport>(`/platform/billing/finance/invoicing?${range(from, to)}&status=${status}`);

export const getInvoiceHistory = (paymentId: string) =>
  apiGet<InvoiceHistory>(`/platform/billing/finance/invoicing/${encodeURIComponent(paymentId)}/history`);

export const recordInvoice = (
  paymentId: string,
  body: { invoiceNumber: string; issuedOn: string; reason?: string },
) =>
  apiPost<{ paymentId: string; corrected: boolean; sharedWithOtherPayments: number }>(
    `/platform/billing/finance/invoicing/${encodeURIComponent(paymentId)}`,
    body,
  );

async function downloadCsv(path: string, filename: string) {
  const response = await api.get<Blob>(path, { responseType: "blob" });
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const downloadClientsCsv = (month: string) =>
  downloadCsv(
    `/platform/billing/finance/clients/csv?month=${encodeURIComponent(month)}`,
    `finanzas-por-cliente-${month}.csv`,
  );

export const downloadPrepaidCsv = () =>
  downloadCsv("/platform/billing/finance/prepaid/csv", "saldos-prepagos.csv");

export const downloadInvoicingCsv = (from: string, to: string, status: InvoicingStatus) =>
  downloadCsv(
    `/platform/billing/finance/invoicing/csv?${range(from, to)}&status=${status}`,
    `facturacion-${status === "PENDING" ? "pendiente" : status === "ISSUED" ? "emitida" : "todo"}-${from === to ? from : `${from}_${to}`}.csv`,
  );

/** Día de Colombia de hoy (AAAA-MM-DD). */
export function colombiaToday(now = new Date()) {
  return new Date(now.getTime() - 5 * 3600_000).toISOString().slice(0, 10);
}
