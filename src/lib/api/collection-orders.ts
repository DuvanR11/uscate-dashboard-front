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
  /** Ingresos verificados de pagos en línea (Wompi, fase W2). */
  onlinePayments?: OnlinePaymentReceipt[];
}
export interface OnlinePaymentReceipt {
  id: string;
  attemptId: string;
  provider: string;
  providerTransactionId: string;
  amount: number;
  allocatedAmount: number;
  excessAmount: number;
  paidAt: string;
  verifiedAt: string;
}
export type OnlineAttemptStatus =
  | "CREATED"
  | "PENDING"
  | "APPROVED"
  | "DECLINED"
  | "VOIDED"
  | "ERROR";
export interface OnlineAttempt {
  id: string;
  reference: string;
  status: OnlineAttemptStatus;
  statusMessage: string | null;
  amount: number;
  currency: string;
  paymentMethodType: string | null;
  providerTransactionId: string | null;
  expiresAt: string;
  createdAt: string;
  finalizedAt: string | null;
  /** Enlace al checkout de Wompi; solo mientras el intento está abierto. */
  checkoutUrl: string | null;
}
export interface OnlinePayments {
  /** Wompi configurado y habilitado para esta organización. */
  enabled: boolean;
  mode: "sandbox" | "production" | null;
  attempts: OnlineAttempt[];
}
export interface OperatorOnlineAttempt extends OnlineAttempt {
  createdByEmail: string;
  lastCheckedAt: string | null;
  events: {
    id: string;
    receivedAt: string;
    eventType: string;
    reportedStatus: string | null;
    checksumValid: boolean;
    result: string | null;
  }[];
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
/** Pagos en línea de una orden (cliente; fase W3 de Wompi). */
export const listOnlinePayments = (orderId: string) =>
  apiGet<OnlinePayments>(`${root()}/${orderId}/online-payments`);
export const startOnlinePayment = (orderId: string) =>
  apiPost<OnlineAttempt>(`${root()}/${orderId}/online-payments`);
/** Vuelta del checkout (`?id=` de Wompi): el servidor consulta la transacción. */
export const confirmOnlinePayment = (transactionId: string) =>
  apiPost<OnlineAttempt>("/organization/billing/online-payments/confirm", {
    transactionId,
  });
/** Operador: intentos de la orden con los avisos de Wompi. */
export const listOrderOnlineAttempts = (org: string, orderId: string) =>
  apiGet<Omit<OnlinePayments, "attempts"> & { attempts: OperatorOnlineAttempt[] }>(
    `${root(org)}/${orderId}/online-payments`,
  );
export const downloadTransferEvidence = (
  org: string | undefined,
  orderId: string,
  requestId: string,
  evidenceId: string,
) =>
  apiGet<{ url: string }>(
    `${root(org)}/${orderId}/requests/${requestId}/evidence/${evidenceId}/download`,
  );
