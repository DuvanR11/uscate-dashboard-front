/* eslint-disable @typescript-eslint/no-require-imports -- Executable CommonJS browser fixtures. */
const assert=require('node:assert/strict'),path=require('node:path'),{pathToFileURL}=require('node:url');
const {contractFixture,org,admin,id,paymentId}=require('./fixtures/territorial-contracts.cjs');
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3035',base='/platform/organizations/'+org+'/territorial-contracts',mine='/organization/territorial-data/contracts';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});const results=[];
 for(const mode of ['create','empty-payments','request','activate','revoke','reader','uncertain','refresh-failure','conflict','read-failure','mobile','client-accept','client-uncertain','client-undesignated']){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],otherWrites=[];const fixture=contractFixture();let rows=['create','empty-payments','uncertain','refresh-failure','mobile'].includes(mode)?[]:[fixture.row],committed=false,failed=false,reads=0;
  const client=mode.startsWith('client'),reader=mode==='reader';if(['activate','revoke','conflict'].includes(mode)){fixture.row.acceptedAt=new Date().toISOString();fixture.row.authorization={id:'exception',status:'APPROVED',expiresAt:fixture.row.endsAt};fixture.row.effectiveReason=mode==='revoke'?'ACTIVE':'AWAITING_ACTIVATION';fixture.row.state=mode==='revoke'?'ACTIVE':'DRAFT';fixture.row.revision=4;}
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(({client,reader,admin,org,mode})=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:client?(mode==='client-undesignated'?'another-admin':admin):'operator',organizationId:client?org:null,fullName:'Persona de prueba',email:'actor@example.test',role:{code:client?'ADMIN':'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:!client,canWrite:!client&&!reader},{module:'DASHBOARD',canRead:true,canWrite:true}]},impersonation:null},version:0})),{client,reader,admin,org,mode});
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async r=>{
   if(r.url().startsWith(origin))return r.continue();const u=new URL(r.url()),headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};if(r.method()==='OPTIONS')return r.respond({status:204,headers});if(!['xhr','fetch'].includes(r.resourceType()))return r.abort();let body=null,status=200;
   if(['/legal/pending','/permissions/modules','/organization/billing/quotes'].includes(u.pathname))body=[];
   if(u.pathname==='/organizations/me')body={id:org,name:'Organización de prueba'};if(u.pathname==='/organization/billing')body={hasSubscription:false};
   if(u.pathname==='/platform/access/context')body={enabled:true,principal:!reader,allOrganizations:true,organizationIds:[],capabilities:reader?['ORGANIZATIONS_READ','BILLING_READ']:['ORGANIZATIONS_READ','BILLING_READ','MANAGEMENT_MANAGE','EXCEPTION_REQUEST','EXCEPTION_APPROVE','PAYMENT_CONFIRM']};
   if(u.pathname==='/platform/organizations/'+org)body={id:org,name:'Organización de prueba',hasSubscription:false,commercialPlan:null,lifecycle:null,plan:null,limits:null};
   if(u.pathname.endsWith('/electoral-profile'))body={organization:{id:org,name:'Org'},profile:null,history:[],registrationGrantsAccess:false,officialCandidacyVerified:false};
   if((u.pathname===base||u.pathname===mine)&&r.method()==='GET'){reads++;body={items:rows,truncated:false};if(mode==='read-failure'&&!failed||mode==='refresh-failure'&&committed&&reads===2){failed=true;status=503;body={message:'Consulta temporalmente no disponible'};}}
   if(u.pathname===base+'/options'){body=fixture.options;if(mode==='empty-payments')body={...body,payments:[]};}
   if(r.method()==='POST'){
    if(![base,base+'/'+id+'/actions',mine+'/'+id+'/accept'].includes(u.pathname)){otherWrites.push(u.pathname);return r.abort();}
    const cmd=JSON.parse(r.postData());writes.push(cmd);
    if(mode==='conflict'){status=409;body={message:'El anexo cambió. Actualiza antes de continuar.'};fixture.row.revision++;}
    else {if(!committed){if(u.pathname===base){fixture.row.reference=cmd.reference;fixture.row.terms.reference=cmd.reference;fixture.row.startsAt=cmd.startsAt;fixture.row.endsAt=cmd.endsAt;rows=[fixture.row];}else if(u.pathname.endsWith('/accept')){fixture.row.acceptedAt=new Date().toISOString();fixture.row.effectiveReason='AWAITING_AUTHORIZATION';fixture.row.revision++;}else if(cmd.action==='REQUEST_APPROVAL'){fixture.row.authorization={id:'exception',status:'PENDING',expiresAt:fixture.row.endsAt};fixture.row.revision++;}else {fixture.row.state=cmd.action==='ACTIVATE'?'ACTIVE':'REVOKED';fixture.row.effectiveReason=fixture.row.state;fixture.row.revision++;}committed=true;}body={id,revision:fixture.row.revision,replayed:writes.length>1};if(['uncertain','client-uncertain'].includes(mode)&&writes.length===1){status=503;body={message:'Operación sin confirmar'};}}
   }
   return r.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+(client?'/organization/billing/quotes':'/platform/organizations/'+org),{waitUntil:'networkidle2'});
  if(!client){await page.waitForSelector('[role="tab"]');const tab=await page.evaluateHandle(()=>Array.from(document.querySelectorAll('[role="tab"]')).find(n=>n.textContent==='Contrato y cobertura'));await tab.asElement().click();await tab.dispose();}
  const s='section[aria-label="'+(client?'Tus anexos territoriales':'Anexos y cobertura territorial')+'"]';await page.waitForSelector(s);
  const click=async text=>{const h=await page.evaluateHandle((s,text)=>Array.from(document.querySelector(s).querySelectorAll('button')).find(b=>b.textContent===text),s,text),b=h.asElement();assert.ok(b,'Button '+text);await b.evaluate(n=>n.scrollIntoView({block:'center'}));await b.click();await h.dispose();};
  if(mode==='read-failure'){await page.waitForSelector(s+' [role="alert"]');await click('Reintentar');await page.waitForSelector(s+' article');}
  else if(client){await page.waitForSelector(s+' article');if(mode==='client-undesignated'){assert.equal(await page.$(s+' input[type="checkbox"]'),null);}else{assert.equal(await page.$eval(s+' article button',n=>n.disabled),true);await page.click(s+' article input[type="checkbox"]');await click('Aceptar este anexo territorial');if(mode==='client-uncertain'){await page.waitForSelector(s+' [role="alert"]');await click('Reintentar aceptación del anexo');await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Aceptado el'),{},s);assert.deepEqual(writes[0],writes[1]);}else await page.waitForFunction(s=>document.querySelector(s).innerText.includes('Aceptado el'),{},s);}}
  else if(reader){await page.waitForSelector(s+' article');assert.equal(await page.$(s+' form'),null);assert.equal((await page.$$(s+' article button')).length,0);}
  else {
   await page.waitForSelector(s+' input[aria-label="Motivo del anexo"]');await page.type(s+' input[aria-label="Motivo del anexo"]','Gestión comercial sintética para verificar N3.');
   if(['create','empty-payments','uncertain','refresh-failure','mobile'].includes(mode)){
    await click('Consultar respaldo y conjuntos');await page.waitForSelector(s+' select[aria-label="Pago del anexo"]');
    if(mode==='empty-payments'){assert.equal(await page.$eval(s+' button[type="submit"]',n=>n.disabled),true);assert.ok((await page.$eval(s,n=>n.innerText)).includes('No hay pagos de suscripción'));}
    else {await page.type(s+' input[aria-label="Referencia del anexo"]','Anexo de prueba');await page.select(s+' select[aria-label="Pago del anexo"]',paymentId);await page.select(s+' select[aria-label="Administrador del anexo"]',admin);
     for(const [label,value] of [['Inicio del anexo',fixture.row.startsAt.slice(0,16)],['Fin del anexo',fixture.row.endsAt.slice(0,16)]])await page.$eval(s+' input[aria-label="'+label+'"]',(n,v)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,v);n.dispatchEvent(new Event('input',{bubbles:true}));n.dispatchEvent(new Event('change',{bubbles:true}));},value);
     await page.click(s+' input[type="checkbox"]');await click('Guardar anexo para revisión');
     if(['uncertain','refresh-failure'].includes(mode)){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),true);await click('Reintentar operación del anexo');await page.waitForSelector(s+' [role="status"]');assert.deepEqual(writes[0],writes[1]);}else await page.waitForSelector(s+' [role="status"]');assert.deepEqual(writes[0].datasetCodes,['NEIVA_CONCEJO_2023']);}
   }else {await page.waitForSelector(s+' article');await click(mode==='request'?'Solicitar aprobación comercial':mode==='revoke'?'Revocar anexo':'Activar cobertura');if(mode==='conflict'){await page.waitForSelector(s+' [role="alert"]');assert.equal(await page.$eval(s+' fieldset',n=>n.disabled),false);await click('Actualizar anexos');}else await page.waitForSelector(s+' [role="status"]');}
  }
  assert.deepEqual(errors,[]);assert.deepEqual(otherWrites,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);if(reader||mode==='empty-payments'||mode==='client-undesignated'||mode==='read-failure')assert.equal(writes.length,0);console.log('PASS '+mode);results.push({mode,passed:true,writes:writes.length});await context.close();
 }
 console.log(JSON.stringify({result:'N3_COVERAGE_BROWSER_VERIFIED',scenarios:results.length,results,realApi:false,productionUsed:false}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser){const child=browser.process();let timer;await Promise.race([browser.close(),new Promise(resolve=>{timer=setTimeout(resolve,5000);})]);clearTimeout(timer);if(child?.exitCode===null)child.kill();}});
