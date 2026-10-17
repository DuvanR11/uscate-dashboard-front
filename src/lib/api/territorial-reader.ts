/** Every reader request names its selected context. There is no default dataset. */
export function territorialReaderRoot(datasetCode:string){
 if(!/^[A-Z][A-Z0-9_]{2,79}$/.test(datasetCode))throw new Error('INVALID_TERRITORIAL_CONTEXT');
 return '/organization/territorial-data/explorer/'+encodeURIComponent(datasetCode);
}
export function assertTerritorialReaderBinding(value:unknown,datasetCode:string){
 territorialReaderRoot(datasetCode);
 if(!value||typeof value!=='object'||!('datasetCode'in value)||value.datasetCode!==datasetCode)throw new Error('TERRITORIAL_CONTEXT_MISMATCH');
}
