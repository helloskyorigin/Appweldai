'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  const U=window.AppweldUI,s=U.read();
  U.icon('build-icon',s.icon,s.name?.trim()||'A');
  const icon=document.getElementById('build-icon');
  icon.style.backgroundColor=s.color||'#D8E6B5';
  let step=0;
  const all=[...document.querySelectorAll('.build-step')];
  const back=document.getElementById('build-back');
  const next=document.getElementById('build-next');
  function show(){
    all.forEach((el,i)=>{el.classList.toggle('is-done',i<step);el.classList.toggle('is-active',i===step);el.setAttribute('aria-current',i===step?'step':'false');});
    back.disabled=step===0;
    document.getElementById('build-progress').textContent=String(step+1).padStart(2,'0')+' / 05';
    next.innerHTML=step===4?'See delivery preview <span>↗</span>':'Next demo step <span>↗</span>';
  }
  back.addEventListener('click',()=>{step=Math.max(step-1,0);show();});
  next.addEventListener('click',()=>{if(step===4)location.assign('/download/');else{step++;show();}});
  show();
});
