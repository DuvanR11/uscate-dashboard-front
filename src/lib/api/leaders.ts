import { apiGet, apiPost, apiPut } from '@/lib/api';

// Fase 4 "Líderes y celular" (2026-10-06) — cliente del panel del líder
// (`/leader/dashboard/*`) y del ranking, las metas y las reglas de puntos
// (`/productivity/*`).

// --- Panel del líder --------------------------------------------------------

export interface LeaderRecentProspect {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  voteConfirmed?: boolean;
}

export interface LeaderStanding {
  fullName: string | null;
  /** Meta de votantes captados. 0 = sin meta. */
  goal: number;
  goalProgress: number | null;
  remaining: number | null;
  /** Puesto entre los líderes de la organización, por votantes captados. */
  position: number;
  leaders: number;
  points: number;
  capturedThisWeek: number;
  pendingConfirmation: number;
}

export interface LeaderStats {
  leaderId: string;
  kpi: { total: number; confirmed: number; verified: number; completionRate: number };
  recent: LeaderRecentProspect[];
  standing: LeaderStanding;
}

export interface LeaderNetwork {
  directCount: number;
  totalReferrals: number;
  activeJourneys: number;
  topReferrers: { id: string; name: string; referralsCount: number }[];
}

export interface QuickCaptureInput {
  firstName: string;
  lastName: string;
  documentNumber?: string;
  phone?: string;
  localityId?: number;
  votingStation?: string;
  votingTable?: string;
  dataTreatment: boolean;
}

export const leaderApi = {
  stats: () => apiGet<LeaderStats>('/leader/dashboard/stats'),
  network: () => apiGet<LeaderNetwork>('/leader/dashboard/network'),
  quickCapture: (data: QuickCaptureInput) =>
    apiPost<LeaderRecentProspect>('/leader/dashboard/prospects', data),
};

// --- Ranking, metas y reglas ---------------------------------------------------

export type LeadersRankingSort = 'captured' | 'confirmed' | 'points';

export interface LeaderRankingRow {
  position: number;
  id: string;
  fullName: string;
  role: string | null;
  zone: string | null;
  goal: number;
  /** Total histórico de contactos a su cargo (contra esto se mide la meta). */
  capturedTotal: number;
  /** Captados en el periodo elegido (o todos, sin periodo). */
  captured: number;
  confirmed: number;
  goalProgress: number | null;
  points: number;
  lastCaptureAt: string | null;
}

export interface LeadersRanking {
  data: LeaderRankingRow[];
  summary: {
    leaders: number;
    captured: number;
    confirmed: number;
    withoutCaptures: number;
    withGoal: number;
  };
  meta: { total: number; page: number; lastPage: number };
}

export interface LeadersRankingQuery {
  from?: string;
  to?: string;
  role?: string;
  sort?: LeadersRankingSort;
  limit?: number;
}

export interface PointsRule {
  type: string;
  group: 'Votantes' | 'Solicitudes' | 'Denuncias';
  label: string;
  description: string;
  defaultPoints: number;
  points: number;
  /** La organización cambió el valor por defecto. */
  customized: boolean;
}

export const productivityApi = {
  leaders: (query: LeadersRankingQuery = {}) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    const qs = params.toString();
    return apiGet<LeadersRanking>(`/productivity/leaders${qs ? `?${qs}` : ''}`);
  },
  /** Sin `userIds`, la meta se aplica a todos los líderes activos. */
  setGoals: (goal: number, userIds?: string[]) =>
    apiPut<{ updated: number; goal: number }>('/productivity/goals', { goal, userIds }),
  rules: () => apiGet<PointsRule[]>('/productivity/rules'),
  /** `points: null` devuelve la acción a su valor por defecto. */
  updateRules: (rules: { type: string; points: number | null }[]) =>
    apiPut<PointsRule[]>('/productivity/rules', { rules }),
};
