'use strict';
window.addEventListener('DOMContentLoaded', () => {
  const U=window.AppweldUI,s=U.read(),title=s.name?.trim()||'Your app';
  const url=U.validate(s.url);
  const iconReady=/^data:image\/png;base64,/.test(s.icon||'');
  U.setText('review-name',title);
  U.setText('review-appname',title);
  U.setText('review-url',url?.hostname||'Website not added');
  U.setText('review-color',s.color);
  U.setText('review-icon-state',iconReady?'Uploaded':'Required');
  U.icon('review-icon',iconReady?s.icon:'',iconReady?title:'+');
  document.getElementById('review-icon').style.backgroundColor=s.color;
  U.setText('url-text',url?'HTTPS URL format looks valid. Website reachability has not been tested.':'Enter a public HTTPS website in App Studio.');
  U.setText('url-state',url?'FORMAT ONLY':'NOT CHECKED');
  U.setText('url-flag',url?'✓':'?');
  const ready=Boolean(url&&s.name?.trim()&&iconReady);
  const notice=document.getElementById('review-required');
  notice.hidden=ready;
  const next=document.getElementById('review-next');
  if(!ready){ next.href='/create/';next.textContent='Complete app details ↗'; }
});
