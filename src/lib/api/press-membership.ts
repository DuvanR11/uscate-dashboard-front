import { apiGet, apiPost } from "@/lib/api";

// Zyron Prensa, Fase 4 (2026-11-08): el periodista arma y paga su orden de
// membresía sin pasar por un asesor. Montos calculados por el servidor.
export interface PressMembershipTerm {
  termMonths: number;
  discountPercent: number;
  totalAmount: number;
  monthlyPrice: number | null;
}

export interface PressMembershipOptions {
  currentPlanCode: string;
  onTrial: boolean;
  currentPeriodEnd: string | null;
  plans: { code: string; name: string; terms: PressMembershipTerm[] }[];
  openOrder: null | {
    id: string;
    commercialPlanCode: string | null;
    termMonths: number;
    totalAmount: number;
    dueAt: string;
  };
}

export const getPressMembershipOptions = () =>
  apiGet<PressMembershipOptions>("/organization/billing/press-membership");

export const createPressMembershipOrder = (body: {
  commercialPlanCode: string;
  termMonths: number;
  requestKey: string;
}) =>
  apiPost<{ orderId: string; created: boolean }>(
    "/organization/billing/press-membership/orders",
    body,
  );
