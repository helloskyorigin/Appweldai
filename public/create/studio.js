'use strict';
window.addEventListener('DOMContentLoaded',() => {
const U=window.AppweldUI;
const $=id=>document.getElementById(id);
const url=$('website'), name=$('app-name'), color=$('splash-color'), iconInput=$('app-icon');
const saved=U.read();const query=new URLSearchParams(location.search).get('url');
if(query && U.validate(query))url.value=U.validate(query).href; else url.value=saved.url||'';
name.value=saved.name||'';color.value=saved.color||'#D8E6B5';let iconData=saved.icon||'';let status=saved.status||'dark';
function contrast(hex){const parts=[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);return parts.map(v=>v<=.04045?v/12.92:Math.pow((v+.055)/1.055,2.4)).reduce((a,b,i)=>a+b*[.2126,.7152,.0722][i],0)>.23?'#243327':'#FFFFFF';}
function current(){return{url:url.value.trim(),name:name.value.trim(),color:color.value.toUpperCase(),icon:iconData,status}};
function render(){const s=current(), v=U.validate(s.url), title=U.label(s), hostname=U.host(s);U.save(s);
U.setText('name-count',`${name.value.length}/28`);U.setText('preview-name',title);U.setText('preview-domain',hostname);U.setText('summary-name',title);U.setText('summary-url',v?hostname:'Not entered');U.setText('summary-color',s.color);U.setText('color-code',s.color);U.setText('content-brand',title);
U.icon('preview-icon',iconData,title);$('preview-icon').style.color=contrast(s.color);
$('splash-view').style.backgroundColor=s.color;$('statusline').style.color=status==='light'?'#f7faf4':'#243327';$('statusline').style.backgroundColor=status==='light'?'#26332a':s.color;
$('url-error').textContent=s.url&&!v?'Enter a public HTTPS website URL (example.com).':'';url.setAttribute('aria-invalid',String(Boolean(s.url&&!v)));
document.querySelectorAll('.color-choice').forEach(b=>{const selected=b.dataset.color.toUpperCase()===s.color;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});
document.querySelectorAll('.status-option').forEach(b=>{const selected=b.dataset.status===status;b.classList.toggle('active',selected);b.setAttribute('aria-pressed',String(selected));});}
[url,name,color].forEach(x=>x.addEventListener('input',render));
document.querySelectorAll('.color-choice').forEach(b=>b.addEventListener('click',()=>{color.value=b.dataset.color;render();}));
document.querySelectorAll('.status-option').forEach(b=>b.addEventListener('click',()=>{status=b.dataset.status;render();}));
iconInput.addEventListener('change',async e=>{const file=e.target.files?.[0];$('icon-error').textContent='';if(!file)return;
if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>2*1024*1024){$('icon-error').textContent='Choose a PNG, JPG or WebP under 2 MB.';iconInput.value='';return;}
try{const img=await createImageBitmap(file);const c=document.createElement('canvas');const max=256,side=Math.min(max,Math.max(img.width,img.height));c.width=side;c.height=side;const ctx=c.getContext('2d');ctx.fillStyle='#fff';ctx.fillRect(0,0,side,side);const scale=Math.min(side/img.width,side/img.height);ctx.drawImage(img,(side-img.width*scale)/2,(side-img.height*scale)/2,img.width*scale,img.height*scale);iconData=c.toDataURL('image/png');img.close();$('icon-choice').textContent=file.name+' · local image preview';render();}catch{$('icon-error').textContent='Unable to read this image. Choose another icon.';}
});
$('app-form').addEventListener('submit',e=>e.preventDefault());
document.querySelectorAll('[data-preview]').forEach(b=>b.addEventListener('click',()=>{const splash=b.dataset.preview==='splash';$('splash-view').hidden=!splash;$('content-view').hidden=splash;U.setText('device-caption',splash?'Splash identity preview — updates as you customize':'Illustrative content view — not a loaded website');document.querySelectorAll('[data-preview]').forEach(btn=>{btn.classList.toggle('is-active',btn===b);btn.setAttribute('aria-pressed',String(btn===b));});}));
const tabs=$('tab-design'),tabPreview=$('tab-preview'),columns=document.querySelector('.studio-columns');
function switchTab(which){columns.classList.toggle('show-preview',which==='preview');columns.classList.toggle('show-design',which==='design');tabs.classList.toggle('selected',which==='design');tabPreview.classList.toggle('selected',which==='preview');tabs.setAttribute('aria-pressed',String(which==='design'));tabPreview.setAttribute('aria-pressed',String(which==='preview'));}
tabs.addEventListener('click',()=>switchTab('design'));tabPreview.addEventListener('click',()=>switchTab('preview'));
$('to-review').addEventListener('click',()=>{const valid=U.validate(url.value);if(!valid){$('url-error').textContent='Enter a valid public HTTPS URL to continue.';url.focus();if(matchMedia('(max-width:740px)').matches)switchTab('design');return;}url.value=valid.href;render();location.assign('/review/');});
if(matchMedia('(max-width:740px)').matches)switchTab('design');render();
});
