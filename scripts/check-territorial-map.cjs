/* eslint-disable @typescript-eslint/no-require-imports -- Mocked API browser integration. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{pathToFileURL}=require('node:url');
const fixture=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const snapshot=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../../api-uscate-back/src/modules/platform/data/neiva-municipality-mgn2024.json'),'utf8'));
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3028';
let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const scenarios=['desktop','mobile','reader','unavailable','corrupt','stale','forbidden'];
 for(const mode of scenarios){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],mapQueries=[],writes=[];let failed=false;
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(mode=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'fixture',organizationId:'org',fullName:'Fixture',role:{code:mode==='reader'?'LEADER':'ADMIN'},permissions:[{module:'DASHBOARD',canRead:true,canWrite:false,canDelete:false}]},impersonation:null},version:0})),mode);
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  await page.setRequestInterception(true);
  page.on('request',async request=>{
   if(request.url().startsWith(origin))return request.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});
   if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();
   const url=new URL(request.url());assert.ok(!/maps.googleapis|mapbox|tile.openstreetmap/.test(url.hostname));
   if(request.method()!=='GET')writes.push(url.pathname);
   let body=null,status=200;
   if(['/legal/pending','/permissions/modules'].includes(url.pathname))body=[];
   if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname==='/organizations/me')body={id:'org',name:'Fixture',isDemo:false};
   if(url.pathname.endsWith('/reports'))body={items:[],next:null};
   if(url.pathname.endsWith('/context'))body={pilot:'NEIVA_CONCEJO_2023',eligibleTerritory:true,resultsAvailable:true,reason:'AVAILABLE',accessMode:'PAID',subscriptionAccess:'FULL',geography:{divipolaMunicipalityCode:'41001',revision:1},publication:fixture.version,trial:null};
   if(url.pathname.endsWith('/results'))body=fixture;
   if(url.pathname.endsWith('/results/map')){
    mapQueries.push(Object.fromEntries(url.searchParams));
    body={version:fixture.version,territoryCode:'41001',granularity:'MUNICIPAL',source:{id:'DANE_MGN2024_NEIVA_REFERENCE_V1',publisher:'DANE',referenceYear:2024,coordinateSystem:'EPSG:4326',coordinateOrder:'LONGITUDE_LATITUDE',use:'MUNICIPAL_REFERENCE_ONLY',electionBoundaryCertified:false,sourceSha256:'cad5847b5baa095ccb40f695fee82d7825f1c9d0b2669e3f7ec175c388270bc3',canonicalSha256:'aa9a8dd20121ac5141c765e932183b2139c6147132048ed51ac1727bd37bd4aa'},vertexCount:10882,boundary:structuredClone(snapshot),availability:{municipality:true,submunicipalResults:false,electoralHeatmap:false,participation:false,votersByAge:false}};
    if(mode==='corrupt')body.boundary.features[0].geometry.coordinates[0][1][0]=0;
    if(['unavailable','stale','forbidden'].includes(mode)&&!failed){status=mode==='unavailable'?503:mode==='stale'?409:403;body={};failed=true;}
   }
   return request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/territorio/resultados-electorales',{waitUntil:'networkidle2',timeout:90000});
  await page.waitForSelector('table');
  const section='section[aria-label="Mapa municipal de referencia"]';
  if(['unavailable','corrupt'].includes(mode)){
   await page.waitForSelector(section+' [role="alert"]');assert.equal(await page.$(section+' svg'),null);
   assert.equal(await page.$$eval('tbody tr',rows=>rows.length),17);
   if(mode==='unavailable'){await page.click(section+' button');await page.waitForSelector(section+' svg');}
  }else{
   await page.waitForSelector(section+' svg');
   const initial=await page.$eval(section+' svg',n=>n.getAttribute('viewBox'));
   await page.evaluate(s=>[...document.querySelectorAll(s+' button')].find(b=>b.textContent==='Acercar').click(),section);
   await page.waitForFunction(s=>document.querySelector(s+' svg').getAttribute('viewBox')!=='0 0 700 500',{},section);
   await page.click(section+' [aria-label="Desplazar al este"]');
   await page.evaluate(s=>[...document.querySelectorAll(s+' button')].find(b=>b.textContent==='Ver municipio completo').click(),section);
   assert.equal(await page.$eval(section+' svg',n=>n.getAttribute('viewBox')),initial);
   await page.select(section+' select','00001');
   await page.waitForFunction(s=>document.querySelector(s).innerText.includes('10,90 %'),{},section);
   assert.equal(await page.$eval(section+' path',n=>n.getAttribute('fill')),'#d8eceb');
   const text=await page.$eval(section,n=>n.innerText);assert.ok(text.includes('MGN 2024'));assert.ok(text.includes('no certifica'));
   if(mode==='mobile')await page.screenshot({path:process.env.TERRITORIAL_MAP_SCREENSHOT||path.resolve(__dirname,'../../.tmp/t4-sources/mobile-map.png'),fullPage:true});
  }
  assert.ok(mapQueries.length>0);for(const q of mapQueries)assert.deepEqual(q,{versionId:fixture.version.id,contentHash:fixture.version.contentHash});
  assert.deepEqual(errors,[]);assert.deepEqual(writes,[]);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await context.close();
 }
 console.log(JSON.stringify({result:'TERRITORIAL_MAP_BROWSER_VERIFIED',scenarios:scenarios.length,desktopMobile:true,readerAccess:true,zoomPanSelection:true,failClosedAndRetry:true,allApiMocked:true,noMutations:true}));
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
