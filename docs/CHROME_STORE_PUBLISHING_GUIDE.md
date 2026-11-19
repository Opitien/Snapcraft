# Chrome Web Store Publishing Guide for SnapCraft

This step-by-step guide walks you through publishing **SnapCraft** to the official **Google Chrome Web Store**.

---

## 📋 Prerequisites

1. **Google Account**: Sign in to the account you want to own the extension.
2. **One-Time Developer Fee**: Google charges a one-time **$5 registration fee** to activate a Chrome Web Store developer account.
3. **Developer Dashboard**: Access the dashboard at [https://chrome.google.com/webstore/devconsole](https://chrome.google.com/webstore/devconsole).

---

## 📦 Step 1: Package Your Extension

Run the packaging command in your terminal:

```bash
npm run zip
```

This compiles your extension and generates the production zip file:
📁 `.output/chrome-screenshot-extension-1.0.0-chrome.zip` (~98 kB)

This zip file contains `manifest.json`, the background service worker, extension pages, icons, and content scripts with all development modules removed.

---

## 🚀 Step 2: Upload to Developer Dashboard

1. Go to the [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole).
2. Click the **"New Item"** button in the top right.
3. Drag and drop or browse to select `.output/chrome-screenshot-extension-1.0.0-chrome.zip`.
4. Wait a few seconds for Google to validate the manifest.

---

## ✍️ Step 3: Complete Store Listing Information

### 1. Product Details
- **Item Name**: `SnapCraft - Screenshot & Screen Annotation Tool`
- **Summary (Short description, max 132 chars)**:
  `Capture visible screens, full scrolling pages, or draggable areas with an instant offline editor, blur tool, and local history.`
- **Detailed Description**:
  ```markdown
  SnapCraft is a lightweight, modern, and privacy-first screenshot extension for Google Chrome.

  🔥 Key Features:
  • Visible Viewport Capture: Instant pixel-perfect capture of your active screen.
  • Full-Page Scrolling: Smart stitching engine that hides sticky headers and eliminates duplicate seams.
  • Custom Draggable Area: Click & drag across any rectangular region with live dimensions and smart element snap.
  • Powerful In-Browser Editor:
    - Crop with live interactive handles
    - Blur / Pixelate tool to redact sensitive passwords, emails, and API keys
    - Vector arrows, rectangles, circles, straight lines, and freehand pen
    - High-contrast text annotations and step-by-step numbered callout badges (①, ②, ③)
    - Auto-Fit screen view so ultra-long screenshots never spill off your monitor
  • 100% Private & Offline: Uses local IndexedDB storage. Zero cloud uploads, zero trackers.
  • Export Options: One-click copy to clipboard (PNG) or direct download.

  ⌨️ Keyboard Shortcuts:
  • Alt + Shift + V : Capture Visible Screen
  • Alt + Shift + F : Capture Full Page
  • Alt + Shift + A : Select Custom Area
  ```
- **Category**: `Productivity` (or `Photos`)
- **Language**: `English`

---

## 🎨 Step 4: Upload Store Graphics & Media

Google requires the following graphical assets:

| Asset | Dimensions | Status | Location |
|---|---|---|---|
| **Store Icon** | 128 × 128 px (PNG) | ✅ Ready | `public/icon-128.png` |
| **Screenshots** | 1280 × 800 px or 640 × 400 px (PNG/JPEG) | At least 1 required (up to 5) | Take screenshots of the popup & editor |
| **Small Promo Tile** | 440 × 280 px (PNG) | Recommended | Crop from `assets/social-preview.png` |
| **Marquee Promo Tile** | 1400 × 560 px (PNG) | Optional | For featured placements |

> **Tip for Screenshots:** Open SnapCraft in Chrome, capture a page, open the editor with annotations, and use your OS screen capture or SnapCraft itself to save an image at 1280×800.

---

## 🔒 Step 5: Privacy Practices & Review Justifications

Google will prompt you to explain why your extension requests each permission. Copy and paste the approved justifications below:

### 1. Single Purpose Description
> `SnapCraft provides users with screen capture capabilities (visible screen, full scrollable webpage, and custom selected area) and offline image annotation tools.`

### 2. Permission Justifications
- **`activeTab`**:
  > `Used exclusively to capture the visible viewport of the active tab when the user clicks a capture action in the popup or presses a shortcut.`
- **`scripting`**:
  > `Used to inject the interactive area selection overlay and full-page scrolling engine into the active page upon user request.`
- **`storage`**:
  > `Stores user preferences (image export format, auto-open editor) and persists screenshot history locally in IndexedDB.`
- **`downloads`**:
  > `Allows the user to download their captured and annotated screenshot file to their local machine.`

### 3. Data Usage Disclosures
- Does your extension collect personal data? ➔ **No**
- Does your extension transmit data to external servers? ➔ **No**
- Check the box confirming: *"I certify that this extension adheres to the Chrome Web Store Developer Program Policies."*

### 4. Privacy Policy URL
Enter the GitHub URL to the repository's Privacy Policy:
```
https://github.com/Opitien/Snapcraft/blob/main/PRIVACY_POLICY.md
```

---

## 🚀 Step 6: Submit for Review

1. Click **"Submit for Review"** at the top right of the dashboard.
2. Choose **"Publish automatically once approved"**.
3. **Review Timeline**: Manifest V3 extensions requesting standard permissions typically pass automated & human review within **24 to 72 hours**.
4. Once approved, your extension will be live on the Chrome Web Store with its own public installation link!
