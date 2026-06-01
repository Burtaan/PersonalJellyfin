window.__catflix_pcstatus_init = function () {
  const s = JSON.parse(localStorage.getItem('catflix_settings') || '{}');
  if (s.pcStatusEnabled === false) return;
  if (window.__catflix_pcstatus_running) return;
  window.__catflix_pcstatus_running = true;

  const API_KEY = window.CATFLIX_API_KEY || '';
  const SERVER = window.location.origin;
  const PC_TEST_ID = '70ea81304315da3be21ce85d8c91adfb';
  const CHECK_INTERVAL = 60000;

  let pcOnline = null;
  let injectTimer = null;
  let checkTimer = null;

  function injectButton() {
    if (document.getElementById('pc-status-btn')) return;
    const headerRight = document.querySelector('.headerRight');
    if (!headerRight) return;
    const btn = document.createElement('div');
    btn.id = 'pc-status-btn';
    btn.style.cssText = 'display:inline-flex;align-items:center;gap:5px;font-size:13px;font-weight:700;font-family:sans-serif;color:#000;margin-left:8px;margin-right:8px;flex-shrink:0;';
    btn.innerHTML = '<span id="pc-status-dot" style="width:7px;height:7px;border-radius:50%;flex-shrink:0;display:inline-block;"></span><span>PC</span>';
    headerRight.prepend(btn);
    applyStatus();
  }

  function applyStatus() {
    const dot = document.getElementById('pc-status-dot');
    if (!dot) return;
    dot.style.background  = pcOnline === null ? '#888' : pcOnline ? '#4caf50' : '#f44336';
    dot.style.boxShadow   = `0 0 5px ${pcOnline === null ? '#888' : pcOnline ? '#4caf50' : '#f44336'}`;
  }

  async function checkPC() {
    if (!window.__catflix_pcstatus_running) return;
    try {
      await fetch(`${SERVER}/Videos/${PC_TEST_ID}/stream?api_key=${API_KEY}&MaxStreamingBitrate=1`, {
        signal: AbortSignal.timeout(3000)
      });
      pcOnline = true;
    } catch (e) {
      pcOnline = e.name !== 'TimeoutError';
    }
    applyStatus();
  }

  injectTimer = setInterval(() => {
    if (!window.__catflix_pcstatus_running) { clearInterval(injectTimer); return; }
    if (document.querySelector('.headerRight')) injectButton();
  }, 500);

  checkTimer = setInterval(() => {
    if (!window.__catflix_pcstatus_running) { clearInterval(checkTimer); return; }
    checkPC();
  }, CHECK_INTERVAL);

  setTimeout(() => { injectButton(); checkPC(); }, 500);

  window.__catflix_pcstatus_stop = function () {
    window.__catflix_pcstatus_running = false;
    clearInterval(injectTimer);
    clearInterval(checkTimer);
    const btn = document.getElementById('pc-status-btn');
    if (btn) btn.remove();
  };
};

window.__catflix_pcstatus_init();
