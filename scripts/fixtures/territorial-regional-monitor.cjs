const code='MEDELLIN_ALCALDIA_2023';
function configuration(){return {
 dataset:{code,name:'Alcaldía de Medellín 2023'},current:{datasetCode:code,revision:0,enabled:false,planRevision:0,nextRunAt:null,blockedReason:null,updatedAt:null},
 readiness:{ready:true,planRevision:1,blocker:null},workerEnabled:false,adapter:'OFFICIAL_DOCUMENT_V1',allowedHosts:['observatorio.registraduria.gov.co'],
 runs:[],alerts:[],history:[],policy:{timeZone:'America/Bogota',globalConcurrency:1,maxSources:20,maxBytesPerSource:10485760,timeoutSeconds:10,retryDelayMinutes:60,maxRetries:1,historyShown:20},checkedAt:new Date().toISOString(),
};}
function changed(){const f=configuration(),now=new Date().toISOString();f.current={...f.current,revision:1,enabled:true,planRevision:1,nextRunAt:new Date(Date.now()+86400000).toISOString(),updatedAt:now};f.workerEnabled=true;
 const observation={sourceId:'synthetic-source',code:'CONTENT_CHANGED',severity:'ERROR',retryable:false,observedHash:'c'.repeat(64),bytes:100,httpStatus:200};
 f.runs=[{id:'synthetic-run',datasetCode:code,controlRevision:1,planRevision:1,scheduledDay:'2026-10-17',attempt:1,status:'COMPLETED',scheduledFor:now,requestedAt:now,startedAt:now,finishedAt:now,errorCode:null,retryable:false,observations:[observation]}];
 f.alerts=[{resourceCode:'synthetic-source',code:'CONTENT_CHANGED',severity:'ERROR',status:'OPEN',episode:1,runId:'synthetic-run',responsibleEmail:'responsible@example.test',observation,firstObservedAt:now,lastObservedAt:now,resolvedAt:null}];return f;
}
module.exports={code,configuration,changed};
