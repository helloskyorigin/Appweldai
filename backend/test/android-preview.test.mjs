import test from 'node:test';
import assert from 'node:assert/strict';
import {Readable} from 'node:stream';
import {createHash} from 'node:crypto';
import {makeCloudServer} from '../cloud-server.mjs';
function testStore(){
 const proofs=new Map(),jobs=new Map();
 return {
 async challenge(id,p){proofs.set(id,{...p,verified:false,used:false,expiryMs:Date.now()+600000});},
 async getChallenge(id){return proofs.get(id);},
 async verifyChallenge(id){proofs.get(id).verified=true;},
 async reserve({id,token,host,challengeId}){
  const p=proofs.get(challengeId);if(!p?.verified||p.used||p.host!==host)throw Error('Not verified');
  p.used=true;jobs.set(id,{id,tokenHash:createHash('sha256').update(token).digest('hex'),state:'queued',expiryMs:Date.now()+600000,previewState:'not_configured'});
 },
 async uploadSpec(){},async deleteSpec(){},async status(id){return jobs.get(id)},
 async patch(id,fields){Object.assign(jobs.get(id),fields);},
 async claimPreview(id){const j=jobs.get(id);if(j.state!=='ready'||j.previewState!=='not_configured')return false;j.previewState='uploading';return true;},
 async readArtifact(){const content=Buffer.alloc(1500,42);return{size:content.length,stream:Readable.from([content])};}
 };
}
function icon(){const b=Buffer.alloc(32);b.write('89504e470d0a1a0a','hex');b.writeUInt32BE(512,16);b.writeUInt32BE(512,20);return 'data:image/png;base64,'+b.toString('base64');}
async function scenario(enabled){
 const store=testStore();let uploads=0;
 const server=makeCloudServer({store,config:{APPWELD_BUILDS_ENABLED:'true',APPWELD_FREE_TEST_DOWNLOADS:'true',APPWELD_ANDROID_PREVIEW_ENABLED:enabled?'true':'false',APPETIZE_API_TOKEN:enabled?'server-secret':''},
  inspect:async url=>({hostname:new URL(url).hostname,httpStatus:200}),txtLookup:async()=>[],metaCheck:async()=>true,
  runJob:async id=>store.patch(id,{state:'ready',stage:'Completed'}),
  uploadPreview:async(apk,key)=>{assert.equal(apk.length,1500);assert.equal(key,'server-secret');uploads++;return{buildId:'sampleBuild_12345'};}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+server.address().port;
 const post=async(path,body,token)=>{const r=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json',...(token?{'X-Appweld-Build-Token':token}:{})},body:JSON.stringify(body||{})});return{status:r.status,data:await r.json()}};
 try{
  const proof=(await post('/api/ownership/start',{url:'https://example.org'})).data;
  assert.equal((await post('/api/ownership/verify',{challengeId:proof.challengeId})).status,200);
  const job=(await post('/api/build',{url:'https://example.org',appName:'Sample',packageName:'com.example.app',splashColor:'#ffffff',iconPngBase64:icon(),challengeId:proof.challengeId})).data;
  assert.ok(job.token);
  assert.equal((await post('/api/build/'+job.id+'/preview',{},'bad-token')).status,404);
  const cap=await fetch(base+'/api/capabilities').then(r=>r.json());assert.equal(cap.realAndroidPreviewAvailable,enabled);
  const res=await post('/api/build/'+job.id+'/preview',{},job.token);assert.equal(res.status,enabled?200:503);
  if(enabled){
   assert.equal(res.data.buildId,'sampleBuild_12345');
   const status=await fetch(base+'/api/build/'+job.id+'/status',{headers:{'X-Appweld-Build-Token':job.token}}).then(r=>r.json());
   assert.equal(status.previewState,'ready');assert.equal(status.previewBuildId,'sampleBuild_12345');
   const again=await post('/api/build/'+job.id+'/preview',{},job.token);
   assert.equal(again.status,200);assert.equal(again.data.reused,true);assert.equal(uploads,1);
  }else assert.equal(uploads,0);
 }finally{await new Promise(r=>server.close(r));}
}
test('signed APK preview uploads once and never without correct secret build token',()=>scenario(true));
test('preview disabled when provider credentials absent',()=>scenario(false));
