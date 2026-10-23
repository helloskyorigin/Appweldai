'use strict';
window.addEventListener('DOMContentLoaded',async()=>{
 const U=window.AppweldUI,s=U.read();
 U.icon('build-icon',s.icon,s.name?.trim()||'A');
 const icon=document.getElementById('build-icon');if(icon)icon.style.backgroundColor=s.color||'#D8E6B5';
 const progress=document.getElementById('build-progress'),message=document.getElementById('build-message'),button=document.getElementById('build-next');
 const steps=[...document.querySelectorAll('.build-step')];
 const stage=(index,msg)=>{progress.textContent=msg;steps.forEach((x,i)=>{x.classList.toggle('is-active',i===index);x.classList.toggle('is-done',i<index);});};
 const saved=U.validate(s.url);
 if(!saved||!s.name||!s.packageName||!/^data:image\/png;base64,/.test(s.icon||'')||sessionStorage.getItem('appweld.verified')!=='true'){
  stage(-1,'NOT VERIFIED');message.textContent='App information or domain verification is missing. Return to Review.';button.disabled=false;button.textContent='Go to Review ↗';button.onclick=()=>location.assign('/review/');return;
 }
 stage(0,'STARTING');message.textContent='Submitting verified build…';
 const oldSession=JSON.parse(sessionStorage.getItem('appweld.build')||'null');
 let build=oldSession&&oldSession.id&&oldSession.token?oldSession:null;
 if(!build){
  try{
   const response=await fetch('/api/build',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({url:saved.href,appName:s.name,packageName:s.packageName,splashColor:s.color,iconPngBase64:s.icon,challengeId:sessionStorage.getItem('appweld.challenge')})});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Unable to start Android build.');
   build={id:data.id,token:data.token};sessionStorage.setItem('appweld.build',JSON.stringify(build));sessionStorage.removeItem('appweld.verified');
  }catch(e){stage(-1,'NOT STARTED');message.textContent=e.message||'Build service unavailable.';button.disabled=false;button.textContent='Back to Review ↗';button.onclick=()=>location.assign('/review/');return;}
 }
 stage(1,'BUILDING');message.textContent='Real Gradle compilation runs in the build worker. This may take several minutes.';
 async function poll(){
  try{
   const response=await fetch(`/api/build/${build.id}/status`,{headers:{'X-Appweld-Build-Token':build.token}});
   const data=await response.json();if(!response.ok||!data.ok)throw Error(data.error||'Status unavailable.');
   if(data.state==='ready'){
    stage(4,'COMPLETED');message.textContent=data.downloadsLocked ? 'Your Android build compiled, but private test downloads are currently disabled on this server. Contact support with your build ID.' : 'Your signed APK and AAB are ready for download.';button.disabled=false;button.textContent=data.downloadsLocked ? 'View build details ↗' : 'Download app files ↗';button.onclick=()=>location.assign('/download/');return;
   }
   if(data.state==='failed'){
    stage(-1,'FAILED');message.textContent=data.error||'Compilation failed. Your data has not been charged.';button.disabled=false;button.textContent='Back to Review ↗';button.onclick=()=>location.assign('/review/');return;
   }
   progress.textContent=data.stage||'COMPILING';setTimeout(poll,4000);
  }catch(e){progress.textContent='CONNECTION LOST';message.textContent='Could not check build status: '+e.message+'. Retrying without starting a duplicate build.';setTimeout(poll,6000);}
 }
 poll();
});
