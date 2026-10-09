import api, { apiGet } from "@/lib/api";

export const RECEIVABLE_STATE = {
  AWAITING_TRANSFER: "Esperando transferencia",
  PARTIAL: "Abono parcial",
  UNDER_REVIEW: "En revisión",
  PAID_PENDING_APPLICATION: "Pagada, pendiente de aplicar",
  APPLIED: "Aplicada al plan",
} as const;
export const RECEIVABLE_AGING = {
  NOT_DUE: "Dentro del plazo",
  DUE_0_30: "Fuera de plazo: 0–30 días",
  DUE_31_60: "Fuera de plazo: 31–60 días",
  DUE_61_90: "Fuera de plazo: 61–90 días",
  DUE_91_PLUS: "Fuera de plazo: 91 días o más",
  SETTLED: "Sin saldo pendiente",
} as const;
export interface Receivable {
  id: string;
  organizationId: string;
  organizationName: string;
  quoteId: string;
  quoteVersion: number;
  currency: string;
  totalAmount: string;
  receivedAmount: string;
  allocatedAmount: string;
  outstandingAmount: string;
  excessAmount: string;
  state: keyof typeof RECEIVABLE_STATE;
  aging: keyof typeof RECEIVABLE_AGING;
  daysPastDue: number | null;
  pendingReviews: number;
  dueAt: string;
  createdAt: string;
  appliedAt: string | null;
  requiresReconciliation: boolean;
}
export interface ReceivablesReport {
  asOf: string;
  total: number;
  page: number;
  pageSize: number;
  rows: Receivable[];
  summaries: {
    currency: string;
    orders: number;
    totalAmount: string;
    receivedAmount: string;
    allocatedAmount: string;
    outstandingAmount: string;
    excessAmount: string;
    overdueAmount: string;
    notDueAmount: string;
    paidPendingApplication: number;
    pendingReviews: number;
    due0To30: string;
    due31To60: string;
    due61To90: string;
    due91Plus: string;
  }[];
}
export const getReceivables = (params: string) =>
  apiGet<ReceivablesReport>(`/platform/billing/receivables?${params}`);
export async function exportReceivables(params: string) {
  const response = await api.get<Blob>(
    `/platform/billing/receivables/csv?${params}`,
    { responseType: "blob" },
  );
  const url = URL.createObjectURL(response.data);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "cartera.csv";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function receivableMoney(amount: string, currency: string) {
  const [integer, cents = "00"] = amount.split(".");
  return `${new Intl.NumberFormat("es-CO").format(BigInt(integer))},${cents.padEnd(2, "0")} ${currency}`;
}
