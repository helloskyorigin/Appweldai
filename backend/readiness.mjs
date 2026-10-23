import dns from 'node:dns/promises';
import https from 'node:https';
import net from 'node:net';

const MAX_BYTES = 192 * 1024;

export function publicIPv4(address) {
  if (net.isIP(address) !== 4) return false;
  const [a,b,c,d] = address.split('.').map(Number);
  // Deny all non-global IPv4 ranges, including private, link-local, documentation,
  // benchmarking, shared address space and cloud metadata endpoints.
  if (a === 0 || a === 10 || a === 127 || a >= 224 || a === 169 && b === 254 ||
      a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 ||
      a === 100 && b >= 64 && b <= 127 || a === 192 && (b === 0 || b === 88 && c === 99) ||
      a === 198 && (b === 18 || b === 19 || b === 51 && c === 100) ||
      a === 203 && b === 0 && c === 113 || a === 192 && b === 0 && c === 2 ||
      a === 192 && b === 0 && c === 0 || a === 198 && b === 51 && c === 100 ||
      a === 255 || a === 169 && b === 254) return false;
  return d >= 0 && d <= 255;
}

export function normalizeWebsite(input) {
  if (typeof input !== 'string' || !input.trim() || input.length > 2048) throw new Error('Enter a valid HTTPS website URL.');
  let url;
  try { url = new URL(/^https?:\/\//i.test(input.trim()) ? input.trim() : `https://${input.trim()}`); }
  catch { throw new Error('Enter a valid HTTPS website URL.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.port && url.port !== '443' ||
      url.hostname.length > 253 || !url.hostname.includes('.') || net.isIP(url.hostname) ||
      /(?:\.local|\.internal|\.localhost|\.test|\.example|\.invalid)$/i.test(url.hostname) ||
      !/^[a-z\d.-]+$/i.test(url.hostname)) throw new Error('Use a public HTTPS domain without credentials or a custom port.');
  url.hash = '';
  return url;
}

export async function resolveSafeIPv4(hostname, lookup = dns.lookup) {
  const addresses = await lookup(hostname, { all:true, family:4, verbatim:true });
  if (!Array.isArray(addresses) || !addresses.length || !addresses.every(a => publicIPv4(a.address))) {
    throw new Error('This host is not publicly reachable or failed the network safety check.');
  }
  return addresses[0].address;
}

export function fetchPagePinned(url, address, {timeout=10000}={}) {
  return new Promise((resolve,reject)=>{
    const req=https.get(url, {
      lookup:(_host,_opts,callback)=>callback(null,address,4),
      headers:{'user-agent':'AppweldReadiness/1.0 (+public website checker)','accept':'text/html,application/xhtml+xml'},
      timeout, maxHeaderSize:16384,
    }, response=>{
      const status=response.statusCode||0;
      const location=response.headers.location;
      if (status >= 300 && status < 400 && location) {
        response.resume();return resolve({status,location});
      }
      const mime=String(response.headers['content-type']||'');
      if (!/text\/html|application\/xhtml\+xml/i.test(mime)) {response.destroy(); return reject(new Error('The website did not return an HTML page.'));}
      let body=''; let length=0;
      response.on('data',chunk=>{
        length+=chunk.length;
        if (length>MAX_BYTES) {response.destroy();return resolve({status,html:body.slice(0,MAX_BYTES),truncated:true});}
        body+=chunk.toString('utf8');
      });
      response.on('end',()=>resolve({status,html:body,truncated:false}));
      response.on('error',reject);
    });
    req.on('timeout',()=>req.destroy(new Error('Website request timed out.')));
    req.on('error',reject);
  });
}

function stripTags(input) {return String(input||'').replace(/<[^>]*>/g,' ').replace(/&(?:amp|lt|gt|quot|#39);/gi,' ').replace(/\s+/g,' ').trim().slice(0,120);}

export async function inspectWebsite(raw,{lookup=dns.lookup,fetcher=fetchPagePinned}={}) {
  let url=normalizeWebsite(raw);
  const redirects=[];
  let response;
  for(let hop=0;hop<=3;hop++) {
    const address=await resolveSafeIPv4(url.hostname,lookup);
    response=await fetcher(url,address);
    if (response.location) {
      if(hop===3) throw new Error('Too many redirects.');
      url=normalizeWebsite(new URL(response.location,url).href);
      redirects.push(url.hostname);
      continue;
    }
    break;
  }
  if(!response?.html || response.status<200 || response.status>=400) {
    throw new Error(`Website returned HTTP ${response?.status || 'unknown'} instead of a usable page.`);
  }
  const html=response.html;
  const title=stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title\s*>/i)?.[1]||'');
  const viewport=/<meta\s+[^>]*name\s*=\s*['"]viewport['"][^>]*>/i.test(html) ||
    /<meta\s+[^>]*content\s*=\s*['"][^'"]*width\s*=\s*device-width[^'"]*['"][^>]*name\s*=\s*['"]viewport['"][^>]*>/i.test(html);
  const hints=[];
  if (!viewport) hints.push('A mobile viewport meta tag was not detected in the sampled HTML. Check responsive layout on a phone.');
  if (/accounts\.google\.com|google-signin|g_id_onload|firebase-auth/i.test(html)) hints.push('Third-party authentication may not work inside an embedded WebView and needs device testing.');
  if (/checkout|stripe|paypal|razorpay|payment/i.test(html)) hints.push('Checkout and payment redirects need a real-device test.');
  return {checkedAt:new Date().toISOString(),url:url.href,hostname:url.hostname,title,httpStatus:response.status,https:true,htmlReceived:true,mobileViewportDetected:viewport,redirected:redirects.length>0,redirectCount:redirects.length,partialHtml:!!response.truncated,deviceTestRequired:true,playStoreApproval:'not_checked',hints};
}
