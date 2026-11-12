# SnapCraft — Chrome Screenshot & Annotation Extension (MVP)

A lightweight, high-performance Chrome screenshot extension built with **React**, **TypeScript**, and **WXT** following **Manifest V3** best practices.

SnapCraft allows users to capture visible viewports, entire scrolling webpages, and custom draggable regions with pixel-perfect accuracy, offline image editing, annotation tools, and local history.

---

## 🚀 Key Features

### 1. Visible Screen Capture
- Captures the exact visible browser viewport using `chrome.tabs.captureVisibleTab()`.
- Accounts for high-DPI displays (Retina, 4K) and browser zoom levels.
- Instantly opens in the dedicated canvas editor or copies directly to the system clipboard.

### 2. Full-Page Scrolling & Stitching Engine
- Automatically scrolls through long webpages in calibrated increments.
- Accounts for lazy-loaded assets and CSS animations with configurable delay triggers.
- **Smart Sticky Header Suppression:** Temporarily hides `fixed` and `sticky` headers on intermediate slices to prevent repeated navigation bars down the stitched image.
- **Mathematical Overlap Compensation:** Accurately computes remaining scroll height at the page bottom and clips the overlapping upper portion of the final slice to guarantee zero duplicated sections or visible seams.
- **Floating On-Screen Progress Indicator:** Displays real-time capture percentage and an immediate **Cancel** button.
- **Canvas Safeguard:** Protects against browser canvas dimension limits (32,767px) by scaling down safely without crashing.
- Restores original scroll position, page styles, and sticky elements upon completion or cancellation.

### 3. Custom Draggable Area Capture
- Injected high-z-index overlay with a dark backdrop and crosshair cursor.
- Supports clicking and dragging in **all four directions** (top-left, bottom-right, etc.).
- Cutout box with live dimensions badge (`Width × Height` in CSS and physical device pixels).
- **8 Interactive Resize Handles:** Fine-tune rectangular boundaries from any corner or edge before capturing.
- Draggable center for repositioning the selection area.
- Floating **Capture (Enter)** and **Cancel (Esc)** action controls.
- Isolates page events, prevents text selection interference, and removes all injected DOM elements on completion or cancellation.

### 4. Dedicated Canvas Editor & Annotation Suite
- Dedicated extension page (`/editor.html`) preserving browser performance.
- **Interactive Tools:**
  - **Crop:** Freeform crop box with live preview, confirmation, and cancellation.
  - **Rectangle:** Clean geometric outlines with configurable line thickness and color.
  - **Arrow:** Vector arrows with calculated directional arrowheads for callouts.
  - **Text:** High-contrast text annotations with semi-transparent background pills.
  - **Blur / Redact:** High-resolution pixelation mosaic for obscuring sensitive credentials, emails, and passwords.
  - **Freehand Pen:** Smooth brush drawing for quick notes.
  - **History (Undo / Redo):** Stack-based state restoration.
  - **Zoom & Pan:** Zoom in, zoom out, and 100% reset.
- **Export Options:** One-click **Copy to Clipboard** (`image/png` via `ClipboardItem`) and **Download PNG**.

### 5. Local Offline Storage & History
- Uses **IndexedDB** for full-resolution screenshot image storage, preventing `chrome.storage.local` quota limits.
- Generates compressed JPEG thumbnails using `OffscreenCanvas` for instant popup loading.
- Tracks source URL, hostname, dimensions, and capture timestamps.
- Download past captures, delete individual screenshots, or clear entire history with confirmation.
- 100% local processing — no external network requests or third-party servers.

### 6. Default Keyboard Shortcuts
- `Alt + Shift + V` — Capture visible viewport
- `Alt + Shift + F` — Capture full scrollable page
- `Alt + Shift + A` — Select custom draggable area

---

## 🛠️ Technology Stack

