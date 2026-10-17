import api from '@/lib/api';
export interface TerritorialExplorerEntry {
 code:string;name:string;election:{code:string;name:string;date:string};corporation:{code:string;name:string};territory:{code:string;name:string;level:string};constituencyCode:string;origins:string[];
 access:{status:'ACTIVE'|'READ_ONLY'|'EXPIRED'|'REVOKED'|'PENDING'|'UNVERIFIED'|'NONE';mode:'PAID'|'DEMO'|null;startsAt:string|null;endsAt:string|null};
 availability:'AVAILABLE'|'CATALOG_UNAVAILABLE'|'SOURCES_PENDING'|'GEOGRAPHY_PENDING'|'PUBLICATION_PENDING'|'ACCESS_REQUIRED';canExplore:boolean;reader:'NEIVA_MUNICIPAL'|null;publication:{id:string;number:number;publishedAt:string}|null;
}
export interface TerritorialExplorerPage {items:TerritorialExplorerEntry[];nextAfterCode:string|null;checkedAt:string;registrationGrantsResults:false}
const root='/organization/territorial-data/explorer';
export async function getTerritorialExplorer(signal:AbortSignal,afterCode?:string){return (await api.get<TerritorialExplorerPage>(root,{params:afterCode?{afterCode}:undefined,signal,timeout:30000})).data;}
export async function getTerritorialExplorerEntry(code:string,signal:AbortSignal){return (await api.get<{item:TerritorialExplorerEntry;checkedAt:string;registrationGrantsResults:false}>(root+'/'+encodeURIComponent(code),{signal,timeout:30000})).data;}
export function validateTerritorialExplorerPage(page:TerritorialExplorerPage){
 const code=(v:unknown)=>typeof v==='string'&&/^[A-Z][A-Z0-9_]{2,79}$/.test(v),date=(v:unknown)=>typeof v==='string'&&Number.isFinite(Date.parse(v));
 if(!page||!Array.isArray(page.items)||page.items.length>20||page.registrationGrantsResults!==false||!date(page.checkedAt)||(page.nextAfterCode!==null&&!code(page.nextAfterCode))||new Set(page.items.map(r=>r?.code)).size!==page.items.length)throw new Error('Respuesta territorial incompatible. Actualiza la consulta.');
 for(const row of page.items){
  if(!row||!code(row.code)||typeof row.name!=='string'||!row.name||!row.election||!code(row.election.code)||typeof row.election.name!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(row.election.date)||!row.corporation||typeof row.corporation.code!=='string'||typeof row.corporation.name!=='string'||!row.territory||typeof row.territory.code!=='string'||typeof row.territory.name!=='string'||typeof row.territory.level!=='string'||typeof row.constituencyCode!=='string'||!Array.isArray(row.origins)||!row.origins.every(o=>['CONTRACT','PROFILE','LEGACY_PILOT'].includes(o))||!row.access||!['ACTIVE','READ_ONLY','EXPIRED','REVOKED','PENDING','UNVERIFIED','NONE'].includes(row.access.status)||![null,'PAID','DEMO'].includes(row.access.mode)||![row.access.startsAt,row.access.endsAt].every(v=>v===null||date(v))||!['AVAILABLE','CATALOG_UNAVAILABLE','SOURCES_PENDING','GEOGRAPHY_PENDING','PUBLICATION_PENDING','ACCESS_REQUIRED'].includes(row.availability)||typeof row.canExplore!=='boolean'||![null,'NEIVA_MUNICIPAL'].includes(row.reader))throw new Error('El contexto territorial está incompleto. Actualiza la consulta.');
  if(row.canExplore!== (row.availability==='AVAILABLE')||row.canExplore!==Boolean(row.reader)||(!row.canExplore&&row.publication!==null))throw new Error('La disponibilidad territorial requiere nueva comprobación.');
  if(row.canExplore&&(!['ACTIVE','READ_ONLY'].includes(row.access.status)||row.code!=='NEIVA_CONCEJO_2023'||row.election.code!=='CO_TERRITORIALES_2023'||row.election.date!=='2023-10-29'||row.corporation.code!=='CONCEJO'||row.territory.code!=='41001'||row.constituencyCode!=='GENERAL'||!row.publication||typeof row.publication.id!=='string'||!row.publication.id||!Number.isInteger(row.publication.number)||row.publication.number<1||!date(row.publication.publishedAt)))throw new Error('El lector disponible no corresponde a este contexto y versión.');
 }
 if(page.nextAfterCode!==null&&(!page.items.length||page.nextAfterCode!==page.items[page.items.length-1].code))throw new Error('La paginación territorial requiere nueva comprobación.');
}
