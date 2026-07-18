(function () {
  const QR_URL = "https://cdn.jsdelivr.net/gh/Burtaan/PersonalJellyfin@latest/Images/swish-donate.png";

  window.__catflix_donate_running = false;

  window.__catflix_donate_init = function () {
    if (window.__catflix_donate_running) return;
    window.__catflix_donate_running = true;

    const badge = document.createElement('div');
    badge.id = 'catflix-donate-badge';
    badge.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 16px 10px 12px;
      border-radius: 999px;
      background: #1c1027;
      border: 1px solid rgba(192,132,252,0.35);
      box-shadow: 0 4px 20px rgba(0,0,0,0.5);
      cursor: pointer;
      z-index: 9999;
      transition: transform 0.15s ease, border-color 0.15s ease;
    `;
    badge.innerHTML = `
      <span style="font-size:15px; line-height:1;">&#x1F63B;</span>
      <span style="color:#e9d5ff;font-size:13px;font-weight:600;white-space:nowrap;">Support Catflix</span>
    `;
    document.body.appendChild(badge);

    badge.addEventListener('mouseenter', () => {
      badge.style.transform = 'scale(1.04)';
      badge.style.borderColor = 'rgba(192,132,252,0.7)';
    });
    badge.addEventListener('mouseleave', () => {
      badge.style.transform = 'scale(1)';
      badge.style.borderColor = 'rgba(192,132,252,0.35)';
    });

    const overlay = document.createElement('div');
    overlay.id = 'catflix-donate-overlay';
    overlay.style.cssText = `
      display: none !important;
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      width: 100vw !important;
      height: 100vh !important;
      margin: 0 !important;
      padding: 0 !important;
      background: rgba(10,8,15,0.8) !important;
      z-index: 10000 !important;
      align-items: center !important;
      justify-content: center !important;
    `;
    overlay.innerHTML = `
      <div style="background:#1c1027; border:1px solid rgba(192,132,252,0.25); border-radius:16px; padding:32px; text-align:center; max-width:320px; box-shadow:0 8px 40px rgba(0,0,0,0.8);">
        <div style="margin-bottom:8px; font-size:26px;">&#x1F63B;</div>
        <h2 style="color:#e9d5ff; font-size:19px; margin:0 0 6px;">Thanks for the support!</h2>
        <p style="color:rgba(192,132,252,0.7); font-size:13px; margin-bottom:20px;">Scan with Swish to feed the server cat</p>
        <img src="${QR_URL}" alt="Swish QR" style="width:220px; height:auto; border-radius:12px; background:#fff; padding:10px;">
        <div id="catflix-donate-close" style="display:inline-block; margin-top:20px; padding:8px 24px; border-radius:999px; background:rgba(192,132,252,0.15); color:#e9d5ff; font-size:13px; cursor:pointer;">Close</div>
      </div>
    `;
    document.body.appendChild(overlay);

    badge.addEventListener('click', () => {
      overlay.style.setProperty('display', 'flex', 'important');
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay || e.target.id === 'catflix-donate-close') {
        overlay.style.setProperty('display', 'none', 'important');
      }
    });

    function updateVisibility() {
      const isPlayingVideo = !!document.querySelector('video');
      badge.style.display = isPlayingVideo ? 'none' : 'flex';
      if (isPlayingVideo) {
        overlay.style.setProperty('display', 'none', 'important');
      }
    }

    const obs = new MutationObserver(updateVisibility);
    obs.observe(document.body, { childList: true, subtree: true });
    const interval = setInterval(updateVisibility, 1000);
    updateVisibility();

    window.__catflix_donate_observer = obs;
    window.__catflix_donate_interval = interval;
  };

  window.__catflix_donate_stop = function () {
    window.__catflix_donate_running = false;
    if (window.__catflix_donate_observer) window.__catflix_donate_observer.disconnect();
    if (window.__catflix_donate_interval) clearInterval(window.__catflix_donate_interval);
    const badge = document.getElementById('catflix-donate-badge');
    const overlay = document.getElementById('catflix-donate-overlay');
    if (badge) badge.remove();
    if (overlay) overlay.remove();
  };

  const settings = JSON.parse(localStorage.getItem('catflix_settings') || '{}');
  if (settings.donateEnabled !== false) {
    window.__catflix_donate_init();
  }
})();
