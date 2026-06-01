window.__catflix_locationtags_init = function () {
  const s = JSON.parse(localStorage.getItem('catflix_settings') || '{}');
  if (s.locationTagsEnabled === false) return;
  if (window.__catflix_locationtags_running) return;
  window.__catflix_locationtags_running = true;

  const API_KEY = window.CATFLIX_API_KEY || '';
  const USER_ID = window.CATFLIX_USER_ID || '';
  const SERVER = window.location.origin;
  const HEADERS = { 'X-MediaBrowser-Token': API_KEY };

  const BADGE_PC_STYLE  = 'background:#cc7722;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;font-family:monospace;letter-spacing:0.5px;line-height:1.4;display:block;';
  const BADGE_NAS_STYLE = 'background:#1a6b3c;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;font-family:monospace;letter-spacing:0.5px;line-height:1.4;display:block;';

  const pathCache = {};

  async function prefetchAllPaths() {
    const res = await fetch(`${SERVER}/Items?Recursive=true&IncludeItemTypes=Movie,Series&Fields=Path&UserId=${USER_ID}&Limit=500`, { headers: HEADERS });
    if (!res.ok) return;
    const data = await res.json();
    (data.Items || []).forEach(item => {
      if (item.Path && item.Type === 'Movie') pathCache[item.Id] = [item.Path];
    });
  }

  prefetchAllPaths();

  function isPC(path)  { return path && (path.includes('/mnt/PC_Serier')        || path.includes('/mnt/PC_Filmer')); }
  function isNAS(path) { return path && (path.includes('/mnt/Disk/Plex/Serier') || path.includes('/mnt/Disk/Plex/Filmer')); }

  async function getPaths(itemId) {
    if (pathCache[itemId] !== undefined) return pathCache[itemId];
    try {
      const res = await fetch(`${SERVER}/Items/${itemId}?Fields=Path&UserId=${USER_ID}`, { headers: HEADERS });
      if (!res.ok) return [];
      const data = await res.json();

      if (data.Type === 'Series') {
        const seasonsRes = await fetch(`${SERVER}/Items?ParentId=${itemId}&IncludeItemTypes=Season&Fields=Id&UserId=${USER_ID}`, { headers: HEADERS });
        if (!seasonsRes.ok) return [];
        const seasonsData = await seasonsRes.json();
        const paths = (await Promise.all((seasonsData.Items || []).map(async season => {
          const epRes = await fetch(`${SERVER}/Items?ParentId=${season.Id}&IncludeItemTypes=Episode&Fields=Path&Limit=1&UserId=${USER_ID}`, { headers: HEADERS });
          if (!epRes.ok) return [];
          const epData = await epRes.json();
          return (epData.Items || []).map(i => i.Path).filter(Boolean);
        }))).flat();
        pathCache[itemId] = paths;
        return paths;
      }

      if (data.Type === 'Season') {
        const epRes = await fetch(`${SERVER}/Items?ParentId=${itemId}&IncludeItemTypes=Episode&Fields=Path&Limit=1&UserId=${USER_ID}`, { headers: HEADERS });
        if (!epRes.ok) return [];
        const epData = await epRes.json();
        const paths = (epData.Items || []).map(i => i.Path).filter(Boolean);
        pathCache[itemId] = paths;
        return paths;
      }

      const paths = data.Path ? [data.Path] : [];
      pathCache[itemId] = paths;
      return paths;
    } catch { return []; }
  }

  async function processCard(card) {
    if (!window.__catflix_locationtags_running) return;
    if (card._locationTagged) return;
    card._locationTagged = true;

    const itemId = card.getAttribute('data-id');
    if (!itemId) return;

    const paths = await getPaths(itemId);
    const hasPC  = paths.some(isPC);
    const hasNAS = paths.some(isNAS);
    if (!hasPC && !hasNAS) return;

    if (!window.__catflix_locationtags_running) return;

    const scalable = card.querySelector('.cardScalable');
    if (!scalable) return;
    scalable.style.position = 'relative';

    const container = document.createElement('div');
    container.className = 'catflix-location-badge';
    container.style.cssText = 'position:absolute;top:8px;left:8px;display:flex;flex-direction:column;gap:3px;align-items:flex-start;z-index:9999;pointer-events:none;';

    if (hasPC)  { const b = document.createElement('span'); b.textContent = 'PC';  b.style.cssText = BADGE_PC_STYLE;  container.appendChild(b); }
    if (hasNAS) { const b = document.createElement('span'); b.textContent = 'NAS'; b.style.cssText = BADGE_NAS_STYLE; container.appendChild(b); }

    scalable.appendChild(container);
  }

  function processAll() {
    if (!window.__catflix_locationtags_running) return;
    document.querySelectorAll('.card[data-id]').forEach(processCard);
  }

  const observer = new MutationObserver(() => {
    if (!window.__catflix_locationtags_running) { observer.disconnect(); return; }
    processAll();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  processAll();

  window.__catflix_locationtags_stop = function () {
    window.__catflix_locationtags_running = false;
    observer.disconnect();
    document.querySelectorAll('.catflix-location-badge').forEach(b => b.remove());
    document.querySelectorAll('.card[data-id]').forEach(c => { c._locationTagged = false; });
  };
};

window.__catflix_locationtags_init();
