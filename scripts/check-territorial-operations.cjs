/* eslint-disable @typescript-eslint/no-require-imports -- Local fixture and browser verification. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),ts=require('typescript');
const fixture=require('./fixtures/territorial-operations.cjs');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api/territorial-operations.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,target={exports:{}};
new Function('module','exports','require',compiled)(target,target.exports,()=>({}));
const validate=target.exports.validateTerritorialOperations;let checks=0;
assert.doesNotThrow(()=>validate(fixture.page()));checks++;
for(const mutate of [p=>{p.checkedAt='bad';},p=>{p.items.push(p.items[0]);},p=>{p.cacheSeconds=0;},p=>{p.pageSize=100;},p=>{p.next='../';},
 p=>{p.next='NEIVA_CONCEJO_2023';},p=>{p.items[0].sources.PENDING_ORIGINAL=-1;},p=>{p.items[0].documentary=null;},
 p=>{p.items[0].territory=null;},p=>{p.items[0].warnings=[{code:'X'}];},p=>{p.items[0].changedDocumentaryCases=-1;},
 p=>{p.reports.states[0].oldestAt='bad';},p=>{p.reports.states[0].expiredLeases=-1;},p=>{p.reports.workerEnabled='true';},
 p=>{p.remoteMonitoring.pilot='MEDELLIN';},p=>{p.remoteMonitoring.schedule.hour=99;},p=>{p.remoteMonitoring.lastRun.requestedAt='bad';},
 p=>{p.remoteMonitoring.stale=null;},p=>{p.limitations=[null];},p=>{p.items=Array.from({length:21},(_,i)=>fixture.item('QA_'+i));},
]){const p=fixture.page();mutate(p);assert.throws(()=>validate(p));checks++;}
if(process.env.N6_BROWSER_TEST!=='true'){console.log(JSON.stringify({result:'N6_OPERATIONS_RESPONSE_VERIFIED',checks}));process.exit(0);}
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://127.0.0.1:3051';assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const backend=process.env.TERRITORIAL_TEST_BACKEND||path.resolve(__dirname,'../../api-uscate-back'),output=process.env.N6_EVIDENCE_DIR||path.resolve(__dirname,'../../.tmp/n6-browser');fs.mkdirSync(output,{recursive:true});let browser;
(async()=>{
 const {default:puppeteer}=await import(pathToFileURL(path.join(backend,'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href);
 browser=await puppeteer.launch({headless:true});const scenarios=[];
 for(const mode of ['dashboard','mobile','empty','error-retry','refresh-error','pagination','invalid-response','scoped','no-capability','disabled']){
  const session=await browser.createBrowserContext(),page=await session.newPage(),errors=[],calls=[],writes=[];let apiCalls=0;
  await session.setCookie({name:'auth-token',value:'synthetic-only',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('auth-storage',JSON.stringify({state:{token:'synthetic-only',user:{id:'11111111-1111-4111-8111-111111111111',email:'operator@example.test',fullName:'Synthetic operator',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:true,canDelete:false}]},impersonation:null},version:0}));});
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});await page.setCacheEnabled(false);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
  page.on('request',async request=>{try{
   const u=new URL(request.url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return request.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET, OPTIONS','cache-control':'no-store'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});
   if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();
   if(request.method()!=='GET'){writes.push(u.pathname);return request.abort();}
   const respond=(body,status=200)=>request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/platform/access/context')return respond({enabled:mode!=='disabled',allOrganizations:mode!=='scoped',capabilities:mode==='no-capability'?[]:['CATALOG_MANAGE'],principal:false,organizationIds:[]});
   if(u.pathname==='/platform/territorial-data/operations'){
    calls.push(u.pathname+u.search);apiCalls++;
    if(mode==='error-retry'&&apiCalls===1||mode==='refresh-error'&&apiCalls>1)return respond({message:'Fallo de lectura de prueba'},503);
    const data=fixture.page();if(mode==='empty')data.items=[];
    if(mode==='invalid-response')data.items[0].sources.DOCUMENT_REVIEWED=-1;
    if(mode==='pagination'){
     if(u.searchParams.has('afterCode'))data.items=[fixture.item('ZZ_FINAL')];
     else{data.items=Array.from({length:20},(_,i)=>fixture.item('QA_'+String(i).padStart(3,'0')));data.next='QA_019';}
    }
    return respond(data);
   }
   if(u.pathname.startsWith('/platform/territorial-data/'))throw Error('Unexpected operation '+u.pathname);
   return respond(u.pathname==='/branding'?{applicationName:'Zyron',primaryColor:'#1E4FD8',secondaryColor:'#22B8CF',accentColor:'#22B8CF'}:[]);
  }catch(e){errors.push(e.message);if(!request.isInterceptResolutionHandled())await request.abort();}});
  const wait=async text=>{try{return await page.waitForFunction(t=>document.body.innerText.includes(t),{},text);}catch{throw Error(mode+': '+text+'; '+(await page.$eval('body',n=>n.innerText)).slice(-1800));}};
  async function click(label){const handle=await page.evaluateHandle(t=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===t),label);assert.ok(handle.asElement(),'Missing '+label);await page.waitForFunction(n=>!n.disabled,{},handle.asElement());await handle.asElement().click();await handle.dispose();}
  await page.goto(origin+'/platform/territorial-operations',{waitUntil:'networkidle2',timeout:60000});
  if(['scoped','no-capability','disabled'].includes(mode)){await wait('Se requiere gestión del catálogo');assert.equal(calls.length,0);assert.equal(await page.$('a[href="/platform/territorial-operations"]'),null);}
  else if(mode==='invalid-response'){await wait('No se pudo cargar esta sección');assert.equal(await page.$('article'),null);}
  else{
   if(mode==='error-retry'){await wait('Fallo de lectura de prueba');await click('Reintentar');}
   if(mode==='empty')await wait('No hay conjuntos en esta página');
   else if(mode==='pagination'){
    await page.waitForSelector('article[aria-label="Operación QA_019"]');await click('Página siguiente');await page.waitForSelector('article[aria-label="Operación ZZ_FINAL"]');
    assert.ok(calls.some(p=>p.includes('afterCode=QA_019')));assert.equal(await page.$('article[aria-label="Operación QA_000"]'),null);
    await click('Página anterior');await page.waitForSelector('article[aria-label="Operación QA_000"]');
   }else{
    await page.waitForSelector('article[aria-label="Operación NEIVA_CONCEJO_2023"]');await wait('Con cambios en sus antecedentes: 1');await wait('1 trabajos con concesión vencida');await wait('Comprobaciones remotas: solo Neiva');
    if(mode==='refresh-error'){await click('Actualizar estado');await wait('Fallo de lectura de prueba');assert.equal(await page.$('article'),null);}
   }
   if(mode==='mobile'){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'operations-mobile.png'),fullPage:true});}
   if(mode==='dashboard')await page.screenshot({path:path.join(output,'operations-desktop.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);scenarios.push({mode,operationsReads:calls.length,noWrites:true});await session.close();
 }
 const evidence={result:'N6_OPERATIONS_BROWSER_VERIFIED',checkedAt:new Date().toISOString(),responseChecks:checks,scenarios,compiledNext:true,apiMocked:true,syntheticData:true,noJavascriptErrors:true,productionRequests:0};
 fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
