/* eslint-disable @typescript-eslint/no-require-imports -- Browser checks with a fully mocked API. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),{createHash}=require('node:crypto'),{pathToFileURL}=require('node:url');
const fixture=JSON.parse(fs.readFileSync(process.argv[2],'utf8')),assets=path.resolve(process.argv[3]);
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://localhost:3027';
let browser;
(async()=>{
 const puppeteer=await import(pathToFileURL(path.resolve(__dirname,'../../api-uscate-back/node_modules/puppeteer-core/lib/puppeteer/puppeteer-core.js')).href);
 browser=await puppeteer.default.launch({executablePath:process.env.TERRITORIAL_TEST_CHROME||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const scenarios=['desktop','mobile','queued','expired','failed','withdrawn','reader','forbidden','corrupt','retry','pagination','limit'];
 for(const mode of scenarios){
  const context=await browser.createBrowserContext(),page=await context.newPage(),errors=[],requests=[],posts=[],rows=[];
  let failOnce=mode==='retry',loads=0,downloadCount=0;
  const folder=path.join(assets,'history-downloads-'+Date.now()+'-'+mode);fs.mkdirSync(folder,{recursive:true});
  await (await page.createCDPSession()).send('Page.setDownloadBehavior',{behavior:'allow',downloadPath:folder});
  await context.setCookie({name:'auth-token',value:'fixture',url:origin},{name:'user-permissions',value:'1',url:origin});
  await page.evaluateOnNewDocument(mode=>localStorage.setItem('auth-storage',JSON.stringify({state:{token:'fixture',user:{id:'admin',organizationId:'org',fullName:'Fixture',role:{code:mode==='reader'?'LEADER':'ADMIN'},permissions:[{module:'DASHBOARD',canRead:true,canWrite:false,canDelete:false}]},impersonation:null},version:0})),mode);
  await page.setViewport({width:mode==='mobile'?390:1440,height:1000});page.on('pageerror',e=>errors.push(e.message));
  function row(format='pdf',id='report'){
   const bytes=fs.readFileSync(path.join(assets,'report.'+format));
   return {id,versionId:fixture.version.id,versionNumber:2,format,contentHash:fixture.version.contentHash,filename:'report-'+id+'.'+format,requestedByEmail:'admin@example.test',state:mode==='expired'?'EXPIRED':mode==='failed'?'FAILED':mode==='queued'&&loads<2?'PENDING':'AVAILABLE',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+(mode==='expired'?-1000:86400000)).toISOString(),bytes:bytes.length,fileHash:createHash('sha256').update(bytes).digest('hex'),errorCode:mode==='failed'?'GENERATION_INTERRUPTED':null,downloadable:!['expired','failed','withdrawn'].includes(mode)};
  }
  if(!['desktop','mobile','queued','retry','limit','reader'].includes(mode))rows.push(row());
  await page.setRequestInterception(true);
  page.on('request',async request=>{
   if(request.url().startsWith(origin))return request.continue();
   const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'*'};
   if(request.method()==='OPTIONS')return request.respond({status:204,headers});
   if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();
   const url=new URL(request.url());requests.push({path:url.pathname,method:request.method()});let body=null,status=200;
   if(['/legal/pending','/permissions/modules'].includes(url.pathname))body=[];
   if(url.pathname==='/organization/billing')body={hasSubscription:false};
   if(url.pathname==='/organizations/me')body={id:'org',name:'Fixture',isDemo:false};
   if(url.pathname==='/organization/territorial-data/context')body={eligibleTerritory:true,resultsAvailable:true,reason:'AVAILABLE',accessMode:'DEMO',subscriptionAccess:'READ_ONLY',geography:{divipolaMunicipalityCode:'41001',revision:1},publication:fixture.version,trial:{startsAt:'2026-10-14T20:00:00Z',trialEndsAt:'2026-10-21T20:00:00Z',readOnlyEndsAt:'2026-10-28T20:00:00Z'}};
   if(url.pathname==='/organization/territorial-data/results')body=fixture;
   if(url.pathname==='/organization/territorial-data/reports'){
    if(request.method()==='POST'){
     const dto=JSON.parse(request.postData());posts.push(dto);assert.deepEqual(Object.keys(dto).sort(),['contentHash','format','requestKey','versionId']);assert.equal(dto.versionId,fixture.version.id);assert.equal(dto.contentHash,fixture.version.contentHash);
     if(mode==='limit'){status=429;body={message:'Limit'};}
     else if(failOnce){failOnce=false;status=503;body={message:'Uncertain'};}
     else {rows.unshift(row(dto.format,dto.format));body=rows[0];status=202;}
    }else{
     loads++;body={items:rows.map(r=>mode==='queued'?{...r,state:loads<3?'PENDING':'AVAILABLE',downloadable:loads>=3}:r),next:mode==='pagination'&&!url.searchParams.has('before')?'older':null};
     if(mode==='pagination'&&url.searchParams.has('before'))body.items=[{...row(),'requestedByEmail':'older@example.test'}];
    }
   }
   if(url.pathname.endsWith('/download')){
    downloadCount++;
    if(mode==='forbidden'){status=403;body={message:'Denied'};}
    else {const id=url.pathname.split('/').at(-2),r=rows.find(r=>r.id===id),bytes=fs.readFileSync(path.join(assets,'report.'+r.format));return request.respond({status:200,headers,contentType:r.format==='pdf'?'application/pdf':r.format==='csv'?'text/csv':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',body:mode==='corrupt'?Buffer.alloc(bytes.length,1):bytes});}
   }
   return request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
  });
  await page.goto(origin+'/territorio/resultados-electorales',{waitUntil:'networkidle2',timeout:90000});await page.waitForSelector('table');
  const section='section[aria-label="Historial de informes municipales"]';
  const click=async label=>page.evaluate(({selector,label})=>[...document.querySelectorAll(selector+' button')].find(b=>b.textContent===label).click(),{selector:section,label});
  if(mode==='reader'){assert.equal(await page.$(section),null);assert.equal(requests.some(r=>r.path.endsWith('/reports')),false);}
  else{
   await page.waitForSelector(section);
   if(['desktop','mobile','queued','retry','limit'].includes(mode)){
    for(const format of mode==='desktop'?['csv','xlsx','pdf']:['pdf']){
     await click('Solicitar '+(format==='xlsx'?'Excel':format.toUpperCase()));
     if(mode==='limit'){await page.waitForFunction(()=>document.body.innerText.includes('límite de solicitudes'));break;}
     if(mode==='retry'){await page.waitForFunction(()=>document.body.innerText.includes('No pudimos completar'));await page.waitForFunction(()=>!document.querySelector('section[aria-label="Historial de informes municipales"] button').disabled);await click('Solicitar PDF');for(let n=0;n<100&&posts.length<2;n++)await new Promise(r=>setTimeout(r,50));assert.equal(posts[0].requestKey,posts[1].requestKey);}
     if(mode==='queued')await page.waitForFunction(()=>document.body.innerText.includes('Pendiente'));
     await page.waitForFunction(label=>document.querySelector('section[aria-label="Historial de informes municipales"] li strong')?.textContent.includes(label)&&document.querySelector('section[aria-label="Historial de informes municipales"] li button:not(:disabled)'),{timeout:20000},format==='xlsx'?'Excel':format.toUpperCase());
     await click('Descargar archivo');const target=path.join(folder,'report-'+format+'.'+format);
     for(let n=0;n<100&&!fs.existsSync(target);n++)await new Promise(r=>setTimeout(r,50));
     assert.ok(fs.existsSync(target),JSON.stringify({mode,format,files:fs.readdirSync(folder),section:await page.$eval(section,n=>n.innerText),errors,downloadCount}));assert.deepEqual(fs.readFileSync(target),fs.readFileSync(path.join(assets,'report.'+format)));
     await page.waitForFunction(()=>!document.querySelector('section[aria-label="Historial de informes municipales"] button').disabled);
    }
   }else if(['expired','failed','withdrawn'].includes(mode)){
    assert.equal(await page.$eval(section+' li button',n=>n.disabled),true);assert.equal(downloadCount,0);
   }else if(['forbidden','corrupt'].includes(mode)){
    const before=requests.filter(r=>r.path.endsWith('/context')).length;await click('Descargar archivo');
    if(mode==='forbidden'){for(let n=0;n<100&&requests.filter(r=>r.path.endsWith('/context')).length===before;n++)await new Promise(r=>setTimeout(r,50));assert.ok(requests.filter(r=>r.path.endsWith('/context')).length>before);}
    else await page.waitForFunction(()=>document.body.innerText.includes('No pudimos completar'));
    assert.equal(fs.readdirSync(folder).length,0);
   }else if(mode==='pagination'){
    await click('Más antiguos');await page.waitForFunction(()=>document.body.innerText.includes('older@example.test'));await click('Más recientes');await page.waitForFunction(()=>document.body.innerText.includes('admin@example.test'));
   }
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   if(['desktop','mobile'].includes(mode))await (await page.$(section)).screenshot({path:path.join(assets,'history-'+mode+'.png')});
  }
  assert.deepEqual(errors,[]);assert.ok(requests.filter(r=>r.method!=='GET').every(r=>r.method==='POST'&&r.path==='/organization/territorial-data/reports'));console.log(JSON.stringify({scenario:mode,result:'passed',posts:posts.length,downloads:downloadCount,allApiMocked:true}));await context.close();
 }
})().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
