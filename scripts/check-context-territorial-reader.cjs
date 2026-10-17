/* eslint-disable @typescript-eslint/no-require-imports -- Local response and browser fixtures. */
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),{pathToFileURL}=require('node:url'),{createHash}=require('node:crypto'),ts=require('typescript');
const fixture=require('./fixtures/national-territorial-explorer.cjs');
const code=fixture.neiva.code,root='/organization/territorial-data/explorer/'+code;
function load(name,requireFn=()=>({})){const source=fs.readFileSync(path.join(__dirname,'../src/lib/api/',name+'.ts'),'utf8'),compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,esModuleInterop:true}}).outputText,m={exports:{}};new Function('module','exports','require',compiled)(m,m.exports,requireFn);return m.exports;}
const helpers=load('territorial-reader');let checks=0,browser;
(async()=>{
assert.equal(helpers.territorialReaderRoot(code),root);checks++;
assert.equal(helpers.territorialReaderRoot(fixture.medellin.code),'/organization/territorial-data/explorer/'+fixture.medellin.code);checks++;
for(const invalid of ['','neiva','../NEIVA','NEIVA/RESULTS']){assert.throws(()=>helpers.territorialReaderRoot(invalid));checks++;}
assert.doesNotThrow(()=>helpers.assertTerritorialReaderBinding({datasetCode:code},code));checks++;
for(const value of [null,{},fixture.context(),{datasetCode:fixture.medellin.code}]){assert.throws(()=>helpers.assertTerritorialReaderBinding(value,code));checks++;}
const calls=[],api={get:async(url,options)=>{calls.push({url,options});return {data:{datasetCode:fixture.medellin.code}};}},resolve=name=>name.includes('territorial-reader')?helpers:api;
const results=load('territorial-results',resolve),maps=load('territorial-map',resolve),signal=new AbortController().signal;
await assert.rejects(()=>results.getOrganizationTerritorialContext(code,signal),/MISMATCH/);checks++;
await assert.rejects(()=>results.getOrganizationMunicipalResults(code,signal),/MISMATCH/);checks++;
await assert.rejects(()=>maps.getMunicipalMap(code,fixture.results().version,signal),/MISMATCH/);checks++;
assert.deepEqual(calls.map(r=>r.url),[root+'/context',root+'/results',root+'/map']);checks++;
if(process.env.N5_BROWSER_TEST!=='true'){console.log(JSON.stringify({result:'N5_CONTEXT_READER_RESPONSES_VERIFIED',checks}));return;}
const origin=process.env.TERRITORIAL_TEST_ORIGIN||'http://127.0.0.1:3050';assert.ok(['127.0.0.1','localhost'].includes(new URL(origin).hostname));
const backend=process.env.TERRITORIAL_TEST_BACKEND||path.resolve(__dirname,'../../api-uscate-back'),output=process.env.N5_EVIDENCE_DIR||path.resolve(__dirname,'../../.tmp/n5-context-browser');fs.mkdirSync(output,{recursive:true});
const {default:puppeteer}=await import(pathToFileURL(path.join(backend,'node_modules/puppeteer/lib/puppeteer/puppeteer.js')).href);browser=await puppeteer.launch({headless:true});const scenarios=[];
for(const mode of ['context-mismatch','results-mismatch','map-mismatch','map-view','history-mismatch','report-flow','report-uncertain']){
 const session=await browser.createBrowserContext(),page=await session.newPage(),errors=[],requests=[],posts=[];let saved=false,uncertain=true;
 const bytes=Buffer.from('%PDF-1.7\nFictitious context-bound report\n'),fileHash=createHash('sha256').update(bytes).digest('hex'),id='77777777-7777-4777-8777-777777777777';
 const report={id,versionId:fixture.neiva.publication.id,versionNumber:1,format:'pdf',contentHash:'a'.repeat(64),filename:'neiva-concejo-2023-fixture.pdf',requestedByEmail:'member@example.test',state:'AVAILABLE',createdAt:new Date().toISOString(),expiresAt:new Date(Date.now()+86400000).toISOString(),bytes:bytes.length,fileHash,errorCode:null,downloadable:true};
 await session.setCookie({name:'auth-token',value:'synthetic-only',url:origin},{name:'user-permissions',value:'1',url:origin});
 await page.evaluateOnNewDocument(()=>{localStorage.setItem('auth-storage',JSON.stringify({state:{token:'synthetic-only',user:{id:'11111111-1111-4111-8111-111111111111',organizationId:'22222222-2222-4222-8222-222222222222',email:'member@example.test',fullName:'Synthetic member',role:{code:'ADMIN'},permissions:[{module:'DASHBOARD',canRead:true,canWrite:false,canDelete:false}]},impersonation:null},version:0}));const original=URL.createObjectURL;URL.createObjectURL=blob=>{window.__reportBlob=blob;return original.call(URL,blob);};HTMLAnchorElement.prototype.click=function(){if(this.download)window.__reportFilename=this.download;};});
 await page.setCacheEnabled(false);page.on('pageerror',e=>errors.push(e.message));await page.setRequestInterception(true);
 page.on('request',async request=>{try{const u=new URL(request.url());if(u.origin===origin||['blob:','data:'].includes(u.protocol))return request.continue();const headers={'access-control-allow-origin':origin,'access-control-allow-headers':'*','access-control-allow-methods':'GET, POST, OPTIONS','cache-control':'no-store'};if(request.method()==='OPTIONS')return request.respond({status:204,headers});if(!['xhr','fetch'].includes(request.resourceType()))return request.abort();const respond=(body,status=200)=>request.respond({status,headers,contentType:'application/json',body:JSON.stringify(body)});
 if(u.pathname.startsWith('/organization/territorial-data/')){
  requests.push({method:request.method(),path:u.pathname});
  if(u.pathname==='/organization/territorial-data/explorer')return respond(fixture.page());
  if(u.pathname===root)return respond({item:fixture.neiva,checkedAt:new Date().toISOString(),registrationGrantsResults:false});
  if(u.pathname===root+'/context')return respond({...fixture.context(),datasetCode:mode==='context-mismatch'?fixture.medellin.code:code});
  if(u.pathname===root+'/results')return respond({...fixture.results(),datasetCode:mode==='results-mismatch'?fixture.medellin.code:code});
  if(u.pathname===root+'/map'){if(mode==='map-mismatch')return respond({datasetCode:fixture.medellin.code});if(mode==='map-view'){const boundary=require(path.join(backend,'dist/src/modules/platform/territorial-map.util.js')).municipalBoundary();return respond({...boundary,version:fixture.results().version,territoryCode:'41001',granularity:'MUNICIPAL',datasetCode:code,availability:{municipality:true,submunicipalResults:false,electoralHeatmap:false,participation:false,votersByAge:false}});}return respond({message:'Cartography outside navigation test'},503);}
  if(u.pathname===root+'/reports'&&request.method()==='GET')return respond({items:saved?[report]:[],next:null,datasetCode:mode==='history-mismatch'?fixture.medellin.code:code});
  if(u.pathname===root+'/reports'&&request.method()==='POST'){const body=JSON.parse(request.postData());posts.push(body);saved=true;if(mode==='report-uncertain'&&uncertain){uncertain=false;return respond({message:'Synthetic uncertain write'},503);}return respond({id,datasetCode:code,state:'PENDING'},202);}
  if(u.pathname===root+'/reports/'+id+'/download')return request.respond({status:200,headers,contentType:'application/pdf',body:bytes});
  throw Error('Unexpected unbound territorial route '+u.pathname);
 }
 if(request.method()!=='GET')throw Error('Unexpected write '+u.pathname);
 return respond(u.pathname==='/branding'?{applicationName:'Zyron',primaryColor:'#1E4FD8',secondaryColor:'#22B8CF',accentColor:'#22B8CF'}:[]);
 }catch(e){errors.push(e.message);if(!request.isInterceptResolutionHandled())await request.abort();}});
 const selected='section[aria-label="Resultados del contexto seleccionado"]';
 async function click(label,scope='body'){const h=await page.evaluateHandle((s,t)=>Array.from(document.querySelector(s).querySelectorAll('button')).find(b=>b.textContent===t),scope,label);assert.ok(h.asElement(),'Missing '+label+' in '+mode);await page.waitForFunction(n=>!n.disabled,{},h.asElement());await h.asElement().evaluate(n=>n.scrollIntoView({block:'center'}));await h.asElement().click();await h.dispose();}
 const wait=t=>page.waitForFunction(t=>document.body.innerText.includes(t),{},t);
 await page.setViewport({width:1440,height:1000});await page.goto(origin+'/territorio/resultados-electorales',{waitUntil:'networkidle2',timeout:60000});await page.waitForSelector('article[aria-label="Contexto NEIVA_CONCEJO_2023"]');await click('Consultar resultados de Neiva');
 if(mode==='context-mismatch'||mode==='results-mismatch'){await wait('No pudimos comprobar la versión vigente.');assert.equal(await page.$(selected+' table:has(caption)'),null);if(mode==='context-mismatch')assert.equal(requests.some(r=>r.path===root+'/results'),false);}
  else{await page.waitForSelector(selected+' table:has(caption)');if(mode==='map-mismatch')await wait('No pudimos comprobar el mapa de referencia.');if(mode==='history-mismatch')await wait('No pudimos consultar el historial.');if(mode==='map-view'){await page.waitForSelector('section[aria-label="Mapa municipal de referencia"] svg path');assert.ok(await page.$eval('section[aria-label="Mapa municipal de referencia"] svg path',n=>n.getAttribute('d').length>1000));}
  if(mode.startsWith('report-')){const history='section[aria-label="Historial de informes municipales"]';await click('Solicitar PDF',history);if(mode==='report-uncertain'){await wait('No pudimos completar la operación.');await click('Solicitar PDF',history);await page.waitForFunction(s=>!document.querySelector(s).innerText.includes('Comprobando acceso y procesando'),{},history);assert.equal(posts.length,2);assert.deepEqual(posts[0],posts[1]);}
   await wait('PDF · Disponible');await click('Descargar archivo',history);await page.waitForFunction(()=>Boolean(window.__reportBlob&&window.__reportFilename));const copied=await page.evaluate(async()=>({filename:window.__reportFilename,bytes:Array.from(new Uint8Array(await window.__reportBlob.arrayBuffer()))}));assert.equal(copied.filename,report.filename);assert.equal(createHash('sha256').update(Buffer.from(copied.bytes)).digest('hex'),fileHash);assert.equal(requests.some(r=>r.path===root+'/reports/'+id+'/download'),true);}
 }
 assert.deepEqual(errors,[]);assert.ok(requests.every(r=>r.path.startsWith('/organization/territorial-data/explorer')));assert.ok(posts.every(p=>p.versionId===fixture.neiva.publication.id&&p.contentHash==='a'.repeat(64)));scenarios.push({mode,contextBoundRequests:requests.length,reportPostRequests:posts.length,downloadCheckedInMemory:mode.startsWith('report-')});await session.close();
}
const evidence={result:'N5_2_CONTEXT_READERS_BROWSER_VERIFIED',checkedAt:new Date().toISOString(),responseChecks:checks,scenarios,compiledNext:true,apiAndWorkerMocked:true,syntheticData:true,noJavascriptErrors:true,noLegacyImplicitRoutes:true,productionRequests:0,realPdfGenerationChecked:false};fs.writeFileSync(path.join(output,'evidence.json'),JSON.stringify(evidence,null,2));console.log(JSON.stringify(evidence));
})().catch(e=>{console.error(e.stack);process.exitCode=1;}).finally(async()=>{if(browser)await browser.close();});
