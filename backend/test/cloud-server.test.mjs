import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {makeCloudServer} from '../cloud-server.mjs';
import {CloudStore,hashToken} from '../cloud-store.mjs';
const bufferIcon=()=>{
 const buf=Buffer.alloc(32);buf.write('89504e470d0a1a0a','hex');buf.writeUInt32BE(512,16);buf.writeUInt32BE(512,20);
 return 'data:image/png;base64,'+buf.toString('base64');
};
const fakeStore=()=>{
 const proofs=new Map(),jobs=new Map(),files=new Map(),limits=new Map();
 return {
  async challenge(id,data){proofs.set(id,{...data,expiryMs:Date.now()+3600000,verified:false,used:false})},
  async getChallenge(id){return proofs.get(id)||null},
  async verifyChallenge(id){proofs.get(id).verified=true},
  async reserve({id,token,host,challengeId,packageName}){
   const p=proofs.get(challengeId);if(!p?.verified||p.used||p.host!==host)throw Error('Owner not verified');
   if(limits.get(host)>=1)throw Error('Daily build quota reached');
   p.used=true;limits.set(host,1);jobs.set(id,{id,tokenHash:hashToken(token),state:'queued',stage:'Queued',packageName,expiryMs:Date.now()+3600000,previewState:'not_configured'});
  },
  async uploadSpec(id,sp){files.set(id,sp)},async deleteSpec(id){files.delete(id)},
  async patch(id,v){Object.assign(jobs.get(id),v)},async status(id){return jobs.get(id)},
  async readArtifact(id,name){return{size:1200,stream:{on(){return this},pipe(res){res.end('test')}}}}
 };
};
async function app(store,config,runJob=async()=>{}){
 const server=makeCloudServer({store,config,runJob,inspect:async u=>({hostname:new URL(u).hostname,httpStatus:200,title:'Test',mobileViewportDetected:true}),txtLookup:async()=>[],metaCheck:async()=>true});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));return{base:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(r=>server.close(r))};
}
const post=async(base,url,body)=>{const r=await fetch(base+url,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});return[r.status,await r.json()]};
const jobSpec=(challengeId)=>({url:'https://testsite.example.org',appName:'Test App',packageName:'com.testsite.android',splashColor:'#D8E6B5',iconPngBase64:bufferIcon(),challengeId});
test('anonymous build disabled unless explicit opt-in; cloud API reports locked downloads',async()=>{
 const instance=await app(fakeStore(),{APPWELD_BUILDS_ENABLED:'false'});
 try{const [status]=await post(instance.base,'/api/build',jobSpec('x'));assert.equal(status,503);
 const capabilities=await fetch(instance.base+'/api/capabilities').then(r=>r.json());assert.equal(capabilities.downloadsLocked,true);assert.equal(capabilities.realAndroidPreviewAvailable,false);
 }finally{await instance.close()}
});
test('requires verified domain, prevents bypass of pre-payment artifact lock',async()=>{
 const shared=fakeStore(),config={APPWELD_BUILDS_ENABLED:'true'},inst=await app(shared,config);
 try{
  let [code,noProof]=await post(inst.base,'/api/build',jobSpec('missing'));assert.equal(code,422);
  let [start,proof]=await post(inst.base,'/api/ownership/start',{url:'https://testsite.example.org'});assert.equal(start,200);
  let [verified,result]=await post(inst.base,'/api/ownership/verify',{challengeId:proof.challengeId});assert.equal(verified,200);
  let [accepted,job]=await post(inst.base,'/api/build',jobSpec(proof.challengeId));assert.equal(accepted,202);assert.equal(job.downloadsLocked,true);
  const status=await fetch(inst.base+`/api/build/${job.id}/status`,{headers:{'X-Appweld-Build-Token':job.token}}).then(r=>r.json());assert.equal(status.state,'queued');assert.deepEqual(status.files,[]);
  const noToken=await fetch(inst.base+`/api/build/${job.id}/status`);assert.equal(noToken.status,404);
  const locked=await fetch(inst.base+`/api/build/${job.id}/download/apk`,{headers:{'X-Appweld-Build-Token':job.token}});assert.equal(locked.status,403);
  const [reused]=await post(inst.base,'/api/build',jobSpec(proof.challengeId));assert.equal(reused,422);
 }finally{await inst.close()}
});
test('store token hashing does not expose raw download capability',()=>{assert.equal(hashToken('foo'),createHash('sha256').update('foo').digest('hex'));assert.equal(hashToken('foo').includes('foo'),false)});
