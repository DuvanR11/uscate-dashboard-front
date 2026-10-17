/* eslint-disable @typescript-eslint/no-require-imports -- Standalone local fixture verification. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),ts=require('typescript');
const fixture=require('./fixtures/national-territorial-explorer.cjs');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api/territorial-explorer.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,target={exports:{}};
new Function('module','exports','require',compiled)(target,target.exports,()=>({}));
const validate=target.exports.validateTerritorialExplorerPage;let checks=0;
assert.doesNotThrow(()=>validate(fixture.page()));checks++;
for(const mutate of [
 p=>{p.registrationGrantsResults=true;},p=>{p.checkedAt='invalid';},p=>{p.items.push(p.items[0]);},p=>{p.nextAfterCode='WRONG_CURSOR';},p=>{p.items=Array.from({length:21},(_,i)=>({...p.items[0],code:'CONTEXT_'+i}));},
 p=>{p.items[1].territory.code='05001';},p=>{p.items[1].election.date='2027-10-31';},p=>{p.items[1].corporation.code='ALCALDIA';},p=>{p.items[1].constituencyCode='OTHER';},p=>{p.items[1].access.status='EXPIRED';},p=>{p.items[1].reader='UNKNOWN';},p=>{p.items[0].publication=fixture.neiva.publication;},p=>{p.items[1].publication=null;},p=>{p.items[1].origins=['ANY_ORG'];},p=>{p.items[1].canExplore=false;},
]){const p=fixture.page();mutate(p);assert.throws(()=>validate(p));checks++;}
if(process.env.N5_BROWSER_TEST!=='true'){console.log(JSON.stringify({result:'N5_RESPONSE_VALIDATION_VERIFIED',checks}));process.exit(0);}
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://127.0.0.1:3050';assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname),'Only localhost test builds allowed');
const backend=process.env.TERRITORIAL_TEST_BACKEND||path.resolve(__dirname,'../../api-uscate-back'),output=process.env.N5_EVIDENCE_DIR||path.resolve(__dirname,'../../.tmp/n5-browser');fs.mkdirSync(output,{recursive:true});let browser;
(async()=>{const {default:puppeteer}=await import(pathToFileURL(path.join(backend,'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href);browser=await puppeteer.launch({headless:true});const scenarios=[];
for(const mode of ['contexts','open-neiva','read-only','filters-close-results','empty','list-error','selection-error','revoked-before-opening','revoked-results','refresh-failure-clears-results','pagination','invalid-response','no-permission','impersonated','cancel-selection','mobile']){
 const session=await browser.createBrowserContext(),page=await session.newPage(),errors=[],writes=[],calls=[];let changed=false,listCalls=0;
 await session.setCookie({name:'auth-token',value:'synthetic-only',url:origin},{name:'user-permissions',value:'1',url:origin});
 await page.evaluateOnNewDocument(mode=>{localStorage.setItem('auth-storage',JSON.stringify({state:{token:'synthetic-only',user:{id:'11111111-1111-4111-8111-111111111111',organizationId:'22222222-2222-4222-8222-222222222222',email:'member@example.test',fullName:'Synthetic member',role:{code:'ADMIN'},permissions:mode==='no-permission'?[]:[{module:'DASHBOARD',canRead:true,canWrite:false,canDelete:false}]},impersonation:mode==='impersonated'?{active:true}:null},version:0}));},mode);
 await page.setCacheEnabled(false);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
 page.on('request',async request=>{try{const u=new URL(request.url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return request.continue();const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS','cache-control':'no-store'};if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(request.method()!=='GET'){writes.push(u.pathname);return request.abort();}if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();const respond=(body,status=200)=>request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});let body=[];
 if(u.pathname.startsWith('/organization/territorial-data/')){
  calls.push(u.pathname+u.search);
  if(u.pathname==='/organization/territorial-data/explorer'){
   listCalls++;body=fixture.page();if(mode==='empty')body.items=[];if(mode==='list-error'||mode==='refresh-failure-clears-results'&&changed)return respond({message:'Synthetic list failure'},503);
   if(mode==='invalid-response')body.items[1].territory.code='05001';if(mode==='read-only')body.items[1].access.status='READ_ONLY';
   if(mode==='pagination'){if(u.searchParams.get('afterCode'))body.items=[{...fixture.medellin,code:'ZONA_ALCALDIA_2023',territory:{code:'99999',name:'Territorio ficticio',level:'MUNICIPAL'}}];else body.nextAfterCode=fixture.neiva.code;}
   return respond(body);
  }
  if(u.pathname.startsWith('/organization/territorial-data/explorer/')){
   if(mode==='selection-error')return respond({message:'Synthetic selection failure'},503);
   if(mode==='cancel-selection')await new Promise(resolve=>setTimeout(resolve,1500));
   const item=structuredClone(fixture.neiva);if(mode==='read-only')item.access.status='READ_ONLY';if(mode==='revoked-before-opening'){item.access.status='REVOKED';item.canExplore=false;item.reader=null;item.availability='ACCESS_REQUIRED';item.publication=null;}
   return respond({item,checkedAt:new Date().toISOString(),registrationGrantsResults:false});
  }
  if(u.pathname.endsWith('/context')){body=fixture.context();if(mode==='read-only')body.subscriptionAccess='READ_ONLY';if(mode==='revoked-results'&&changed)body={...body,eligibleTerritory:false,resultsAvailable:false,reason:'CONTRACT_UNVERIFIED',publication:null,geography:null};return respond(body);}
  if(u.pathname.endsWith('/results'))return respond(fixture.results());
  if(u.pathname.endsWith('/reports'))return respond({items:[],next:null});
  if(u.pathname.endsWith('/results/map'))return respond({message:'Cartography outside this navigation fixture'},503);
  return respond({message:'Outside local fixture scope'},403);
 }
 if(u.pathname==='/branding')body={applicationName:'Zyron',primaryColor:'#1E4FD8',secondaryColor:'#22B8CF',accentColor:'#22B8CF'};
 return respond(body);
 }catch(e){if(!request.isInterceptResolutionHandled())await request.abort().catch(()=>{});if(!['cancel-selection'].includes(mode))errors.push(e.message);}});
 const panel='section[aria-label="Contextos territoriales de la organización"]',selected='section[aria-label="Resultados del contexto seleccionado"]';
 async function click(text,scope='body'){const h=await page.evaluateHandle((s,t)=>Array.from(document.querySelector(s).querySelectorAll('button')).find(b=>b.textContent===t),scope,text);assert.ok(h.asElement(),'Missing '+text+' in '+mode);await page.waitForFunction(n=>!n.disabled,{},h.asElement());await h.asElement().evaluate(n=>n.scrollIntoView({block:'center'}));await h.asElement().click();await h.dispose();}
 const waitText=t=>page.waitForFunction(t=>document.body.innerText.includes(t),{},t);
 await page.setViewport({width:mode==='mobile'?390:1440,height:1000});await page.goto(origin+'/territorio/resultados-electorales',{waitUntil:'networkidle2',timeout:60000});
 if(['no-permission','impersonated'].includes(mode)){assert.equal(calls.length,0);assert.equal(await page.$(selected),null);}
 else if(['empty','list-error','invalid-response'].includes(mode)){await waitText(mode==='empty'?'No hay conjuntos territoriales asociados':'No pudimos comprobar los contextos');assert.equal(await page.$(selected),null);assert.equal(calls.some(p=>p.endsWith('/context')||p.endsWith('/results')),false);}
 else{
  await page.waitForSelector(panel+' article');assert.equal(calls.some(p=>p.endsWith('/context')||p.endsWith('/results')),false);const initial=await page.$eval(panel,n=>n.innerText);assert.ok(initial.includes('Fuentes y publicación en preparación'));assert.equal(await page.$(panel+' article[aria-label="Contexto MEDELLIN_ALCALDIA_2023"] button'),null);
  if(mode==='pagination'){await click('Cargar más territorios',panel);await waitText('Territorio ficticio');assert.equal(await page.$$eval(panel+' article',rows=>rows.length),3);assert.equal(calls.some(p=>p.includes('afterCode=NEIVA_CONCEJO_2023')),true);}
  else if(!['contexts','mobile'].includes(mode)){
   await click('Consultar resultados de Neiva',panel);
   if(['selection-error','revoked-before-opening'].includes(mode)){await waitText(mode==='selection-error'?'No pudimos confirmar el acceso':'La disponibilidad cambió');assert.equal(await page.$(selected),null);assert.equal(calls.some(p=>p.endsWith('/context')||p.endsWith('/results')),false);}
   else if(mode==='cancel-selection'){await waitText('Comprobando acceso y publicación');await click('Cancelar consulta',panel);await new Promise(resolve=>setTimeout(resolve,1800));assert.equal(await page.$(selected),null);assert.equal(calls.some(p=>p.endsWith('/context')||p.endsWith('/results')),false);}
   else{await page.waitForSelector(selected+' table:has(caption)');assert.equal(await page.$$eval(selected+' table:has(caption) tbody tr',rows=>rows.length),2);assert.ok((await page.$eval(selected,n=>n.innerText)).includes('Neiva, Huila'));if(mode==='read-only')await waitText('Período de solo lectura.');
    if(mode==='filters-close-results'){await page.select(panel+' select[aria-label="Cargo territorial"]','ALCALDIA');assert.equal(await page.$(selected),null);assert.equal(await page.$$eval(panel+' article',rows=>rows.length),1);await page.select(panel+' select[aria-label="Elección territorial"]','CO_TERRITORIALES_2023');assert.equal(await page.$eval(panel+' select[aria-label="Cargo territorial"]',n=>n.value),'');}
    if(mode==='revoked-results'){changed=true;await click('Actualizar consulta',selected);await waitText('El acceso territorial aún no está acreditado.');assert.equal(await page.$(selected+' table'),null);}
    if(mode==='refresh-failure-clears-results'){changed=true;await click('Actualizar disponibilidad',panel);await waitText('No pudimos comprobar los contextos');assert.equal(await page.$(selected),null);}
   }
  }
  if(mode==='mobile'){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await(await page.$(panel)).screenshot({path:path.join(output,'n5-mobile.png')});}
 }
 assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);scenarios.push({mode,noWrites:true,apiMocked:true,requests:calls.length,listQueries:listCalls});await session.close();
}
const evidence={result:'N5_TERRITORIAL_EXPLORER_BROWSER_VERIFIED',checkedAt:new Date().toISOString(),responseChecks:checks,scenarios,scenarioCount:scenarios.length,compiledNext:true,apiMocked:true,syntheticData:true,noJavascriptErrors:true,noApiWrites:true,productionRequests:0,privateFilesDownloaded:false};fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
