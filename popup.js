const $ = (id) => document.getElementById(id);

function setTheme(theme) {
  const body = document.body;
  body.classList.remove('dark');
  if (theme === 'dark') {
    body.classList.add('dark');
  } else if (theme === 'system') {
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      body.classList.add('dark');
    }
  }
  document.querySelectorAll('.theme-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.theme === theme);
  });
  chrome.storage.sync.set({ theme });
}

function sendToColab(action, data, cb) {
  chrome.tabs.query({ url: 'https://colab.research.google.com/*' }, (tabs) => {
    for (const tab of tabs) {
      chrome.tabs.sendMessage(tab.id, { action, ...data }, (response) => {
        if (chrome.runtime.lastError) continue;
        if (cb) cb(response);
      });
    }
  });
}

function updateStatus() {
  sendToColab('getStatus', {}, (status) => {
    const dot = $('statusDot');
    const text = $('statusText');
    if (status) {
      if (status.enabled) {
        dot.className = 'status-dot active';
        text.textContent = 'Активно';
      } else {
        dot.className = 'status-dot inactive';
        text.textContent = 'Отключено';
      }
    } else {
      dot.className = 'status-dot inactive';
      text.textContent = 'Нет данных';
    }
  });
}

chrome.storage.sync.get(['enabled', 'loggingEnabled', 'theme'], (r) => {
  $('enabled').checked = r.enabled !== false;
  $('loggingEnabled').checked = r.loggingEnabled === true;
  setTheme(r.theme || 'system');
  updateStatus();
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    chrome.storage.sync.get('theme', ({ theme: t }) => {
      if (t === 'system') document.body.classList.toggle('dark', e.matches);
    });
  });
});

$('enabled').addEventListener('change', () => {
  const val = $('enabled').checked;
  chrome.storage.sync.set({ enabled: val });
  updateStatus();
});

$('loggingEnabled').addEventListener('change', () => {
  const val = $('loggingEnabled').checked;
  chrome.storage.sync.set({ loggingEnabled: val });
});

document.querySelectorAll('.theme-btn').forEach(btn => {
  btn.addEventListener('click', () => setTheme(btn.dataset.theme));
});

$('logBtn').addEventListener('click', () => {
  const area = $('logArea');
  const actions = $('logActions');
  if (area.classList.contains('open')) {
    area.classList.remove('open');
    actions.classList.remove('show');
    $('logBtn').textContent = '📋 Логи';
    return;
  }
  area.textContent = 'Загрузка...';
  let received = false;
  sendToColab('getLogs', {}, (response) => {
    if (received) return;
    received = true;
    if (!response || !response.logs || response.logs.length === 0) {
      area.textContent = 'Логов нет';
      area.classList.add('open');
      $('logBtn').textContent = '✕ Закрыть';
      actions.classList.add('show');
      return;
    }
    const lines = response.logs.map(e => {
      const t = new Date(e.t).toLocaleTimeString('ru-RU');
      const extra = e.d !== undefined ? ' ' + JSON.stringify(e.d) : '';
      return `<span class="log-time">[${t}]</span> ${e.m}${extra}`;
    }).join('\n');
    area.innerHTML = lines;
    area.classList.add('open');
    $('logBtn').textContent = '✕ Закрыть';
    actions.classList.add('show');
    area.scrollTop = area.scrollHeight;
  });
  setTimeout(() => {
    if (!received) {
      area.textContent = 'Нет активных вкладок Colab';
      area.classList.add('open');
      $('logBtn').textContent = '✕ Закрыть';
    }
  }, 1000);
});

$('copyLogsBtn').addEventListener('click', () => {
  const text = $('logArea').textContent;
  if (text && text !== 'Логов нет' && text !== 'Загрузка...' && !text.startsWith('Нет активных')) {
    navigator.clipboard.writeText(text);
  }
});

$('clearLogsBtn').addEventListener('click', () => {
  sendToColab('clearLogs', {});
  $('logArea').textContent = 'Логов нет';
});
