'use strict';
window.addEventListener('DOMContentLoaded',async()=>{
 const U=window.AppweldUI,s=U.read();
 U.setText('delivery-for',`${s.name||'Your Android app'} · ${U.host(s)} · ${s.packageName||'Package pending'}`);
 const status=document.getElementById('download-status'),container=document.getElementById('artifact-downloads');
 let build;try{build=JSON.parse(sessionStorage.getItem('appweld.build')||'null');}catch{}
 if(!build?.id||!build?.token){status.textContent='No verified build is associated with this session. Start at App Studio.';return;}
 try{
  const response=await fetch(`/api/build/${build.id}/status`,{headers:{'X-Appweld-Build-Token':build.token}});
  const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Build not found.');
  if(data.state!=='ready'){status.textContent=`Build is ${data.state}. Go to Build to see its live status.`;return;}
  const previewPanel=document.getElementById('android-preview-panel');
  const previewButton=document.getElementById('start-android-preview');
  const previewMessage=document.getElementById('android-preview-status');
  const previewHolder=document.getElementById('android-emulator-holder');
  const previewFrame=document.getElementById('android-emulator-frame');
  const consent=document.getElementById('preview-consent');
  const capabilities=await fetch('/api/capabilities',{cache:'no-store'}).then(r=>r.json()).catch(()=>({}));
  if(capabilities.realAndroidPreviewAvailable||data.previewState==='ready'){
    previewPanel.hidden=false;
    previewButton.addEventListener('click',async()=>{
      if(!consent.checked){previewMessage.textContent='Confirm your consent to the external Android emulator first.';consent.focus();return;}
      previewButton.disabled=true;previewMessage.textContent='Preparing your signed APK in the Android emulator…';
      try{
        let buildId=data.previewBuildId;
        if(!buildId){
          const r=await fetch(`/api/build/${build.id}/preview`,{method:'POST',headers:{'X-Appweld-Build-Token':build.token}});
          const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Preview unavailable');
          buildId=result.buildId;
        }
        if(!/^[a-zA-Z0-9_-]{5,120}$/.test(buildId))throw Error('Invalid preview identifier.');
        previewFrame.src=`https://appetize.io/embed/${encodeURIComponent(buildId)}?device=pixel4`;
        previewHolder.hidden=false;
        previewMessage.textContent='Your actual generated APK is running on a third-party Android emulator.';
      }catch(e){previewButton.disabled=false;previewMessage.textContent=e.message||'Android emulator is unavailable.';}
    });
  }

  if(data.downloadsLocked!==false){container.hidden=true;status.textContent='Your Android build is complete, but this server has not enabled private test downloads. No payment is collected.';return;}
  for(const type of ['apk','aab','key-backup']){
   const a=document.getElementById('file-'+type);
   a.href='#';
   a.addEventListener('click',async event=>{
     event.preventDefault();if(a.dataset.working==='true')return;
     a.dataset.working='true';const original=a.textContent;a.textContent='Downloading…';
     try{
       const response=await fetch(`/api/build/${build.id}/download/${type}`,{headers:{'X-Appweld-Build-Token':build.token},cache:'no-store'});
       if(!response.ok){const problem=await response.json().catch(()=>({}));throw Error(problem.error||'File unavailable.');}
       const object=URL.createObjectURL(await response.blob());
       const link=document.createElement('a');link.href=object;link.download=type==='key-backup'?'signing-key-backup.zip':'android-app.'+type;
       document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(object),30_000);
     }catch(e){status.textContent='Download failed: '+e.message;}
     finally{a.dataset.working='false';a.textContent=original;}
   });
  }
  container.hidden=false;status.textContent='Files are ready. Download all three and keep your signing-key backup private. They expire in about one hour after build creation.';
 }catch(e){status.textContent='Download unavailable: '+e.message;}
});
