const item=(code='NEIVA_CONCEJO_2023')=>({code,name:code==='NEIVA_CONCEJO_2023'?'Concejo de Neiva 2023':'Alcaldía de Medellín 2023',state:'ACTIVE',revision:1,
 election:{code:'CO_TERRITORIALES_2023',name:'Territoriales 2023',electionDate:'2023-10-29'},corporation:code==='NEIVA_CONCEJO_2023'?{code:'CONCEJO',name:'Concejo'}:{code:'ALCALDIA',name:'Alcaldía'},
 territory:code==='NEIVA_CONCEJO_2023'?{code:'41001',name:'Neiva',level:'MUNICIPAL'}:{code:'05001',name:'Medellín',level:'MUNICIPAL'},sources:{DOCUMENT_REVIEWED:2,PENDING_ORIGINAL:1},documentary:{DOCUMENTS_READY:1},
 changedDocumentaryCases:1,syntheticExercises:{REVIEWED:2},versions:code==='NEIVA_CONCEJO_2023'?{PUBLISHED:1}:{},readerImplemented:code==='NEIVA_CONCEJO_2023',
 warnings:[{code:'DOCUMENTS_CHANGED',message:'Cambió el catálogo o una fuente de una preparación documental.'}]});
const page=()=>({checkedAt:new Date().toISOString(),cacheSeconds:15,pageSize:20,next:null,items:[item(),item('MEDELLIN_ALCALDIA_2023')],
 reports:{workerEnabled:true,states:[{state:'GENERATING',count:3,expiredLeases:1,oldestAt:'2026-10-17T10:00:00.000Z'}]},
 remoteMonitoring:{pilot:'NEIVA_CONCEJO_2023',workerEnabled:true,stale:true,interrupted:true,lastCompletedAt:null,lastRun:{status:'RUNNING',requestedAt:'2026-10-17T10:00:00.000Z',finishedAt:null,leaseExpiresAt:'2026-10-17T10:10:00.000Z'},schedule:{enabled:true,nextRunAt:'2026-10-18T14:00:00.000Z',hour:9,minute:0,blockedReason:null}},
 limitations:['Las advertencias son operativas; no validan autenticidad ni habilitan acceso comercial.','Los ejercicios sintéticos no son resultados oficiales.']});
module.exports={item,page};
