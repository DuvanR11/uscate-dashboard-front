import { apiGet, apiPost } from "@/lib/api";
export const BALANCE_SOURCE = {
  MONTHLY: "Incluido mensual",
  PURCHASED: "Comprado",
  TRIAL: "Sesión inicial de prueba",
} as const;
export const BALANCE_STATUS = {
  VALID: "Vigente",
  EXPIRED: "Vencido",
  SCHEDULED: "Vigencia futura",
  SOURCE_VOID: "Pago anulado",
  ACCESS_PENDING: "Revisar vigencia de acceso",
  TRIAL_RECORDED: "Prueba registrada; validar acceso antes de uso",
} as const;
export interface SupportBalance {
  id: string;
  organizationId: string;
  organizationName?: string;
  sourceType: keyof typeof BALANCE_SOURCE;
  capacitySeconds: number;
  remainingSeconds: number;
  validFrom: string;
  expiresAt: string;
  version: number;
  status?: keyof typeof BALANCE_STATUS;
}
export interface BalanceBoard {
  items: SupportBalance[];
  total: number;
  page: number;
  pageSize: number;
  cutoff: string;
  reconciled: boolean | null;
  automaticConsumptionEnabled: boolean;
}
export interface BalanceSource {
  sourceType: "MONTHLY" | "PURCHASED";
  sourceId: string;
  capacitySeconds: number;
  validFrom: string;
  expiresAt: string;
  alreadyReconciled: boolean;
}
export interface BalanceHistory {
  balance: SupportBalance;
  items: {
    id: string;
    kind: string;
    deltaSeconds: number;
    beforeSeconds: number;
    afterSeconds: number;
    reason: string;
    evidence: string;
    actorName: string;
    createdAt: string;
  }[];
  total: number;
  page: number;
  pageSize: number;
}
export const balanceBoard = (
  platform: boolean,
  org: string | undefined,
  page: number,
) =>
  apiGet<BalanceBoard>(
    platform
      ? org
        ? `/platform/support/organizations/${org}/balances?page=${page}&pageSize=25`
        : `/platform/support/balances?page=${page}&pageSize=25`
      : `/organization/support/balances?page=${page}&pageSize=25`,
  );
export const balanceSources = (org: string) =>
  apiGet<{
    items: BalanceSource[];
    limit: number;
    trialRequiresPrincipal: boolean;
    issues?: { sourceType: string; sourceId: string; reason: string }[];
  }>(`/platform/support/organizations/${org}/balance-sources`);
export const balanceHistory = (platform: boolean, id: string, page: number) =>
  apiGet<BalanceHistory>(
    `${platform ? "/platform" : "/organization"}/support/balances/${id}/movements?page=${page}&pageSize=25`,
  );
export const openBalance = (org: string, dto: Record<string, unknown>) =>
  apiPost<SupportBalance>(
    `/platform/support/organizations/${org}/balances`,
    dto,
  );
export const reconcileBalance = (id: string, dto: Record<string, unknown>) =>
  apiPost<SupportBalance>(`/platform/support/balances/${id}/reconcile`, dto);
