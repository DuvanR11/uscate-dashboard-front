import { apiGet } from '@/lib/api';
import type { User } from '@/store/auth-store';

/**
 * Fase 0 del análisis de punta a punta (2026-10-28, TRV-02): sesión vigente.
 * Mismo cuerpo que `POST /auth/login` (`user` con los permisos efectivos de
 * HOY y `expiresAt` del token actual) más `impersonating` (si es un "ver
 * como"). No emite otra cookie. Un 401 (rol cambiado, sesión revocada o
 * vencida) lo maneja `lib/api.ts` como cualquier sesión vencida.
 */
export interface CurrentSession {
  user: User;
  expiresAt: string;
  impersonating?: boolean;
}

export const getCurrentSession = () => apiGet<CurrentSession>('/auth/session');
