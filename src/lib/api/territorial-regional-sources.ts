import {apiGet,apiPost} from '@/lib/api';
import type {RegistryContext} from './territorial-registry';
export interface RegionalSourceMetadata {version:number;title:string;publisher:string;sourceUrl:string;purpose:string;resultType:string;resolution:string;sourceTerritoryCode:string;cutoffAt:string|null;publicAggregated:boolean}
export interface RegionalSource {id:string;datasetCode:string;metadata:RegionalSourceMetadata;sha256:string;bytes:number;extension:string;state:string;revision:number;createdById:string;createdAt:string;storedAt:string|null;originalAvailable:boolean;resultsPublished:false;numericReconciliation:string;geographicMapping:string;history:{id:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string}[]}
export interface RegionalSourceList {dataset:RegistryContext['definition'];items:RegionalSource[];truncated:boolean;resultsPublishedByIntake:false}
export interface RegisterRegionalSource {requestKey:string;datasetCode:string;title:string;publisher:string;sourceUrl:string;purpose:string;resultType:string;resolution:string;sourceTerritoryCode:string;cutoffAt?:string;publicAggregated:true;sha256:string;bytes:number;extension:string;reason:string}
export interface ReviewRegionalSource {requestKey:string;expectedRevision:number;action:'REVIEW'|'REJECT'|'WITHDRAW';metadataChecked?:boolean;reason:string}
const root='/platform/territorial-data/regional-sources';
export const listRegionalSources=(code:string)=>apiGet<RegionalSourceList>(root+'?datasetCode='+encodeURIComponent(code));
export const registerRegionalSource=(input:RegisterRegionalSource)=>apiPost<RegionalSource>(root,input);
export const uploadRegionalOriginal=(id:string,file:File)=>{const body=new FormData();body.set('original',file);return apiPost<RegionalSource>(root+'/'+encodeURIComponent(id)+'/original',body);};
export const reviewRegionalSource=(id:string,input:ReviewRegionalSource)=>apiPost(root+'/'+encodeURIComponent(id)+'/review',input);
export const downloadRegionalOriginal=(id:string)=>apiGet<{url:string;expiresInSeconds:number}>(root+'/'+encodeURIComponent(id)+'/original/download');
