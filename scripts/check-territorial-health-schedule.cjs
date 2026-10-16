/* eslint-disable @typescript-eslint/no-require-imports -- Full browser fixture; no live API or public sources. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {scheduleFixture}=require('./fixtures/territorial-health-schedule.cjs'),{healthFixture}=require('./fixtures/territorial-health.cjs'),{workflowFixture}=require('./fixtures/territorial-geographic-review.cjs');
const validation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-cierre-2026-10-15.json'),'utf8'));
const draft=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'),'utf8'));draft.contentHash=validation.draftContentHash;
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3032';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const mode of (process.env.TERRITORIAL_SCHEDULE_MODES?.split(',')||['default','activate','pause','blocked','weekly','uncertain','refresh-failure','conflict','mobile','worker-disabled','reader','read-failure','remote-change'])){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],sourceCalls=[];let reads=0,failed=false,committed=false;const state=scheduleFixture(),owner=state.operators[0];
  if(['pause','blocked','remote-change'].includes(mode))Object.assign(state.current,{enabled:true,revision:1,responsibleId:owner.id,responsibleEmail:owner.email,nextRunAt:'2026-10-20T14:00:00Z'});
  if(mode==='blocked')Object.assign(state.current,{blockedReason:'CONFIG_CHANGED',nextRunAt:null,approvedConfigHash:'f'.repeat(64)});
  if(mode==='worker-disabled')state.workerEnabled=false;
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(mode=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'49abaa20-76e4-4d13-b5ac-543c0c64d98a',organizationId:'platform',fullName:'Fixture',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:mode!=='reader',canDelete:false}]},impersonation:null},version:0})),mode);
  if(mode==='remote-change')await page.evaluateOnNewDocument(()=>{const original=window.setInterval.bind(window);window.setInterval=(fn,ms,...args)=>original(fn,ms===60000?250:ms,...args);});
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async request=>{
   if(request.url().startsWith(origin))return request.continue();
   const url=new URL(request.url());if(url.hostname.includes('registraduria.gov.co')||url.hostname.includes('alcaldianeiva.gov.co'))sourceCalls.push(url.hostname);
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();let body=null,status=200;
   if(['/legal/pending','/permissions/modules','/platform/territorial-data'].includes(url.pathname))body=[];
   if(url.pathname==='/platform/access/context')body={enabled:true,principal:false,capabilities:['CATALOG_MANAGE'],organizationIds:[],allOrganizations:true};
   if(url.pathname==='/organizations/me')body={id:'platform',name:'Fixture'};if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname.endsWith('/geography/config'))body={identity:{},current:null,history:[],municipalities:[]};
   if(url.pathname.endsWith('/geography/crosswalk'))body=draft;if(url.pathname.endsWith('/crosswalk/validation'))body=validation;if(url.pathname.endsWith('/geography/review-workflow'))body=workflowFixture(validation);
   if(url.pathname==='/platform/territorial-data/health')body=healthFixture();
   if(url.pathname==='/platform/territorial-data/health/schedule'){
    if(request.method()==='GET'){
     reads++;if(mode==='remote-change'&&reads>=2)Object.assign(state.current,{revision:2,hour:11});body=state;
     if((mode==='read-failure'&&!failed)||(mode==='refresh-failure'&&committed&&reads===2)){failed=true;status=503;body={message:'No disponible'};}
    }else{
     assert.equal(request.method(),'POST');const command=JSON.parse(request.postData());writes.push(command);
     if(mode==='conflict'&&!failed){failed=true;Object.assign(state.current,{revision:1,hour:10,enabled:true,responsibleId:owner.id,responsibleEmail:owner.email});status=409;body={message:'La programación cambió. Actualiza antes de guardar.'};}
     else{
      if(!committed){Object.assign(state.current,command,{revision:command.expectedRevision+1,responsibleEmail:command.responsibleId?owner.email:null,approvedConfigHash:state.currentConfigHash,blockedReason:null,nextRunAt:command.enabled?'2026-10-20T14:00:00Z':null});state.history.unshift({id:'event',revision:state.current.revision,actorEmail:owner.email,reason:command.reason,snapshot:{...state.current},createdAt:new Date().toISOString()});committed=true;}
      if(mode==='uncertain'&&!failed){failed=true;return request.abort('failed');}
      body={revision:state.current.revision,replayed:writes.length>1};
     }
    }
   }
   return request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/territorial-data',{waitUntil:'networkidle2',timeout:90000});
  const s='section[aria-label="Programación de comprobaciones territoriales"]';
  if(mode==='reader'){await page.waitForFunction(()=>document.body.innerText.includes('Se requiere acceso interno global'));assert.deepEqual(writes,[]);}
  else{
   if(mode==='read-failure'){await page.waitForSelector(s+' [role="alert"]');await page.click(s+' button');}
   await page.waitForSelector(s+' form');const text=await page.$eval(s,n=>n.innerText);
   const refresh=async()=>{const b=await page.$(s+' button:first-of-type');await b.evaluate(n=>n.scrollIntoView({block:'center'}));await b.click();};
   const save=async()=>{const b=await page.$(s+' button[type="submit"]');await b.evaluate(n=>n.scrollIntoView({block:'center'}));await b.click();};
   const reason=s+' input[aria-label="Motivo de programación"]';
   if(mode==='remote-change'){
    await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Otro operador cambió'),{},s);await page.type(reason,'Borrador local sin confirmar.');
    assert.equal(await page.$eval(s+' input[type="time"]',n=>n.value),'09:00');assert.equal(await page.$eval(s+' button[type="submit"]',n=>n.disabled),true);
    await refresh();await page.waitForFunction(s=>document.querySelector(s+' input[type="time"]').value==='11:00',{},s);assert.equal(writes.length,0);
   }
   else if(mode==='default'||mode==='read-failure'){assert.equal(await page.$eval(s+' input[type="time"]',n=>n.value),'09:00');assert.equal(await page.$eval(s+' input[type="checkbox"]',n=>n.checked),false);assert.equal(await page.$eval(s+' select[aria-label="Responsable automático"]',n=>n.value),'');assert.equal(writes.length,0);}
   else{
    if(mode==='blocked')assert.ok(text.includes('Las fuentes o controles cambiaron'));
    if(!['pause','blocked','remote-change'].includes(mode))await page.click(s+' input[type="checkbox"]');
    if(mode==='pause')await page.click(s+' input[type="checkbox"]');
    await page.select(s+' select[aria-label="Responsable automático"]',owner.id);await page.type(reason,'Programación de prueba aprobada.');
    if(mode==='weekly'){
     await page.select(s+' select[aria-label="Frecuencia automática"]','WEEKLY');await page.select(s+' select[aria-label="Día automático"]','5');
     await page.$eval(s+' input[type="time"]',n=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'10:30');n.dispatchEvent(new Event('input',{bubbles:true}));});
     const boxes=await page.$$(s+' input[type="checkbox"]');await boxes[1].click();
    }
    if(mode==='worker-disabled'){assert.equal(await page.$eval(s+' button[type="submit"]',n=>n.disabled),true);assert.equal(writes.length,0);}
    else{
     await save();
     if(['uncertain','refresh-failure'].includes(mode)){
      await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await refresh();await page.waitForNetworkIdle({idleTime:300});assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await save();
     }
     if(mode==='conflict'){
      await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),false);await refresh();await page.waitForFunction(s=>document.querySelector(s+' input[type="time"]').value==='10:00',{},s);await save();
     }
     await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Programación guardada'),{},s);assert.equal(state.history.length,1);
     assert.equal(writes.at(-1).enabled,mode!=='pause');assert.equal(writes.at(-1).hour,mode==='weekly'||mode==='conflict'?10:9);
     if(['uncertain','refresh-failure'].includes(mode))assert.deepEqual(writes[0],writes[1]);
     if(mode==='conflict'){assert.notEqual(writes[0].requestKey,writes[1].requestKey);assert.equal(writes[1].expectedRevision,1);}
     if(mode==='weekly'){assert.equal(writes[0].weekDay,5);assert.equal(writes[0].minute,30);assert.equal(writes[0].maxRetries,1);}
    }
   }
   assert.equal(await page.$eval(s,n=>n.scrollWidth>n.clientWidth+1),false);
   if(mode==='mobile'){const dir=path.resolve(__dirname,'../../.tmp/t6-health-schedule');fs.mkdirSync(dir,{recursive:true});await(await page.$(s)).screenshot({path:path.join(dir,'mobile.png')});}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(sourceCalls,[]);for(const w of writes)assert.deepEqual(Object.keys(w).sort(),['enabled','cadence','hour','minute','weekDay','maxRetries','responsibleId','expectedRevision','reason','requestKey'].sort());
  console.log(JSON.stringify({mode,passed:true,reads,writes:writes.length,liveSourceRequests:0}));await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
