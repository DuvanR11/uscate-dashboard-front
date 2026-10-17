import api from '@/lib/api';
export interface RegionalMonitorCommand{requestKey:string;expectedRevision:number;planRevision:number;enabled:boolean;reason:string}
export interface RegionalMonitorObservation{sourceId:string;code:string;severity:'OK'|'ATTENTION'|'ERROR';retryable:boolean;observedHash?:string;bytes?:number;httpStatus?:number}
export interface RegionalMonitorConfiguration{
 dataset:{code:string;name:string};current:{datasetCode:string;revision:number;enabled:boolean;planRevision:number;nextRunAt:string|null;blockedReason:string|null;updatedAt:string|null};
 readiness:{ready:boolean;planRevision:number|null;blocker:string|null};workerEnabled:boolean;adapter:'OFFICIAL_DOCUMENT_V1';allowedHosts:string[];
 runs:{id:string;datasetCode:string;controlRevision:number;planRevision:number;scheduledDay:string;attempt:number;status:'QUEUED'|'RUNNING'|'COMPLETED'|'FAILED'|'CANCELLED';scheduledFor:string;requestedAt:string;startedAt:string|null;finishedAt:string|null;errorCode:string|null;retryable:boolean;observations:RegionalMonitorObservation[]}[];
 alerts:{resourceCode:string;code:string;severity:'ATTENTION'|'ERROR';status:'OPEN'|'RESOLVED';episode:number;runId:string|null;responsibleEmail:string;observation:RegionalMonitorObservation;firstObservedAt:string;lastObservedAt:string;resolvedAt:string|null}[];
 history:{id:string;revision:number;actorEmail:string;reason:string;createdAt:string;snapshot:{enabled:boolean;planRevision:number}}[];
 policy:{timeZone:'America/Bogota';globalConcurrency:1;maxSources:20;maxBytesPerSource:10485760;timeoutSeconds:10;retryDelayMinutes:60;maxRetries:1;historyShown:20};checkedAt:string;
}
const object=(x:unknown):x is Record<string,unknown>=>Boolean(x&&typeof x==='object'&&!Array.isArray(x));
const text=(x:unknown)=>typeof x==='string';
const integer=(x:unknown,min=0)=>Number.isSafeInteger(x)&&Number(x)>=min;
const date=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x));
const nullableDate=(x:unknown)=>x===null||date(x);
const observation=(x:unknown)=>object(x)&&text(x.sourceId)&&text(x.code)&&['OK','ATTENTION','ERROR'].includes(String(x.severity))&&typeof x.retryable==='boolean'&&(x.observedHash===undefined||typeof x.observedHash==='string'&&/^[a-f0-9]{64}$/.test(x.observedHash))&&(x.bytes===undefined||integer(x.bytes))&&(x.httpStatus===undefined||integer(x.httpStatus,100));
export function validateRegionalMonitor(value:unknown,code:string):asserts value is RegionalMonitorConfiguration{
 if(code==='NEIVA_CONCEJO_2023'||!object(value)||!object(value.dataset)||value.dataset.code!==code||!text(value.dataset.name)||!object(value.current)||value.current.datasetCode!==code||!integer(value.current.revision)||typeof value.current.enabled!=='boolean'||!integer(value.current.planRevision)||!nullableDate(value.current.nextRunAt)||!nullableDate(value.current.updatedAt)||!(value.current.blockedReason===null||text(value.current.blockedReason))
  ||!object(value.readiness)||typeof value.readiness.ready!=='boolean'||!(value.readiness.planRevision===null||integer(value.readiness.planRevision,1))||!(value.readiness.blocker===null||text(value.readiness.blocker))
  ||typeof value.workerEnabled!=='boolean'||value.adapter!=='OFFICIAL_DOCUMENT_V1'||!Array.isArray(value.allowedHosts)||!value.allowedHosts.every(text)||!date(value.checkedAt)
  ||!object(value.policy)||value.policy.timeZone!=='America/Bogota'||value.policy.globalConcurrency!==1||value.policy.maxSources!==20||value.policy.maxBytesPerSource!==10485760||value.policy.timeoutSeconds!==10||value.policy.retryDelayMinutes!==60||value.policy.maxRetries!==1||value.policy.historyShown!==20
  ||!Array.isArray(value.runs)||value.runs.length>20||!value.runs.every(r=>object(r)&&text(r.id)&&r.datasetCode===code&&integer(r.controlRevision,1)&&integer(r.planRevision,1)&&typeof r.scheduledDay==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(r.scheduledDay)&&[1,2].includes(Number(r.attempt))&&integer(r.attempt,1)&&['QUEUED','RUNNING','COMPLETED','FAILED','CANCELLED'].includes(String(r.status))&&date(r.scheduledFor)&&date(r.requestedAt)&&nullableDate(r.startedAt)&&nullableDate(r.finishedAt)&&(r.errorCode===null||text(r.errorCode))&&typeof r.retryable==='boolean'&&Array.isArray(r.observations)&&r.observations.length<=20&&r.observations.every(observation))
  ||!Array.isArray(value.alerts)||value.alerts.length>50||!value.alerts.every(a=>object(a)&&text(a.resourceCode)&&text(a.code)&&['ATTENTION','ERROR'].includes(String(a.severity))&&['OPEN','RESOLVED'].includes(String(a.status))&&integer(a.episode,1)&&text(a.responsibleEmail)&&(a.runId===null||text(a.runId))&&observation(a.observation)&&date(a.firstObservedAt)&&date(a.lastObservedAt)&&nullableDate(a.resolvedAt))
  ||!Array.isArray(value.history)||value.history.length>20||!value.history.every(h=>object(h)&&text(h.id)&&integer(h.revision,1)&&text(h.actorEmail)&&text(h.reason)&&date(h.createdAt)&&object(h.snapshot)&&typeof h.snapshot.enabled==='boolean'&&integer(h.snapshot.planRevision,1)))throw Error('No pudimos verificar el estado del ejecutor regional.');
 if(value.readiness.ready&&value.readiness.planRevision===null||value.current.enabled&&Number(value.current.revision)===0||!value.current.enabled&&value.current.nextRunAt!==null)throw Error('El control regional requiere actualizarse.');
}
export async function getRegionalMonitor(code:string){const {data}=await api.get<unknown>('/platform/territorial-data/regional-monitor/'+encodeURIComponent(code),{timeout:25000});validateRegionalMonitor(data,code);return data;}
export const configureRegionalMonitor=(code:string,input:RegionalMonitorCommand)=>api.post<{datasetCode:string;revision:number;replayed:boolean}>('/platform/territorial-data/regional-monitor/'+encodeURIComponent(code),input,{timeout:25000});
