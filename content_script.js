(function () {
  let pendingDisconnect = false;

  function dialogWatcher() {
    new MutationObserver(() => {
      const dialog = document.querySelector('mwc-dialog[open]');
      if (!dialog) return;
      if (!pendingDisconnect) return;
      const yesBtn = dialog.querySelector('md-text-button[slot="primaryAction"]');
      if (!yesBtn) return;
      yesBtn.click();
      pendingDisconnect = false;
    }).observe(document.body, { childList: true, subtree: true, attributeFilter: ['open'] });
  }
  dialogWatcher();

  const worker = new Worker(URL.createObjectURL(new Blob([
    `setInterval(() => postMessage('tick'), 10000);`
  ], { type: 'application/javascript' })));
  worker.onmessage = () => doDisconnect();

  function getStatusBar() {
    return document.querySelector('colab-status-bar');
  }

  function getExecStatus() {
    const bar = getStatusBar();
    if (!bar?.shadowRoot) return null;
    return bar.shadowRoot.querySelector('colab-execution-status');
  }

  function getExecRoot() {
    const el = getExecStatus();
    if (!el?.shadowRoot) return null;
    return el.shadowRoot;
  }

  function isRunning() {
    const root = getExecRoot();
    if (!root) return null;
    const spinner = root.querySelector('md-circular-progress');
    const text = root.textContent || '';
    return !!spinner || text.includes('Выполнение') || text.includes('Executing') || text.endsWith('…');
  }

  function isConnected() {
    const btn = document.querySelector('colab-connect-button');
    if (!btn?.shadowRoot) return false;
    const sparkline = btn.shadowRoot.querySelector('colab-usage-sparkline');
    const shadowText = btn.shadowRoot.textContent || '';
    return !!sparkline || shadowText.includes('ОЗУ') || shadowText.includes('RAM') || shadowText.includes('Диск');
  }

  function clickRuntimeMenu() {
    const btn = document.querySelector('#runtime-menu-button');
    if (!btn) return false;
    btn.click();
    return true;
  }

  function doDisconnect() {
    if (pendingDisconnect) return;

    const running = isRunning();
    if (running !== false) return;

    const connected = isConnected();
    if (!connected) return;

    pendingDisconnect = true;
    setTimeout(() => { pendingDisconnect = false; }, 60000);

    if (!clickRuntimeMenu()) { pendingDisconnect = false; return; }

    setTimeout(() => {
      const items = document.querySelectorAll('.goog-menuitem-content');
      const target = Array.from(items).find(el =>
        el.textContent.includes('Отключиться') || el.textContent.includes('Disconnect')
      );
      if (!target) { pendingDisconnect = false; return; }
      const item = target.closest('.goog-menuitem');
      const rect = item.getBoundingClientRect();
      const evtOpts = { bubbles: true, cancelable: true, view: window, button: 0, clientX: rect.x + 10, clientY: rect.y + 10 };
      item.dispatchEvent(new MouseEvent('mousedown', evtOpts));
      item.dispatchEvent(new MouseEvent('mouseup', evtOpts));
      item.click();
    }, 300);
  }

  function setupExecutionObserver() {
    const root = getExecRoot();
    if (!root) return false;
    new MutationObserver(() => {
      doDisconnect();
    }).observe(root, { childList: true, subtree: true, attributes: true });
    return true;
  }

  if (!setupExecutionObserver()) {
    const initObserver = new MutationObserver(() => {
      if (setupExecutionObserver()) {
        initObserver.disconnect();
      }
    });
    initObserver.observe(document.body, { childList: true, subtree: true });
  }
  doDisconnect();
})();
