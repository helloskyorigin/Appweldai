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
  if(data.downloadsLocked!==false){container.hidden=true;status.textContent='Your Android build is complete. APK, AAB and signing key are private while the interactive Android preview and $9 download unlock are being prepared. No payment is being collected.';return;}
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
