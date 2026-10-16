const registryFixture=()=>({
 elections:[{code:'CO_TERRITORIALES_2023',name:'Territoriales 2023',electionDate:'2023-10-29',kind:'TERRITORIAL'}],
 corporations:[{code:'CONCEJO',name:'Concejo',allowedLevels:['MUNICIPAL'],allowedElectionKinds:['TERRITORIAL']}],
 territories:[{code:'CO',name:'Colombia',level:'NATIONAL',parentCode:null,origin:'COUNTRY_DEFINITION'},{code:'41',name:'Huila',level:'DEPARTMENTAL',parentCode:'CO',origin:'LEGACY_IDENTITY'},{code:'41001',name:'Neiva',level:'MUNICIPAL',parentCode:'41',origin:'LEGACY_IDENTITY'}],
 datasets:[{code:'NEIVA_CONCEJO_2023',name:'Concejo de Neiva 2023',electionCode:'CO_TERRITORIALES_2023',corporationCode:'CONCEJO',territoryCode:'41001',constituencyCode:'GENERAL',adapter:'LEGACY_NEIVA_2023',state:'LEGACY_READY',revision:1}],
 history:[],levels:['NATIONAL','DEPARTMENTAL','MUNICIPAL'],electionKinds:['TERRITORIAL','NATIONAL','OTHER'],counts:{elections:1,datasets:1},truncated:false,registrationGrantsAccess:false,
});
module.exports={registryFixture};