| Layer | Technology |
|---|---|
| **Framework & Build** | [WXT (Web Extension Tools)](https://wxt.dev) + Vite |
| **UI Library** | React 18 & TypeScript |
| **Styling** | Tailwind CSS (v3.4) & Lucide Icons |
| **Graphics** | HTML5 Canvas API & OffscreenCanvas |
| **Storage** | IndexedDB (Images) + Chrome Storage Sync/Local (Settings) |
| **Platform** | Chrome Extension Manifest V3 |

---

## 📁 Project Structure

```text
Extension-chrome/
├── entrypoints/
│   ├── background.ts            # MV3 Service Worker (message passing & shortcuts)
│   ├── content.ts               # Content script (injected selection & scroll engine)
│   ├── globals.css              # Tailwind base styling
│   ├── popup/                   # Extension popup interface
│   │   ├── App.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   ├── editor/                  # Dedicated canvas editor page
│   │   ├── App.tsx
│   │   ├── index.html
│   │   └── main.tsx
│   └── settings/                # Settings & History manager page
│       ├── App.tsx
│       ├── index.html
│       └── main.tsx
├── components/
│   ├── popup/                   # Header, CaptureActions, RecentCaptures, Footer
│   └── editor/                  # EditorToolbar, EditorCanvas
├── features/
│   ├── visible-capture/         # Viewport capture logic & restricted URL detection
│   ├── full-page/               # ScrollController & image stitcher
│   ├── area-capture/            # Selection overlay & crop utilities
│   └── editor/                  # CanvasEngine (drawing, blur, crop, undo/redo)
├── services/
│   ├── db.ts                    # IndexedDB screenshot & thumbnail storage
│   ├── storage.ts               # Extension preferences sync
│   ├── downloads.ts             # Chrome downloads & clipboard helper
│   └── messaging.ts             # Typed Chrome runtime & tab messaging
├── types/
│   ├── screenshot.ts            # Screenshot data interfaces
│   └── messages.ts              # Extension message union types
├── scripts/
│   └── generate-icons.js        # Pure Node PNG icon generator (16, 32, 48, 128px)
├── test/
│   └── capture-logic.test.mjs   # Unit tests for capture, scroll, and crop math
├── wxt.config.ts                # WXT configuration & Manifest definition
├── tailwind.config.js           # Tailwind configuration
└── package.json
```

---

## 📦 Installation & Setup

### Prerequisites
- **Node.js**: v18+ (tested on Node v24)
- **Google Chrome** (or Chromium-based browser: Brave, Edge, Arc)

### 1. Install Dependencies
```bash
npm install
```

### 2. Build the Extension
```bash
npm run build
```
This compiles the extension into the `.output/chrome-mv3` directory.

### 3. Load into Chrome
1. Open Google Chrome and navigate to `chrome://extensions/`.
2. Enable **Developer mode** using the toggle switch in the top-right corner.
3. Click the **Load unpacked** button in the top-left corner.
4. Select the `.output/chrome-mv3` folder inside your project directory:
   `c:\Users\user\Extension-chrome\.output\chrome-mv3`
5. Pin **SnapCraft** to your browser toolbar for quick access!

---

## 🧑‍💻 Development Workflow

### Live Reload Development Server
```bash
npm run dev
```
WXT will automatically launch a dedicated Chrome test instance with live hot-reloading for extension pages and content scripts.

### Type-Checking
```bash
npm run compile
```

### Run Unit Tests
```bash
npm test
```
Runs Node's native test runner verifying restricted URL logic, scroll step calculations, and physical DPR crop transformations.

---

## 🔒 Security & Permissions

The extension uses the minimal set of Manifest V3 permissions required for MVP functionality:

- `activeTab`: Grants temporary access to the active browser tab when the user interacts with the extension.
- `scripting`: Injects the area selector and scroll capture controllers into the target webpage on demand.
- `storage`: Stores user preferences (format, auto-open editor, auto-copy) across devices.
- `downloads`: Saves captured screenshots to the user's default downloads directory.

---

## ⚠️ Known Limitations & Browser Security Boundaries

1. **Restricted Browser Pages:**
   Under Chrome security policies, extensions cannot execute content scripts or capture tabs on:
   - `chrome://` internal URLs (e.g., `chrome://settings`, `chrome://extensions`)
   - `chrome-extension://` pages from other extensions
   - Chrome Web Store domains (`chromewebstore.google.com`)
   SnapCraft detects these URLs and displays an informative notice to the user.

2. **Cross-Origin Iframes:**
   Content inside third-party cross-origin iframes that handle their own scroll containers cannot be programmatically scrolled from the parent document context.

3. **Max Canvas Dimension Limits:**
   Modern browsers limit HTML5 `<canvas>` elements to 32,767px per dimension and 268M total pixels. For exceptionally long webpages (e.g., infinite-scroll feeds beyond 30,000px), SnapCraft automatically scales the composite canvas to avoid crashing the browser tab.

4. **Complex Custom Parallax / Fixed Positioning:**
   While SnapCraft automatically detects and hides standard `position: fixed` and `position: sticky` headers, non-standard JavaScript-driven scroll listeners that reposition DOM nodes during scrolling may exhibit visual artifacts.
