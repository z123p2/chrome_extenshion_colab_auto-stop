(function () {
  const log = [];
  function l(msg, data) {
    log.push({ t: Date.now(), m: msg, d: data });
    console.log('[CAD]', msg, data);
  }

  function addLogBtn() {
    const btn = document.createElement('button');
    btn.textContent = '↓';
    btn.title = 'Скачать логи';
    Object.assign(btn.style, {
      position: 'fixed', bottom: '10px', right: '10px', zIndex: '99999',
      padding: '2px 8px', fontSize: '11px', cursor: 'pointer',
      background: '#1a73e8', color: '#fff', border: 'none', borderRadius: '3px',
      fontFamily: 'monospace', opacity: '0.5', lineHeight: '1', minWidth: '0'
    });
    btn.onmouseenter = () => btn.style.opacity = '1';
    btn.onmouseleave = () => btn.style.opacity = '0.5';
    btn.onclick = () => {
      const text = log.map(e => `[${new Date(e.t).toISOString().slice(11,19)}] ${e.m} ${e.d !== undefined ? JSON.stringify(e.d) : ''}`).join('\n');
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([text], {type: 'text/plain'}));
      a.download = 'colab-autodisconnect-logs.log';
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(a.href);
    };
    document.body.appendChild(btn);
  }
  addLogBtn();

  let pendingDisconnect = false;
  let workerDisconnected = false;

  function dialogWatcher() {
    new MutationObserver(() => {
      const dialog = document.querySelector('mwc-dialog[open]');
      if (!dialog) return;
      l('dialogFound', { pending: pendingDisconnect });
      if (!pendingDisconnect) return;
      const yesBtn = dialog.querySelector('md-text-button[slot="primaryAction"]');
      if (!yesBtn) { l('dialogNoYesBtn'); return; }
      l('dialogClickYes', { text: yesBtn.textContent?.trim() });
      yesBtn.click();
      pendingDisconnect = false;
      workerDisconnected = true;
    }).observe(document.body, { childList: true, subtree: true, attributeFilter: ['open'] });
    l('dialogWatcherActive');
  }
  dialogWatcher();

  const worker = new Worker(URL.createObjectURL(new Blob([
    `setInterval(() => postMessage('tick'), 10000);`
  ], { type: 'application/javascript' })));
  worker.onmessage = () => { l('workerTick'); doDisconnect(true); };
  l('workerCreated');

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
    l('isRunning', { spinner: !!spinner, text: text.slice(0, 60), result });
    return result;
  }

  function isConnected() {
    const btn = document.querySelector('colab-connect-button');
    l('qConnectBtn', { exists: !!btn });
    if (!btn?.shadowRoot) return false;
    const sparkline = btn.shadowRoot.querySelector('colab-usage-sparkline');
    const shadowText = btn.shadowRoot.textContent || '';
    const result = !!sparkline || shadowText.includes('ОЗУ') || shadowText.includes('RAM') || shadowText.includes('Диск');
    l('isConnected', { sparkline: !!sparkline, result });
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
    if (fromWorker && workerDisconnected) { l('doDisc_skip_workerDone'); return; }
    if (pendingDisconnect) { l('doDisc_skip_pending', { fromWorker }); return; }

    const running = isRunning();
    l('doDisc_runningCheck', { running, fromWorker });
    if (running !== false) { l('doDisc_skip_running'); return; }

    if (!fromWorker) {
      const connected = isConnected();
      l('doDisc_connectedCheck', { connected });
      if (!connected) { l('doDisc_skip_disconnected'); return; }
    }

    pendingDisconnect = true;
    setTimeout(() => { pendingDisconnect = false; }, 60000);
    l('doDisc_proceed');

    if (!clickRuntimeMenu()) { pendingDisconnect = false; return; }

    setTimeout(() => {
      const items = document.querySelectorAll('.goog-menuitem-content');
      l('menuItems', { count: items.length });
      const target = Array.from(items).find(el =>
        el.textContent.includes('Отключиться') || el.textContent.includes('Disconnect')
      );
      if (!target) { l('menuItemNotFound'); pendingDisconnect = false; return; }
      l('menuItemFound', { text: target.textContent?.trim() });
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
  l('init_firstCheck');
  doDisconnect();
})();
