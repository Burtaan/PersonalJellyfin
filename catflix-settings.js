(function () {
  const STORAGE_KEY = 'catflix_settings';

  // ── Add new features HERE and nowhere else ────────────────────────────────
  const FEATURES = [
    {
      key:   'movieInfoEnabled',
      label: 'Movie Info Button',
      desc:  'Cast, runtime & IMDb link in player',
      init:  '__catflix_movieinfo_init',
      stop:  '__catflix_movieinfo_stop',
      cleanup() {
        window.__catflix_movieinfo_running = false;
        const el = document.getElementById('catflix-info-btn');
        if (el) el.remove();
      }
    },
    {
      key:   'locationTagsEnabled',
      label: 'Location Tags',
      desc:  'PC / NAS badges on posters',
      init:  '__catflix_locationtags_init',
      stop:  '__catflix_locationtags_stop',
      cleanup() {
        window.__catflix_locationtags_running = false;
        document.querySelectorAll('.catflix-location-badge').forEach(b => b.remove());
        document.querySelectorAll('.card[data-id]').forEach(c => { c._locationTagged = false; });
      }
    },
    {
      key:   'pcStatusEnabled',
      label: 'PC Status Indicator',
      desc:  'Online dot in header',
      init:  '__catflix_pcstatus_init',
      stop:  '__catflix_pcstatus_stop',
      cleanup() {
        window.__catflix_pcstatus_running = false;
        const el = document.getElementById('pc-status-btn');
        if (el) el.remove();
      }
    },
    {
      key:   'catFactEnabled',
      label: 'Cat Fact Popup',
      desc:  'Random cat fact when you open Jellyfin',
      init:  '__catflix_catfact_init',
      stop:  '__catflix_catfact_stop'
    }
  ];
  // ─────────────────────────────────────────────────────────────────────────

  function getSettings() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
    catch { return {}; }
  }

  function saveSetting(key, value) {
    const s = getSettings();
    s[key] = value;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  }

  const PAW_SVG = `<svg width="18" height="18" viewBox="0 0 100 100" fill="currentColor" xmlns="http://www.w3.org/2000/svg" style="flex-shrink:0;">
    <ellipse cx="20" cy="30" rx="10" ry="13"/>
    <ellipse cx="42" cy="18" rx="10" ry="13"/>
    <ellipse cx="64" cy="18" rx="10" ry="13"/>
    <ellipse cx="82" cy="30" rx="10" ry="13"/>
    <path d="M50 42 C28 42 18 55 20 70 C22 85 35 92 50 92 C65 92 78 85 80 70 C82 55 72 42 50 42 Z"/>
  </svg>`;

  // ── Live feature control (driven by FEATURES array) ───────────────────────

  function applyFeature(key, on) {
    const feature = FEATURES.find(f => f.key === key);
    if (!feature) return;

    if (on) {
      // Reset running flag if it exists, then call init
      const runningFlag = '__catflix_' + key.replace('Enabled', '') + '_running';
      if (window[runningFlag] !== undefined) window[runningFlag] = false;
      if (window[feature.init]) window[feature.init]();
    } else {
      // Call stop if it exists, otherwise run the cleanup defined in FEATURES
      if (window[feature.stop]) {
        window[feature.stop]();
      } else if (feature.cleanup) {
        feature.cleanup();
      }
    }
  }

  // ── Inject sidebar ────────────────────────────────────────────────────────

  function injectSidebarButton() {
    if (document.getElementById('catflix-nav-section')) return;
    const scrollContainer = document.querySelector('.mainDrawer-scrollContainer');
    if (!scrollContainer) return;

    const section = document.createElement('div');
    section.id = 'catflix-nav-section';
    section.innerHTML = `
      <h3 class="sidebarHeader">Catflix</h3>
      <a class="navMenuOption lnkMediaFolder emby-button" id="catflix-settings-btn" href="#"
         style="display:flex;align-items:center;gap:0;">
        <span class="navMenuOptionIcon" style="display:flex;align-items:center;justify-content:center;">${PAW_SVG}</span>
        <span class="navMenuOptionText">Catflix Settings</span>
      </a>
    `;

    const userSection = scrollContainer.querySelector('.userMenuOptions');
    if (userSection) scrollContainer.insertBefore(section, userSection);
    else scrollContainer.appendChild(section);

    document.getElementById('catflix-settings-btn').addEventListener('click', function (e) {
      e.preventDefault();
      openCatPanel();
    });
  }

  // ── Panel ─────────────────────────────────────────────────────────────────

  function makeToggle(feature, settings) {
    const on = settings[feature.key] !== false;
    return `
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">
        <div style="flex:1;margin-right:12px;">
          <div style="color:rgba(255,255,255,0.9);font-size:13px;">${feature.label}</div>
          <div style="color:rgba(255,255,255,0.5);font-size:11px;margin-top:2px;">${feature.desc}</div>
        </div>
        <label style="position:relative;display:inline-block;width:44px;height:26px;flex-shrink:0;cursor:pointer;">
          <input type="checkbox" data-setting="${feature.key}" ${on ? 'checked' : ''}
            style="opacity:0;width:0;height:0;position:absolute;">
          <span data-track="${feature.key}" style="
            position:absolute;cursor:pointer;inset:0;
            background:${on ? '#c084fc' : 'rgba(255,255,255,0.15)'};
            border-radius:26px;transition:background 0.2s;">
            <span data-knob="${feature.key}" style="
              position:absolute;height:20px;width:20px;
              left:${on ? '21px' : '3px'};bottom:3px;
              background:#fff;border-radius:50%;transition:left 0.2s;">
            </span>
          </span>
        </label>
      </div>
    `;
  }

  function openCatPanel() {
    const existing = document.getElementById('catflix-panel');
    if (existing) { existing.remove(); return; }

    const settings = getSettings();
    const isMobile = window.innerWidth < 600;

    const panel = document.createElement('div');
    panel.id = 'catflix-panel';
    panel.style.cssText = `
      position: fixed;
      ${isMobile
        ? 'bottom:0;left:0;right:0;width:100%;border-radius:16px 16px 0 0;'
        : 'top:120px;left:340px;width:310px;border-radius:12px;'}
      background: #1c1027;
      border: 1px solid rgba(192,132,252,0.25);
      box-shadow: 0 8px 40px rgba(0,0,0,0.8);
      z-index: 99999;
      font-family: inherit;
      overflow: hidden;
      user-select: none;
      touch-action: none;
    `;

    panel.innerHTML = `
      <div id="catflix-panel-header" style="
        padding: 14px 16px 12px;
        border-bottom: 1px solid rgba(192,132,252,0.15);
        display: flex;
        align-items: center;
        justify-content: space-between;
        cursor: ${isMobile ? 'default' : 'grab'};
        background: rgba(192,132,252,0.07);
      ">
        <div style="display:flex;align-items:center;gap:10px;pointer-events:none;">
          <img src="https://cheshireacademy.org/wp-content/uploads/2025/03/CatflixLogo.png"
               style="height:22px;object-fit:contain;" alt="Catflix">
          <span style="color:#e9d5ff;font-size:14px;font-weight:600;">Catflix Settings</span>
        </div>
        <button id="catflix-close" style="
          background:none;border:none;color:rgba(192,132,252,0.7);
          font-size:18px;cursor:pointer;line-height:1;padding:4px 8px;
          border-radius:4px;pointer-events:all;
        ">✕</button>
      </div>

      <div style="padding:16px 18px 20px;">
        <div style="
          font-size:10px;font-weight:600;letter-spacing:0.1em;
          color:rgba(192,132,252,0.5);text-transform:uppercase;margin-bottom:14px;
        ">Features</div>

        ${FEATURES.map(f => makeToggle(f, settings)).join('')}

        <div style="
          margin-top:10px;padding-top:12px;
          border-top:1px solid rgba(192,132,252,0.1);
          font-size:10px;color:rgba(255,255,255,0.18);text-align:center;
        ">Toggles apply instantly</div>
      </div>
    `;

    document.body.appendChild(panel);

    document.getElementById('catflix-close').addEventListener('click', () => panel.remove());

    setTimeout(() => {
      document.addEventListener('click', function outsideClick(e) {
        if (!panel.contains(e.target) && !e.target.closest('#catflix-settings-btn')) {
          panel.remove();
          document.removeEventListener('click', outsideClick);
        }
      });
    }, 50);

    // ── Draggable (desktop only) ──
    if (!isMobile) {
      const header = document.getElementById('catflix-panel-header');
      let dragging = false, ox = 0, oy = 0;

      function startDrag(cx, cy) {
        const rect = panel.getBoundingClientRect();
        ox = cx - rect.left;
        oy = cy - rect.top;
        dragging = true;
        header.style.cursor = 'grabbing';
      }

      function moveDrag(cx, cy) {
        if (!dragging) return;
        let nx = Math.max(0, Math.min(window.innerWidth  - panel.offsetWidth,  cx - ox));
        let ny = Math.max(0, Math.min(window.innerHeight - panel.offsetHeight, cy - oy));
        panel.style.left = nx + 'px';
        panel.style.top  = ny + 'px';
      }

      function endDrag() {
        dragging = false;
        header.style.cursor = 'grab';
      }

      header.addEventListener('mousedown', e => {
        if (e.target.id === 'catflix-close') return;
        e.preventDefault();
        startDrag(e.clientX, e.clientY);
      });
      document.addEventListener('mousemove', e => moveDrag(e.clientX, e.clientY));
      document.addEventListener('mouseup', endDrag);

      header.addEventListener('touchstart', e => {
        if (e.target.id === 'catflix-close') return;
        const t = e.touches[0];
        startDrag(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchmove', e => {
        const t = e.touches[0];
        moveDrag(t.clientX, t.clientY);
      }, { passive: true });
      document.addEventListener('touchend', endDrag);
    }

    // ── Live toggles ──
    panel.querySelectorAll('input[data-setting]').forEach(checkbox => {
      const key   = checkbox.dataset.setting;
      const track = panel.querySelector(`[data-track="${key}"]`);
      const knob  = panel.querySelector(`[data-knob="${key}"]`);

      checkbox.addEventListener('change', () => {
        const on = checkbox.checked;
        track.style.background = on ? '#c084fc' : 'rgba(255,255,255,0.15)';
        knob.style.left = on ? '21px' : '3px';
        saveSetting(key, on);
        applyFeature(key, on);
      });
    });
  }

  // ── Boot ──────────────────────────────────────────────────────────────────

  new MutationObserver(() => {
    if (!document.getElementById('catflix-nav-section')) injectSidebarButton();
  }).observe(document.body, { childList: true, subtree: true });

  let attempts = 0;
  function tryInject() {
    injectSidebarButton();
    if (!document.getElementById('catflix-nav-section') && ++attempts < 30) {
      setTimeout(tryInject, 500);
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', tryInject);
  else tryInject();

})();
