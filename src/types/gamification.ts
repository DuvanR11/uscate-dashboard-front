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