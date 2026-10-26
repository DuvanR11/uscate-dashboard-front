/* eslint-disable @typescript-eslint/no-require-imports -- Isolated wire-contract checks. */
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),ts=require('typescript');
const target={exports:{}};const js=ts.transpileModule(fs.readFileSync(path.join(__dirname,'../src/lib/api/territorial-regional-sources.ts'),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('module','exports','require',js)(target,target.exports,()=>({}));
const {regionalFileLimits:limits,assertRegionalFile:check}=target.exports;let checks=0;
const small=limits({}),large=limits({uploadLimits:{pdfBytes:10485760,zipBytes:33554432,largeZipEnabled:true}});
assert.equal(small.zipBytes,10485760);checks++;
assert.throws(()=>check({name:'original.zip',size:29370830},small));checks++;
assert.equal(check({name:'original.zip',size:29370830},large),'zip');checks++;
assert.equal(check({name:'original.ZIP',size:33554432},large),'zip');checks++;
for(const file of [{name:'too-large.zip',size:33554433},{name:'still-limited.pdf',size:10485761},{name:'empty.zip',size:0},{name:'unknown.exe',size:100},{name:'bad.zip',size:NaN},{name:'bad.zip',size:1.1}]){assert.throws(()=>check(file,large));checks++;}
for(const value of [null,{}, {pdfBytes:10485760,zipBytes:67108864,largeZipEnabled:true},{pdfBytes:10485760,zipBytes:33554432,largeZipEnabled:false},{pdfBytes:10485760,zipBytes:33554432,largeZipEnabled:'true'}]){assert.throws(()=>limits({uploadLimits:value}));checks++;}
console.log(JSON.stringify({result:'REGIONAL_LARGE_UPLOAD_WIRE_CONTRACT_VERIFIED',checks,legacyFallback:true,unknownLimitsRejected:true}));
