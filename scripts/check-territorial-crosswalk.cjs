/* eslint-disable @typescript-eslint/no-require-imports -- Local browser checks use mocked APIs only. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const draft=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-crosswalk-draft.json'),'utf8'));
draft.contentHash='badd3781c987d06c09e0aa560b1bf4ee556472d3ad1aae4662fd84754569bf4b';
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3029';let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const modes=['desktop','mobile','no-capability','scoped','forbidden','corrupt','retry'];
 for(const mode of modes){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],writes=[],calls=[];let failed=false;
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
   if(url.pathname.endsWith('/geography/config'))body={identity:{electoralDepartmentCode:'19',electoralMunicipalityCode:'001',divipolaMunicipalityCode:'41001',sourceUrl:'https://www.dane.gov.co'},current:null,history:[],municipalities:[]};
   if(url.pathname.endsWith('/geography/crosswalk')){
    body=structuredClone(draft);
    if(mode==='corrupt')body.published=true;
    if(mode==='forbidden'){status=403;body={message:'Sin acceso al catálogo'};}
    if(mode==='retry'&&!failed){status=503;body={message:'No disponible'};failed=true;}
   }
   return r.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/platform/territorial-data',{waitUntil:'networkidle2',timeout:90000});
  const section='section[aria-label="Inventario de correspondencias de Neiva"]';
  if(['no-capability','scoped'].includes(mode)){
   assert.equal(await page.$(section),null);assert.equal(calls.some(c=>c.endsWith('/crosswalk')),false);
  }else if(['forbidden','corrupt'].includes(mode)){
   await page.waitForSelector(section+' [role="alert"]');assert.equal(await page.$(section+' input'),null);
  }else{
   if(mode==='retry'){await page.waitForSelector(section+' [role="alert"]');await page.click(section+' button');}
   await page.waitForSelector(section+' input');
   assert.equal(await page.$$eval(section+' ul[aria-label] > li',r=>r.length),52);
   const text=await page.$eval(section,n=>n.innerText);assert.ok(text.includes('863 mesas'));assert.ok(text.includes('aprobadas: 0'));assert.ok(text.includes('DANE 2018'));
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
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await context.close();
 }
 console.log(JSON.stringify({result:'T4_CROSSWALK_BROWSER_VERIFIED',scenarios:modes.length,mockedApiOnly:true,readOnly:true,desktopMobile:true,searchAndSpecialUnit:true,accessFailureAndRetry:true}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
