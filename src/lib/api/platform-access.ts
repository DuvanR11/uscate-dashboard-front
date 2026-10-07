import { apiGet, apiPatch, apiPost } from '@/lib/api';
export interface PlatformAccess { enabled: boolean; principal: boolean; capabilities: string[]; organizationIds: string[]; allOrganizations: boolean; }
export const getPlatformAccess = () => apiGet<PlatformAccess>('/platform/access/context');
export interface StaffAssignment { userId: string; profiles: string[]; capabilities: string[]; organizationIds: string[]; allOrganizations: boolean; version: number; }
export interface StaffData { config: { enabled: boolean; version: number; principalUserId: string }; operators: { id: string; email: string; fullName: string; assignment: StaffAssignment | null }[]; catalog: Record<string, string>; profiles: Record<string, string[]>; }
export const getPlatformStaff = () => apiGet<StaffData>('/platform/access/staff');
export const updatePlatformStaff = (userId: string, input: Omit<StaffAssignment, 'userId'> & { reason: string }) => apiPatch(`/platform/access/staff/${encodeURIComponent(userId)}`, input);
export const activatePlatformSecurity = (input: { version: number; enabled: boolean; reason: string }) => apiPatch('/platform/access/activation', input);
export const EXCEPTION_KIND: Record<string, string> = { QUOTAS: 'Cupos', MODULES: 'Módulos', TRIAL: 'Prueba', COURTESY: 'Cortesía de acceso', PRICING: 'Condición comercial' };
export const EXCEPTION_STATUS: Record<string, string> = { PENDING: 'Pendiente', APPROVED: 'Autorizada, sin ejecutar', REJECTED: 'Rechazada', REVOKED: 'Autorización revocada', EXPIRED: 'Vencida' };
export interface PlatformException { id: string; organizationId: string; organization: { name: string }; kind: string; reason: string; scope: string; evidence: string; responsibleName: string; requestedByEmail: string; expiresAt: string; effectiveStatus: string; status: string; version: number; decidedByEmail: string | null; decisionReason: string | null; revokedByEmail: string | null; revocationReason: string | null; before: Record<string, unknown> | null; }
export const listPlatformExceptions = (params: URLSearchParams, org?: string) => apiGet<{ items: PlatformException[]; total: number; page: number; pageSize: number }>(`${org ? `/platform/organizations/${encodeURIComponent(org)}/exceptions` : '/platform/exceptions'}?${params}`);
export const requestPlatformException = (org: string, input: { kind: string; reason: string; scope: string; evidence: string; responsibleId: string; expiresAt: string }) => apiPost(`/platform/organizations/${encodeURIComponent(org)}/exceptions`, input);
export const decidePlatformException = (task: PlatformException, input: { version: number; decision: string; reason: string }) => apiPatch(`/platform/organizations/${encodeURIComponent(task.organizationId)}/exceptions/${encodeURIComponent(task.id)}`, input);
