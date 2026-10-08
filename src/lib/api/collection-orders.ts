import { apiGet, apiPost } from "@/lib/api";

export type TransferState =
  "PENDING" | "NEEDS_INFORMATION" | "REJECTED" | "CONFIRMED";
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
export interface CollectionOrder {
  id: string;
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
    | "PAID_PENDING_APPLICATION"
    | "UNDER_REVIEW"
    | "PARTIAL"
    | "AWAITING_TRANSFER";
  applicationState: "NOT_APPLIED";
  requests: TransferRequest[];
}
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
export const downloadTransferEvidence = (
  org: string | undefined,
  orderId: string,
  requestId: string,
  evidenceId: string,
) =>
  apiGet<{ url: string }>(
    `${root(org)}/${orderId}/requests/${requestId}/evidence/${evidenceId}/download`,
  );
