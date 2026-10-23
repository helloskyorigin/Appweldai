'use strict';
window.addEventListener('DOMContentLoaded',async () => {
  const U=window.AppweldUI,s=U.read(),title=s.name?.trim()||'Your app';
  const url=U.validate(s.url),iconReady=/^data:image\/png;base64,/.test(s.icon||'');
  U.setText('review-name',title);U.setText('review-appname',title);
  U.setText('review-url',url?.hostname||'Website not added');
  U.setText('review-color',s.color||'#D8E6B5');
  U.setText('review-icon-state',iconReady?'Uploaded':'Required');
  U.icon('review-icon',iconReady?s.icon:'',iconReady?title:'+');
  document.getElementById('review-icon').style.backgroundColor=s.color||'#D8E6B5';
  const pkg=/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(s.packageName||'');
  U.setText('review-package',pkg?s.packageName:'Required');
  const ready=Boolean(url&&s.name?.trim()&&iconReady&&pkg);
  const notice=document.getElementById('review-required'),next=document.getElementById('review-next');
  notice.hidden=ready;
  if(!ready){next.href='/create/';next.textContent='Complete app details ↗';}
  else {next.removeAttribute('href');next.setAttribute('aria-disabled','true');next.textContent='Verify domain to build';}
  const label=document.getElementById('url-state');
  const desc=document.getElementById('url-text');
  const icon=document.getElementById('url-flag');
  const remoteStatus=document.getElementById('remote-state');
  const remoteText=document.getElementById('remote-text');
  const retry=document.getElementById('retry-readiness');
  function status(state,message){remoteStatus.textContent=state;remoteText.textContent=message;}
  if(!url){label.textContent='INVALID';desc.textContent='Enter a public HTTPS URL in App Studio.';icon.textContent='!';status('NOT CHECKED','Add a valid website before checking its live response.');return;}
  label.textContent='FORMAT OK';desc.textContent='HTTPS URL syntax looks valid. Connecting to the real site next.';icon.textContent='✓';
  async function check(){
    retry.hidden=true;status('CHECKING','Checking HTTPS response and mobile viewport on the server…');
    try{
      const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),16000);
      let response;
      try{response=await fetch('/api/readiness',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.href}),signal:controller.signal});}
      finally{clearTimeout(timeout);}
      const data=await response.json().catch(()=>null);
      if(!response.ok||!data?.ok)throw new Error(data?.error||'Readiness service unavailable.');
      const result=data.result;
      status('REACHABLE',`HTTP ${result.httpStatus} · ${result.hostname}${result.title?' · '+result.title:''}`);
      U.setText('viewport-state',result.mobileViewportDetected?'DETECTED':'REVIEW');
      U.setText('viewport-text',result.mobileViewportDetected?'Mobile viewport declaration detected. Actual responsive behavior needs device testing.':'No mobile viewport declaration detected in sampled HTML; inspect responsive layout.');
      U.setText('readiness-hints',result.hints?.join(' ')||'External login, checkout and native device functionality still require device testing.');
      if(ready){next.setAttribute('data-checked','true');next.textContent='Verify domain to build';}
      if(result.hostname!==url.hostname){next.removeAttribute('data-checked');next.removeAttribute('href');next.textContent='Use the final redirected domain';U.setText('readiness-hints','This site redirects to '+result.hostname+'. Enter that exact final URL and verify its domain.');}
    }catch(error){
      status('NOT VERIFIED',`Live check could not complete: ${error.name==='AbortError'?'server timeout':error.message}. No compatibility claims can be made.`);
      retry.hidden=false;
      if(ready){next.removeAttribute('href');next.setAttribute('aria-disabled','true');next.textContent='Website check required';}
    }
  }
  retry.addEventListener('click',check);
  let checked=false;
  const begin=document.getElementById('begin-ownership'),verify=document.getElementById('verify-ownership');
  const ownerText=document.getElementById('ownership-state');
  begin.addEventListener('click',async()=>{
    if(!ready)return;begin.disabled=true;ownerText.textContent='Creating domain verification request…';
    try{const cap=await fetch('/api/capabilities').then(x=>x.json());if(!cap.buildsEnabled)throw Error('Real build service is not deployed/enabled yet. Domain verification will be available when the worker is online.');
    const response=await fetch('/api/ownership/start',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:url.href})});const data=await response.json();if(!response.ok)throw Error(data.error);
      sessionStorage.setItem('appweld.challenge',data.challengeId);
      document.getElementById('dns-host').textContent=data.host;document.getElementById('dns-value').textContent=data.value;
      document.getElementById('dns-instructions').hidden=false;ownerText.textContent='Add the TXT record in your DNS provider, then click Verify domain.';
    }catch(e){ownerText.textContent=e.message||'Unable to start verification.';begin.disabled=false;}
  });
  verify.addEventListener('click',async()=>{
    verify.disabled=true;ownerText.textContent='Checking DNS…';
    try{const response=await fetch('/api/ownership/verify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({challengeId:sessionStorage.getItem('appweld.challenge')})});const data=await response.json();if(!response.ok)throw Error(data.error);
      checked=true;sessionStorage.setItem('appweld.verified','true');ownerText.textContent='Domain verified. You can build your Android app now.';
      if(next.dataset.checked==='true'){next.href='/building/';next.removeAttribute('aria-disabled');next.textContent='Build my Android app ↗';}
    }catch(e){ownerText.textContent=e.message||'TXT verification failed.';verify.disabled=false;}
  });
  await check();
});
