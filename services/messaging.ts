import { ExtensionMessage } from '../types/messages';

/**
 * Send a message to the background service worker
 */
export async function sendToBackground<T = unknown>(message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Send a message to a specific tab's content script
 */
export async function sendToTab<T = unknown>(tabId: number, message: ExtensionMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}

/**
 * Get active browser tab
 */
export async function getActiveTab(): Promise<chrome.tabs.Tab | undefined> {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs[0];
}

/**
 * Ensure content script is injected in tab before communicating
 */
export async function ensureContentScriptInjected(tabId: number): Promise<boolean> {
  try {
    const res = await sendToTab<{ ready: boolean }>(tabId, { type: 'PING' });
    if (res && res.ready) return true;
  } catch {
    // If not injected, inject content script
  }

  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js']
    });
    return true;
  } catch (err) {
    console.error('Failed to inject content script:', err);
    return false;
  }
}
