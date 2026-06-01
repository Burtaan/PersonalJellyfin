(function () {

  window.__catflix_catfact_init = function () {
    const settings = JSON.parse(localStorage.getItem('catflix_settings') || '{}');

    if (settings.catFactEnabled === false) return;

    if (document.getElementById('catflix-catfact-popup')) return;

    fetch('https://catfact.ninja/fact')
      .then(res => res.json())
      .then(data => {
        showPopup(data.fact);
      })
      .catch(() => {});
  };

  window.__catflix_catfact_stop = function () {
    const el = document.getElementById('catflix-catfact-popup');
    if (el) el.remove();
  };

  function showPopup(fact) {
    const popup = document.createElement('div');
    popup.id = 'catflix-catfact-popup';
    popup.style.cssText = `
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: #1c1027;
      border: 1px solid rgba(192,132,252,0.25);
      box-shadow: 0 8px 40px rgba(0,0,0,0.8);
      border-radius: 12px;
      padding: 14px 18px;
      max-width: 380px;
      width: 90%;
      z-index: 99998;
      font-family: inherit;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      animation: catfact-slide-in 0.3s ease;
    `;

    if (!document.getElementById('catflix-catfact-style')) {
      const style = document.createElement('style');
      style.id = 'catflix-catfact-style';
      style.textContent = `
        @keyframes catfact-slide-in {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    popup.innerHTML = `
      <div style="font-size:20px;line-height:1;">🐾</div>
      <div style="flex:1;">
        <div style="font-size:10px;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:rgba(192,132,252,0.6);margin-bottom:4px;">Cat Fact</div>
        <div style="font-size:13px;color:rgba(255,255,255,0.85);line-height:1.5;">${fact}</div>
      </div>
      <button id="catflix-catfact-close" style="
        background:none;border:none;color:rgba(192,132,252,0.6);
        font-size:16px;cursor:pointer;padding:0 0 0 6px;line-height:1;
        flex-shrink:0;
      ">✕</button>
    `;

    document.body.appendChild(popup);

    document.getElementById('catflix-catfact-close').addEventListener('click', () => popup.remove());

    setTimeout(() => {
      if (document.getElementById('catflix-catfact-popup')) popup.remove();
    }, 8000);
  }

  window.__catflix_catfact_init();

})();
