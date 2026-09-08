import { apiGet, apiPatch, apiPost } from '@/lib/api';
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

export function extractErrorMessage(error: unknown): string | undefined {
  if (typeof error === 'object' && error !== null && 'response' in error) {
    const response = (error as { response?: { data?: { message?: string | string[] } } }).response;
    const message = response?.data?.message;
    return Array.isArray(message) ? message[0] : message;
  }
  return undefined;
}
