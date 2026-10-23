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
  for(const type of ['apk','aab','key-backup']){
   const a=document.getElementById('file-'+type);
   a.href=`/api/build/${build.id}/download/${type}?token=${encodeURIComponent(build.token)}`;
   a.setAttribute('download',type==='key-backup'?'signing-key-backup.zip':'android-app.'+type);
  }
  container.hidden=false;status.textContent='Files are ready. Download all three and keep your signing-key backup private. They expire in about one hour after build creation.';
 }catch(e){status.textContent='Download unavailable: '+e.message;}
});
