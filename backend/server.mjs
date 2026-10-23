import http from 'node:http';
import dns from 'node:dns/promises';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import { mkdtemp, rm, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { inspectWebsite, normalizeWebsite } from './readiness.mjs';

// Private single-instance build service. Build slots and artifacts are ephemeral.
// Before exposing to untrusted traffic configure Cloud Run max instances=1,
// request/concurrency limits, per-instance disk budgets and a real durable store.
const __dirname=path.dirname(fileURLToPath(import.meta.url));
const worker=path.resolve(__dirname,'../android-worker/build.py');
const MAX_JSON=3*1024*1024;
const BUILD_TTL=60*60*1000;
const PROOF_TTL=30*60*1000;
const challenges=new Map(), jobs=new Map(), windows=new Map();
let running=0;
function send(res,code,obj,headers={}){
 res.writeHead(code,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(obj));
}
function limiter(ip,kind,limit,windowMs){
 const key=kind+':'+ip,now=Date.now(),old=windows.get(key);
 const item=old&&old.until>now?old:{count:0,until:now+windowMs};item.count++;windows.set(key,item);
 return item.count>limit;
}
function same(a,b){if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y);}
async function readJSON(req,max=MAX_JSON){
 if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(Error('Expected JSON content type.'),{httpCode:415});
 let bytes=0;const parts=[];
 for await(const chunk of req){bytes+=chunk.length;if(bytes>max)throw Object.assign(Error('Request payload too large.'),{httpCode:413});parts.push(chunk);}
 try{return JSON.parse(Buffer.concat(parts).toString('utf8'));}
 catch{throw Object.assign(Error('Invalid JSON.'),{httpCode:400});}
}
const normalize=raw=>normalizeWebsite(raw).toString();
function prune(){
 const now=Date.now();
 for(const [id,c] of challenges){if(c.expires<now)challenges.delete(id);}
 for(const [id,j] of jobs){if(j.expires<now&&j.state!=='building'){jobs.delete(id);if(j.dir)rm(j.dir,{recursive:true,force:true}).catch(()=>{});}}
 for(const [id,w] of windows){if(w.until<now)windows.delete(id);}
}
function jobView(job){return {id:job.id,state:job.state,stage:job.stage,createdAt:new Date(job.created).toISOString(),expiresAt:new Date(job.expires).toISOString(),packageName:job.packageName,error:job.error||null,files:job.state==='ready'?['apk','aab','key-backup']:[]};}
const names={apk:{name:'android-app.apk',type:'application/vnd.android.package-archive'},aab:{name:'android-app.aab',type:'application/octet-stream'},'key-backup':{name:'signing-key-backup.zip',type:'application/zip'}};
async function runBuild(job,spec){
 job.state='building';job.stage='Preparing Android project';running++;
 try{
  job.dir=await mkdtemp(path.join(tmpdir(),'appweld-'));
  const fs=await import('node:fs/promises');
  const specPath=path.join(job.dir,'spec.json');
  await fs.writeFile(specPath,JSON.stringify(spec),{mode:0o600});
  const p=spawn(process.env.PYTHON_BIN||'python3',[worker,specPath,job.dir],{stdio:['ignore','pipe','pipe'],env:{...process.env,PYTHONUNBUFFERED:'1'}});
  let stderr='';
  p.stdout.resume(); // Drain build logs without buffering secrets or unbounded memory.
  p.stderr.on('data',b=>{stderr=(stderr+b).slice(-3000);});
  const timeout=setTimeout(()=>{p.kill('SIGKILL');},Number(process.env.APPWELD_BUILD_TIMEOUT_MS||900000));
  const exit=await new Promise((resolve,reject)=>{p.on('error',reject);p.on('close',resolve);});clearTimeout(timeout);
  if(exit!==0)throw Error('Android compilation failed. Check Gradle/SDK logs in the private build environment.');
  for(const item of Object.values(names)){const f=path.join(job.dir,'dist',item.name);if((await stat(f)).size<1024)throw Error('Generated build file is unexpectedly small.');}
  job.state='ready';job.stage='Signed APK & AAB ready';
  // The build specification includes the customer's private icon; erase it after compilation.
  await fs.rm(specPath,{force:true});
 }catch(error){job.state='failed';job.stage='Build failed';job.error=String(error.message||error).slice(0,200);}
 finally{running--;}
}
export function makeServer({inspect=inspectWebsite,lookupTxt=dns.resolveTxt,buildRunner=runBuild}={}){
 return http.createServer(async(req,res)=>{
  prune();
  const origin='http://localhost';const u=new URL(req.url||'/',origin),route=u.pathname;
  const ip=req.socket.remoteAddress||'unknown';
  if(req.method==='GET'&&route==='/healthz')return send(res,200,{ok:true,buildsEnabled:process.env.APPWELD_BUILDS_ENABLED==='true',running});
  if(req.method==='GET'&&route==='/api/capabilities')return send(res,200,{buildsEnabled:process.env.APPWELD_BUILDS_ENABLED==='true',requiresDomainVerification:true,price:0,temporaryDownloadMinutes:60});
  try{
   if(req.method==='POST'&&route==='/api/readiness'){
    if(limiter(ip,'readiness',10,60000))return send(res,429,{ok:false,error:'Too many checks.'});
    const d=await readJSON(req,4096);return send(res,200,{ok:true,result:await inspect(d.url)});
   }
   if(req.method==='POST'&&route==='/api/ownership/start'){
    if(limiter(ip,'ownership',5,60*60*1000))return send(res,429,{ok:false,error:'Too many verification requests.'});
    const d=await readJSON(req,4096),url=normalizeWebsite(d.url);const id=randomBytes(18).toString('hex'),token='appweld-'+randomBytes(16).toString('hex');
    challenges.set(id,{host:url.hostname,token,expires:Date.now()+PROOF_TTL,verified:false});
    return send(res,200,{ok:true,challengeId:id,type:'DNS_TXT',host:`_appweld.${url.hostname}`,value:token,expiresInMinutes:30});
   }
   if(req.method==='POST'&&route==='/api/ownership/verify'){
    if(limiter(ip,'verify',12,60*60*1000))return send(res,429,{ok:false,error:'Too many verification attempts.'});
    const d=await readJSON(req,4096),c=challenges.get(d.challengeId);
    if(!c||c.expires<Date.now())return send(res,404,{ok:false,error:'Verification challenge expired. Start again.'});
    let records;try{records=await lookupTxt(`_appweld.${c.host}`);}catch{return send(res,422,{ok:false,error:'DNS TXT record not found yet. DNS changes can take time.'});}
    c.verified=records.some(parts=>same(parts.join(''),c.token));
    return send(res,c.verified?200:422,c.verified?{ok:true,verified:true}:{ok:false,error:'TXT record does not match the verification value.'});
   }
   if(req.method==='POST'&&route==='/api/build'){
    if(process.env.APPWELD_BUILDS_ENABLED!=='true')return send(res,503,{ok:false,error:'Android builds are not enabled on this server yet.'});
    if(limiter(ip,'build',3,60*60*1000))return send(res,429,{ok:false,error:'Build limit reached. Try again later.'});
    if(running>=1||[...jobs.values()].some(j=>j.state==='building'||j.state==='queued'))return send(res,429,{ok:false,error:'Build worker is busy. Retry after the current build.'});
    const d=await readJSON(req);const url=normalizeWebsite(d.url),c=challenges.get(d.challengeId);
    if(!c||!c.verified||c.expires<Date.now()||c.host!==url.hostname)return send(res,403,{ok:false,error:'Verify your website domain before building.'});
    if(!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(String(d.packageName||'')))return send(res,422,{ok:false,error:'Enter a valid Android package ID (for example com.yourbrand.app).'});
    if(typeof d.appName!=='string'||!d.appName.trim()||d.appName.length>28||!/^#[0-9a-fA-F]{6}$/.test(d.splashColor||''))return send(res,422,{ok:false,error:'App name and splash color are required.'});
    if(typeof d.iconPngBase64!=='string'||!/^data:image\/png;base64,/.test(d.iconPngBase64)||d.iconPngBase64.length>2_800_000)return send(res,422,{ok:false,error:'A valid 512px PNG icon is required.'});
    // Do not compile unreachable websites; check pinned DNS and redirects first.
    const check=await inspect(url.href);
    if(!check||check.httpStatus<200||check.httpStatus>=400)return send(res,422,{ok:false,error:'Website is not reachable.'});
    if(check.hostname!==url.hostname)return send(res,422,{ok:false,error:'Website redirects to a different host. Enter and verify the final HTTPS domain instead.'});
    const id=randomBytes(16).toString('hex'),token=randomBytes(32).toString('hex');
    const job={id,token,created:Date.now(),expires:Date.now()+BUILD_TTL,state:'queued',stage:'Queued',packageName:d.packageName,error:null,dir:null};jobs.set(id,job);
    challenges.delete(d.challengeId);
    const spec={url:url.href,appName:d.appName.trim(),packageName:d.packageName,splashColor:d.splashColor,iconPngBase64:d.iconPngBase64};
    setImmediate(()=>buildRunner(job,spec));
    return send(res,202,{ok:true,id,token,...jobView(job)});
   }
   const match=route.match(/^\/api\/build\/([a-f0-9]{32})(?:\/(status|download\/(apk|aab|key-backup)))?$/);
   if(req.method==='GET'&&match){
    const job=jobs.get(match[1]);const token=req.headers['x-appweld-build-token']||u.searchParams.get('token');
    if(!job||!same(job.token,token))return send(res,404,{ok:false,error:'Build not found.'});
    if(job.expires<Date.now())return send(res,410,{ok:false,error:'Download expired.'});
    if(match[2]==='status')return send(res,200,{ok:true,...jobView(job)});
    if(match[3]){
     if(job.state!=='ready')return send(res,409,{ok:false,error:'Build is not ready.'});
     const file=names[match[3]],fp=path.join(job.dir,'dist',file.name);const data=await readFile(fp);
     res.writeHead(200,{'Content-Type':file.type,'Content-Disposition':`attachment; filename="${file.name}"`,'Content-Length':data.length,'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});res.end(data);return;
    }
   }
   return send(res,404,{ok:false,error:'Not found.'});
  }catch(e){return send(res,e.httpCode||422,{ok:false,error:String(e.message||'Request failed.').slice(0,180)});}
 });
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const port=Number(process.env.PORT||8080);makeServer().listen(port,'0.0.0.0',()=>console.log(`Appweld engine listening on ${port}`));
}
