export enum TaskPlatform {
  FACEBOOK = 'FACEBOOK',
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  TWITTER = 'TWITTER',
  WHATSAPP = 'WHATSAPP',
  OTHER = 'OTHER',
}

export enum TaskStatus {
  NOT_STARTED = 'NOT_STARTED',
  PENDING = 'PENDING',   // Esperando a n8n
  APPROVED = 'APPROVED', // Puntos ganados
  REJECTED = 'REJECTED'  // Intenta de nuevo
}

// Fase 3b de la versión estable (2026-11-10): tareas del equipo.
export type TaskKind = 'SOCIAL' | 'FIELD';
export type TaskAudience = 'ROLE' | 'FIELD_TEAM' | 'TEAM' | 'PERSON';
export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH';
export type TaskEvidence = 'SCREENSHOT' | 'PHOTO' | 'DOCUMENT' | 'LOCATION' | 'LINK' | 'NOTE';

export interface SocialTask {
  id: number;
  title: string;
  description?: string;
  platform: TaskPlatform;
  postUrl: string;
  points: number;
  myStatus: TaskStatus;
  reason?: string | null; // Razón del rechazo si existe
  endDate?: string | null;
  kind?: TaskKind;
  priority?: TaskPriority;
  evidenceType?: TaskEvidence;
  audience?: TaskAudience;
  completionId?: number | null;
  hasFile?: boolean;
}

// Deuda técnica menor (2026-09-17) — forma real de
// `GET /gamification/tasks/all` (panel admin), verificada contra
// `GamificationService#getAllTasks()` (`prisma.socialTask.findMany()`) y el
// uso real en `gamification/admin/page.tsx`.
export interface AdminTask {
  id: number;
  title: string;
  description?: string | null;
  platform: TaskPlatform;
  postUrl?: string | null;
  points: number;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  kind: TaskKind;
  audience: TaskAudience;
  audienceRole?: string | null;
  assigneeId?: string | null;
  priority: TaskPriority;
  evidenceType: TaskEvidence;
  assignee?: { id: string; fullName: string } | null;
  createdBy?: { id: string; fullName: string } | null;
  _count?: { completions: number };
}

export interface TaskFormPayload {
  title: string;
  description?: string;
  platform?: TaskPlatform;
  postUrl?: string | null;
  points: number;
  startDate: string;
  endDate: string | null;
  kind: TaskKind;
  audience: TaskAudience;
  audienceRole?: string;
  assigneeId?: string;
  priority: TaskPriority;
  evidenceType?: TaskEvidence;
}

/** Lo que envía una persona como evidencia de una tarea en terreno. */
export interface FieldEvidenceInput {
  file?: File;
  link?: string;
  latitude?: number;
  longitude?: number;
  accuracyMeters?: number;
  note?: string;
}