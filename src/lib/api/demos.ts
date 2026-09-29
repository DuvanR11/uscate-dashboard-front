import { apiGet, apiPost } from '@/lib/api';

// Fase E (2026-09-29): demos comerciales (una por comercial, reiniciables).

export interface PlatformDemo {
  id: string;
  name: string;
  slug: string;
  adminEmail: string;
  demoResetAt: string | null;
  createdAt: string;
  demoSalesRep: { id: string; name: string } | null;
}

export interface CreatedDemo {
  organizationId: string;
  name: string;
  slug: string;
  /** Se muestra UNA sola vez: el servidor no la guarda en claro. */
  password: string;
  users: { email: string; role: string }[];
}

export const listDemos = () => apiGet<PlatformDemo[]>('/platform/demos');

export const createDemo = (input: { salesRepId?: string; label?: string }) =>
  apiPost<CreatedDemo>('/platform/demos', input);

export const resetDemo = (organizationId: string) =>
  apiPost<{ demoResetAt: string; deletedRows: number }>(`/platform/demos/${organizationId}/reset`);

// Dentro de la demo (el comercial): estado y reinicio de SU organización.
export const getOwnDemoStatus = () =>
  apiGet<{ isDemo: boolean; demoResetAt?: string | null }>('/organization/demo');

export const resetOwnDemo = () =>
  apiPost<{ demoResetAt: string; deletedRows: number }>('/organization/demo/reset');
