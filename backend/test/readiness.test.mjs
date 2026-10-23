import test from 'node:test';
import assert from 'node:assert/strict';
import {publicIPv4,normalizeWebsite,resolveSafeIPv4,inspectWebsite} from '../readiness.mjs';
test('deny localhost, metadata, private and reserved addresses',()=>{
 for(const address of ['127.0.0.1','169.254.169.254','10.0.0.1','192.168.1.2','172.19.0.2','100.64.5.5','198.51.100.20','203.0.113.8','192.0.2.5','224.1.1.1'])assert.equal(publicIPv4(address),false,address);
 assert.equal(publicIPv4('8.8.8.8'),true);
});
test('reject unsafe URL formats',()=>{
 for(const url of ['http://example.org','http://localhost','https://127.0.0.1/','https://user:pass@example.com','https://example.com:8080','file:///etc/passwd','https://localhost.local'])assert.throws(()=>normalizeWebsite(url),url);
 assert.equal(normalizeWebsite('example.org').href,'https://example.org/');
});
test('block DNS rebinding style private resolution',async()=>{
 await assert.rejects(resolveSafeIPv4('test.example', async()=>[{address:'127.0.0.1'}]));
});
test('inspection reports real HTML signals, not invented guarantees',async()=>{
 const lookup=async()=>[{address:'8.8.8.8'}];
 const fetcher=async()=>({status:200,html:'<html><head><title>My Studio</title><meta name="viewport" content="width=device-width"></head></html>'});
 const out=await inspectWebsite('https://example.org',{lookup,fetcher});
 assert.equal(out.httpStatus,200);assert.equal(out.title,'My Studio');assert.equal(out.mobileViewportDetected,true);assert.equal(out.playStoreApproval,'not_checked');
});
test('validate redirected target again',async()=>{
 const lookup=async()=>[{address:'8.8.8.8'}];
 await assert.rejects(inspectWebsite('https://example.org',{lookup,fetcher:async()=>({status:302,location:'http://169.254.169.254/metadata'})}));
});
