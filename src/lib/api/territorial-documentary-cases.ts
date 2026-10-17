import { apiGet, apiPost } from '@/lib/api';
import type { RegionalSourceMetadata } from './territorial-regional-sources';
export interface DocumentaryEvent {id:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string;snapshot:{checks?:{cutoffExplanation?:string}}}
export interface DocumentaryCase {id:string;datasetCode:string;title:string;resultSourceId:string;referenceSourceId:string;resultTitle:string;referenceTitle:string;state:string;revision:number;responsibleId:string;responsibleEmail:string;snapshotHash:string;blockers:string[];documentaryReady:boolean;numericReconciliation:'PENDING';published:false;history:DocumentaryEvent[];historyTruncated:boolean;snapshot?:{mode:string;dataset:{electionCode:string;corporationCode:string;territoryCode:string;constituencyCode:string};result:{id:string;sha256:string;metadata:RegionalSourceMetadata};reference:{id:string;sha256:string;metadata:RegionalSourceMetadata};resultLocator:string;referenceLocator:string}}
export interface CreateDocumentaryCase {requestKey:string;datasetCode:string;title:string;resultSourceId:string;referenceSourceId:string;resultLocator:string;referenceLocator:string;reason:string}
export interface DocumentaryCommand {requestKey:string;expectedRevision:number;action:string;reason:string;contextChecked?:boolean;coverageChecked?:boolean;independenceChecked?:boolean;cutoffExplanation?:string}
const root='/platform/territorial-data/documentary-cases';
export const listDocumentaryCases=(code:string)=>apiGet<{items:DocumentaryCase[];truncated:boolean}>(root+'?datasetCode='+encodeURIComponent(code));
export const createDocumentaryCase=(input:CreateDocumentaryCase)=>apiPost<DocumentaryCase>(root,input);
export const commandDocumentaryCase=(id:string,input:DocumentaryCommand)=>apiPost<DocumentaryCase>(root+'/'+encodeURIComponent(id)+'/commands',input);
export const getDocumentaryCase=(id:string)=>apiGet<DocumentaryCase>(root+'/'+encodeURIComponent(id));
export const getDocumentaryHistory=(id:string,before?:number)=>apiGet<{items:DocumentaryEvent[];nextBeforeRevision:number|null}>(root+'/'+encodeURIComponent(id)+'/history'+(before?'?beforeRevision='+before:''));
