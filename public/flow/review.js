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
  const ready=Boolean(url&&s.name?.trim()&&iconReady);
  const notice=document.getElementById('review-required'),next=document.getElementById('review-next');
  notice.hidden=ready;
  if(!ready){next.href='/create/';next.textContent='Complete app details ↗';}
  else {next.removeAttribute('href');next.setAttribute('aria-disabled','true');next.textContent='Checking live website…';}
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
      if(ready){next.setAttribute('data-checked','true');next.href='/checkout/';next.removeAttribute('aria-disabled');next.textContent='Continue to order details ↗';}
    }catch(error){
      status('NOT VERIFIED',`Live check could not complete: ${error.name==='AbortError'?'server timeout':error.message}. No compatibility claims can be made.`);
      retry.hidden=false;
      if(ready){next.removeAttribute('href');next.setAttribute('aria-disabled','true');next.textContent='Website check required';}
    }
  }
  retry.addEventListener('click',check);
  await check();
});
