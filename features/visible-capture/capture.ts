export interface VisibleCaptureResult {
  dataUrl: string;
  width: number;
  height: number;
  title: string;
  url: string;
  hostname: string;
  devicePixelRatio: number;
}

/**
 * Check if a tab URL is restricted by Chrome security policy
 */
export function isRestrictedUrl(url?: string): boolean {
  if (!url) return false;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('chrome.google.com/webstore') ||
    url.includes('chromewebstore.google.com')
  );
}

/**
 * Capture visible tab viewport
 */
export async function captureVisibleViewport(tabId?: number): Promise<VisibleCaptureResult> {
  let targetTab: chrome.tabs.Tab | undefined;

  if (tabId) {
    targetTab = await chrome.tabs.get(tabId);
  } else {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    targetTab = tabs[0];
  }

  if (!targetTab || !targetTab.id) {
    throw new Error('No active browser tab found to capture.');
  }

  if (isRestrictedUrl(targetTab.url)) {
    throw new Error(
      'Chrome security prevents extensions from capturing chrome://, Web Store, or internal browser pages. Please try on any standard webpage.'
    );
  }

  const windowId = targetTab.windowId;

  // Capture visible viewport
  const dataUrl = await new Promise<string>((resolve, reject) => {
    chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, (data) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else if (!data) {
        reject(new Error('captureVisibleTab returned empty data'));
      } else {
        resolve(data);
      }
    });
  });

  // Extract dimensions
  const dims = await getImageDimensions(dataUrl);

  let hostname = '';
  try {
    if (targetTab.url) {
      hostname = new URL(targetTab.url).hostname;
    }
  } catch {
    hostname = targetTab.url || 'webpage';
  }

  return {
    dataUrl,
    width: dims.width,
    height: dims.height,
    title: targetTab.title || 'Screenshot',
    url: targetTab.url || '',
    hostname,
    devicePixelRatio: 1
  };
}

/**
 * Helper to obtain natural dimensions of a dataURL image
 */
export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    if (typeof Image === 'undefined') {
      resolve({ width: 1920, height: 1080 });
      return;
    }
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 1920, height: 1080 });
    };
    img.src = dataUrl;
  });
}
