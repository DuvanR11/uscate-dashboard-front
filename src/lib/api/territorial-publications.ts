import { apiGet, apiPost } from '@/lib/api';
export type PublicationAction = 'review' | 'publish' | 'withdraw';
export interface TerritorialResultVersion {
  id: string; number: number; batchId: string; requestKey: string; state: 'DRAFT' | 'REVIEWED' | 'PUBLISHED' | 'WITHDRAWN'; revision: number;
  createdAt: string; reviewedAt: string | null; publishedAt: string | null; withdrawnAt: string | null; contentHash: string;
  payload: {
    municipality: string; department: string; electionDate: string; geographyRevision: number; methodologyVersion?: string;
    groupNameCatalog?: { version: string; contentHash: string; reviewedOn: string };
    totals: Record<string,number>; groups: {documentCode:string;mmvCode:string;votes:number;name?:string}[];
    sources:{actas:{statedScrutinyCompletion:string;cryptographicSignatureVerified:boolean};mmv:{resultType:string;cutoff:null|string}};
    groupPercentageDenominator:{category:string;votes:number}; limits:string[];
  };
  events:{id:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string;requestKey:string}[];
}
export interface PublicationCommand {requestKey:string;expectedRevision:number;reason:string;acceptLimitations?:boolean}
const base='/platform/territorial-data/publications';
export const listResultVersions=(batchId:string)=>apiGet<TerritorialResultVersion[]>(`${base}/batches/${encodeURIComponent(batchId)}`);
export const prepareResultVersion=(batchId:string,input:{requestKey:string;reason:string;methodologyVersion?:'NEIVA_E26_MUNICIPAL_V1'|'NEIVA_E26_MUNICIPAL_NAMES_V2'})=>apiPost<TerritorialResultVersion>(`${base}/batches/${encodeURIComponent(batchId)}`,input);
export const actOnResultVersion=(id:string,action:PublicationAction,input:PublicationCommand)=>apiPost<TerritorialResultVersion>(`${base}/${encodeURIComponent(id)}/${action}`,input);
