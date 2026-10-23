'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  const U=window.AppweldUI,s=U.read();
  if(s.name?.trim()&&U.validate(s.url)) U.setText('delivery-for',`Package preview for ${s.name.trim()} · ${U.host(s)}`);
});
