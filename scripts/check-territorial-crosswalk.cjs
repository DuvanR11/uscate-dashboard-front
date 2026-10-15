/* eslint-disable @typescript-eslint/no-require-imports -- Local browser checks use mocked APIs only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const {workflowFixture}=require('./fixtures/territorial-geographic-review.cjs');
const draft=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'),'utf8'));
const validation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-cierre-2026-10-15.json'),'utf8'));
const revisionTwo=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-evidencias-2026-10-15.json'),'utf8'));
draft.contentHash='d6144f57ecd8990bd20bdcc714d8b7d77e09a48f08de9c7c539c967327918435';
const legacyValidation=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/docs/analitica-territorial/neiva-concejo-2023/fuentes/neiva-validacion-2026-10-15.json'),'utf8'));
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3029';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const modes=['desktop','mobile','no-capability','scoped','forbidden','corrupt','corrupt-coordinate','retry','validation-forbidden','validation-corrupt','validation-retry','legacy-validation','revision-two','unknown-revision'];
 for(const mode of modes){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],calls=[];let failed=false,validationFailed=false;
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(()=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'operator',organizationId:'platform',fullName:'Fixture',role:{code:'PLATFORM_OPERATOR'},permissions:[{module:'PLATAFORMA',canRead:true,canWrite:true,canDelete:false}]},impersonation:null},version:0})));
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);page.on('request',async r=>{
   if(r.url().startsWith(origin))return r.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(r.method()==='OPTIONS')return r.respond({status:204,headers});
   if(!['xhr','fetch'].includes(r.resourceType()))return r.abort();
   if(r.method()!=='GET')writes.push(r.method());
   const url=new URL(r.url());calls.push(url.pathname);let body=null,status=200;
   if(['/legal/pending','/permissions/modules'].includes(url.pathname))body=[];
   if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname==='/organizations/me')body={id:'platform',name:'Fixture'};
   if(url.pathname==='/platform/access/context')body={enabled:true,principal:false,capabilities:mode==='no-capability'?[]:['CATALOG_MANAGE'],organizationIds:[],allOrganizations:mode!=='scoped'};
   if(url.pathname==='/platform/territorial-data')body=[];
   if(url.pathname.endsWith('/geography/review-workflow'))body=workflowFixture(validation);
   if(url.pathname.endsWith('/geography/config'))body={identity:{electoralDepartmentCode:'19',electoralMunicipalityCode:'001',divipolaMunicipalityCode:'41001',sourceUrl:'https://www.dane.gov.co'},current:null,history:[],municipalities:[]};
   if(url.pathname.endsWith('/geography/crosswalk')){
    body=structuredClone(draft);
    if(mode==='corrupt')body.published=true;
    if(mode==='corrupt-coordinate')body.stations[0].pdfCandidate.latitude=100;
    if(mode==='forbidden'){status=403;body={message:'Sin acceso al catálogo'};}
    if(mode==='retry'&&!failed){status=503;body={message:'No disponible'};failed=true;}
   }
   if(url.pathname.endsWith('/crosswalk/validation')){
    body=structuredClone(mode==='legacy-validation'?legacyValidation:mode==='revision-two'?revisionTwo:validation);
    if(mode==='unknown-revision'){body.evidenceRevision=4;const {contentHash,...payload}=body;void contentHash;body.contentHash=createHash('sha256').update(JSON.stringify(payload)).digest('hex');}
    if(mode==='validation-forbidden'){status=403;body={message:'Sin acceso al catálogo'};}
    if(mode==='validation-corrupt')body.cases[0].status='RESOLVED';
    if(mode==='validation-retry'&&!validationFailed){status=503;body={message:'No disponible'};validationFailed=true;}
   }
   return r.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/territorial-data',{waitUntil:'networkidle2',timeout:90000});
  const section='section[aria-label="Inventario de correspondencias de Neiva"]';
  if(['no-capability','scoped'].includes(mode)){
   assert.equal(await page.$(section),null);assert.equal(calls.some(c=>c.endsWith('/crosswalk')),false);
  }else if(['forbidden','corrupt','corrupt-coordinate'].includes(mode)){
   await page.waitForSelector(section+' [role="alert"]');assert.equal(await page.$(section+' input'),null);
  }else{
   if(mode==='retry'){await page.waitForSelector(section+' [role="alert"]');await page.click(section+' button');}
   await page.waitForSelector(section+' input');
   assert.equal(await page.$$eval(section+' ul[aria-label] > li',r=>r.length),52);
   const text=await page.$eval(section,n=>n.innerText);assert.ok(text.includes('863 mesas'));assert.ok(text.includes('aprobadas: 0'));assert.ok(text.includes('DANE 2018'));
   assert.ok(text.includes('52 puestos con coordenadas'));assert.ok(text.includes('3 diferencias'));
   await page.click(section+' input[type="checkbox"]');
   await page.waitForFunction(s=>document.querySelectorAll(s+' ul[aria-label] > li').length===4,{},section);
   await page.click(section+' ul[aria-label] > li details summary');
   assert.ok((await page.$eval(section+' ul[aria-label]',n=>n.innerText)).includes('No se reasigna automáticamente'));
   await page.click(section+' input[type="checkbox"]');
   await page.waitForFunction(s=>document.querySelectorAll(s+' ul[aria-label] > li').length===52,{},section);
   await page.click(section+' details summary');
   assert.equal(await page.$$eval(section+' details:first-of-type li',r=>r.length),19);
   await page.type(section+' input','00');await page.waitForFunction(s=>document.querySelectorAll(s+' ul[aria-label] > li').length===1,{},section);
   assert.ok((await page.$eval(section+' ul[aria-label]',n=>n.innerText)).includes('Zona 90'));
   await page.$eval(section+' input',n=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'vega larga');n.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(s=>document.querySelectorAll(s+' ul[aria-label] > li').length===2,{},section);
   await page.$eval(section+' input',n=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(n,'no-match');n.dispatchEvent(new Event('input',{bubbles:true}));});
   await page.waitForFunction(s=>document.querySelector(s).innerText.includes('No hay puestos que coincidan'),{},section);
   if(mode==='mobile')await page.screenshot({path:path.resolve(__dirname,'../../.tmp/t4-crosswalk-sources/mobile-inventory.png'),fullPage:true});
  }
  const review='section[aria-label="Validación geográfica de T4"]';
  if(['no-capability','scoped'].includes(mode)){
   assert.equal(await page.$(review),null);assert.equal(calls.some(c=>c.endsWith('/crosswalk/validation')),false);
  }else if(['validation-forbidden','validation-corrupt','unknown-revision'].includes(mode)){
   await page.waitForSelector(review+' [role="alert"]');assert.equal(await page.$(review+' details'),null);
  }else{
   if(mode==='validation-retry'){await page.waitForSelector(review+' [role="alert"]');await page.click(review+' button');}
   await page.waitForSelector(review+' details');
   assert.equal(await page.$eval(review+' button',n=>n.getBoundingClientRect().right<=n.parentElement.getBoundingClientRect().right+1),true);
   const text=await page.$eval(review,n=>n.innerText);assert.ok(text.includes('4 casos sin resolver'));assert.ok(text.includes('6 requisitos pendientes'));
   await page.click(review+' details[aria-label="Casos geográficos por resolver"] summary');
   assert.equal(await page.$$eval(review+' details[aria-label="Casos geográficos por resolver"] > ul > li',r=>r.length),4);
   assert.ok((await page.$eval(review,n=>n.innerText)).includes('2024'));
   const geo=review+' details[aria-label="Evidencias geográficas incorporadas"]';
   if(mode==='legacy-validation')assert.equal(await page.$(geo),null);
   else{
    await page.click(geo+' summary');assert.equal(await page.$$eval(geo+' > ul > li',r=>r.length),mode==='revision-two'?4:7);
    const proof=await page.$eval(geo,n=>n.innerText);for(const term of ['2017-12-29','2023-10-13','MAGNA Colombia Bogota','puesto censo','no acredita continuidad'])assert.ok(proof.includes(term),term);
    assert.equal(await page.$$eval(geo+' a',r=>r.length),mode==='revision-two'?5:10);
    if(mode!=='revision-two')for(const term of ['julio','inscripción','linderos','2019'])assert.ok(proof.includes(term),term);
   }
   if(['desktop','mobile'].includes(mode)){
    const dir=path.resolve(__dirname,'../../.tmp/t4-geography-validation-downloads/'+mode);fs.mkdirSync(dir,{recursive:true});
    const cdp=await page.createCDPSession();await cdp.send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:dir});
    const file=path.join(dir,'neiva-validacion-geografica-2026-10-15.json');if(fs.existsSync(file))fs.unlinkSync(file);
    await page.click(review+' button');
    const until=Date.now()+10000;while(!fs.existsSync(file)&&Date.now()<until)await new Promise(r=>setTimeout(r,100));
    assert.deepEqual(JSON.parse(fs.readFileSync(file,'utf8')),validation);
    await page.screenshot({path:path.join(dir,'panel.png'),fullPage:true});
   }
  }
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
 }
 console.log(JSON.stringify({result:'T4_CROSSWALK_AND_VALIDATION_VERIFIED',scenarios:modes.length,mockedApiOnly:true,readOnly:true,desktopMobile:true,searchAndSpecialUnit:true,accessFailureAndRetry:true}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
