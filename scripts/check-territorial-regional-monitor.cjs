/* eslint-disable @typescript-eslint/no-require-imports -- Local synthetic browser harness, no live service. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),ts=require('typescript'),{pathToFileURL}=require('node:url');
const fixture=require('./fixtures/territorial-regional-monitor.cjs'),plans=require('./fixtures/territorial-monitoring-plans.cjs');
const compiled=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api/territorial-regional-monitor.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,m={exports:{}};
new Function('module','exports','require',compiled)(m,m.exports,()=>({}));const validate=m.exports.validateRegionalMonitor;let checks=0;
assert.doesNotThrow(()=>validate(fixture.configuration(),fixture.code));checks++;assert.doesNotThrow(()=>validate(fixture.changed(),fixture.code));checks++;
for(const mutate of [f=>{f.dataset.code='OTHER';},f=>{f.current.datasetCode='OTHER';},f=>{f.current.enabled='true';},f=>{f.current.enabled=true;},f=>{f.workerEnabled='false';},f=>{f.readiness.planRevision=null;},f=>{f.policy.globalConcurrency=2;},f=>{f.policy.timeZone='UTC';},f=>{f.adapter='UNKNOWN';},f=>{f.current.nextRunAt='bad';},f=>{f.current.nextRunAt=new Date().toISOString();},f=>{f.runs=[{}];},f=>{f.alerts=[{}];},f=>{f.history=[{}];}]){const f=fixture.configuration();mutate(f);assert.throws(()=>validate(f,fixture.code));checks++;}
for(const mutate of [f=>{f.runs[0].datasetCode='OTHER';},f=>{f.runs[0].attempt=3;},f=>{f.runs[0].observations[0].severity='GOOD';},f=>{f.runs[0].observations[0].observedHash='bad';}]){const f=fixture.changed();mutate(f);assert.throws(()=>validate(f,fixture.code));checks++;}
if(process.env.N63_BROWSER_TEST!=='true'){console.log(JSON.stringify({result:'N63_REGIONAL_MONITOR_RESPONSES_VERIFIED',checks}));process.exit(0);}
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://127.0.0.1:3053';assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const backend=process.env.TERRITORIAL_TEST_BACKEND,output=process.env.N63_EVIDENCE_DIR;assert.ok(backend&&output);fs.mkdirSync(output,{recursive:true});let browser;
(async()=>{
 const {default:puppeteer}=await import(pathToFileURL(path.join(backend,'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href);browser=await puppeteer.launch({headless:true});const scenarios=[];
 for(const mode of ['off','activate','active','deactivate-global-off','blocked','changed','uncertain','accepted-read-failure','conflict','refresh-failure','invalid-response','legacy','scoped','mobile']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],calls=[];let state=fixture.configuration(),committed=false,failOnce=true,reads=0;
  if(['active','deactivate-global-off','blocked','changed'].includes(mode))state=fixture.changed();
  if(['activate','uncertain','accepted-read-failure','conflict'].includes(mode))state.workerEnabled=true;
  if(mode==='deactivate-global-off')state.workerEnabled=false;
  if(mode==='blocked'){state.current.blockedReason='SOURCE_CHANGED';state.current.nextRunAt=null;state.readiness={ready:false,planRevision:null,blocker:'SOURCE_CHANGED'};}
  await context.setCookie({name:'auth-token',value:'synthetic-only',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(()=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'synthetic-only',user:{id:'11111111-1111-4111-8111-111111111111',email:'operator@example.test',fullName:'Synthetic operator',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:true,canDelete:false}]},impersonation:null},version:0})));
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});await page.setCacheEnabled(false);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
  page.on('request',async request=>{try{
   const u=new URL(request.url());if(u.origin===origin||['data:','blob:'].includes(u.protocol))return request.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, OPTIONS','cache-control':'no-store'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(!['fetch','xhr'].includes(request.resourceType()))return request.abort();
   const respond=(body,status=200)=>request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
   if(u.pathname==='/platform/access/context')return respond({enabled:true,allOrganizations:mode!=='scoped',capabilities:['CATALOG_MANAGE'],principal:false,organizationIds:[]});
   if(u.pathname==='/platform/territorial-data/registry')return respond(plans.registry());
   if(u.pathname.startsWith('/platform/territorial-data/monitoring-plans/')){
    if(mode==='legacy')return respond(plans.legacy());
    const p=plans.regional();p.saved=true;p.preparedNow=true;p.reviewBlockers=[];p.current={...p.current,revision:1,state:'PREPARED',responsibleId:plans.owner,responsibleEmail:'responsible@example.test',reviewDueAt:new Date(Date.now()+86400000).toISOString(),sources:[{id:plans.source,revision:1}]};p.activationBlockers=[{code:'REGIONAL_EXECUTOR_PENDING',message:'Esta política no inicia comprobaciones. Consulta el control de ejecución regional para revisar sus requisitos y estado de activación.'}];return respond(p);
   }
   if(u.pathname.startsWith('/platform/territorial-data/regional-monitor/')){
    assert.equal(u.pathname.split('/').at(-1),fixture.code);calls.push(request.method());
    if(request.method()==='POST'){
     const body=JSON.parse(request.postData());writes.push(body);
     if(mode==='conflict')return respond({message:'El plan cambió. Actualiza antes de activar.'},409);
     if(!committed){state.current={...state.current,revision:state.current.revision+1,enabled:body.enabled,planRevision:body.planRevision,nextRunAt:body.enabled?new Date(Date.now()+86400000).toISOString():null,blockedReason:null,updatedAt:new Date().toISOString()};state.history=[{id:'synthetic-event',revision:state.current.revision,actorEmail:'operator@example.test',reason:body.reason,createdAt:new Date().toISOString(),snapshot:{enabled:body.enabled,planRevision:body.planRevision}}];committed=true;}
     if(mode==='uncertain'&&failOnce){failOnce=false;return respond({message:'No se pudo confirmar el control.'},503);}
     return respond({datasetCode:fixture.code,revision:state.current.revision,replayed:writes.length>1});
    }
    reads++;
    if(mode==='refresh-failure'&&reads>1||mode==='accepted-read-failure'&&committed&&failOnce){failOnce=false;return respond({message:'No se pudo consultar el ejecutor.'},503);}
    const response=structuredClone(state);if(mode==='invalid-response')response.dataset.code='OTHER';return respond(response);
   }
   if(request.method()!=='GET')throw Error('Unexpected write '+u.pathname);
   if(u.pathname.startsWith('/platform/territorial-data/health'))throw Error('Unexpected legacy health request '+u.pathname);
   return respond(u.pathname==='/branding'?{applicationName:'Zyron',primaryColor:'#1E4FD8',secondaryColor:'#22B8CF',accentColor:'#22B8CF'}:[]);
  }catch(e){errors.push(e.message);if(!request.isInterceptResolutionHandled())await request.abort();}});
  const wait=async text=>{try{await page.waitForFunction(t=>document.body.innerText.includes(t),{},text);}catch{throw Error(mode+': '+text+'; '+(await page.$eval('body',n=>n.innerText)).slice(-1800));}};
  const click=async text=>{const handle=await page.evaluateHandle(t=>Array.from(document.querySelectorAll('button')).find(b=>b.textContent===t),text);assert.ok(handle.asElement(),mode+': missing '+text);await page.waitForFunction(n=>!n.disabled,{},handle.asElement());await handle.asElement().click();await handle.dispose();};
  const buttonDisabled=async text=>page.$$eval('button',(nodes,text)=>nodes.find(b=>b.textContent===text)?.disabled,text);
  await page.goto(origin+'/platform/territorial-monitoring?dataset='+(mode==='legacy'?'NEIVA_CONCEJO_2023':fixture.code),{waitUntil:'networkidle2',timeout:60000});
  if(mode==='scoped'){await wait('Se requiere gestión de catálogo');assert.equal(calls.length,0);}
  else if(mode==='legacy'){await wait('Neiva utiliza su programación existente');assert.equal(calls.length,0);}
  else if(mode==='invalid-response'){await wait('No se pudo cargar esta sección');assert.equal(await page.$('section[aria-label="Ejecución regional de '+fixture.code+'"]'),null);}
  else{
   await wait('Ejecución automática regional');
   if(mode==='off'||mode==='mobile'){await wait('Ejecutor global desactivado');assert.equal(await buttonDisabled('Activar ejecución regional'),true);assert.equal(writes.length,0);}
   if(mode==='active')await wait('Programación regional activada');
   if(mode==='blocked'){await wait('Detenida para revisión');assert.equal(await buttonDisabled('Confirmar de nuevo ejecución regional'),true);}
   if(mode==='changed'){await wait('Contenido modificado');await wait('responsible@example.test');await page.click('section[aria-label="Historial de ejecuciones regionales"] summary');await wait('Completada');}
   if(mode==='refresh-failure'){await click('Actualizar ejecutor regional');await wait('Estado por actualizar');assert.equal(await buttonDisabled('Activar ejecución regional'),true);}
   if(['activate','deactivate-global-off','uncertain','accepted-read-failure','conflict'].includes(mode)){
    await page.$eval('input[aria-label="Motivo de ejecución regional"]',el=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el,'Confirmar fuentes y horario para ensayo local.');el.dispatchEvent(new Event('input',{bubbles:true}));});
    if(mode!=='deactivate-global-off')await page.click('input[aria-label="Confirmar ejecución regional"]');
    await click(mode==='deactivate-global-off'?'Desactivar ejecución regional':'Activar ejecución regional');
    if(mode==='conflict'){await wait('El plan cambió. Actualiza antes de activar.');assert.equal(writes.length,1);await wait('Estado por actualizar');}
    else{
     if(mode==='uncertain'||mode==='accepted-read-failure'){await wait('Hay una confirmación pendiente');await click('Reintentar control regional');}
     await wait('Control guardado.');assert.equal(state.current.enabled,mode!=='deactivate-global-off');assert.equal(state.history.length,1);
     if(mode==='uncertain'||mode==='accepted-read-failure'){assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);}
    }
   }
   if(mode==='mobile'){assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:path.join(output,'regional-executor-mobile.png'),fullPage:true});}
   if(mode==='changed')await page.screenshot({path:path.join(output,'regional-executor-desktop.png'),fullPage:true});
  }
  assert.deepEqual(errors,[]);scenarios.push({mode,reads,writes:writes.length,productionRequests:0});await context.close();
 }
 const evidence={result:'N63_REGIONAL_MONITOR_BROWSER_VERIFIED',checkedAt:new Date().toISOString(),responseChecks:checks,scenarios,compiledNext:true,apiMocked:true,syntheticData:true,noJavascriptErrors:true,productionRequests:0,noActualMonitoringActivation:true};fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2)+'\n');console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
