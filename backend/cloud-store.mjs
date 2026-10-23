// Production Appweld build state. All objects are private and expire.
import { createHash } from 'node:crypto';

export const BUILD_TTL_MS = 60 * 60 * 1000;
export const PROOF_TTL_MS = 30 * 60 * 1000;
export const hashToken = value => createHash('sha256').update(value).digest('hex');
export const safeId = value => typeof value === 'string' && /^[a-f0-9]{32,40}$/.test(value);

export class CloudStore {
  constructor({db,bucket,now=()=>Date.now(),dailyLimit=Number(process.env.APPWELD_DAILY_BUILD_LIMIT||10),domainLimit=Number(process.env.APPWELD_DOMAIN_DAILY_LIMIT||1)}) {
    this.db=db;this.bucket=bucket;this.now=now;this.dailyLimit=dailyLimit;this.domainLimit=domainLimit;
  }
  async challenge(id, value) {
    const expires=this.now()+PROOF_TTL_MS;
    await this.db.collection('appweld_proofs').doc(id).create({...value,verified:false,used:false,expiresAt:new Date(expires),expiryMs:expires});
    return expires;
  }
  async getChallenge(id){ if(!safeId(id))return null;const snap=await this.db.collection('appweld_proofs').doc(id).get();return snap.exists?snap.data():null; }
  async verifyChallenge(id){
    if(!safeId(id))throw Error('Invalid verification challenge.');
    const ref=this.db.collection('appweld_proofs').doc(id);
    return this.db.runTransaction(async transaction=>{
      const snap=await transaction.get(ref);if(!snap.exists||snap.data().expiryMs<=this.now()||snap.data().used)throw Error('Verification challenge expired.');
      transaction.update(ref,{verified:true});return true;
    });
  }
  async reserve({id,token,host,challengeId,packageName}) {
    if(!safeId(id)||!safeId(challengeId))throw Error('Invalid build identifier.');
    const date=new Date(this.now()).toISOString().slice(0,10);
    const quota=this.db.collection('appweld_quotas');
    const global=quota.doc('global-'+date),domain=quota.doc('domain-'+hashToken(host).slice(0,24)+'-'+date);
    const proof=this.db.collection('appweld_proofs').doc(challengeId),job=this.db.collection('appweld_jobs').doc(id);
    const expires=this.now()+BUILD_TTL_MS;
    await this.db.runTransaction(async tr=>{
      const [p,g,d]=await Promise.all([tr.get(proof),tr.get(global),tr.get(domain)]);
      if(!p.exists||!p.data().verified||p.data().used||p.data().host!==host||p.data().expiryMs<=this.now())throw Error('Verify ownership of the exact website domain first.');
      const gn=g.exists?g.data().count:0,dn=d.exists?d.data().count:0;
      if(gn>=this.dailyLimit||dn>=this.domainLimit)throw Error('Daily build quota reached. Try again after the daily reset.');
      tr.set(global,{count:gn+1,expiresAt:new Date(expires+86400000)}, {merge:true});
      tr.set(domain,{count:dn+1,expiresAt:new Date(expires+86400000)},{merge:true});
      tr.update(proof,{used:true});
      tr.create(job,{id,state:'queued',stage:'Queued',host,packageName,tokenHash:hashToken(token),createdAt:this.now(),expiryMs:expires,expiresAt:new Date(expires),error:null,previewState:'not_configured'});
    });
    return {id,expires};
  }
  async status(id){if(!safeId(id))return null;const snap=await this.db.collection('appweld_jobs').doc(id).get();return snap.exists?snap.data():null;}
  async claimPreview(id){
    if(!safeId(id))return false;
    const ref=this.db.collection('appweld_jobs').doc(id);
    return this.db.runTransaction(async tx=>{
      const snap=await tx.get(ref);
      if(!snap.exists)return false;
      const j=snap.data();
      if(j.state!=='ready'||j.expiryMs<=this.now()||(j.previewState&&j.previewState!=='not_configured'))return false;
      tx.update(ref,{previewState:'uploading'});return true;
    });
  }

  async patch(id,fields){if(!safeId(id))throw Error('Invalid job id');await this.db.collection('appweld_jobs').doc(id).update(fields);}
  async uploadSpec(id,spec){const f=this.bucket.file(`builds/${id}/input.json`);await f.save(JSON.stringify(spec),{resumable:false,contentType:'application/json',metadata:{cacheControl:'no-store'}});}
  async deleteSpec(id){await this.bucket.file(`builds/${id}/input.json`).delete({ignoreNotFound:true});}
  async readArtifact(id,name){const f=this.bucket.file(`builds/${id}/${name}`);const [meta]=await f.getMetadata();return {stream:f.createReadStream(),size:Number(meta.size),contentType:meta.contentType||'application/octet-stream'};}
}

export async function googleStore(config={}) {
  const [{Firestore},{Storage}]=await Promise.all([import('@google-cloud/firestore'),import('@google-cloud/storage')]);
  const bucketName=config.bucket||process.env.APPWELD_PRIVATE_BUCKET;
  if(!bucketName)throw Error('APPWELD_PRIVATE_BUCKET must be configured');
  return new CloudStore({db:new Firestore(),bucket:new Storage().bucket(bucketName)});
}
export async function executeCloudRunJob(id,config={}) {
  if(!safeId(id))throw Error('Invalid job id');
  const project=config.project||process.env.GOOGLE_CLOUD_PROJECT;
  const region=config.region||process.env.APPWELD_REGION;
  const name=config.name||process.env.APPWELD_RUN_JOB;
  if(!project||!region||!name)throw Error('Cloud Run Job project, region and name are required.');
  const {GoogleAuth}=await import('google-auth-library');
  const client=await new GoogleAuth({scopes:['https://www.googleapis.com/auth/cloud-platform']}).getClient();
  const endpoint=`https://run.googleapis.com/v2/projects/${encodeURIComponent(project)}/locations/${encodeURIComponent(region)}/jobs/${encodeURIComponent(name)}:run`;
  const result=await client.request({url:endpoint,method:'POST',data:{overrides:{containerOverrides:[{env:[{name:'APPWELD_BUILD_ID',value:id}]}],taskCount:1,timeout:'1200s'}}});
  return result.data?.name||'execution requested';
}
