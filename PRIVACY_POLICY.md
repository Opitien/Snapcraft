# Privacy Policy for SnapCraft

**Last updated:** November 19, 2026

SnapCraft is committed to protecting your privacy. This privacy policy explains our practices regarding user data and information handling.

## 1. Information Collection and Use

**SnapCraft does NOT collect, store, or transmit any personal information or browsing history.**

- **No Remote Servers:** All screenshot captures, image stitching, annotations, edits, and file exports are executed **100% locally** within your browser using HTML5 Canvas and browser APIs.
- **Local Storage Only:** Any screenshots saved to your history are stored exclusively on your device using your browser's local **IndexedDB** storage. You can view, export, or delete individual screenshots or wipe your entire history at any time.
- **Preferences:** User settings (such as default image format and editor preferences) are stored locally using the Chrome Storage API (`chrome.storage.sync` / `chrome.storage.local`).

## 2. Chrome Extension Permissions

SnapCraft requests only the minimum permissions necessary to provide screenshot functionality:

- **`activeTab`**: Used solely to capture the visible viewport of the tab you are actively viewing when you trigger a capture action.
- **`scripting`**: Used to inject the interactive draggable area selection overlay and the full-page scroll coordinate engine.
- **`storage`**: Used to store your extension preferences and screenshot history locally.
- **`downloads`**: Used to save your exported screenshots (PNG/JPEG) directly to your computer's downloads folder.

## 3. Third-Party Services & Analytics

SnapCraft contains no third-party trackers, no advertising SDKs, no analytics tools, and no external telemetry. We do not sell, trade, or transfer your data to outside parties.

## 4. Changes to This Policy

If we update our privacy policy, any changes will be posted to this page.

## 5. Contact

If you have questions regarding this privacy policy, please open an issue on GitHub:
https://github.com/Opitien/Snapcraft/issues
