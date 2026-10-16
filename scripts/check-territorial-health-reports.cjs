/* eslint-disable @typescript-eslint/no-require-imports -- Browser fixtures never call the live API or source sites. */
const {scheduleFixture}=require('./fixtures/territorial-health-schedule.cjs');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {healthFixture}=require('./fixtures/territorial-health.cjs'),{workflowFixture}=require('./fixtures/territorial-geographic-review.cjs');
const validation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-cierre-2026-10-15.json'),'utf8'));
const draft=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'),'utf8'));draft.contentHash=validation.draftContentHash;
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3029';let browser;
function completed(){
 const data=healthFixture(),now=new Date().toISOString();
 const observations=[
  {resourceCode:'PUBLICATION',status:'OK',code:'PUBLICATION_MATCH',severity:'INFO',title:'Publicación municipal',detail:'La versión municipal coincide con la referencia.',nextAction:'Conservar la revisión explícita.',checkedAt:now},
  {resourceCode:'CAR05',status:'ERROR',code:'FILE_CHANGED',severity:'ERROR',title:'Plano de comunas',detail:'El PDF descargado cambió respecto a su huella.',nextAction:'Revisar el nuevo documento antes de importar.',checkedAt:now,expectedHash:'b'.repeat(64),actualHash:'c'.repeat(64)},
  {resourceCode:'STATION_PDF',status:'ATTENTION',code:'ACCESS_DENIED',severity:'WARNING',title:'PDF electoral de puestos',detail:'HTTP 403; contenido sin comprobar.',nextAction:'Solicitar el original por el canal oficial.',checkedAt:now,httpStatus:403},
 ];
 const run={id:'00000000-0000-4000-8000-000000000001',status:'COMPLETED',configHash:data.configHash,requestedAt:now,startedAt:now,finishedAt:now,errorCode:null,observations};
 return {...data,checkedAt:now,stale:false,lastComplete:run,latestRun:run,runs:[run],alerts:[{id:'alert1',resourceCode:'CAR05',code:'FILE_CHANGED',severity:'ERROR',status:'OPEN',title:'Plano de comunas',nextAction:observations[1].nextAction,firstObservedAt:now,lastObservedAt:now,resolvedAt:null,episode:1,observation:observations[1]}]};
}
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const mode of ['empty','export-html','export-json','export-mobile','export-failure','reader-page-blocked']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],external=[];let reads=0,failedOnce=false;const exports=[];const dir=path.resolve(__dirname,'../../.tmp/t6-health-report-downloads/'+Date.now()+'-'+mode);fs.mkdirSync(dir,{recursive:true});await(await page.createCDPSession()).send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(()=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'operator',organizationId:'platform',fullName:'Fixture',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:true,canDelete:false}]},impersonation:null},version:0})));
  if(mode==='reader-page-blocked')await page.evaluateOnNewDocument(()=>{const d=JSON.parse(localStorage.getItem('auth-storage'));d.state.user.permissions[0].canWrite=false;localStorage.setItem('auth-storage',JSON.stringify(d));});
  await page.setViewport({width:mode==='export-mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async request=>{
   if(request.url().startsWith(origin))return request.continue();
   const url=new URL(request.url());if(url.hostname.includes('alcaldianeiva.gov.co')||url.hostname.includes('registraduria.gov.co'))external.push(url.hostname);
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});
   if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();
   let body=null,status=200;
   if(['/legal/pending','/permissions/modules','/platform/territorial-data'].includes(url.pathname))body=[];
   if(url.pathname==='/platform/access/context')body={enabled:true,principal:false,capabilities:['CATALOG_MANAGE'],organizationIds:[],allOrganizations:true};
   if(url.pathname==='/organizations/me')body={id:'platform',name:'Fixture'};
   if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname.endsWith('/geography/config'))body={identity:{},current:null,history:[],municipalities:[]};
   if(url.pathname.endsWith('/geography/crosswalk'))body=draft;
   if(url.pathname.endsWith('/crosswalk/validation'))body=validation;
   if(url.pathname.endsWith('/geography/review-workflow'))body=workflowFixture(validation);
   if(url.pathname==='/platform/territorial-data/health/schedule')body=scheduleFixture();
   if(url.pathname==='/platform/territorial-data/health'){
    reads++;body=mode.startsWith('export-')?completed():healthFixture();
    if(mode==='stale')body.stale=true;
    if(mode==='obsolete-config'){body.lastComplete.configHash='f'.repeat(64);body.stale=true;}
    if(mode==='disabled')body.workerEnabled=false;
    if(mode==='cooldown')body.canRequestAt=new Date(Date.now()+240000).toISOString();
    if(mode==='failed'){body.latestRun={...body.latestRun,status:'FAILED',errorCode:'INTERRUPTED'};body.runs.unshift(body.latestRun);}
    if(mode==='pending'||(['uncertain','conflict','refresh-failure'].includes(mode)&&reads>1)){
     if(mode==='pending'&&reads>1)body=completed();else{body.busy=true;body.latestRun={...completed().latestRun,status:'RUNNING',finishedAt:null,observations:null};}
    }
    if(mode==='forbidden'){status=403;body={message:'No tienes acceso al catálogo.'};}
    if(mode==='retry'&&!failedOnce){failedOnce=true;status=503;body={message:'Servicio no disponible.'};}
    if(mode==='refresh-failure'&&reads===2){status=503;body={message:'Estado no disponible.'};}
   }
   if(url.pathname==='/platform/territorial-data/health/checks'){
    assert.equal(request.method(),'POST');writes.push(JSON.parse(request.postData()));
    if(mode==='conflict'){status=409;body={message:'Ya hay una comprobación en curso.'};}
    else if(mode==='uncertain'&&!failedOnce){failedOnce=true;return request.abort('failed');}
    else body={...completed().latestRun,status:'QUEUED',finishedAt:null,observations:null};
   }
   if(url.pathname==='/platform/territorial-data/health/reports'){
    assert.equal(request.method(),'POST');const command=JSON.parse(request.postData());exports.push(command);
    if(mode==='export-failure')return request.respond({status:503,headers,contentType:'application/json',body:JSON.stringify({message:'Audit unavailable'})});
    const html=command.format==='HTML';return request.respond({status:200,headers:{...headers,'Content-Disposition':'attachment; filename="fixture.'+(html?'html':'json')+'"'},contentType:html?'text/html; charset=utf-8':'application/json',body:html?'<!doctype html><html lang="es"><meta charset="utf-8"><h1>Diagnóstico de prueba</h1></html>':JSON.stringify({reportType:'TERRITORIAL_SOURCE_HEALTH'})});
   }
   return request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/territorial-data',{waitUntil:'networkidle2',timeout:90000});
  if(mode==='reader-page-blocked'){
   await page.waitForFunction(()=>document.body.innerText.includes('Se requiere acceso interno global'));assert.equal(exports.length,0);assert.equal(writes.length,0);assert.deepEqual(errors,[]);console.log(JSON.stringify({mode,passed:true,existingCatalogWriteGatePreserved:true,exports:0}));await context.close();continue;
  }
  const s='section[aria-label="Salud de fuentes y alertas territoriales"]';
  if(mode==='forbidden'){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$(s+' strong'),null);}
  else{
   if(mode==='retry'){await page.waitForSelector(s+' [role="alert"]');await page.click(s+' button');}
   await page.waitForSelector(s+' strong');
   const exportButtons=await page.$$(s+' div.rounded button');
   assert.equal(exportButtons.length,2);
   if(mode==='empty'){
    assert.equal(await exportButtons[0].evaluate(n=>n.disabled),true);assert.equal(await exportButtons[1].evaluate(n=>n.disabled),true);assert.deepEqual(exports,[]);
   }else{
    const format=mode==='export-json'?'JSON':'HTML';await exportButtons[format==='JSON'?1:0].click();
    if(mode==='export-failure'){await page.waitForSelector(s+' [role="alert"]');assert.ok((await page.$eval(s,n=>n.innerText)).includes('No se pudo descargar'));}
    else{
     const file=path.join(dir,'diagnostico-fuentes-neiva.'+(format==='HTML'?'html':'json'));
     await page.waitForFunction(selector=>document.querySelector(selector).innerText.includes('descargad'),{},s);
     for(let i=0;i<40&&!fs.existsSync(file);i++)await new Promise(resolve=>setTimeout(resolve,100));
     assert.ok(fs.existsSync(file));const raw=fs.readFileSync(file,'utf8');assert.ok(format==='HTML'?raw.includes('Diagnóstico de prueba'):JSON.parse(raw).reportType==='TERRITORIAL_SOURCE_HEALTH');
    }
    assert.deepEqual(exports,[{format}]);assert.equal(writes.length,0);
   }
   assert.equal(await page.$eval(s,n=>n.scrollWidth<=n.clientWidth+1),true);
  }
  assert.deepEqual(errors,[]);assert.deepEqual(external,[]);assert.ok(writes.every(w=>Object.keys(w).length===1&&typeof w.requestKey==='string'));
  console.log(JSON.stringify({mode,passed:true,reads,writes:writes.length,exports:exports.length,sourceSitesContacted:0}));await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
