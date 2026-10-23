/** Durable Appweld API. This is separate from legacy single-instance dev server.
 * Customer-facing downloads are intentionally LOCKED until a future verified
 * payment entitlement exists. An admin-only QA flag allows private testing.
 */
import http from 'node:http';
import dns from 'node:dns/promises';
import {randomBytes,timingSafeEqual} from 'node:crypto';
import {inspectWebsite,normalizeWebsite,resolveSafeIPv4,fetchPagePinned} from './readiness.mjs';
import {googleStore,executeCloudRunJob,hashToken,safeId} from './cloud-store.mjs';
const TYPES={apk:['android-app.apk','application/vnd.android.package-archive'],aab:['android-app.aab','application/octet-stream'],'key-backup':['signing-key-backup.zip','application/zip']};
const MAX_PREVIEW_APK=60*1024*1024;
export async function uploadToAppetize(apk,apiToken){
 if(!apiToken||!Buffer.isBuffer(apk)||apk.length<1024||apk.length>MAX_PREVIEW_APK)throw Error('Invalid APK or missing provider token.');
 const form=new FormData();form.append('platform','android');form.append('file',new Blob([apk],{type:'application/vnd.android.package-archive'}),'appweld.apk');
 const response=await fetch('https://api.appetize.io/v1/apps',{method:'POST',headers:{'X-API-KEY':apiToken},body:form,signal:AbortSignal.timeout(90000)});
 if(!response.ok)throw Error('Android preview provider rejected the APK.');
 const data=await response.json(),buildId=data.buildId||data.publicKey;
 if(typeof buildId!=='string'||!/^[a-zA-Z0-9_-]{5,120}$/.test(buildId))throw Error('Invalid Android preview identifier.');
 return {buildId};
}
async function loadPreviewApk(store,id){
 const asset=await store.readArtifact(id,'android-app.apk');
 if(asset.size<1024||asset.size>MAX_PREVIEW_APK)throw Error('APK is too large to preview.');
 let size=0;const chunks=[];
 for await(const chunk of asset.stream){size+=chunk.length;if(size>MAX_PREVIEW_APK)throw Error('APK exceeds preview limit.');chunks.push(chunk);}
 return Buffer.concat(chunks);
}

