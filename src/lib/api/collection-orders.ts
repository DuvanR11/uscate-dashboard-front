import { apiGet, apiPost } from "@/lib/api";

export type TransferState =
  | "PENDING"
  | "NEEDS_INFORMATION"
  | "REJECTED"
  | "CONFIRMED";
export interface TransferRequest {
  id: string;
  state: TransferState;
  reportedAmount: number;
  reportedCurrency: string;
  reportedPaidAt: string;
  reportedReference: string;
  notes: string;
  createdAt: string;
  evidence: { id: string; fileName: string; sizeBytes: number }[];
  events: { id: string; action: string; notes: string; createdAt: string }[];
  receipt: null | {
    amount: number;
    allocatedAmount: number;
    excessAmount: number;
    bankReference: string;
    paidAt: string;
    verifiedAt: string;
  };
}
/** A dónde transferir (recorrido de alta, Fase 1B); null si no está configurada. */
export interface PayTo {
  bankName: string;
  accountType: string;
  accountNumber: string;
  holderName: string;
  holderId: string | null;
  /** Código con el que Finanzas confirma el ingreso (p. ej. BANCOLOMBIA-7160). */
  code: string;
}
export interface CollectionOrder {
  id: string;
  /** Referencia corta para la descripción de la transferencia (ZY-XXXXXXXX). */
  paymentReference: string;
  payTo: PayTo | null;
  quoteId: string;
  quoteVersion: number;
  currency: string;
  totalAmount: number;
  allocatedAmount: number;
  outstandingAmount: number;
  excessAmount: number;
  dueAt: string;
  requiresReconciliation: boolean;
  state:
    | "APPLIED"
    | "PAID_PENDING_APPLICATION"
    | "UNDER_REVIEW"
    | "PARTIAL"
    | "AWAITING_TRANSFER";
  applicationState: "NOT_APPLIED" | "APPLIED";
  application?: null | {
    id: string;
    paymentId: string;
    appliedAt: string;
    appliedByEmail: string;
    notes: string;
    after: { currentPeriodEnd: string };
  };
  requests: TransferRequest[];
}
export interface ApplicationPreview {
  applied: boolean;
  expectedSubscriptionUpdatedAt: string;
  totalAmount: number;
  termMonths: number;
  planName: string;
  periodStart: string;
  periodEnd: string;
  renewing: boolean;
  quotasPreserved: boolean;
  requiresReconciliation: boolean;
}
export interface ApplyOrderInput {
  requestKey: string;
  expectedSubscriptionUpdatedAt: string;
  notes: string;
  acknowledgeReconciliation: boolean;
}
export const previewOrderApplication = (org: string, orderId: string) =>
  apiGet<ApplicationPreview>(`${root(org)}/${orderId}/application-preview`);
export const applyOrderToPlan = (
  org: string,
  orderId: string,
  input: ApplyOrderInput,
) => apiPost(`${root(org)}/${orderId}/apply`, input);
export interface ReviewTransferInput {
  requestKey: string;
  action: "NEEDS_INFORMATION" | "REJECTED" | "CONFIRMED";
  expectedState: "PENDING" | "NEEDS_INFORMATION";
  notes: string;
  receivingAccount?: string;
  bankReference?: string;
  amount?: number;
  currency?: string;
  paidAt?: string;
  acknowledgeReconciliation?: boolean;
}
const root = (org?: string) =>
  org
    ? `/platform/billing/organizations/${encodeURIComponent(org)}/orders`
    : "/organization/billing/orders";
export const listCollectionOrders = (org?: string) =>
  apiGet<CollectionOrder[]>(root(org));
export const createCollectionOrder = (org: string, quoteId: string) =>
  apiPost<CollectionOrder>(root(org), { quoteId });
export const submitTransfer = (orderId: string, form: FormData) =>
  apiPost<CollectionOrder>(`${root()}/${orderId}/requests`, form);
export const addTransferInformation = (
  orderId: string,
  requestId: string,
  form: FormData,
) =>
  apiPost<CollectionOrder>(
    `${root()}/${orderId}/requests/${requestId}/information`,
    form,
  );
export const reviewTransfer = (
  org: string,
  orderId: string,
  requestId: string,
  input: ReviewTransferInput,
) =>
  apiPost<CollectionOrder>(
    `${root(org)}/${orderId}/requests/${requestId}/review`,
    input,
  );
/** Finanzas registra una transferencia ya verificada en el banco. */
export interface RecordTransferInput {
  requestKey: string;
  amount: number;
  paidAt: string;
  bankReference: string;
  notes: string;
  acknowledgeReconciliation?: boolean;
}
export const recordTransfer = (
  org: string,
  orderId: string,
  input: RecordTransferInput,
) =>
  apiPost<CollectionOrder>(`${root(org)}/${orderId}/transfers`, input);
export const downloadTransferEvidence = (
  org: string | undefined,
  orderId: string,
  requestId: string,
  evidenceId: string,
) =>
  apiGet<{ url: string }>(
    `${root(org)}/${orderId}/requests/${requestId}/evidence/${evidenceId}/download`,
  );
