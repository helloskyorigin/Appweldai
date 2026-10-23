'use strict';
(() => {
  const q = id => document.getElementById(id);
  const website = q('website'), name = q('app-name'), color = q('splash-color');
  const previewName = q('preview-name'), previewDomain = q('preview-domain');
  const previewIcon = q('preview-icon'), check = q('url-check'), urlError = q('url-error'), iconError = q('icon-error');
  let imageUrl = null;
  const validUrl = (raw) => {
    if (!raw.trim()) return null;
    try {
      const url = new URL(/^https?:\/\//i.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`);
      if (url.protocol !== 'https:' || url.username || url.password || !url.hostname.includes('.')) return null;
      if (/(^|\.)localhost$|\.local$|^127\.|^10\.|^192\.168\.|^169\.254\.|^0\./i.test(url.hostname)) return null;
      return url;
    } catch { return null; }
  };
  const fromQuery = new URLSearchParams(window.location.search).get('url');
  if (fromQuery) { const parsed = validUrl(fromQuery); if (parsed) website.value = parsed.href; }
  function update() {
    const parsed = validUrl(website.value);
    urlError.textContent = website.value.trim() && !parsed ? 'Use a public HTTPS website URL (for example, https://example.com).' : '';
    website.setAttribute('aria-invalid', String(Boolean(urlError.textContent)));
    const hostname = parsed?.hostname || 'yourwebsite.com';
    const appName = name.value.trim() || (parsed ? hostname.split('.')[0].replace(/[-_]/g, ' ') : 'My Android App');
    previewName.textContent = appName;
    previewDomain.textContent = hostname;
    if (!imageUrl) previewIcon.textContent = (appName.charAt(0) || 'A').toUpperCase();
    q('color-label').textContent = color.value.toUpperCase();
    q('studio-showcase').style.setProperty('--app-color', color.value);
    document.querySelector('.studio-splash').style.backgroundColor = color.value;
    previewIcon.style.backgroundColor = imageUrl ? 'transparent' : '#fff';
    check.textContent = parsed ? `✓ HTTPS URL formatted correctly: ${hostname}. Live reachability and Android compatibility still require a backend/device check.` : 'Enter a public HTTPS URL to begin. No remote scan happens in this preview.';
  }
  for(const e of [website,name,color]) e.addEventListener('input',update);
  q('app-icon').addEventListener('change', event => {
    const file = event.target.files?.[0];
    if(imageUrl){URL.revokeObjectURL(imageUrl);imageUrl=null;}
    previewIcon.replaceChildren();
    iconError.textContent='';
    if(!file){update();return;}
    if(!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2*1024*1024){
      iconError.textContent='Choose a PNG, JPG or WebP image smaller than 2 MB.';
      event.target.value='';update();return;
    }
    imageUrl=URL.createObjectURL(file);
    const img=new Image();img.alt='Your selected app icon';img.src=imageUrl;
    previewIcon.appendChild(img);
    update();
  });
  q('studio-form').addEventListener('submit',e=>e.preventDefault());
  window.addEventListener('pagehide',()=>{if(imageUrl)URL.revokeObjectURL(imageUrl);});
  update();
})();