const MAX_BODY=3*1024*1024;
const eq=(a,b)=>{if(typeof a!=='string'||typeof b!=='string')return false;const x=Buffer.from(a),y=Buffer.from(b);return x.length===y.length&&timingSafeEqual(x,y)};
function reply(res,status,body){res.writeHead(status,{'content-type':'application/json; charset=utf-8','cache-control':'no-store','x-content-type-options':'nosniff'});res.end(JSON.stringify(body));}
function view(j,freeDownloads){const unlocked=freeDownloads&&j.state==='ready';return{id:j.id,state:j.state,stage:j.stage,packageName:j.packageName,expiresAt:new Date(j.expiryMs).toISOString(),error:j.error||null,files:unlocked?['apk','aab','key-backup']:[],downloadsLocked:!unlocked,previewState:j.previewState||'not_configured',previewBuildId:j.previewState==='ready'?j.previewBuildId||null:null};}
async function readJSON(req,limit=MAX_BODY){if(!String(req.headers['content-type']||'').startsWith('application/json'))throw Object.assign(Error('Use JSON content type'),{code:415});let n=0,chunks=[];for await(const part of req){n+=part.length;if(n>limit)throw Object.assign(Error('Request is too large'),{code:413});chunks.push(part)}try{return JSON.parse(Buffer.concat(chunks).toString('utf8'))}catch{throw Object.assign(Error('Malformed JSON'),{code:400})}}
async function metaProof(host,token){const url=normalizeWebsite('https://'+host+'/');const ip=await resolveSafeIPv4(url.hostname);const page=await fetchPagePinned(url,ip,{timeout:8000});if(page.status<200||page.status>=400||!page.html)return false;return (page.html.match(/<meta\b[^>]*>/gi)||[]).some(tag=>{let n=tag.match(/\bname\s*=\s*["']([^"']+)["']/i)?.[1],v=tag.match(/\bcontent\s*=\s*["']([^"']+)["']/i)?.[1];return n?.toLowerCase()==='appweld-verification'&&eq(v,token)});}
function checkedName(input){const value=String(input||'').trim();if(!value||value.length>28||/[\x00-\x1F]/.test(value))throw Error('App name must be 1–28 printable characters');return value}
function checkedPackage(input){const value=String(input||'');if(!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(value)||value.length>180)throw Error('Invalid Android package ID');return value}
function checkedIcon(input){if(typeof input!=='string'||!/^data:image\/png;base64,/.test(input)||input.length>2_800_000)throw Error('Provide the required 512px PNG app icon');const buffer=Buffer.from(input.slice('data:image/png;base64,'.length),'base64');if(buffer.length>2*1024*1024||buffer.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||buffer.readUInt32BE(16)!==512||buffer.readUInt32BE(20)!==512)throw Error('App icon must be a 512×512 PNG no larger than 2MB');return input}
function localLimiter(){const hits=new Map();return (key,limit,windowMs)=>{const now=Date.now(),x=hits.get(key);let h=x&&x.until>now?x:{count:0,until:now+windowMs};h.count++;hits.set(key,h);if(hits.size>4000)for(const[k,v]of hits)if(v.until<now)hits.delete(k);return h.count>limit;}}
export function makeCloudServer({store,runJob=executeCloudRunJob,inspect=inspectWebsite,txtLookup=dns.resolveTxt,metaCheck=metaProof,uploadPreview=uploadToAppetize,now=()=>Date.now(),config=process.env}){
 const limited=localLimiter();
 // Explicit free-test mode: only domain-verified owners holding their secret job token can download.
 const freeDownloads=config.APPWELD_BUILDS_ENABLED==='true'&&config.APPWELD_FREE_TEST_DOWNLOADS==='true';
 const previewEnabled=config.APPWELD_ANDROID_PREVIEW_ENABLED==='true'&&Boolean(config.APPETIZE_API_TOKEN);
 return http.createServer(async(req,res)=>{
  const pathname=new URL(req.url||'/', 'http://localhost').pathname;
  const ip=req.socket.remoteAddress||'unknown';
  if(req.method==='GET'&&pathname==='/healthz')return reply(res,200,{ok:true,service:'appweld-cloud',buildsEnabled:config.APPWELD_BUILDS_ENABLED==='true'});
  if(req.method==='GET'&&pathname==='/api/capabilities')return reply(res,200,{buildsEnabled:config.APPWELD_BUILDS_ENABLED==='true',requiresDomainVerification:true,price:0,temporaryDownloadMinutes:60,downloadsLocked:!freeDownloads,freeTestDownloadsEnabled:freeDownloads,realAndroidPreviewAvailable:previewEnabled});
  try {
    if(req.method==='POST'&&pathname==='/api/readiness'){
      if(limited('inspect:'+ip,8,60000))return reply(res,429,{ok:false,error:'Too many website checks'});
      const input=await readJSON(req,4096);return reply(res,200,{ok:true,result:await inspect(input.url)});
    }
    if(req.method==='POST'&&pathname==='/api/ownership/start'){
      if(limited('proof:'+ip,6,3600000))return reply(res,429,{ok:false,error:'Too many ownership requests'});
      const data=await readJSON(req,4096),u=normalizeWebsite(data.url);
      const id=randomBytes(18).toString('hex'),token='appweld-'+randomBytes(16).toString('hex');
      await store.challenge(id,{host:u.hostname,token});
      return reply(res,200,{ok:true,challengeId:id,type:'DNS_TXT_OR_HTML_META',host:`_appweld.${u.hostname}`,value:token,metaTag:`<meta name="appweld-verification" content="${token}">`,expiresInMinutes:30});
    }
    if(req.method==='POST'&&pathname==='/api/ownership/verify'){
      if(limited('verify:'+ip,12,3600000))return reply(res,429,{ok:false,error:'Too many verification attempts'});
      const input=await readJSON(req,4096),proof=await store.getChallenge(input.challengeId);
      if(!proof||proof.used||proof.expiryMs<=now())return reply(res,404,{ok:false,error:'Challenge missing or expired'});
      let dnsOk=false,metaOk=false;
      try{const records=await txtLookup(`_appweld.${proof.host}`);dnsOk=records.some(parts=>eq(parts.join(''),proof.token))}catch{}
      if(!dnsOk)try{metaOk=await metaCheck(proof.host,proof.token)}catch{}
      if(!dnsOk&&!metaOk)return reply(res,422,{ok:false,error:'Verification record not found yet'});
      await store.verifyChallenge(input.challengeId);
      return reply(res,200,{ok:true,verified:true,method:dnsOk?'dns_txt':'html_meta'});
    }
    if(req.method==='POST'&&pathname==='/api/build'){
      if(config.APPWELD_BUILDS_ENABLED!=='true')return reply(res,503,{ok:false,error:'Cloud build engine is not enabled yet'});
      if(limited('build:'+ip,4,3600000))return reply(res,429,{ok:false,error:'Too many build attempts'});
      const input=await readJSON(req);const url=normalizeWebsite(input.url),appName=checkedName(input.appName),packageName=checkedPackage(input.packageName),icon=checkedIcon(input.iconPngBase64);
      if(!/^#[\da-fA-F]{6}$/.test(input.splashColor||''))throw Error('Invalid splash screen color');
      const checked=await inspect(url.href);
      if(!checked||checked.hostname!==url.hostname||checked.httpStatus<200||checked.httpStatus>=400)throw Error('Website redirected or could not be verified. Use its final HTTPS address.');
      const id=randomBytes(16).toString('hex'),token=randomBytes(32).toString('hex');
      const spec={url:url.href,appName,packageName,splashColor:input.splashColor,iconPngBase64:icon};
      await store.reserve({id,token,host:url.hostname,challengeId:input.challengeId,packageName});
      try{await store.uploadSpec(id,spec);await runJob(id);}catch(error){await store.patch(id,{state:'failed',stage:'Build could not be scheduled',error:'Cloud build service unavailable; retry later.'});await store.deleteSpec(id).catch(()=>{});return reply(res,503,{ok:false,error:'Unable to schedule Android build. No files were created.'});}
      return reply(res,202,{ok:true,id,token,state:'queued',stage:'Queued',downloadsLocked:!freeDownloads,previewState:'not_configured'});
    }
    const match=pathname.match(/^\/api\/build\/([a-f0-9]{32})(?:\/(status|preview|download\/(apk|aab|key-backup)))?$/);
    if((req.method==='GET'||req.method==='POST')&&match){
      const job=await store.status(match[1]);const token=req.headers['x-appweld-build-token'];
      if(!job||job.expiryMs<=now()||!eq(job.tokenHash,hashToken(String(token||''))))return reply(res,404,{ok:false,error:'Build not found or expired'});
      if(match[2]==='status')return reply(res,200,{ok:true,...view(job,freeDownloads)});
      if(match[2]==='preview'&&req.method==='POST'){
        if(!previewEnabled)return reply(res,503,{ok:false,error:'Live Android preview is not configured.'});
        if(job.state!=='ready')return reply(res,409,{ok:false,error:'The APK must finish building first.'});
        if(job.previewState==='ready'&&job.previewBuildId)return reply(res,200,{ok:true,buildId:job.previewBuildId,reused:true});
        if(!await store.claimPreview(match[1]))return reply(res,409,{ok:false,error:'Preview is already starting or has been used.'});
        try {
          const apk=await loadPreviewApk(store,match[1]),result=await uploadPreview(apk,config.APPETIZE_API_TOKEN);
          if(!/^[a-zA-Z0-9_-]{5,120}$/.test(result.buildId))throw Error('Invalid preview response.');
          await store.patch(match[1],{previewState:'ready',previewBuildId:result.buildId});
          return reply(res,200,{ok:true,buildId:result.buildId});
        } catch {
          await store.patch(match[1],{previewState:'failed',previewBuildId:null});
          return reply(res,502,{ok:false,error:'The Android emulator could not be prepared.'});
        }
      }
      if(req.method!=='GET')return reply(res,405,{ok:false,error:'Method not allowed.'});

      if(match[3]){
        // Free testing is unlocked SERVER-SIDE, never by an editable browser flag.
        // Builds require domain ownership verification and daily quotas before creation.
        if(!freeDownloads)return reply(res,403,{ok:false,error:'Private test downloads are disabled on this server'});
        if(job.state!=='ready')return reply(res,409,{ok:false,error:'Android build not ready'});
        const [filename,mime]=TYPES[match[3]];
        const asset=await store.readArtifact(match[1],filename);
        res.writeHead(200,{'content-type':mime,'content-disposition':`attachment; filename="${filename}"`,'content-length':asset.size,'cache-control':'private, no-store','x-content-type-options':'nosniff'});
        asset.stream.on('error',()=>res.destroy());asset.stream.pipe(res);return;
      }
    }
    return reply(res,404,{ok:false,error:'Not found'});
  } catch(e){return reply(res,e.code||422,{ok:false,error:String(e.message||'Request failed').slice(0,180)})}
 });
}
if(process.argv[1]?.endsWith('/cloud-server.mjs')){
 const store=await googleStore();const app=makeCloudServer({store});app.listen(Number(process.env.PORT||8080),'0.0.0.0');
}
