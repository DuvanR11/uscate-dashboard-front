import { apiGet,apiPost } from '@/lib/api';
import type { RegistryContext } from './territorial-registry';
export interface TerritorialContractTerms {
 version:1;organizationId:string;reference:string;paymentId:string;designatedUserId:string;designatedName:string;designatedEmail:string;startsAt:string;endsAt:string;planCode:string;commercialPlanCode:string;
 payment:{amount:string;currency:string;reference:string|null;periodStart:string;periodEnd:string};
 datasets:{code:string;name:string;electionCode:string;electionName:string;electionDate:string;corporationCode:string;corporationName:string;territoryCode:string;territoryName:string;constituencyCode:string}[];
}
export interface TerritorialContract {id:string;reference:string;state:string;revision:number;startsAt:string;endsAt:string;termsHash:string;terms:TerritorialContractTerms|null;designatedUserId:string;acceptedAt:string|null;authorization:{id?:string;status:string;expiresAt:string}|null;effectiveReason:string;history:{id:string;revision:number;action:string;reason:string;createdAt:string;actorEmail?:string}[]}
export interface TerritorialContractList {items:TerritorialContract[];truncated:boolean}
export interface CreateTerritorialContract {requestKey:string;paymentId:string;designatedUserId:string;reference:string;startsAt:string;endsAt:string;datasetCodes:string[];reason:string}
export interface TerritorialContractAction {requestKey:string;expectedRevision:number;action:'REQUEST_APPROVAL'|'ACTIVATE'|'REVOKE';reason:string}
export interface TerritorialContractAcceptance {requestKey:string;expectedRevision:number;termsHash:string}
export interface TerritorialContractOptions {datasets:RegistryContext['definition'][];truncated:boolean;recipients:{id:string;fullName:string;email:string}[];payments:{id:string;reference:string|null;currency:string;totalAmount:string;periodStart:string;periodEnd:string;territoryCode:string|null}[]}
const root=(id:string)=>'/platform/organizations/'+encodeURIComponent(id)+'/territorial-contracts';
export const listTerritorialContracts=(id:string)=>apiGet<TerritorialContractList>(root(id));
export const getTerritorialContractOptions=(id:string,search='')=>apiGet<TerritorialContractOptions>(root(id)+'/options?search='+encodeURIComponent(search));
export const createTerritorialContract=(id:string,body:CreateTerritorialContract)=>apiPost(root(id),body);
export const actTerritorialContract=(org:string,id:string,body:TerritorialContractAction)=>apiPost(root(org)+'/'+encodeURIComponent(id)+'/actions',body);
export const listMyTerritorialContracts=()=>apiGet<TerritorialContractList>('/organization/territorial-data/contracts');
export const acceptTerritorialContract=(id:string,body:TerritorialContractAcceptance)=>apiPost('/organization/territorial-data/contracts/'+encodeURIComponent(id)+'/accept',body);
