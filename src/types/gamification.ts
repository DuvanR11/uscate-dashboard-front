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

export interface SocialTask {
  id: number;
  title: string;
  description?: string;
  platform: TaskPlatform;
  postUrl: string;
  points: number;
  myStatus: TaskStatus;
  reason?: string | null; // Razón del rechazo si existe
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
}

export interface TaskFormPayload {
  title: string;
  description?: string;
  platform: TaskPlatform;
  postUrl: string | null;
  points: number;
  startDate: string;
  endDate: string | null;
}