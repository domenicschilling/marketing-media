// Gemeinsame iOS-Teile: Statusleiste, Dynamic Island, Tab-Leiste, Home-Balken
(function(){
  const p=document.querySelector('.phone');
  const aktiv=p.dataset.tab;
  const ohneTabs=p.dataset.tabbar==='aus';
  const sb=`<div class="sb"><span class="zeit">9:41</span><span class="ic">
    <svg width="19" height="12" viewBox="0 0 19 12" fill="currentColor"><rect x="0" y="8" width="3.2" height="4" rx="1"/><rect x="5" y="5.5" width="3.2" height="6.5" rx="1"/><rect x="10" y="3" width="3.2" height="9" rx="1"/><rect x="15" y="0" width="3.2" height="12" rx="1"/></svg>
    <svg width="17" height="12" viewBox="0 0 17 12" fill="currentColor"><path d="M8.5 2.4c2.4 0 4.6.9 6.2 2.5l1.2-1.2C14 1.8 11.4.7 8.5.7S3 1.8 1.1 3.7l1.2 1.2C3.9 3.3 6.1 2.4 8.5 2.4zm0 3.4c1.5 0 2.8.6 3.8 1.5l1.2-1.2C12.2 4.8 10.4 4.1 8.5 4.1s-3.7.7-5 2l1.2 1.2c1-.9 2.3-1.5 3.8-1.5zm0 3.4c.6 0 1.1.2 1.5.6L8.5 11.3 7 9.8c.4-.4.9-.6 1.5-.6z"/></svg>
    <svg width="27" height="13" viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.8" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="20" height="9" rx="2.4" fill="currentColor"/><path d="M25 4.5v4c.8-.3 1.3-1.1 1.3-2s-.5-1.7-1.3-2z" fill="currentColor" opacity=".45"/></svg>
  </span></div><div class="island"></div>`;
  const ic={
    heute:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M3.5 10.5 12 3.8l8.5 6.7V19a1.5 1.5 0 0 1-1.5 1.5h-4.2v-6h-5.6v6H5A1.5 1.5 0 0 1 3.5 19z"/></svg>',
    anfragen:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M4 13.5 6.3 5.6A1.6 1.6 0 0 1 7.8 4.5h8.4a1.6 1.6 0 0 1 1.5 1.1l2.3 7.9V18a1.5 1.5 0 0 1-1.5 1.5H5.5A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1.2 2.2h4.6l1.2-2.2H20"/></svg>',
    chats:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 11.6c0 4.2-3.8 7.5-8.5 7.5-1.1 0-2.2-.2-3.2-.5L4 20l1.3-3.6c-1.1-1.3-1.8-3-1.8-4.8C3.5 7.4 7.3 4 12 4s8.5 3.4 8.5 7.6z"/></svg>',
    monat:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20V13M10 20V8M15 20v-5M20 20V4"/></svg>'
  };
  const t=(k,l,b)=>`<div class="tab${aktiv===k?' an':''}">${ic[k]}<span>${l}</span>${b?`<span class="badge">${b}</span>`:''}</div>`;
  const tabs=ohneTabs?'<div class="home"></div>':`<div class="fade-unten"></div><nav class="tabs">${t('heute','Heute')}${t('anfragen','Anfragen','3')}${t('chats','Chats')}${t('monat','Monat')}</nav><div class="home"></div>`;
  p.insertAdjacentHTML('afterbegin',sb);
  p.insertAdjacentHTML('beforeend',tabs);
})();
