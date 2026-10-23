'use strict';
window.AppweldUI = (() => {
  const KEY = 'appweld.preview.v1';
  const initial = { url:'', name:'', color:'#D8E6B5', status:'dark', icon:'' };
  function read() { try { return {...initial,...JSON.parse(sessionStorage.getItem(KEY) || '{}')}; } catch { return {...initial}; } }
  function save(patch) { const next={...read(),...patch}; try {sessionStorage.setItem(KEY,JSON.stringify(next));} catch {} return next; }
  function validate(raw) {
    const val=String(raw||'').trim(); if (!val) return null;
    try {
      const u=new URL(/^https?:\/\//i.test(val)?val:'https://'+val);
      if(u.protocol!=='https:' || u.username || u.password || !u.hostname.includes('.'))return null;
      const h=u.hostname.toLowerCase();
      if(/^(localhost|\d+\.\d+\.\d+\.\d+)$/.test(h) || /(?:\.local|\.localhost|\.internal|\.test)$/.test(h))return null;
      return u;
    } catch{return null;}
  }
  function label(s) { const url=validate(s.url);return s.name?.trim()|| (url ? url.hostname.split('.')[0].replace(/[-_]/g,' ').slice(0,28):'My Android App'); }
  function host(s) { return validate(s.url)?.hostname || 'yourwebsite.com'; }
  function setText(id,value){const e=document.getElementById(id);if(e)e.textContent=value;}
  function icon(id,data,text){const e=document.getElementById(id);if(!e)return;e.replaceChildren();if(data && /^data:image\/(png|jpeg|webp);base64,/.test(data)){const img=new Image();img.src=data;img.alt='Selected app icon';e.appendChild(img);} else e.textContent=(text?.charAt(0)||'A').toUpperCase();}
  return {read,save,validate,label,host,setText,icon};
})();
