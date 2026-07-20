# Colab Auto-Disconnect

🌐 **English** | [Russian](README.ru.md)

Chrome extension that automatically disconnects Google Colab runtime immediately after all cells finish executing, preventing background consumption of compute limits.

Works in **active and background tabs** - no need to keep the Colab tab focused.

## Why this is needed

After code execution, Google Colab does not disconnect the virtual machine - it enters idle mode. Paid Compute Units or free daily limits continue to be consumed. Leaving a tab overnight can drain your balance completely. This extension solves the problem at the browser level, once for all notebooks.

## How it works

Two parallel mechanisms ensure disconnection in any tab state:

**1. MutationObserver (active tab)**
Monitors the `colab-execution-status` shadow root for changes. When cells finish (spinner disappears), it immediately clicks **Runtime** -> **Disconnect and delete runtime**, then confirms **Yes** in the dialog.

**2. Web Worker (background tab)**
Chrome throttles DOM timers in inactive tabs. A Web Worker runs in a separate thread, firing every 10 seconds - Chrome never throttles it. The worker calls `doDisconnect(true)`, which skips the `isConnected` check (shadow DOM is frozen in background tabs) and proceeds directly to the disconnect menu.

After a successful disconnect, `workerDisconnected` flag prevents repeat attempts until new cells are executed.

**3. Dialog watcher**
A permanent `MutationObserver` with `attributeFilter: ['open']` catches the confirmation dialog. It only clicks "Yes" when `pendingDisconnect` is true (triggered by the script), ignoring dialogs opened manually.

## Important limitations

- **Data deletion:** The session is destroyed completely. All unsaved files in `/content/` will be lost. Save results to Google Drive before running.
- **Run all mode:** The script triggers when no cells are active. Running a single cell manually will trigger disconnect. Use `Ctrl + F9` (Run all).
- **Interface language:** Menu text search supports **Russian** and **English** Colab UI languages.

## Installation

1. Download the repo and unpack the archive.
2. Open `chrome://extensions/`.
3. Enable **Developer mode** (top right).
4. Click **Load unpacked** (top left) and select the `chrome_extenshion_colab_auto-stop` folder.

## Project structure

```
├── manifest.json       - Chrome Extension manifest (Manifest V3)
├── content_script.js   - Disconnect logic + logging + message listener
├── popup.html          - Settings popup UI (theme, toggles, logs)
├── popup.js            - Popup logic (storage, messaging, logs display)
├── icons/              - Extension icons
├── README.md           - Documentation (EN)
├── README.ru.md        - Documentation (RU)
├── LICENSE             - MIT License
└── .gitignore
```

## Technical details

- **No `background.js`** - no service worker, no extra permissions
- **No polling** - MutationObserver for active tabs, Web Worker for background tabs
- **`pendingDisconnect` flag** - prevents conflicts with manual session management
- **`workerDisconnected` flag** - prevents repeat disconnect in already-disconnected tabs
- **15s timeout** - if a menu click doesn't trigger a dialog, retries automatically
- **Google Closure events** - menu items are clicked via `mousedown` + `mouseup` + `click` with real coordinates (Closure ignores plain `.click()`)

## License

[MIT](LICENSE)
