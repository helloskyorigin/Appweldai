'use strict';
window.addEventListener('DOMContentLoaded',()=>{
  const U=window.AppweldUI,s=U.read();
  const title=s.name?.trim()||'Your app';
  U.setText('checkout-name',title);
  U.setText('checkout-url',U.validate(s.url)?.hostname||'Website not selected');
  U.icon('checkout-icon',s.icon,title);
  document.getElementById('checkout-icon').style.backgroundColor=s.color;
});
