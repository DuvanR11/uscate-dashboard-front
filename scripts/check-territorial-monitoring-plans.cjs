/* eslint-disable @typescript-eslint/no-require-imports -- Controlled fixtures, no live API. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{pathToFileURL}=require('node:url');
const fixture=require('./fixtures/territorial-monitoring-plans.cjs');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api/territorial-monitoring-plans.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,target={exports:{}};
new Function('module','exports','require',compiled)(target,target.exports,()=>({}));const validate=target.exports.validateMonitoringConfiguration;let checks=0;
assert.doesNotThrow(()=>validate(fixture.regional(),fixture.code));checks++;assert.doesNotThrow(()=>validate(fixture.legacy(),'NEIVA_CONCEJO_2023'));checks++;
for(const mutate of [p=>{p.dataset.code='OTHER';},p=>{p.mode='LEGACY_NEIVA';},p=>{p.current.enabled=true;},p=>{p.activationAvailable=true;},p=>{p.activationBlockers=[];},p=>{p.current.datasetCode='OTHER';},p=>{p.current.hour=24;},p=>{p.current.maxRetries=2;},p=>{p.current.cadence='DAILY';p.current.weekDay=1;},p=>{p.current.reviewDueAt='bad';},p=>{p.preparedNow=true;},p=>{p.saved=true;},p=>{p.current.sources=Array(21).fill({id:fixture.source,revision:1});},p=>{p.current.sources=[{id:fixture.source,revision:0}];},p=>{p.sources.push(p.sources[0]);},p=>{p.operators=null;},p=>{p.history=[{id:'x'}];},p=>{p.policy.timeZone='UTC';},p=>{p.policy.maxSources=100;},p=>{p.reviewBlockers=[null];}]){const p=fixture.regional();mutate(p);assert.throws(()=>validate(p,fixture.code));checks++;}
for(const mutate of [p=>{p.legacy.current.pilot='OTHER';},p=>{p.dataset.territoryCode='05001';},p=>{p.legacy.timeZone='UTC';}]){const p=fixture.legacy();mutate(p);assert.throws(()=>validate(p,'NEIVA_CONCEJO_2023'));checks++;}
if(process.env.N62_BROWSER_TEST!=='true'){console.log(JSON.stringify({result:'N62_MONITORING_RESPONSES_VERIFIED',checks}));process.exit(0);}
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://127.0.0.1:3052';assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const backend=process.env.TERRITORIAL_TEST_BACKEND||path.resolve(__dirname,'../../api-uscate-back'),output=process.env.N62_EVIDENCE_DIR||path.resolve(__dirname,'../../.tmp/n62-browser');fs.mkdirSync(output,{recursive:true});let browser;
(async()=>{
 const {default:puppeteer}=await import(pathToFileURL(path.join(backend,'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href);browser=await puppeteer.launch({headless:true});const scenarios=[];
 for(const mode of ['choose','draft','prepare','weekly','uncertain','acknowledged-read-failure','conflict','refresh-failure','changed-source','archived','legacy','switch-context','invalid-response','scoped','no-capability','mobile']){
  const session=await browser.createBrowserContext(),page=await session.newPage(),errors=[],posts=[],calls=[];let state=fixture.regional(),committed=false,failOnce=true,reads=0;
  if(mode==='archived')state.dataset.state='ARCHIVED';
  if(mode==='changed-source'){state.current={...state.current,revision:1,state:'PREPARED',responsibleId:fixture.owner,responsibleEmail:'operator@example.test',reviewDueAt:new Date(Date.now()+86400000).toISOString(),sources:[{id:fixture.source,revision:1}]};state.saved=true;state.sources[0].revision=2;state.sources[0].reviewed=false;state.reviewBlockers=[{code:'SOURCE_CHANGED',message:'Cambió una fuente seleccionada.'}];}
  await session.setCookie({name:'auth-token',value:'synthetic-only',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(()=>{localStorage.setItem('auth-storage',JSON.stringify({state:{token:'synthetic-only',user:{id:'11111111-1111-4111-8111-111111111111',email:'operator@example.test',fullName:'Synthetic operator',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:true,canDelete:false}]},impersonation:null},version:0}));});
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});await page.setCacheEnabled(false);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
  page.on('request',async request=>{try{
   const u=new URL(request.url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return request.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, OPTIONS','cache-control':'no-store'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(!['fetch','xhr'].includes(request.resourceType()))return request.abort();
   const respond=(body,status=200)=>request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/platform/access/context')return respond({enabled:true,allOrganizations:mode!=='scoped',capabilities:mode==='no-capability'?[]:['CATALOG_MANAGE'],principal:false,organizationIds:[]});
   if(u.pathname==='/platform/territorial-data/registry')return respond(fixture.registry());
   if(u.pathname.startsWith('/platform/territorial-data/monitoring-plans/')){
    calls.push({method:request.method(),path:u.pathname});const code=u.pathname.split('/').at(-1);
    if(request.method()==='POST'){
     assert.equal(code,fixture.code);const body=JSON.parse(request.postData());posts.push(body);assert.equal(body.enabled,false);
     if(mode==='conflict')return respond({message:'La fuente cambió. Actualiza el plan.'},409);
     if(!committed){state={...state,current:{...state.current,...body,datasetCode:fixture.code,revision:1,state:body.action==='PREPARE'?'PREPARED':'DRAFT',responsibleEmail:body.responsibleId?'operator@example.test':null,updatedAt:new Date().toISOString()},saved:true,preparedNow:body.action==='PREPARE',reviewBlockers:body.action==='PREPARE'?[]:state.reviewBlockers,history:[{id:'saved-event',revision:1,action:body.action,actorEmail:'operator@example.test',reason:body.reason,createdAt:new Date().toISOString()}]};committed=true;}
     if(mode==='uncertain'&&failOnce){failOnce=false;return respond({message:'No se pudo confirmar el guardado.'},503);}
     return respond({datasetCode:fixture.code,revision:1,replayed:posts.length>1,enabled:false});
    }
    assert.equal(request.method(),'GET');reads++;
    if(mode==='refresh-failure'&&reads>1||mode==='acknowledged-read-failure'&&committed&&failOnce){failOnce=false;return respond({message:'No se pudo consultar la configuración.'},503);}
    if(code==='NEIVA_CONCEJO_2023')return respond(fixture.legacy());
    assert.equal(code,fixture.code);const response=structuredClone(state);if(mode==='invalid-response')response.current.enabled=true;return respond(response);
   }
   if(request.method()!=='GET')throw Error('Unexpected write '+u.pathname);
   if(u.pathname.startsWith('/platform/territorial-data/health'))throw Error('Unexpected Neiva schedule request '+u.pathname);
   return respond(u.pathname==='/branding'?{applicationName:'Zyron',primaryColor:'#1E4FD8',secondaryColor:'#22B8CF',accentColor:'#22B8CF'}:[]);
  }catch(e){errors.push(e.message);if(!request.isInterceptResolutionHandled())await request.abort();}});
  const wait=async text=>{try{await page.waitForFunction(t=>document.body.innerText.includes(t),{},text);}catch{throw Error(mode+': '+text+'; '+(await page.$eval('body',n=>n.innerText)).slice(-1600));}};
  async function click(text){const handle=await page.evaluateHandle(t=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===t),text);assert.ok(handle.asElement(),mode+': missing '+text);await page.waitForFunction(n=>!n.disabled,{},handle.asElement());await handle.asElement().click();await handle.dispose();}
  async function fill(label,value){await page.$eval('[aria-label="'+label+'"]',(el,value)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));},value);}
  const initial=['choose','switch-context'].includes(mode)?'':mode==='legacy'?'NEIVA_CONCEJO_2023':fixture.code;
  await page.goto(origin+'/platform/territorial-monitoring'+(initial?'?dataset='+initial:''),{waitUntil:'networkidle2',timeout:60000});
  if(['scoped','no-capability'].includes(mode)){await wait('Se requiere gestión de catálogo');assert.equal(calls.length,0);}
  else{
   await page.waitForSelector('select[aria-label="Conjunto del monitoreo"]');
   if(mode==='choose'){assert.equal(calls.length,0);await page.select('select[aria-label="Conjunto del monitoreo"]',fixture.code);}
   if(mode==='switch-context'){await page.select('select[aria-label="Conjunto del monitoreo"]','NEIVA_CONCEJO_2023');await wait('Neiva utiliza su programación existente');await page.select('select[aria-label="Conjunto del monitoreo"]',fixture.code);await wait('Comprobaciones desactivadas');assert.equal(await page.$('section[aria-label="Programación existente de Neiva"]'),null);}
   else if(mode==='invalid-response'){await wait('No se pudo cargar esta sección');assert.equal(await page.$('section[aria-label="Monitoreo de '+fixture.code+'"]'),null);}
   else if(mode==='legacy'){await wait('Neiva utiliza su programación existente');await wait('Estado: Activada');assert.equal(calls.length,1);assert.equal(await page.$eval('input[aria-label="Motivo regional"]',()=>true).catch(()=>false),false);}
   else{
    await wait('Comprobaciones desactivadas');
    if(mode==='archived'){await wait('La configuración está disponible en lectura.');assert.equal(await page.$('input[aria-label="Motivo regional"]'),null);}
    else if(mode==='changed-source'){await wait('La fuente cambió. Desmarca y vuelve a seleccionarla');assert.equal(await page.$eval('button[value="PREPARE"]',n=>n.disabled),true);}
    else if(mode==='refresh-failure'){await click('Actualizar plan');await wait('No se pudo consultar la configuración.');await wait('Estado por actualizar');assert.equal(await page.$eval('button[value="PREPARE"]',n=>n.disabled),true);assert.equal(await page.$eval('button[value="SAVE_DRAFT"]',n=>n.disabled),true);}
    else if(['draft','prepare','weekly','uncertain','acknowledged-read-failure','conflict'].includes(mode)){
     await fill('Motivo regional','Preparar política regional para ensayo controlado.');
     if(['prepare','weekly'].includes(mode)){
      await page.select('select[aria-label="Responsable regional"]',fixture.owner);await page.click('input[aria-label="Seleccionar Original ficticio de resultados"]');
      const future=new Date(Date.now()+3*86400000-5*3600000).toISOString().slice(0,16);await fill('Fecha límite regional',future);
      if(mode==='weekly'){await page.select('select[aria-label="Frecuencia regional"]','WEEKLY');await page.select('select[aria-label="Día regional"]','3');await fill('Hora regional','13:25');}
     }
     await click(['prepare','weekly'].includes(mode)?'Guardar y preparar configuración':'Guardar borrador regional');
     if(mode==='conflict'){await wait('La fuente cambió. Actualiza el plan.');assert.equal(posts.length,1);await wait('Estado por actualizar');}
     else{
      if(mode==='uncertain'||mode==='acknowledged-read-failure'){await wait('Hay una solicitud sin confirmar');await click('Reintentar guardado regional');}
      await wait(['prepare','weekly'].includes(mode)?'Configuración preparada para revisión.':'Borrador guardado.');assert.equal(state.history.length,1);if(mode==='uncertain'||mode==='acknowledged-read-failure'){assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);}
      if(mode==='weekly'){assert.equal(posts[0].weekDay,3);assert.equal(posts[0].hour,13);assert.equal(posts[0].minute,25);}
     }
    }
    if(mode==='mobile'){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'regional-monitoring-mobile.png'),fullPage:true});}
    if(mode==='draft')await page.screenshot({path:path.join(output,'regional-monitoring-desktop.png'),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);assert.ok(posts.every(p=>p.enabled===false));scenarios.push({mode,regionalReads:reads,writes:posts.length,externalRequests:0});await session.close();
 }
 const evidence={result:'N62_MONITORING_BROWSER_VERIFIED',checkedAt:new Date().toISOString(),responseChecks:checks,scenarios,compiledNext:true,apiMocked:true,syntheticData:true,noJavascriptErrors:true,productionRequests:0,noNewScheduleActivation:true};fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
