import { apiDelete, apiGet, apiPatch, apiPost, apiPut } from '@/lib/api';
import api from '@/lib/api';

/**
 * Cliente para `modules/campaign-finance` (backend) — rastreador interno
 * de aportantes/gastos de campaña (Ley 1475 de 2011). Nunca reemplaza
 * Cuentas Claras (el canal oficial del CNE) — los mismos campos que ese
 * aplicativo pide, para que el tesorero solo copie de acá.
 */

export type CampaignContributionSourceType =
  | 'RECURSOS_PROPIOS'
  | 'CONYUGE_PARIENTE'
  | 'TERCERO';

export interface CampaignFinanceSettings {
  campaignSpendingCap: number | null;
  campaignSpendingCapReference: string | null;
}

export interface CampaignContribution {
  id: string;
  contributorName: string;
  contributorDocument: string | null;
  address: string | null;
  phone: string | null;
  incomeName: string;
  description: string;
  amount: string;
  sourceType: CampaignContributionSourceType;
  exceedsIndividualLimit: boolean;
  registeredAt: string;
  createdAt: string;
}

export interface CampaignExpense {
  id: string;
  category: string;
  providerName: string;
  providerDocument: string | null;
  description: string;
  amount: string;
  expenseDate: string;
  createdAt: string;
}

export interface CampaignFinanceSummary {
  campaignSpendingCap: number | null;
  campaignSpendingCapReference: string | null;
  totalRaised: number;
  totalSpent: number;
  capUsagePercentage: number | null;
  exceedingContributionsCount: number;
}

export function getCampaignFinanceSettings(): Promise<CampaignFinanceSettings> {
  return apiGet<CampaignFinanceSettings>('/campaign-finance/settings');
}

export function updateCampaignFinanceSettings(input: {
  campaignSpendingCap: number;
  campaignSpendingCapReference: string;
}): Promise<CampaignFinanceSettings> {
  return apiPatch<CampaignFinanceSettings>('/campaign-finance/settings', input);
}

export function listCampaignContributions(): Promise<CampaignContribution[]> {
  return apiGet<CampaignContribution[]>('/campaign-finance/contributions');
}

export function createCampaignContribution(input: {
  contributorName: string;
  contributorDocument?: string;
  address?: string;
  phone?: string;
  incomeName: string;
  description: string;
  amount: number;
  sourceType: CampaignContributionSourceType;
  registeredAt: string;
}): Promise<CampaignContribution> {
  return apiPost<CampaignContribution>('/campaign-finance/contributions', input);
}

export type CampaignContributionInput = Parameters<typeof createCampaignContribution>[0];

/** Corrige un aporte mal digitado. */
export function updateCampaignContribution(id: string, input: CampaignContributionInput): Promise<CampaignContribution> {
  return apiPut<CampaignContribution>(`/campaign-finance/contributions/${id}`, input);
}

export function deleteCampaignContribution(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/campaign-finance/contributions/${id}`);
}

export function listCampaignExpenses(): Promise<CampaignExpense[]> {
  return apiGet<CampaignExpense[]>('/campaign-finance/expenses');
}

export function createCampaignExpense(input: {
  category: string;
  providerName: string;
  providerDocument?: string;
  description: string;
  amount: number;
  expenseDate: string;
}): Promise<CampaignExpense> {
  return apiPost<CampaignExpense>('/campaign-finance/expenses', input);
}

export type CampaignExpenseInput = Parameters<typeof createCampaignExpense>[0];

/** Corrige un gasto mal digitado. */
export function updateCampaignExpense(id: string, input: CampaignExpenseInput): Promise<CampaignExpense> {
  return apiPut<CampaignExpense>(`/campaign-finance/expenses/${id}`, input);
}

export function deleteCampaignExpense(id: string): Promise<{ deleted: boolean }> {
  return apiDelete<{ deleted: boolean }>(`/campaign-finance/expenses/${id}`);
}

export function getCampaignFinanceSummary(): Promise<CampaignFinanceSummary> {
  return apiGet<CampaignFinanceSummary>('/campaign-finance/summary');
}

/** `GET /campaign-finance/contributions/export` — descarga real el CSV (blob), no JSON. */
export async function downloadCampaignContributionsCsv(): Promise<void> {
  const response = await api.get('/campaign-finance/contributions/export', {
    responseType: 'blob',
  });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'aportantes-campana.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
