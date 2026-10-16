import { apiGet, apiPost } from '@/lib/api';
export interface HealthScheduleSettings {
 enabled:boolean; cadence:'DAILY'|'WEEKLY'; hour:number; minute:number; weekDay:number|null; maxRetries:number; responsibleId:string|null;
}
export interface HealthScheduleCommand extends HealthScheduleSettings { requestKey:string; expectedRevision:number; reason:string }
export interface HealthScheduleConfiguration {
 current:HealthScheduleSettings&{pilot:string;revision:number;responsibleEmail:string|null;approvedConfigHash:string;nextRunAt:string|null;blockedReason:string|null;updatedAt:string|null};
 history:{id:string;revision:number;actorEmail:string;reason:string;createdAt:string;snapshot:HealthScheduleSettings}[];
 operators:{id:string;email:string;fullName:string}[];timeZone:string;currentConfigHash:string;workerEnabled:boolean;
 policy:{graceMinutes:number;minPrimaryGapHours:number;maxPrimaryRunsPerDay:number;retryDelayMinutes:number;retryWindowHours:number;maxRetries:number;latestHistoryShown:number};
}
export async function getTerritorialHealthSchedule(){
 const data=await apiGet<HealthScheduleConfiguration>('/platform/territorial-data/health/schedule');
 if(data?.current?.pilot!=='NEIVA_CONCEJO_2023'||!Number.isInteger(data.current.revision)||data.timeZone!=='America/Bogota'||!Array.isArray(data.operators)||!Array.isArray(data.history)||!data.policy)throw Error('No se pudo verificar la programación territorial.');
 return data;
}
export const saveTerritorialHealthSchedule=(command:HealthScheduleCommand)=>apiPost<{revision:number;replayed:boolean}>('/platform/territorial-data/health/schedule',command);
