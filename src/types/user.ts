export type UserRole =
  | 'SUPER_ADMIN'
  | 'ADMIN'
  | 'SECRETARY'
  | 'LEADER'
  | 'LAWYER'
  | 'LEGISLATIVE'
  | 'CITIZEN'
  | 'BUHO';

export interface User {
  id: string;

  fullName: string;
  email: string;

  address?: string;
  phone?: string;
  documentNumber?: string;

  birthDate?: string;
  createdAt?: string;

  isActive: boolean;

  // REDES SOCIALES (deuda técnica menor, 2026-09-16 — ya se leían en
  // create-user-form.tsx vía `(user as any)`, nunca declaradas acá).
  facebookUser?: string;
  instagramUser?: string;
  tiktokUser?: string;
  youtubeUser?: string;
  xUser?: string;

  // PRODUCTIVIDAD
  totalPoints?: number;
  requestsGoal?: number;

  // SEGUIMIENTO
  completedRequests?: number;
  pendingRequests?: number;
  resolvedRequests?: number;

  // LOCALIDAD
  locality?:
    | {
        id: number;
        name: string;
      }
    | string
    | null;

  // ROL
  role?: {
    id: number | string;
    name: string;
    code: UserRole;
  };

  // PERMISOS PBAC
  permissions?: Array<{
    module: string;
    canRead: boolean;
    canWrite: boolean;
    canDelete?: boolean;
  }>;
}