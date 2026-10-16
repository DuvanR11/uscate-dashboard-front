/* eslint-disable @typescript-eslint/no-require-imports -- Executable CommonJS browser fixture, matching the other browser checks. */
/* Browser fixtures only: no production API, political data or provider traffic. */
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {registryFixture}=require('./fixtures/territorial-registry.cjs');
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3034',id='539131ad-5d06-4185-953f-fbb10b405640',userId='c9f937cc-59f9-4fde-aee9-4c3675c9c7ee',base='/platform/organizations/'+id+'/electoral-profile';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const results=[];
 for(const mode of ['new','existing','reader','uncertain','refresh-failure','conflict','inactive','no-options','read-failure','mobile']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[];let committed=false,failed=false,reads=0;
  const registry=registryFixture(),raw=registry.datasets[0],dataset={...raw,election:registry.elections[0],corporation:registry.corporations[0],territory:registry.territories.find(t=>t.code==='41001')};
  const user={id:userId,fullName:'Integrante de prueba',email:'team@example.test',isActive:mode!=='inactive',role:{code:'ADMIN',name:'Administrador'}};
  const state={organization:{id,name:'Organización sintética',territoryCode:'41001',officeType:'CONCEJO'},profile:['existing','reader','inactive'].includes(mode)?{aspirantName:'Aspirante sintético',datasetCode:dataset.code,dataset,revision:1,updatedAt:new Date().toISOString(),team:[{userId,function:'COORDINATOR',user}]}:null,history:[],registrationGrantsAccess:false,officialCandidacyVerified:false};
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(mode=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'operator',organizationId:null,fullName:'Operador de prueba',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:mode!=='reader',canDelete:false}]},impersonation:null},version:0})),mode);
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async r=>{
   if(r.url().startsWith(origin))return r.continue();
   const url=new URL(r.url()),headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(r.method()==='OPTIONS')return r.respond({status:204,headers});if(!['xhr','fetch'].includes(r.resourceType()))return r.abort();let body=null,status=200;
   if(['/legal/pending','/permissions/modules'].includes(url.pathname))body=[];
   if(url.pathname==='/organizations/me')body={id:'platform',name:'Prueba de plataforma'};
   if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname==='/platform/access/context')body={enabled:true,principal:false,capabilities:mode==='reader'?['ORGANIZATIONS_READ']:['ORGANIZATIONS_READ','ORGANIZATIONS_CREATE'],allOrganizations:true,organizationIds:[]};
   if(url.pathname==='/platform/organizations/'+id)body={id,name:state.organization.name,hasSubscription:false,commercialPlan:null,lifecycle:null,plan:null,limits:null};
   if(url.pathname===base){reads++;body=state;if(mode==='read-failure'&&!failed||mode==='refresh-failure'&&committed&&reads===2){failed=true;status=503;body={message:'Ficha temporalmente no disponible'};}}
   if(url.pathname===base+'/options')body={datasets:mode==='no-options'?[]:[dataset],users:mode==='no-options'?[]:[user],truncated:{datasets:false,users:false}};
   if(url.pathname===base+'/commands'){
    const cmd=JSON.parse(r.postData());writes.push(cmd);
    if(mode==='conflict'){status=409;body={message:'La ficha cambió. Recarga antes de guardar.'};}
    else {if(!committed){state.profile={aspirantName:cmd.aspirantName,datasetCode:cmd.datasetCode,dataset,revision:(state.profile?.revision??0)+1,updatedAt:new Date().toISOString(),team:cmd.team.map(m=>({...m,user}))};committed=true;}body={revision:state.profile.revision,replayed:writes.length>1};if(mode==='uncertain'&&writes.length===1){status=503;body={message:'Resultado sin confirmar'};}}
   }
   return r.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/organizations/'+id,{waitUntil:'networkidle2'});
  const s='section[aria-label="Aspirante y equipo electoral"]';await page.waitForSelector(s).catch(async e=>{console.error(JSON.stringify({mode,url:page.url(),body:await page.$eval('body',n=>n.innerText),errors}));throw e;});
  const click=async text=>{const h=await page.evaluateHandle((s,text)=>Array.from(document.querySelector(s).querySelectorAll('button')).find(b=>b.textContent===text),s,text);const e=h.asElement();assert.ok(e,'Button '+text);await e.evaluate(n=>n.scrollIntoView({block:'center'}));await e.click();await h.dispose();};
  if(mode==='read-failure'){await page.waitForSelector(s+' [role="alert"]');await click('Reintentar');await page.waitForSelector(s+' form');assert.equal(writes.length,0);}
  else if(mode==='reader'){await page.waitForSelector(s+' article');assert.equal(await page.$(s+' form'),null);assert.ok((await page.$eval(s,n=>n.innerText)).includes('acceso de consulta'));}
  else {
   await page.waitForSelector(s+' form');await click('Consultar opciones');await page.waitForFunction(s=>document.querySelector(s+' select[aria-label="Conjunto electoral"]').options.length>1||document.querySelector(s).textContent.includes('No se encontraron conjuntos'),{},s);
   if(mode==='no-options'){assert.equal(await page.$eval(s+' button[type="submit"]',b=>b.disabled),true);assert.ok((await page.$eval(s,n=>n.innerText)).includes('Catálogo territorial nacional'));}
   else {
    const input=s+' input[aria-label="Nombre del aspirante"]';await page.$eval(input,n=>{n.value='';n.dispatchEvent(new Event('input',{bubbles:true}));});await page.click(input,{clickCount:3});await page.type(input,'Aspirante sintético actualizado');
    await page.select(s+' select[aria-label="Conjunto electoral"]',dataset.code);
    const cb=await page.$(s+' input[type="checkbox"]');await cb.evaluate(n=>n.scrollIntoView({block:'center'}));if(mode==='inactive'){await cb.click();}else if(!await cb.evaluate(n=>n.checked)){await cb.click();}
    if(mode!=='inactive')await page.select(s+' select[aria-label="Función de Integrante de prueba"]','COORDINATOR');
    await page.type(s+' input[aria-label="Motivo de la ficha electoral"]','Registro sintético para verificar la pantalla.');await click('Guardar ficha electoral');
    if(['uncertain','refresh-failure'].includes(mode)){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await click('Reintentar el mismo guardado');await page.waitForSelector(s+' [role="status"]');assert.equal(writes.length,2);assert.deepEqual(writes[0],writes[1]);}
    else if(mode==='conflict'){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),false);await click('Recargar ficha');assert.equal(writes.length,1);}
    else {await page.waitForSelector(s+' [role="status"]');assert.equal(writes.length,1);assert.equal(writes[0].team.length,mode==='inactive'?0:1);assert.ok((await page.$eval(s+' article',n=>n.innerText)).includes('actualizado'));}
   }
  }
  assert.deepEqual(errors,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);results.push({mode,passed:true,writes:writes.length});console.log('PASS '+mode);await context.close();
 }
 console.log(JSON.stringify({result:'N2_PROFILE_BROWSER_VERIFIED',scenarios:results.length,results,realApi:false,productionUsed:false}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser){const child=browser.process();let timer;await Promise.race([browser.close(),new Promise(resolve=>{timer=setTimeout(resolve,5000);})]);clearTimeout(timer);if(child?.exitCode===null)child.kill();}});
