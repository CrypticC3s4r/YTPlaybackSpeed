# YouTube Playback Speed Extension — Specification

## File Structure

```plaintext
your-project-root/
├── create3.ps1
└── extension/
    ├── README.md
    ├── content.js
    ├── manifest.json
    ├── popup.html
    ├── popup.js
    └── icons/
        ├── icon16.png
        ├── icon48.png
        └── icon128.png
```

## Specification

### Purpose
This Chrome extension enables advanced playback speed control on YouTube, allowing users to:
- Set playback speed up to 16x (beyond YouTube's default 2x limit).
- Temporarily double the current playback speed by holding the spacebar or left mouse button on the video.
- See an on-screen overlay of the current speed.
- Control speed via popup UI and keyboard shortcuts.

### Features
- **Shift + .**: Increase speed (up to 16x)
- **Shift + ,**: Decrease speed (down to 0.25x)
- **Shift + [1-9]**: Instantly set speed to 1x through 9x (e.g., Shift+5 sets speed to 5x)
- **Hold Spacebar or Left Mouse Button**: Temporarily double the speed
  - If the resulting speed is 3x or more, releasing Space resets speed to 1.5x
- **Overlay**: Shows current speed on the video
- **Popup**: Displays and syncs current speed
- **Persistent Storage**: Remembers speed setting across sessions

### File Descriptions
- `manifest.json`: Chrome extension manifest (v3), declares content script, permissions, popup, and icons.
- `content.js`: Injected into YouTube pages. Handles speed logic, overlays, keyboard/mouse events, and communication with popup.
- `popup.html`: Popup UI for the extension, provides usage instructions and current speed display.
- `popup.js`: Logic for the popup, syncs and displays current speed, listens to storage and content script.
- `README.md`: Brief overview and usage instructions.
- `icons/`: Icon assets for the extension.
- `create3.ps1`: (Purpose not analyzed; likely a build or automation script.)

## Function/Module Relationships (Node Map)

```mermaid
flowchart TD
    subgraph ContentScript [content.js]
        A[createOverlay] --> B[showOverlay]
        B --> C[setPlaybackRate]
        C --> D[chrome.storage.sync.set]
        C --> E[showOverlay]
        F[enableDoubleSpeed] --> C
        G[disableDoubleSpeed] --> C
        H[attachRateChangeListener] --> B
        I[attachVideoMouseEvents] --> F
        I --> G
        J[document.addEventListener (keydown)] --> C
        J --> F
        J --> G
        K[chrome.storage.sync.get] --> C
        L[chrome.runtime.onMessage] --> C
    end
    subgraph Popup [popup.js]
        M[updateSpeedDisplay]
        N[DOMContentLoaded] --> O[chrome.storage.sync.get] --> M
        N --> P[chrome.storage.onChanged] --> M
        N --> Q[chrome.tabs.query] --> R[chrome.tabs.sendMessage] --> M
    end
    ContentScript <--> Popup
    ContentScript -.->|chrome.storage| Popup
    ContentScript -.->|chrome.runtime.sendMessage| Popup
```

## High-Level Flow
- On YouTube, `content.js` loads, reads speed from storage, and applies it to the video.
- User can adjust speed with Shift + . or , (keyboard), or by using the popup.
- Holding space or left mouse button temporarily doubles the speed.
- Overlay visually shows the current speed.
- Popup displays and updates speed, syncing with content script via storage and messaging.

---

## Example User Actions
- **Increase Speed**: Press Shift + .
- **Decrease Speed**: Press Shift + ,
- **Double Speed**: Hold space or left mouse button
- **See Speed**: Look at overlay or popup

---

## Recent Implementation Steps (Changelog)

### 2025-05-04
- **Added Keyboard Shortcuts for Quick Speed Set:**
    - Pressing Shift + 1 through Shift + 9 now instantly sets playback speed to 1x through 9x, respectively.
    - Implemented in `content.js` within the main keydown event handler.
    - This works alongside the existing Shift + . and Shift + , shortcuts for fine-grained control, and the double-speed (Space/Mouse) features.
- **Double Speed Logic Updated:**
    - If playback speed while holding Space is 3x or more, releasing Space sets speed to 1.5x instead of restoring the previous speed.
- **Documentation Updated:**
    - This changelog section was added to `spec.md` per user request, to document each significant implementation step.

---

## Notes
- The extension only runs on YouTube (`*://*.youtube.com/*`).
- All speed changes are persisted using `chrome.storage.sync`.
- The overlay is transient and disappears after 1.5 seconds.

---

## Future Improvements (Suggested)
- Add options page for custom speed increments.
- Support for other video platforms.
- Customizable overlay appearance.
