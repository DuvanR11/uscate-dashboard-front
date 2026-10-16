import { apiGet, apiPost } from '@/lib/api';
import api from '@/lib/api';
export interface HealthObservation { resourceCode:string; status:'OK'|'ATTENTION'|'ERROR'; code:string; severity:'INFO'|'WARNING'|'ERROR'; title:string; detail:string; nextAction:string; checkedAt:string; expectedHash?:string; actualHash?:string; bytes?:number; httpStatus?:number }
export interface HealthRun { id:string; status:'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'; configHash:string; requestedAt:string; startedAt:string|null; finishedAt:string|null; errorCode:string|null; observations:HealthObservation[]|null;origin?:'MANUAL'|'SCHEDULED';scheduledFor?:string|null;attempt?:number }
export interface TerritorialHealth {
 pilot:string; configHash:string; mode:string; workerEnabled:boolean; checkedAt:string|null;
 stale:boolean; staleAfterHours:number; busy:boolean; interrupted:boolean; canRequestAt:string|null;
 sources:{code:string;title:string;url:string;sha256:string;maxBytes:number}[];
 lastComplete:HealthRun|null; latestRun:HealthRun|null; runs:HealthRun[];
 alerts:{id:string;resourceCode:string;code:string;severity:string;status:'OPEN'|'RESOLVED';title:string;nextAction:string;firstObservedAt:string;lastObservedAt:string;resolvedAt:string|null;episode:number;observation:HealthObservation}[];
 coverage:string[]; limitations:string[];
}
export async function getTerritorialHealth(){
 const data=await apiGet<TerritorialHealth>('/platform/territorial-data/health');
 if(data?.pilot!=='NEIVA_CONCEJO_2023'||!Array.isArray(data.sources)||!Array.isArray(data.alerts)||!Array.isArray(data.runs)||!Array.isArray(data.limitations)||!Array.isArray(data.lastComplete?.observations??[])||!/^[a-f0-9]{64}$/.test(data.configHash??''))throw Error('No se pudo verificar el estado de salud territorial.');
 return data;
}
export const requestTerritorialHealth=(requestKey:string)=>apiPost<HealthRun>('/platform/territorial-data/health/checks',{requestKey});
export async function downloadTerritorialHealth(format:'HTML'|'JSON') {
 const response=await api.post<Blob>('/platform/territorial-data/health/reports',{format},{responseType:'blob'});
 const expected=format==='HTML'?'text/html':'application/json';
 if(!response.data.size||!String(response.headers['content-type']??'').startsWith(expected))throw Error('El servidor no devolvió un diagnóstico válido.');
 const url=URL.createObjectURL(response.data),link=document.createElement('a');
 link.href=url;link.download=`diagnostico-fuentes-neiva.${format==='HTML'?'html':'json'}`;
 document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
