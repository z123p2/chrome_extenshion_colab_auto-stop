# Colab Auto-Disconnect

🌐 **English** | [Русский](README.ru.md)

Chrome extension that automatically disconnects Google Colab runtime after all cells finish executing.

## How it works

1. A `MutationObserver` watches the `colab-execution-status` shadow root for changes
2. When cells finish (spinner disappears), the script clicks **Runtime** -> **Disconnect and delete runtime**
3. When the confirmation dialog appears, it clicks **Yes**
4. The runtime is disconnected - no manual steps needed

The extension observes only `childList` and `attributeFilter: ['open']` mutations - no polling, no unnecessary load on the page.

## Installation

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked**
4. Select the `chrome_extenshion_colab_auto-stop` folder

## Project structure

```
├── manifest.json       - Chrome Extension manifest (Manifest V3)
├── content_script.js   - main extension logic (~78 lines)
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── README.md
├── README.ru.md
├── LICENSE
└── .gitignore
```

## Why this approach

The extension uses only:
- `MutationObserver` on shadow roots (no `setInterval` polling)
- One `setTimeout(300ms)` for Closure menu initialization
- A `pendingDisconnect` flag to avoid interfering with manual interaction

No `background.js`, no `downloads` permission, no inline script injection.

## License

MIT
