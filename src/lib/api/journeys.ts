import { apiGet, apiPost, apiPatch, apiDelete } from '@/lib/api';

/**
 * Cliente para `modules/crm/journeys` (backend) — Plan "Motor de
 * Automatización de Campaña" (2026-09-08). Permiso propio
 * `AUTOMATIZACION_CAMPANA` (Difusiones > Automatización). A diferencia de
 * `osint.ts`, este controller devuelve el recurso plano (sin `{success,
 * data}`) — mismo estilo que `campaigns.ts`/`platform.ts`.
 */

export type JourneyTriggerType =
  | 'PROSPECT_CREATED'
  | 'EVENT_ATTENDANCE_REGISTERED'
  | 'REQUEST_CREATED'
  | 'DAYS_BEFORE_ELECTION_VOTE_NOT_CONFIRMED';

export type JourneyStepType = 'WAIT' | 'SEND_EMAIL' | 'SEND_SMS' | 'SEND_WHATSAPP_META';

export interface JourneyStep {
  id: string;
  journeyId: string;
  order: number;
  type: JourneyStepType;
  waitHours: number | null;
  channelTemplate: Record<string, string> | null;
}

export interface Journey {
  id: string;
  organizationId: string;
  name: string;
  triggerType: JourneyTriggerType;
  triggerConfig: Record<string, unknown> | null;
  isActive: boolean;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
  steps: JourneyStep[];
  activeEnrollments?: number;
}

export interface CreateJourneyStepInput {
  order: number;
  type: JourneyStepType;
  waitHours?: number;
  channelTemplate?: Record<string, string>;
}

export interface CreateJourneyInput {
  name: string;
  triggerType: JourneyTriggerType;
  triggerConfig?: Record<string, unknown>;
  steps: CreateJourneyStepInput[];
}

export interface UpdateJourneyInput {
  name?: string;
  triggerConfig?: Record<string, unknown>;
  isActive?: boolean;
  steps?: CreateJourneyStepInput[];
}

/** `GET /crm/journeys` */
export function listJourneys(): Promise<Journey[]> {
  return apiGet<Journey[]>('/crm/journeys');
}

/** `POST /crm/journeys` */
export function createJourney(input: CreateJourneyInput): Promise<Journey> {
  return apiPost<Journey>('/crm/journeys', input);
}

/** `PATCH /crm/journeys/:id` */
export function updateJourney(id: string, input: UpdateJourneyInput): Promise<Journey> {
  return apiPatch<Journey>(`/crm/journeys/${id}`, input);
}

/** `DELETE /crm/journeys/:id` */
export function deleteJourney(id: string): Promise<void> {
  return apiDelete(`/crm/journeys/${id}`).then(() => undefined);
}

export type JourneyEnrollmentStatus = 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
export type JourneyStepExecutionStatus = 'SENT' | 'FAILED';

export interface JourneyStepExecutionEntry {
  id: string;
  enrollmentId: string;
  stepId: string;
  status: JourneyStepExecutionStatus;
  detail: string | null;
  executedAt: string;
}

export interface JourneyEnrollmentEntry {
  id: string;
  journeyId: string;
  prospectId: string;
  status: JourneyEnrollmentStatus;
  currentStepOrder: number;
  enrolledAt: string;
  completedAt: string | null;
  prospect: { id: string; firstName: string; lastName: string };
  executions: JourneyStepExecutionEntry[];
}

/** `GET /crm/journeys/:id/enrollments` */
export function listJourneyEnrollments(journeyId: string): Promise<JourneyEnrollmentEntry[]> {
  return apiGet<JourneyEnrollmentEntry[]>(`/crm/journeys/${journeyId}/enrollments`);
}

/** `DELETE /crm/journeys/:id/enrollments/:enrollmentId` — cancela UNA inscripción puntual. */
export function cancelJourneyEnrollment(journeyId: string, enrollmentId: string): Promise<void> {
  return apiDelete(`/crm/journeys/${journeyId}/enrollments/${enrollmentId}`).then(() => undefined);
}

// TRV-25: vive en `lib/api-error.ts`; se reexporta para los imports de siempre.
export { extractErrorMessage } from '@/lib/api-error';
