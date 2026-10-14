import { apiGet, apiPost } from '@/lib/api';
import type { PlatformException } from './platform-access';
export interface TerritorialBatch {
 id:string;requestKey:string;createdById:string;reason:string;state:string;createdAt:string;readyAt:string|null;
 preview:{municipality:string;department:string;corporation:string;electionDate:string;documentCompletion:string;observedTables:number;published:boolean;totals:Record<string,number>;groups:{documentCode:string;mmvCode:string;votes:number}[];pending:string[]};
 evidence:{id:string;kind:string;state:string;sha256:string;bytes:number;storedAt:string|null}[];
}
export const listTerritorialBatches=()=>apiGet<TerritorialBatch[]>('/platform/territorial-data');
export const createTerritorialBatch=(input:FormData)=>apiPost<TerritorialBatch>('/platform/territorial-data',input);
export const downloadTerritorialEvidence=(batchId:string,fileId:string)=>apiGet<{url:string}>(`/platform/territorial-data/${encodeURIComponent(batchId)}/evidence/${encodeURIComponent(fileId)}/download`);

export interface GeographyReview {
 id:string; revision:number; municipalityId:number; active:boolean; reason:string; createdAt:string; reviewedByEmail:string;
}
export interface GeographyConfig {
 identity:{pilot:string;electoralDepartmentCode:string;electoralMunicipalityCode:string;divipolaDepartmentCode:string;divipolaMunicipalityCode:string;sourceUrl:string};
 current:GeographyReview|null; history:GeographyReview[];
 municipalities:{id:number;name:string;department:{id:number;name:string}}[];
}
export interface TerritorialContext {
 pilot:string; eligibleTerritory:boolean; reason:string; subscriptionAccess:string; resultsAvailable:boolean;
 geography:{divipolaMunicipalityCode:string;divipolaDepartmentCode:string;electoralDepartmentCode:string;electoralMunicipalityCode:string;municipalityId:number;revision:number;sourceUrl:string}|null;
 accessMode?:'PAID'|'DEMO'|null;
 trial?:{startsAt:string;trialEndsAt:string;readOnlyEndsAt:string}|null;
}
export const getTerritorialGeography=()=>apiGet<GeographyConfig>('/platform/territorial-data/geography/config');
export const reviewTerritorialGeography=(input:{expectedRevision:number;municipalityId:number;active:boolean;reason:string})=>apiPost<GeographyReview>('/platform/territorial-data/geography/reviews',input);
export const diagnoseTerritorialAccess=(organizationId:string)=>apiGet<TerritorialContext>(`/platform/territorial-data/geography/organizations/${encodeURIComponent(organizationId)}`);
export interface TrialPreview {organizationId:string;name:string;pilot:string;planId:string;territoryCode:string;trialDays:number;readOnlyDays:number;authorizationScope:string;current:{id:string;exceptionId:string;startsAt:string;trialEndsAt:string;readOnlyEndsAt:string}|null;}
const trialPath=(id:string)=>`/platform/territorial-data/trials/${encodeURIComponent(id)}`;
export const previewTerritorialTrial=(id:string)=>apiGet<TrialPreview>(trialPath(id)+'/preview');
export const requestTerritorialTrial=(id:string,reason:string)=>apiPost<PlatformException>(trialPath(id)+'/request',{reason});
export const activateTerritorialTrial=(id:string,exceptionId:string,reason:string)=>apiPost<NonNullable<TrialPreview['current']>>(trialPath(id)+'/activate',{exceptionId,reason});
