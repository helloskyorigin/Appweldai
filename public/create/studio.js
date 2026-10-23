'use strict';
window.addEventListener('DOMContentLoaded', () => {
  const U = window.AppweldUI;
  const $ = id => document.getElementById(id);
  const url = $('website');
  const name = $('app-name');
  const color = $('splash-color');
  const fileInput = $('app-icon'); const packageInput=$('package-id');
  const saved = U.read();
  const query = new URLSearchParams(location.search).get('url');
  const resolvedUrl = query && U.validate(query);
  url.value = resolvedUrl ? resolvedUrl.href : saved.url || '';
  name.value = saved.name || '';packageInput.value=saved.packageName||'';
  color.value = saved.color || '#D8E6B5';
  let iconData = saved.icon || '';
  let iconFileName = saved.iconName || '';

  const contrast = hex => {
    const values = [1,3,5].map(i => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map(v => v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4));
    const lum = values.reduce((acc, value, index) => acc + value * [0.2126, 0.7152, 0.0722][index], 0);
    return lum > 0.24 ? '#223226' : '#fff';
  };
  function current() {
    return {url: url.value.trim(), name: name.value.trim(), packageName: packageInput.value.trim(), color: color.value.toUpperCase(), icon: iconData, iconName: iconFileName};
  }
  function validIcon() { return /^data:image\/png;base64,/.test(iconData); }
  function render() {
    const s = current();
    const v = U.validate(s.url);
    const title = s.name || 'Your app';
    U.save(s);
    U.setText('name-count', `${name.value.length}/28`);
    U.setText('preview-name', title);
    U.setText('preview-domain', v ? v.hostname : 'yourwebsite.com');
    U.setText('summary-name', title);
    U.setText('summary-url', v ? v.hostname : 'Not entered');
    U.setText('color-code', s.color);
    const icon = $('preview-icon');
    U.icon('preview-icon', iconData, validIcon() ? title : '+');
    icon.style.color = contrast(s.color);
    icon.classList.toggle('is-placeholder', !validIcon());
    $('splash-view').style.backgroundColor = s.color;
    $('statusline').style.backgroundColor = s.color;
    $('statusline').style.color = contrast(s.color);
    $('preview-name').style.color = contrast(s.color);
    $('preview-domain').style.color = contrast(s.color);
    document.querySelector('.home-indicator').style.backgroundColor = contrast(s.color);
    document.querySelectorAll('.color-choice').forEach(btn => {
      const chosen = btn.dataset.color.toUpperCase() === s.color;
      btn.classList.toggle('active', chosen);
      btn.setAttribute('aria-pressed', String(chosen));
    });
    const preview = $('upload-preview');
    preview.replaceChildren();
    if (validIcon()) {
      const img = new Image(); img.src = iconData; img.alt = '';
      preview.append(img);
    } else {
      preview.textContent = '↑';
    }
    $('upload-title').textContent = validIcon() ? 'App icon selected' : 'Choose your app icon';
    $('upload-detail').textContent = validIcon() ? `${iconFileName || 'Your square logo'} · Tap to change` : 'PNG, JPG or WebP · square · 512×512 px min · 2 MB max';
    $('remove-icon').hidden = !validIcon();
  }
  function clearFieldError(field, id) {field.removeAttribute('aria-invalid'); $(id).textContent = '';}
  url.addEventListener('input', () => {clearFieldError(url, 'url-error'); render();});
  packageInput.addEventListener('input',()=>{clearFieldError(packageInput,'package-error');render();});
  const tabSplash=$('tab-splash'),tabSite=$('tab-site'),frame=$('site-frame');
  function setTab(which){const web=which==='web';$('splash-container').hidden=web;$('web-preview-live').hidden=!web;tabSplash.classList.toggle('is-active',!web);tabSite.classList.toggle('is-active',web);tabSplash.setAttribute('aria-pressed',String(!web));tabSite.setAttribute('aria-pressed',String(web));if(web){const v=U.validate(url.value);if(v){frame.src=v.href;$('site-open').href=v.href;$('live-preview-host').textContent=v.hostname;}}}
  tabSplash.addEventListener('click',()=>setTab('splash'));tabSite.addEventListener('click',()=>setTab('web'));
  let previewHost='';url.addEventListener('change',()=>{const v=U.validate(url.value);if(v&&v.hostname!==previewHost){previewHost=v.hostname;if(tabSite.getAttribute('aria-pressed')==='true')frame.src=v.href;}});
  name.addEventListener('input', () => {clearFieldError(name, 'name-error'); render();});
  color.addEventListener('input', render);
  document.querySelectorAll('.color-choice').forEach(btn => btn.addEventListener('click', () => {color.value = btn.dataset.color; render();}));

  async function readAndNormalizeIcon(file) {
    if (!['image/png','image/jpeg','image/webp'].includes(file.type) || file.size > 2 * 1024 * 1024)
      throw Error('Choose a PNG, JPG or WebP image smaller than 2 MB.');
    const source = URL.createObjectURL(file);
    try {
      const picture = new Image();
      await new Promise((resolve, reject) => {picture.onload = resolve;picture.onerror = reject;picture.src = source;});
      if (picture.naturalWidth < 512 || picture.naturalHeight < 512 || Math.abs(picture.naturalWidth - picture.naturalHeight) > 2)
        throw Error('Your icon needs to be square and at least 512 × 512 pixels.');
      const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 512;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw Error('This browser cannot process the icon. Try another image.');
      ctx.clearRect(0,0,512,512);
      ctx.drawImage(picture, 0, 0, 512, 512);
      const output=canvas.toDataURL('image/png');if(output.length>2_800_000)throw Error('Icon image is too complex for a 2 MB PNG. Try a simpler square logo.');return output;
    } finally {URL.revokeObjectURL(source);}
  }
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    if (!file) return;
    try {
      const next = await readAndNormalizeIcon(file);
      iconData = next;iconFileName = file.name;
      clearFieldError(fileInput, 'icon-error');
      render();
    } catch (err) {
      $('icon-error').textContent = err.message || 'Unable to read that image.';
      fileInput.setAttribute('aria-invalid', 'true');
    }
    fileInput.value = '';
  });
  document.querySelector('.clean-upload').addEventListener('keydown', e => {if(e.key==='Enter'||e.key===' '){e.preventDefault();fileInput.click();}});
  $('remove-icon').addEventListener('click', () => {iconData = '';iconFileName = '';render();});
  $('app-form').addEventListener('submit', e => e.preventDefault());
  $('to-review').addEventListener('click', () => {
    const v = U.validate(url.value);
    if (!v) {
      $('url-error').textContent = 'Enter a valid public HTTPS website address.';
      url.setAttribute('aria-invalid', 'true');url.focus();return;
    }
    if (!name.value.trim()) {
      $('name-error').textContent = 'Add a name for your Android app.';
      name.setAttribute('aria-invalid', 'true');name.focus();return;
    }
    if(!/^[a-z][a-z0-9_]*(?:\.[a-z][a-z0-9_]*){2,}$/.test(packageInput.value.trim())){
      $('package-error').textContent='Enter a package ID like com.yourbrand.app (lowercase).';
      packageInput.setAttribute('aria-invalid','true');packageInput.focus();return;
    }
    if (!validIcon()) {
      $('icon-error').textContent = 'Upload a square app icon (minimum 512 × 512 px) to continue.';
      fileInput.setAttribute('aria-invalid', 'true');document.querySelector('.clean-upload').scrollIntoView({block:'center',behavior:'smooth'});document.querySelector('.clean-upload').focus();return;
    }
    url.value = v.href;
    render();
    location.assign('/review/');
  });
  render();
});
