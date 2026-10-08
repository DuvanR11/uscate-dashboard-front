import { apiGet, apiPatch, apiPost } from '@/lib/api';

export type InfrastructureStatus = 'DECLARED' | 'ESTIMATED' | 'CONFIRMED' | 'VOID';
export interface InfrastructureResource {
  id: string; name: string; supplier: string | null; technicalReference: string | null;
  billingOwner: string | null; declaredPlanAmount: string | null; declaredPlanCurrency: string | null;
  declaredPaymentCurrency: string | null; declarationSource: string | null;
  approvedMonthlyBudget?: string | null; budgetCurrency?: string | null; budgetReviewer?: string | null; budgetSource?: string | null;
}
export interface InfrastructureCost {
  id: string; resourceId: string; resource: InfrastructureResource; periodStart: string; periodEnd: string;
  amount: string; currency: string; status: InfrastructureStatus; invoiceReference: string | null;
  evidenceReference: string | null; paidAmount: string | null; paidCurrency: string | null;
  paymentReference: string | null; notes: string; version: number;
}
export interface InfrastructureDetail extends InfrastructureCost {
  changes: { id: string; operatorEmail: string; reason: string; before: unknown; after: unknown; createdAt: string }[];
}
export interface InfrastructureReport {
  items: InfrastructureCost[]; total: number; page: number; pageSize: number;
  totals: { currency: string; status: InfrastructureStatus; amount: string | null; records: number }[];
  payments: { currency: string; amount: string | null; records: number }[];
}
export interface InfrastructureInput {
  resourceId: string; periodStart: string; periodEnd: string; amount: string; currency: string;
  status: InfrastructureStatus; invoiceReference?: string; evidenceReference?: string;
  paidAmount?: string; paidCurrency?: string; paymentReference?: string; notes: string; reason: string;
}
export const infrastructureResources = () => apiGet<InfrastructureResource[]>('/platform/infrastructure/resources');
export const infrastructureCosts = (params: URLSearchParams) => apiGet<InfrastructureReport>(`/platform/infrastructure/costs?${params}`);
export const infrastructureDetail = (id: string) => apiGet<InfrastructureDetail>(`/platform/infrastructure/costs/${encodeURIComponent(id)}`);
export const saveInfrastructureCost = (input: InfrastructureInput, current?: { id: string; version: number }) => current
  ? apiPatch(`/platform/infrastructure/costs/${encodeURIComponent(current.id)}`, { ...input, version: current.version })
  : apiPost('/platform/infrastructure/costs', input);
