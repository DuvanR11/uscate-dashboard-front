import { apiGet } from '@/lib/api';

/**
 * Cliente para `modules/war-room` (backend) — Sala de Guerra unificada,
 * Track B ("Diferenciación de mercado") de Ruta 2027. Fusiona 3 lecturas
 * que ya existen por separado (Monitoreo Predictivo, OSINT, Día D en vivo)
 * — este archivo no inventa ningún dato nuevo, solo tipa la respuesta ya
 * combinada del backend.
 */

export interface UrgentMention {
  id: string;
  title: string;
  summary: string | null;
  url: string;
  keywordName: string;
  urgencyScore: number | null;
  sentiment: string | null;
  locationNameRaw: string | null;
  createdAt: string;
}

export interface CaseAlert {
  id: string;
  message: string;
  createdAt: string;
  caseId: string;
  caseTitle: string;
  monitorQuery: string;
}

export interface ElectionDayLive {
  progress: { confirmed: number; total: number };
  byStation: { name: string; total: number; confirmed: number }[];
  lastHour: number;
  leaderboard: { id: string; name: string; confirmedToday: number }[];
  electionDate: string | null;
  isElectionDay: boolean;
  serverTime: string;
}

export interface WarRoomOverview {
  urgentMentions: UrgentMention[];
  caseAlerts: CaseAlert[];
  electionDay: ElectionDayLive;
}

/** `GET /war-room/overview` — exige DASHBOARD+MONITOREO_PREDICTIVO+OSINT_CASOS a la vez. */
export function getWarRoomOverview(): Promise<WarRoomOverview> {
  return apiGet<WarRoomOverview>('/war-room/overview');
}
