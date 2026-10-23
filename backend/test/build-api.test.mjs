import test from 'node:test';
import assert from 'node:assert/strict';
import { makeServer } from '../server.mjs';

const original=process.env.APPWELD_BUILDS_ENABLED;
process.env.APPWELD_BUILDS_ENABLED='true';
let record;
const server=makeServer({
 inspect:async raw=>({url:raw,hostname:new URL(raw).hostname,httpStatus:200,title:'Example',mobileViewportDetected:true}),
 lookupTxt:async()=> record?[[record]]:[],
 checkMeta:async(host,token)=>token==='appweld-meta-test',
 buildRunner:async(job)=>{job.state='failed';job.error='SDK absent in mock environment';job.stage='failed';},
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const endpoint=`http://127.0.0.1:${server.address().port}`;
const post=async(p,d)=>{const r=await fetch(endpoint+p,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(d)});return [r.status,await r.json()]};
test('build must be disabled without DNS ownership proof',async()=>{
 const [s,d]=await post('/api/build',{url:'https://example.org',packageName:'com.example.app'});
 assert.equal(s,403);assert.match(d.error,/Verify your website/);
});
test('DNS proof then start build returns token; invalid input rejected',async()=>{
 const [start,d]=await post('/api/ownership/start',{url:'https://example.org'});
 assert.equal(start,200);record=d.value;assert.match(d.metaTag,/<meta name=\"appweld-verification\"/);
 const [code,proof]=await post('/api/ownership/verify',{challengeId:d.challengeId});assert.equal(code,200);assert.equal(proof.verified,true);
 const [bad,body]=await post('/api/build',{url:'https://example.org',challengeId:d.challengeId,packageName:'BAD ID'});
 assert.equal(bad,422);assert.match(body.error,/package ID/i);
});
test('health route reports service state',async()=>{
 const r=await fetch(endpoint+'/healthz');assert.equal(r.status,200);assert.equal((await r.json()).ok,true);
});
test.after(async()=>{await new Promise(resolve=>server.close(resolve));process.env.APPWELD_BUILDS_ENABLED=original;});
