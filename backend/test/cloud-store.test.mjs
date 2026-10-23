import test from 'node:test';
import assert from 'node:assert/strict';
import {CloudStore,hashToken} from '../cloud-store.mjs';
function fakeDb(){
 const docs=new Map();
 return {docs,collection(coll){return {doc(id){const key=coll+'/'+id;return {key,async get(){return{exists:docs.has(key),data:()=>docs.get(key)}},async create(v){if(docs.has(key))throw Error('already exists');docs.set(key,v)},async update(v){docs.set(key,{...docs.get(key),...v})}}}}},
 async runTransaction(callback){const writes=[];const result=await callback({get:async ref=>ref.get(),set:(ref,v)=>writes.push(()=>docs.set(ref.key,{...docs.get(ref.key),...v})),update:(ref,v)=>writes.push(()=>docs.set(ref.key,{...docs.get(ref.key),...v})),create:(ref,v)=>writes.push(()=>docs.set(ref.key,v))});writes.forEach(f=>f());return result}};
}
const noStorage={file(){return{async save(){},async delete(){}}}};
test('verified challenge is consumed, job persists outside process, daily quota enforced',async()=>{
 const db=fakeDb(),now=()=>Date.UTC(2026,9,23,12),store=new CloudStore({db,bucket:noStorage,now,dailyLimit:2,domainLimit:1});
 const challengeId='b'.repeat(36),id='a'.repeat(32),token='secret-token';
 await store.challenge(challengeId,{host:'example.org',token:'dns-token'});
 await assert.rejects(store.reserve({id,token,host:'example.org',challengeId,packageName:'com.example.app'}),/Verify ownership/);
 await store.verifyChallenge(challengeId);
 await store.reserve({id,token,host:'example.org',challengeId,packageName:'com.example.app'});
 const fromOtherInstance=new CloudStore({db,bucket:noStorage,now});
 const state=await fromOtherInstance.status(id);
 assert.equal(state.state,'queued');assert.equal(state.tokenHash,hashToken(token));assert.equal(state.tokenHash.includes(token),false);
 await assert.rejects(store.reserve({id:'c'.repeat(32),token,host:'example.org',challengeId,packageName:'com.example.app'}),/Verify ownership/);
 const otherChallenge='e'.repeat(36);await store.challenge(otherChallenge,{host:'example.org',token:'other'});await store.verifyChallenge(otherChallenge);
 await assert.rejects(store.reserve({id:'d'.repeat(32),token,host:'example.org',challengeId:otherChallenge,packageName:'com.example.app'}),/Daily build quota/);
});
