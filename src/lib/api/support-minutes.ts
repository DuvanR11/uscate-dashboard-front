import { apiGet } from "@/lib/api";

// Fase 7 del plan de finanzas (2026-11-08): minutos de soporte por
// organización y por mes (`GET /platform/support/minutes`).
export interface SupportMinutesRow {
  organizationId: string;
  organizationName: string;
  month: string;
  planCode: string | null;
  planName: string | null;
  ticketMinutes: number;
  ticketActions: number;
  ticketActionsWithoutMinutes: number;
  sessionMinutes: number;
  purchasedMinutes: number;
  includedHoursMinutes: number;
  trialMinutes: number;
  noChargeMinutes: number;
  pendingMinutes: number;
  absorbedMinutes: number;
  expectedMinutes: number | null;
  overExpected: boolean;
}
export interface SupportMinutesReport {
  months: string[];
  rows: SupportMinutesRow[];
  expectedSource: string;
  generatedAt: string;
}
export const getSupportMinutes = (months: number, organizationId?: string) => {
  const query = new URLSearchParams({ months: String(months) });
  if (organizationId) query.set("organizationId", organizationId);
  return apiGet<SupportMinutesReport>(`/platform/support/minutes?${query}`);
};
