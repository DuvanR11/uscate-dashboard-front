import api from '@/lib/api';
import type { RegistryContext } from './territorial-registry';
import type { HealthScheduleConfiguration } from './territorial-health-schedule';

export interface MonitoringSettings {
  enabled:false;cadence:'DAILY'|'WEEKLY';hour:number;minute:number;weekDay:number|null;maxRetries:number;
  responsibleId:string|null;reviewDueAt:string|null;notifyUnavailable:boolean;notifyChanged:boolean;notifyReviewDue:boolean;
  sources:{id:string;revision:number}[];
}
export interface MonitoringPlanCommand extends MonitoringSettings {requestKey:string;expectedRevision:number;catalogRevision:number;action:'SAVE_DRAFT'|'PREPARE';reason:string}
export interface RegionalMonitoringPlan {
  mode:'REGIONAL_PLAN';dataset:RegistryContext['definition'];saved:boolean;
  current:MonitoringSettings&{datasetCode:string;revision:number;state:'DRAFT'|'PREPARED';responsibleEmail:string|null;updatedAt:string};
  preparedNow:boolean;reviewBlockers:{code:string;message:string}[];activationAvailable:false;activationBlockers:{code:string;message:string}[];proposedNextAt:string;
  sources:{id:string;revision:number;state:string;stored:boolean;title:string;purpose:string;reviewed:boolean}[];sourcesTruncated:boolean;
  operators:{id:string;email:string;fullName:string}[];operatorsTruncated:boolean;
  history:{id:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string}[];
  policy:{timeZone:'America/Bogota';maxSources:20;maxPrimaryRunsPerDay:1;minPrimaryGapHours:23;retryDelayMinutes:60;maxRetries:1;maxHistoryShown:20};
}
export interface LegacyMonitoringPlan {mode:'LEGACY_NEIVA';dataset:RegistryContext['definition'];legacy:HealthScheduleConfiguration;sources:{code:string;title:string}[];timeZone:'America/Bogota'}
export type MonitoringConfiguration=RegionalMonitoringPlan|LegacyMonitoringPlan;
const object=(v:unknown):v is Record<string,unknown>=>Boolean(v&&typeof v==='object'&&!Array.isArray(v));
const integer=(v:unknown,min:number,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(v)&&Number(v)>=min&&Number(v)<=max;
const date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
const text=(v:unknown)=>typeof v==='string';
const issues=(v:unknown):v is {code:string;message:string}[]=>Array.isArray(v)&&v.every(i=>object(i)&&text(i.code)&&text(i.message));
export function validateMonitoringConfiguration(value:unknown,code:string):asserts value is MonitoringConfiguration{
  if(!object(value)||!object(value.dataset)||value.dataset.code!==code||!text(value.dataset.name)||!integer(value.dataset.revision,1)||!text(value.dataset.state))throw Error('No pudimos verificar el conjunto del monitoreo.');
  if(value.mode==='LEGACY_NEIVA'){
    if(code!=='NEIVA_CONCEJO_2023'||value.dataset.adapter!=='LEGACY_NEIVA_2023'||value.dataset.electionCode!=='CO_TERRITORIALES_2023'||value.dataset.corporationCode!=='CONCEJO'||value.dataset.territoryCode!=='41001'||value.dataset.constituencyCode!=='GENERAL'
      ||value.timeZone!=='America/Bogota'||!object(value.legacy)||!object(value.legacy.current)||value.legacy.current.pilot!==code||!integer(value.legacy.current.revision,0)
      ||typeof value.legacy.current.enabled!=='boolean'||value.legacy.timeZone!=='America/Bogota'||!Array.isArray(value.legacy.operators)||!Array.isArray(value.legacy.history)||!object(value.legacy.policy)
      ||!Array.isArray(value.sources)||!value.sources.every(s=>object(s)&&text(s.code)&&text(s.title)))throw Error('No pudimos verificar la programación existente de Neiva.');
    return;
  }
  if(value.mode!=='REGIONAL_PLAN'||code==='NEIVA_CONCEJO_2023'||value.activationAvailable!==false||typeof value.saved!=='boolean'||typeof value.preparedNow!=='boolean'
    ||!issues(value.reviewBlockers)||!issues(value.activationBlockers)||value.activationBlockers.length<1||!date(value.proposedNextAt)
    ||!object(value.policy)||value.policy.timeZone!=='America/Bogota'||value.policy.maxSources!==20||value.policy.maxPrimaryRunsPerDay!==1||value.policy.minPrimaryGapHours!==23||value.policy.retryDelayMinutes!==60||value.policy.maxRetries!==1||value.policy.maxHistoryShown!==20
    ||!object(value.current)||value.current.datasetCode!==code||value.current.enabled!==false||!integer(value.current.revision,0)||!['DRAFT','PREPARED'].includes(String(value.current.state))
    ||!['DAILY','WEEKLY'].includes(String(value.current.cadence))||!integer(value.current.hour,0,23)||!integer(value.current.minute,0,59)||!integer(value.current.maxRetries,0,1)
    ||!(value.current.cadence==='DAILY'?value.current.weekDay===null:integer(value.current.weekDay,0,6))
    ||!(value.current.responsibleId===null||text(value.current.responsibleId))||!(value.current.responsibleEmail===null||text(value.current.responsibleEmail))
    ||!(value.current.reviewDueAt===null||date(value.current.reviewDueAt))||!date(value.current.updatedAt)
    ||typeof value.current.notifyChanged!=='boolean'||typeof value.current.notifyUnavailable!=='boolean'||typeof value.current.notifyReviewDue!=='boolean'
    ||!Array.isArray(value.current.sources)||value.current.sources.length>20||!value.current.sources.every(s=>object(s)&&text(s.id)&&integer(s.revision,1))
    ||new Set(value.current.sources.map(s=>s.id)).size!==value.current.sources.length
    ||!Array.isArray(value.sources)||value.sources.length>120||typeof value.sourcesTruncated!=='boolean'||!value.sources.every(s=>object(s)&&text(s.id)&&integer(s.revision,1)&&text(s.state)&&typeof s.stored==='boolean'&&typeof s.reviewed==='boolean'&&text(s.title)&&text(s.purpose))
    ||new Set(value.sources.map(s=>s.id)).size!==value.sources.length||!Array.isArray(value.operators)||value.operators.length>26||typeof value.operatorsTruncated!=='boolean'||!value.operators.every(u=>object(u)&&text(u.id)&&text(u.email)&&text(u.fullName))
    ||!Array.isArray(value.history)||value.history.length>20||!value.history.every(h=>object(h)&&text(h.id)&&integer(h.revision,1)&&text(h.action)&&text(h.actorEmail)&&text(h.reason)&&date(h.createdAt)))throw Error('No pudimos verificar la configuración regional.');
  if(value.preparedNow!==(value.current.state==='PREPARED'&&value.reviewBlockers.length===0)||value.saved!==(Number(value.current.revision)>0))throw Error('La revisión del plan requiere comprobarse de nuevo.');
}
export async function getMonitoringConfiguration(code:string){const {data}=await api.get<unknown>('/platform/territorial-data/monitoring-plans/'+encodeURIComponent(code),{timeout:25000});validateMonitoringConfiguration(data,code);return data;}
export const saveMonitoringPlan=(code:string,input:MonitoringPlanCommand)=>api.post<{datasetCode:string;revision:number;replayed:boolean;enabled:false}>('/platform/territorial-data/monitoring-plans/'+encodeURIComponent(code),input,{timeout:25000});
