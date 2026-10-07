import { apiGet } from '@/lib/api';

export interface UsageMeasurement { unit: string; quantity: string | null; quality: string; source: string; }
export interface UsageValuation { amount: string | null; reportedAmount: string | null; currency: string | null; status: string; source: string; reconciliationStatus: string; }
export interface UsageAttempt {
  id: string; provider: string; service: string; accountRef: string; model: string | null;
  result: string; externalId: string | null; startedAt: string; finishedAt: string | null;
  operation: { id: string; scope: string; organizationId: string | null; module: string; action: string };
  measurements: UsageMeasurement[]; valuations?: UsageValuation[];
}
export interface UsageReport {
  items: UsageAttempt[]; total: number; page: number; pageSize: number; from: string; to: string;
  coverage: 'LIVE_PARTIAL'; historicalBackfill: false; unresolved: number; missingMeasurements: number;
  units: { unit: string; quality: string; quantity: string | null; observed: number; pending: number }[];
  costs?: { currency: string | null; status: string; amount: string | null; attempts: number }[];
  missingValuations?: number;
}
export const getProviderUsage = (params: URLSearchParams, costs: boolean) =>
  apiGet<UsageReport>(`/platform/provider-usage${costs ? '/costs' : ''}?${params}`);
