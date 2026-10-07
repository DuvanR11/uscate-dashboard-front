import { apiGet } from '@/lib/api';

// Fase 6 "Piloto y medición": qué áreas de la plataforma usa de verdad cada
// organización (`modules/module-activity` en el backend).

export interface AreaActivity {
  area: string;
  /** Personas distintas que la usaron en el periodo. */
  users: number;
  /** Días distintos con actividad. */
  days: number;
  reads: number;
  writes: number;
  lastAt: string | null;
}

export interface OrganizationActivity {
  id: string;
  name: string;
  isDemo: boolean;
  planCode: string | null;
  teamUsers: number;
  activeUsers: number;
  activeDays: number;
  lastActivityAt: string | null;
  areasAvailable: string[];
  areasUsed: string[];
  areas: AreaActivity[];
}

export interface ActivitySummary {
  days: number;
  since: string;
  /** Primer día con medición; antes de esa fecha no hay datos. */
  trackingSince: string | null;
  organizations: OrganizationActivity[];
}

export interface ActivityDetail {
  days: number;
  since: string;
  organization: { id: string; name: string; isDemo: boolean; planCode: string | null };
  areas: AreaActivity[];
  modules: Array<AreaActivity & { module: string; name: string }>;
  users: Array<{
    id: string;
    fullName: string;
    role: string | null;
    days: number;
    writes: number;
    areas: string[];
    lastAt: string | null;
  }>;
  daily: Array<{ day: string; users: number }>;
}

export const getActivitySummary = (days: number) =>
  apiGet<ActivitySummary>(`/platform/activity/organizations?days=${days}`);

export const getActivityDetail = (organizationId: string, days: number) =>
  apiGet<ActivityDetail>(
    `/platform/activity/organizations/${encodeURIComponent(organizationId)}?days=${days}`,
  );
