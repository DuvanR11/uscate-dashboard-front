import { apiGet } from '@/lib/api';

/** Cliente para `modules/organizations` (backend) — la propia organización del usuario, no cruzado. */

export interface OrganizationUsageMetric {
  limit: number;
  used: number;
  remaining: number;
  percentage: number;
}

export interface OrganizationSubscription {
  organization: { id: string; name: string; nit: string };
  billing: { status: string; nextRenewal: string };
  plan: { code: string; name: string; modules: string[] } | null;
  consumption: {
    sms: OrganizationUsageMetric;
    email: OrganizationUsageMetric;
    whatsapp: OrganizationUsageMetric;
  };
  seats: Record<string, { roleName: string; limit: number; used: number; remaining: number; percentage: number }>;
}

/** `GET /organization/subscription` — plan, consumo y asientos de MI organización. */
export function getMySubscription(): Promise<OrganizationSubscription> {
  return apiGet<OrganizationSubscription>('/organization/subscription');
}

export interface OnboardingChecklistItem {
  key: string;
  label: string;
  description: string;
  href: string;
  done: boolean;
}

export interface OnboardingChecklist {
  items: OnboardingChecklistItem[];
  allDone: boolean;
}

/** `GET /organization/onboarding` — checklist de bienvenida, con señales reales. */
export function getOnboardingChecklist(): Promise<OnboardingChecklist> {
  return apiGet<OnboardingChecklist>('/organization/onboarding');
}
