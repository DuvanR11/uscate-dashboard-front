/* eslint-disable @typescript-eslint/no-require-imports -- Full browser fixture; no live API or public sources. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {scheduleFixture}=require('./fixtures/territorial-health-schedule.cjs'),{healthFixture}=require('./fixtures/territorial-health.cjs'),{workflowFixture}=require('./fixtures/territorial-geographic-review.cjs');
const validation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-cierre-2026-10-15.json'),'utf8'));
const draft=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'),'utf8'));draft.contentHash=validation.draftContentHash;
const {registryFixture}=require('./fixtures/territorial-registry.cjs');
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3033';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 for(const mode of ['default','election','corporation','territory','dataset','archive','uncertain','refresh-failure','conflict','mobile','reader','read-failure','unknown']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],official=[];let reads=0,failed=false,committed=false;
  const state=registryFixture();
  if(['dataset','archive'].includes(mode))state.territories.push({code:'11',name:'Bogot\u00e1',level:'DEPARTMENTAL',parentCode:'CO',origin:'ADMINISTRATIVE_CANDIDATE'},{code:'11001',name:'Bogot\u00e1',level:'MUNICIPAL',parentCode:'11',origin:'ADMINISTRATIVE_CANDIDATE'});
  if(mode==='archive')state.datasets.push({code:'BOGOTA_2023',name:'Bogot\u00e1 2023',electionCode:'CO_TERRITORIALES_2023',corporationCode:'CONCEJO',territoryCode:'11001',constituencyCode:'GENERAL',adapter:'CONFIGURATION_ONLY',state:'DRAFT',revision:1});
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(mode=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'49abaa20-76e4-4d13-b5ac-543c0c64d98a',organizationId:'platform',fullName:'Fixture',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:mode!=='reader',canDelete:false}]},impersonation:null},version:0})),mode);
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async request=>{
   if(request.url().startsWith(origin))return request.continue();
   const url=new URL(request.url());if(url.hostname.includes('registraduria.gov.co')||url.hostname.includes('alcaldianeiva.gov.co'))official.push(url.hostname);
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();let body=null,status=200;
   if(['/legal/pending','/permissions/modules','/platform/territorial-data'].includes(url.pathname))body=[];
   if(url.pathname==='/platform/access/context')body={enabled:true,principal:false,capabilities:['CATALOG_MANAGE'],organizationIds:[],allOrganizations:true};
   if(url.pathname==='/organizations/me')body={id:'platform',name:'Fixture'};if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname.endsWith('/geography/config'))body={identity:{},current:null,history:[],municipalities:[]};
   if(url.pathname.endsWith('/geography/crosswalk'))body=draft;if(url.pathname.endsWith('/crosswalk/validation'))body=validation;if(url.pathname.endsWith('/geography/review-workflow'))body=workflowFixture(validation);
   if(url.pathname==='/platform/territorial-data/health')body=healthFixture();

   if(url.pathname.endsWith('/health/schedule'))body=scheduleFixture();
   const base='/platform/territorial-data/registry';
   if(url.pathname===base){reads++;body=state;if((mode==='read-failure'&&!failed)||(mode==='refresh-failure'&&committed&&reads===2)){failed=true;status=503;body={message:'No disponible'};}}
   if(url.pathname===base+'/territory-candidates')body=[{code:'11',name:'Bogot\u00e1',level:'DEPARTMENT',departmentCode:null}];
   if(url.pathname.startsWith(base+'/datasets/')){
    const d=state.datasets.find(d=>d.code===decodeURIComponent(url.pathname.split('/').at(-1)));
    if(!d){status=404;body={message:'Conjunto de datos no registrado.'};}else body={definition:{...d,election:state.elections.find(e=>e.code===d.electionCode),corporation:state.corporations.find(c=>c.code===d.corporationCode),territory:state.territories.find(t=>t.code===d.territoryCode)},workflow:d.adapter==='LEGACY_NEIVA_2023'?'LEGACY_NEIVA':'CONFIGURATION_ONLY',commercialAccessGranted:false,resultsPublishedByRegistration:false,pending:[]};
   }
   if(url.pathname===base+'/commands'){
    const c=JSON.parse(request.postData());writes.push(c);
    if(mode==='conflict'&&!failed){failed=true;status=409;body={message:'La elecci\u00f3n ya est\u00e1 registrada.'};}
    else{
     if(!committed){
      const row={...c,revision:1};
      if(c.kind==='ELECTION')state.elections.push({...row,kind:c.electionKind});
      if(c.kind==='CORPORATION')state.corporations.push(row);
      if(c.kind==='TERRITORY')state.territories.push({code:c.code,name:'Bogot\u00e1',level:'DEPARTMENTAL',parentCode:'CO',origin:'ADMINISTRATIVE_CANDIDATE'});
      if(c.kind==='DATASET')state.datasets.push({...row,state:'DRAFT',adapter:'CONFIGURATION_ONLY'});
      if(c.kind==='ARCHIVE_DATASET')Object.assign(state.datasets.find(d=>d.code===c.code),{state:'ARCHIVED',revision:2});
      state.history.unshift({id:'event',entityCode:c.code,entityKind:c.kind,revision:1,action:c.kind==='ARCHIVE_DATASET'?'ARCHIVE':'CREATE',actorEmail:'operator@example.test',reason:c.reason});committed=true;
     }
     if(mode==='uncertain'&&!failed){failed=true;return request.abort('failed');}
     body={code:c.code,revision:1,replayed:writes.length>1};status=201;
    }
   }
   return request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/territorial-data',{waitUntil:'networkidle2',timeout:90000});
  const s='section[aria-label="Cat\u00e1logo territorial nacional"]';
  if(mode==='reader'){await page.waitForFunction(()=>document.body.innerText.includes('Se requiere acceso interno global'));assert.equal(writes.length,0);}
  else{
   if(mode==='read-failure'){await page.waitForSelector(s+' [role="alert"]');await page.click(s+' button');}
   await page.waitForSelector(s+' form');
   const fill=async(label,value)=>{const selector=s+' input[aria-label="'+label+'"]';await page.$eval(selector,(n,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,v);n.dispatchEvent(new Event('input',{bubbles:true}));},value);};
   const clickText=async text=>{const buttons=await page.$$(s+' button');for(const b of buttons)if((await b.evaluate(n=>n.innerText))===text){await b.evaluate(n=>n.scrollIntoView({block:'center'}));await b.click();return;}throw Error('Button missing: '+text);};
   if(['default','archive','unknown'].includes(mode)){
    await fill('Consultar c\u00f3digo de conjunto',mode==='archive'?'BOGOTA_2023':mode==='unknown'?'UNKNOWN_CODE':'NEIVA_CONCEJO_2023');await clickText('Consultar definici\u00f3n');
    if(mode==='unknown'){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$(s+' article'),null);}
    else{await page.waitForSelector(s+' article');assert.ok((await page.$eval(s+' article',n=>n.innerText)).includes(mode==='archive'?'Preparaci\u00f3n de fuentes pendiente':'Piloto con flujo de fuentes disponible'));}
   }
   if(!['default','read-failure','unknown'].includes(mode)){
    if(mode==='archive'){await fill('Motivo del cat\u00e1logo','Archivo de configuraci\u00f3n de prueba.');await clickText('Archivar definici\u00f3n con el motivo indicado');}
    else{
     const type=mode==='corporation'?'CORPORATION':mode==='territory'?'TERRITORY':mode==='dataset'?'DATASET':'ELECTION';await page.select(s+' select[aria-label="Tipo de registro territorial"]',type);
     if(type==='TERRITORY'){await fill('Buscar territorio','Bogota');await clickText('Buscar territorios');await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Bogot\u00e1 \u00b7 11'),{},s);await clickText('Bogot\u00e1 \u00b7 11');}
     else{await fill('C\u00f3digo de configuraci\u00f3n','TEST_2027');await fill('Nombre de configuraci\u00f3n','Configuraci\u00f3n regional de prueba');}
     if(type==='ELECTION')await fill('Fecha de elecci\u00f3n','2027-10-31');
     if(type==='DATASET'){await page.select(s+' select[aria-label="Elecci\u00f3n del conjunto"]','CO_TERRITORIALES_2023');await page.select(s+' select[aria-label="Corporaci\u00f3n del conjunto"]','CONCEJO');await page.select(s+' select[aria-label="Territorio del conjunto"]','11001');}
     await fill('Motivo del cat\u00e1logo','Configuraci\u00f3n revisada para el ensayo.');await clickText('Registrar configuraci\u00f3n');
     if(['uncertain','refresh-failure'].includes(mode)){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await clickText('Actualizar cat\u00e1logo');await page.waitForNetworkIdle({idleTime:250});assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await clickText('Reintentar registro');}
     if(mode==='conflict'){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),false);await fill('C\u00f3digo de configuraci\u00f3n','NEW_CODE_2027');await clickText('Registrar configuraci\u00f3n');}
    }
    await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Configuraci\u00f3n registrada.')||document.querySelector(s).innerText.includes('Definici\u00f3n archivada.'),{},s);
    assert.equal(state.history.length,1);
    if(mode==='archive')assert.equal(state.datasets.find(d=>d.code==='BOGOTA_2023').state,'ARCHIVED');
    if(mode==='dataset'){assert.equal(writes[0].territoryCode,'11001');assert.equal(state.datasets.at(-1).adapter,'CONFIGURATION_ONLY');}
    if(['uncertain','refresh-failure'].includes(mode))assert.deepEqual(writes[0],writes[1]);
    if(mode==='conflict')assert.notEqual(writes[0].requestKey,writes[1].requestKey);
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(mode==='mobile'){const folder=path.resolve(__dirname,'../../.tmp/n1-browser');fs.mkdirSync(folder,{recursive:true});await(await page.$(s)).screenshot({path:path.join(folder,'registry-mobile.png')});}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(official,[]);for(const w of writes){assert.equal('adapter' in w,false);assert.equal('state' in w,false);assert.equal('organizationId' in w,false);}
  console.log(JSON.stringify({mode,passed:true,reads,writes:writes.length,officialRequests:0}));await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
