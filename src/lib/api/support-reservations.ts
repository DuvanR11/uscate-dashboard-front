import { apiGet, apiPost } from "@/lib/api";
export interface SupportReservation {
  id: string;
  sessionId: string;
  state:
    | "PENDING"
    | "CONFIRMED"
    | "STARTED"
    | "SETTLED"
    | "RELEASED"
    | "REVIEW"
    | "EXPIRED";
  version: number;
  estimatedSeconds: number;
  notice: string;
  plannedStart: string;
  plannedEnd: string;
  confirmedAt: string | null;
  startedAt: string | null;
  settledAt: string | null;
  releasedAt: string | null;
  reviewReason: string | null;
}
export interface ReservationDetail {
  reservation: SupportReservation | null;
  allocations: {
    balanceId: string;
    sourceType: string;
    expiresAt: string;
    reservedSeconds: number;
    consumedSeconds: number;
  }[];
  events: {
    id: string;
    action: string;
    body: string;
    actorName: string;
    createdAt: string;
  }[];
}
const root = (platform: boolean, id: string) =>
  `${platform ? "/platform" : "/organization"}/support/sessions/${id}/reservation`;
export const reservationDetail = (platform: boolean, id: string) =>
  apiGet<ReservationDetail>(root(platform, id));
export const createReservation = (id: string, data: Record<string, unknown>) =>
  apiPost<SupportReservation>(root(true, id), data);
export const reservationAction = (
  platform: boolean,
  id: string,
  action: "confirm" | "start" | "release",
  data: Record<string, unknown>,
) => apiPost<SupportReservation>(`${root(platform, id)}/${action}`, data);
