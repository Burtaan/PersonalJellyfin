window.__catflix_movieinfo_init = function () {
  const s = JSON.parse(localStorage.getItem('catflix_settings') || '{}');
  if (s.movieInfoEnabled === false) return;
  if (window.__catflix_movieinfo_running) return;
  window.__catflix_movieinfo_running = true;

  const API_KEY = window.CATFLIX_API_KEY || '';
  const USER_ID = window.CATFLIX_USER_ID || '';
  const SERVER = window.location.origin;
  const HEADERS = { 'X-MediaBrowser-Token': API_KEY };

  function getItemId() {
    const el = document.querySelector('[data-item-id]');
    return el ? el.getAttribute('data-item-id') : null;
  }

  function removePopup() {
    const existing = document.getElementById('catflix-info-popup');
    if (existing) existing.remove();
  }

  function formatRuntime(ticks) {
    if (!ticks) return 'N/A';
    const minutes = Math.floor(ticks / 600000000);
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  }

  async function showPopup(itemId) {
    const existing = document.getElementById('catflix-info-popup');
    if (existing) { existing.remove(); return; }

    const res = await fetch(`${SERVER}/Items/${itemId}?Fields=Overview,Genres,Studios,People,ProviderIds,RunTimeTicks,OfficialRating,CommunityRating,ProductionYear,Tags&UserId=${USER_ID}`, { headers: HEADERS });
    if (!res.ok) return;
    const d = await res.json();

    const directors = (d.People || []).filter(p => p.Type === 'Director').map(p => p.Name).join(', ') || 'N/A';
    const producers = (d.People || []).filter(p => p.Type === 'Producer').map(p => p.Name).slice(0, 3).join(', ') || 'N/A';
    const cast = (d.People || []).filter(p => p.Type === 'Actor').map(p => p.Name).slice(0, 5).join(', ') || 'N/A';
    const genres = (d.Genres || []).join(', ') || 'N/A';
    const studio = (d.Studios || []).map(s => s.Name).slice(0, 2).join(', ') || 'N/A';
    const imdbId = d.ProviderIds?.Imdb || null;
    const imdbUrl = imdbId ? `https://www.imdb.com/title/${imdbId}/` : null;

    const popup = document.createElement('div');
    popup.id = 'catflix-info-popup';
    popup.style.cssText = `
      position: fixed;
      bottom: 100px;
      right: 24px;
      width: 360px;
      max-height: 80vh;
      overflow-y: auto;
      background: rgba(20,20,20,0.95);
      backdrop-filter: blur(20px);
      border-radius: 16px;
      padding: 20px;
      z-index: 99999;
      color: #fff;
      font-family: sans-serif;
      box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      border: 1px solid rgba(255,255,255,0.1);
    `;

    popup.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:14px;">
        <div>
          <div style="font-size:16px;font-weight:700;line-height:1.3;">${d.Name || 'Unknown'}</div>
          <div style="font-size:12px;color:#aaa;margin-top:2px;">${d.ProductionYear || ''} ${d.OfficialRating ? '· ' + d.OfficialRating : ''}</div>
        </div>
        ${imdbUrl ? `<a href="${imdbUrl}" target="_blank" style="background:#f5c518;color:#000;font-size:11px;font-weight:800;padding:3px 7px;border-radius:5px;text-decoration:none;flex-shrink:0;margin-left:10px;">IMDb</a>` : ''}
      </div>
      ${d.Overview ? `<div style="font-size:12px;color:#ccc;line-height:1.5;margin-bottom:14px;max-height:120px;overflow-y:auto;">${d.Overview}</div>` : ''}
      <div style="display:grid;gap:8px;font-size:12px;">
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Runtime</span><span style="color:#fff;text-align:right;">${formatRuntime(d.RunTimeTicks)}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Rating</span><span style="color:#fff;text-align:right;">⭐ ${d.CommunityRating ? d.CommunityRating.toFixed(1) : 'N/A'}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Genres</span><span style="color:#fff;text-align:right;">${genres}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Director</span><span style="color:#fff;text-align:right;">${directors}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Cast</span><span style="color:#fff;text-align:right;">${cast}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Producers</span><span style="color:#fff;text-align:right;">${producers}</span></div>
        <div style="display:flex;justify-content:space-between;gap:10px;"><span style="color:#888;flex-shrink:0;">Studio</span><span style="color:#fff;text-align:right;">${studio}</span></div>
      </div>
    `;

    document.body.appendChild(popup);

    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!popup.contains(e.target)) {
          popup.remove();
          document.removeEventListener('click', handler);
        }
      });
    }, 100);
  }

  function injectButton() {
    if (!window.__catflix_movieinfo_running) return;
    if (document.getElementById('catflix-info-btn')) return;
    const subtitlesBtn = document.querySelector('.btnSubtitles');
    if (!subtitlesBtn) return;

    const btn = document.createElement('button');
    btn.id = 'catflix-info-btn';
    btn.className = 'autoSize paper-icon-button-light';
    btn.title = 'Movie Info';
    btn.innerHTML = '<span class="material-icons" aria-hidden="true">info</span>';
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const itemId = getItemId();
      if (itemId) showPopup(itemId);
    });

    subtitlesBtn.parentNode.insertBefore(btn, subtitlesBtn);
  }

  const injectInterval = setInterval(() => {
    if (!window.__catflix_movieinfo_running) { clearInterval(injectInterval); return; }
    if (document.querySelector('.btnSubtitles') && !document.getElementById('catflix-info-btn')) {
      injectButton();
    }
    if (!document.querySelector('.btnSubtitles')) removePopup();
  }, 200);

  const observer = new MutationObserver(() => {
    if (!window.__catflix_movieinfo_running) { observer.disconnect(); return; }
    if (document.querySelector('.btnSubtitles') && !document.getElementById('catflix-info-btn')) {
      injectButton();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  window.__catflix_movieinfo_stop = function () {
    window.__catflix_movieinfo_running = false;
    clearInterval(injectInterval);
    observer.disconnect();
    const btn = document.getElementById('catflix-info-btn');
    if (btn) btn.remove();
    removePopup();
  };
};

window.__catflix_movieinfo_init();
