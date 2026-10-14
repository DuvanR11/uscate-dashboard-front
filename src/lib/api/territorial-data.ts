import { apiGet, apiPost } from '@/lib/api';
export interface TerritorialBatch {
 id:string;requestKey:string;createdById:string;reason:string;state:string;createdAt:string;readyAt:string|null;
 preview:{municipality:string;department:string;corporation:string;electionDate:string;documentCompletion:string;observedTables:number;published:boolean;totals:Record<string,number>;groups:{documentCode:string;mmvCode:string;votes:number}[];pending:string[]};
 evidence:{id:string;kind:string;state:string;sha256:string;bytes:number;storedAt:string|null}[];
}
export const listTerritorialBatches=()=>apiGet<TerritorialBatch[]>('/platform/territorial-data');
export const createTerritorialBatch=(input:FormData)=>apiPost<TerritorialBatch>('/platform/territorial-data',input);
export const downloadTerritorialEvidence=(batchId:string,fileId:string)=>apiGet<{url:string}>(`/platform/territorial-data/${encodeURIComponent(batchId)}/evidence/${encodeURIComponent(fileId)}/download`);
