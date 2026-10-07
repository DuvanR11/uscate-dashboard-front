import { apiGet, apiPatch, apiPost } from '@/lib/api';

export const MANAGEMENT_STATUS = { OPEN: 'Abierta', IN_PROGRESS: 'En atención', WAITING: 'En espera', DONE: 'Resuelta', CANCELLED: 'Cancelada' };
export const MANAGEMENT_PRIORITY = { NORMAL: 'Normal', HIGH: 'Alta', CRITICAL: 'Crítica' };
export type ManagementStatus = keyof typeof MANAGEMENT_STATUS;
export type ManagementPriority = keyof typeof MANAGEMENT_PRIORITY;
export interface PlatformManagement {
  id: string; organizationId: string; title: string; notes: string;
  status: ManagementStatus; priority: ManagementPriority;
  assigneeId: string; assigneeName: string; dueAt: string; version: number;
  createdAt: string; updatedAt: string;
  organization: { id: string; name: string };
}
export interface ManagementInput { title: string; notes: string; priority: ManagementPriority; assigneeId: string; dueAt: string }
export type ManagementUpdate = Partial<Omit<ManagementInput, 'title'>> & { version: number; reason: string; status?: ManagementStatus };
export const listManagementOperators = () => apiGet<{ id: string; fullName: string }[]>('/platform/management/operators');
export function listPlatformManagement(params: URLSearchParams, organizationId?: string) {
  const path = organizationId ? `/platform/organizations/${encodeURIComponent(organizationId)}/management` : '/platform/management';
  return apiGet<{ items: PlatformManagement[]; total: number; page: number; pageSize: number }>(`${path}?${params}`);
}
export function createPlatformManagement(organizationId: string, input: ManagementInput) {
  return apiPost<PlatformManagement>(`/platform/organizations/${encodeURIComponent(organizationId)}/management`, input);
}
export function updatePlatformManagement(task: PlatformManagement, input: ManagementUpdate) {
  return apiPatch<PlatformManagement>(`/platform/organizations/${encodeURIComponent(task.organizationId)}/management/${encodeURIComponent(task.id)}`, input);
}
