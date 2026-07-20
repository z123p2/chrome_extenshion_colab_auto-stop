(function () {
  const log = [];
  let enabled = true;
  let loggingEnabled = false;
  let pendingDisconnect = false;
  let workerDisconnected = false;

  function l(msg, data) {
    if (!loggingEnabled) return;
    const entry = { t: Date.now(), m: msg, d: data };
    log.push(entry);
    if (log.length > 500) log.splice(0, log.length - 500);
  }

  function initStorage() {
    chrome.storage.sync.get(['enabled', 'loggingEnabled'], (r) => {
      enabled = r.enabled !== false;
      loggingEnabled = r.loggingEnabled === true;
      if (loggingEnabled) l('logStarted');
    });
  }
  initStorage();

  chrome.storage.onChanged.addListener((changes) => {
    if (changes.enabled) enabled = changes.enabled.newValue;
    if (changes.loggingEnabled) {
      loggingEnabled = changes.loggingEnabled.newValue;
      if (loggingEnabled) l('logStarted');
    }
  });

  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg.action === 'getLogs') {
      sendResponse({ logs: log.slice(-200) });
    }
    if (msg.action === 'getStatus') {
      sendResponse({ enabled });
    }
    if (msg.action === 'clearLogs') {
      log.length = 0;
      sendResponse({ ok: true });
    }
  });

  function dialogWatcher() {
    new MutationObserver(() => {
      const dialog = document.querySelector('mwc-dialog[open]');
      if (!dialog) return;
      l('dialogFound', { pending: pendingDisconnect });
      if (!pendingDisconnect) return;
      const yesBtn = dialog.querySelector('md-text-button[slot="primaryAction"]');
      if (!yesBtn) { l('dialogNoYesBtn'); return; }
      l('dialogClickYes');
      yesBtn.click();
      pendingDisconnect = false;
      workerDisconnected = true;
    }).observe(document.body, { childList: true, subtree: true, attributeFilter: ['open'] });
  }
  dialogWatcher();

  const worker = new Worker(URL.createObjectURL(new Blob([
    `setInterval(() => postMessage('tick'), 10000);`
  ], { type: 'application/javascript' })));
  worker.onmessage = () => {
    l('workerTick');
    doDisconnect(true);
  };

  function getStatusBar() {
    const el = document.querySelector('colab-status-bar');
    l('qStatusBar', { exists: !!el });
    return el;
  }

  function getExecStatus() {
    const bar = getStatusBar();
    if (!bar?.shadowRoot) return null;
    const el = bar.shadowRoot.querySelector('colab-execution-status');
    l('qExecStatus', { exists: !!el });
    return el;
  }

  function getExecRoot() {
    const el = getExecStatus();
    if (!el?.shadowRoot) return null;
    return el.shadowRoot;
  }

  function isRunning() {
    const root = getExecRoot();
    if (!root) { l('isRunning_null'); return null; }
    const spinner = root.querySelector('md-circular-progress');
    const text = root.textContent || '';
    const result = !!spinner || text.includes('Выполнение') || text.includes('Executing') || text.endsWith('…');
    l('isRunning', { result });
    return result;
  }

  function isConnected() {
    const btn = document.querySelector('colab-connect-button');
    l('qConnectBtn', { exists: !!btn });
    if (!btn?.shadowRoot) return false;
    const sparkline = btn.shadowRoot.querySelector('colab-usage-sparkline');
    const shadowText = btn.shadowRoot.textContent || '';
    const result = !!sparkline || shadowText.includes('ОЗУ') || shadowText.includes('RAM') || shadowText.includes('Диск');
    l('isConnected', { result });
    return result;
  }

  function clickRuntimeMenu() {
    const btn = document.querySelector('#runtime-menu-button');
    if (!btn) { l('noRuntimeBtn'); return false; }
    btn.click();
    l('runtimeBtnClicked');
    return true;
  }

  function doDisconnect(fromWorker) {
    if (!enabled) { l('doDisc_skip_disabled'); return; }
    if (fromWorker && workerDisconnected) { l('doDisc_skip_workerDone'); return; }
    if (pendingDisconnect) { l('doDisc_skip_pending'); return; }

    const running = isRunning();
    l('doDisc_runningCheck', { running, fromWorker });
    if (running !== false) { l('doDisc_skip_running'); return; }

    if (!fromWorker) {
      const connected = isConnected();
      l('doDisc_connectedCheck', { connected });
      if (!connected) { l('doDisc_skip_disconnected'); return; }
    }

    pendingDisconnect = true;
    setTimeout(() => { pendingDisconnect = false; }, 15000);
    l('doDisc_proceed');

    if (!clickRuntimeMenu()) { pendingDisconnect = false; return; }

    setTimeout(() => {
      const items = document.querySelectorAll('.goog-menuitem-content');
      l('menuItems', { count: items.length });
      const target = Array.from(items).find(el =>
        el.textContent.includes('Отключиться') || el.textContent.includes('Disconnect')
      );
      if (!target) { l('menuItemNotFound'); pendingDisconnect = false; return; }
      l('menuItemFound');
      const item = target.closest('.goog-menuitem');
      const rect = item.getBoundingClientRect();
      const evtOpts = { bubbles: true, cancelable: true, view: window, button: 0, clientX: rect.x + 10, clientY: rect.y + 10 };
      item.dispatchEvent(new MouseEvent('mousedown', evtOpts));
      item.dispatchEvent(new MouseEvent('mouseup', evtOpts));
      item.click();
      l('menuItemClicked');
    }, 300);
  }

  function setupExecutionObserver() {
    const root = getExecRoot();
    if (!root) { l('execObs_fail'); return false; }
    new MutationObserver((mutations) => {
      l('execObs_fired', { types: [...new Set(mutations.map(m => m.type))].join(',') });
      if (workerDisconnected) {
        const running = root.querySelector('md-circular-progress');
        const text = root.textContent || '';
        if (running || text.includes('Выполнение') || text.includes('Executing')) {
          l('execObs_resetWorkerFlag');
          workerDisconnected = false;
        }
      }
      doDisconnect();
    }).observe(root, { childList: true, subtree: true, attributes: true });
    l('execObs_ok');
    return true;
  }

  if (!setupExecutionObserver()) {
    l('execObs_deferred');
    const initObserver = new MutationObserver(() => {
      if (setupExecutionObserver()) {
        l('execObs_deferred_success');
        initObserver.disconnect();
      }
    });
    initObserver.observe(document.body, { childList: true, subtree: true });
  }
  doDisconnect();
})();
