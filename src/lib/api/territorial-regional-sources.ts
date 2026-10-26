import {apiGet,apiPost} from '@/lib/api';
import type {RegistryContext} from './territorial-registry';
export interface RegionalSourceMetadata {version:number;title:string;publisher:string;sourceUrl:string;purpose:string;resultType:string;resolution:string;sourceTerritoryCode:string;cutoffAt:string|null;publicAggregated:boolean}
export interface RegionalSource {id:string;datasetCode:string;metadata:RegionalSourceMetadata;sha256:string;bytes:number;extension:string;state:string;revision:number;createdById:string;createdAt:string;storedAt:string|null;originalAvailable:boolean;resultsPublished:false;numericReconciliation:string;geographicMapping:string;history:{id:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string}[]}
export interface RegionalUploadLimits {pdfBytes:number;zipBytes:number;largeZipEnabled:boolean}
export interface RegionalSourceList {dataset:RegistryContext['definition'];items:RegionalSource[];truncated:boolean;resultsPublishedByIntake:false;uploadLimits?:RegionalUploadLimits}
export function regionalFileLimits(data: Pick<RegionalSourceList,'uploadLimits'>):RegionalUploadLimits {
 const v=data.uploadLimits,small=10*1024*1024;
 if(v===undefined)return {pdfBytes:small,zipBytes:small,largeZipEnabled:false};
 if(!v||v.pdfBytes!==small||typeof v.largeZipEnabled!=='boolean'||v.zipBytes!==(v.largeZipEnabled?32:10)*1024*1024)throw Error('No se pudieron verificar los límites de carga regional. Actualiza la consulta.');
 return v;
}
export function assertRegionalFile(file:Pick<File,'name'|'size'>,limits:RegionalUploadLimits):string {
 const extension=file.name.split('.').pop()?.toLowerCase();
 if(!Number.isSafeInteger(file.size)||file.size<1||!['pdf','zip'].includes(extension??'')||file.size>(extension==='pdf'?limits.pdfBytes:limits.zipBytes))throw Error(`Selecciona un PDF de hasta 10 MiB o ZIP de hasta ${limits.zipBytes/1024/1024} MiB, según la capacidad habilitada.`);
 return extension!;
}
export interface RegisterRegionalSource {requestKey:string;datasetCode:string;title:string;publisher:string;sourceUrl:string;purpose:string;resultType:string;resolution:string;sourceTerritoryCode:string;cutoffAt?:string;publicAggregated:true;sha256:string;bytes:number;extension:string;reason:string}
export interface ReviewRegionalSource {requestKey:string;expectedRevision:number;action:'REVIEW'|'REJECT'|'WITHDRAW';metadataChecked?:boolean;reason:string}
const root='/platform/territorial-data/regional-sources';
export const listRegionalSources=async(code:string)=>{const data=await apiGet<RegionalSourceList>(root+'?datasetCode='+encodeURIComponent(code));regionalFileLimits(data);return data;};
export const registerRegionalSource=(input:RegisterRegionalSource)=>apiPost<RegionalSource>(root,input);
export const uploadRegionalOriginal=(id:string,file:File)=>{const body=new FormData();body.set('original',file);return apiPost<RegionalSource>(root+'/'+encodeURIComponent(id)+'/original',body);};
export const reviewRegionalSource=(id:string,input:ReviewRegionalSource)=>apiPost(root+'/'+encodeURIComponent(id)+'/review',input);
export const downloadRegionalOriginal=(id:string)=>apiGet<{url:string;expiresInSeconds:number}>(root+'/'+encodeURIComponent(id)+'/original/download');
