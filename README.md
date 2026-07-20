# Colab Auto-Disconnect

**English** | [Russian](README.ru.md)

Chrome extension that automatically disconnects Google Colab runtime immediately after all cells finish executing, preventing background consumption of compute limits.

## Why this is needed

After code execution, Google Colab does not disconnect the virtual machine - it enters idle mode. Paid Compute Units or free daily limits continue to be consumed. Leaving a tab overnight can drain your balance completely. This extension solves the problem at the browser level, once for all notebooks.

## How it works

1. A `MutationObserver` watches the `colab-execution-status` shadow root for changes.
2. When all running cells finish (spinner disappears), the script clicks **Runtime** -> **Disconnect and delete runtime**.
3. When the confirmation dialog appears, it clicks **Yes**.

The extension only reacts to DOM mutations - no polling (`setInterval`), zero CPU load.

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
├── content_script.js   - DOM monitoring logic (~64 lines)
├── icons/              - Extension icons
├── README.md           - Documentation (EN)
├── README.ru.md        - Documentation (RU)
├── LICENSE             - MIT License
└── .gitignore
```

## Security

- Fully open source, no background processes (`background.js`).
- No dangerous permissions required (history, downloads, network).
- `pendingDisconnect` flag prevents conflicts with manual session management.

## License

[MIT](LICENSE)
