import http from 'node:http';
import { inspectWebsite } from './readiness.mjs';

const port = Number(process.env.PORT || 8080);
const maxJsonBytes=4096;
const counters=new Map();
function json(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(JSON.stringify(data));}
function rateLimited(req){
 const now=Date.now();const client=req.socket.remoteAddress||'anonymous';
 const val=counters.get(client)||{n:0,expires:now+60000};if(now>val.expires){val.n=0;val.expires=now+60000;}
 val.n++;counters.set(client,val);
 if(counters.size>5000)for(const [key,value] of counters)if(now>value.expires)counters.delete(key);
 return val.n>8;
}
const server=http.createServer(async (req,res)=>{
 if(req.method==='GET'&&req.url==='/healthz')return json(res,200,{ok:true,service:'appweld-readiness'});
 if(req.method!=='POST'||req.url!=='/api/readiness')return json(res,404,{error:'Not found.'});
 if(!String(req.headers['content-type']||'').startsWith('application/json'))return json(res,415,{error:'Content type must be JSON.'});
 if(rateLimited(req))return json(res,429,{error:'Too many checks. Try again shortly.'});
 let size=0;const chunks=[];
 for await(const chunk of req){size+=chunk.length;if(size>maxJsonBytes)return json(res,413,{error:'Request too large.'});chunks.push(chunk);}
 try{
   const body=JSON.parse(Buffer.concat(chunks).toString('utf8'));
   const data=await inspectWebsite(body.url);
   json(res,200,{ok:true,result:data});
 }catch(error){json(res,422,{ok:false,error: error instanceof SyntaxError?'Invalid JSON.': String(error.message||'Unable to inspect website.').slice(0,180)});}
});
server.requestTimeout=20000;
server.listen(port,'0.0.0.0',()=>console.log(`Appweld readiness API on :${port}`));
