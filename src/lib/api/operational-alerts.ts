import { apiGet, apiPatch, apiPost } from '@/lib/api';
export interface OperationalAlert {
  id:string; organizationId:string; organizationName:string; kind:string; resource:string; periodKey:string;
  threshold:number|null; severity:string; title:string; nextAction:string; observation:Record<string,unknown>;
  status:string; active:boolean; assigneeId:string|null; version:number; observedAt:string;
}
export interface AlertReport { items:OperationalAlert[];total:number;page:number;pageSize:number;automaticCollection:boolean;pending:string[]; }
export interface AlertDetail extends OperationalAlert { changes:{ id:string;action:string;actorId:string|null;reason:string;details:unknown;createdAt:string }[]; }
export const getOperationalAlerts = (params:URLSearchParams) => apiGet<AlertReport>(`/platform/alerts?${params}`);
export const getOperationalAlert = (id:string) => apiGet<AlertDetail>(`/platform/alerts/${encodeURIComponent(id)}`);
export const getAlertAssignees = (id:string) => apiGet<{ id:string;fullName:string;email:string }[]>(`/platform/alerts/${encodeURIComponent(id)}/assignees`);
// Fase 7 del plan de finanzas (2026-11-08): capacidad del servidor contra los umbrales del plan.
export interface CapacityEvaluation { resource:string; status:'OK'|'OVER'|'INSUFFICIENT'; value:number|null; threshold:number; samples:number; detail:Record<string,string|number|boolean|null>; }
export interface ServerCapacity { evaluations:CapacityEvaluation[]; samples:number; lastSampleAt:string|null; unwatchedQueues:Record<string,string>; sampling:boolean; checkedAt:string; }
export const getServerCapacity = () => apiGet<ServerCapacity>('/platform/alerts/server-capacity');
export const refreshOperationalAlerts = () => apiPost('/platform/alerts/refresh');
export const updateOperationalAlert = (id:string,input:{ version:number;action:string;reason:string;assigneeId?:string }) => apiPatch(`/platform/alerts/${encodeURIComponent(id)}`,input);
