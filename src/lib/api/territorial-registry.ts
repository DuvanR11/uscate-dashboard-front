import { apiGet, apiPost } from '@/lib/api';
export type RegistryKind='ELECTION'|'CORPORATION'|'TERRITORY'|'DATASET'|'ARCHIVE_DATASET';
export interface RegistryDefinition {code:string;name:string}
export interface RegistryElection extends RegistryDefinition {electionDate:string;kind:string}
export interface RegistryCorporation extends RegistryDefinition {allowedLevels:string[];allowedElectionKinds:string[]}
export interface RegistryTerritory extends RegistryDefinition {level:string;parentCode:string|null;origin:string}
export interface RegistryDataset extends RegistryDefinition {electionCode:string;corporationCode:string;territoryCode:string;constituencyCode:string;adapter:string;state:string;revision:number}
export interface RegistryConfiguration {
 elections:RegistryElection[];corporations:RegistryCorporation[];territories:RegistryTerritory[];datasets:RegistryDataset[];
 history:{id:string;entityKind:string;entityCode:string;revision:number;action:string;actorEmail:string;reason:string;createdAt:string}[];
 levels:string[];electionKinds:string[];truncated:boolean;counts:{elections:number;datasets:number};registrationGrantsAccess:false;
}
export interface RegistryCommand {
 kind:RegistryKind;code:string;requestKey:string;expectedRevision:number;reason:string;name?:string;electionDate?:string;electionKind?:string;
 allowedLevels?:string[];allowedElectionKinds?:string[];electionCode?:string;corporationCode?:string;territoryCode?:string;constituencyCode?:string;
}
export interface RegistryContext {definition:RegistryDataset&{election:RegistryElection;corporation:RegistryCorporation;territory:RegistryTerritory};workflow:'LEGACY_NEIVA'|'CONFIGURATION_ONLY';sourceReviewRequired:boolean;commercialAccessGranted:false;resultsPublishedByRegistration:false;pending:string[]}
const base='/platform/territorial-data/registry';
export async function getTerritorialRegistry(){const data=await apiGet<RegistryConfiguration>(base);if(!data||data.registrationGrantsAccess!==false||!['elections','corporations','territories','datasets','history'].every(k=>Array.isArray(data[k as keyof RegistryConfiguration])))throw Error('No se pudo verificar el catálogo territorial.');return data;}
export const saveTerritorialRegistry=(command:RegistryCommand)=>apiPost<{code:string;revision:number;replayed:boolean}>(base+'/commands',command);
export const getTerritorialContext=(code:string)=>apiGet<RegistryContext>(base+'/datasets/'+encodeURIComponent(code));
export const findTerritorialCandidates=(search:string)=>apiGet<(RegistryDefinition&{level:string;departmentCode:string|null})[]>(base+'/territory-candidates?search='+encodeURIComponent(search));
