import { defineBackground } from 'wxt/sandbox';
import { captureVisibleViewport, isRestrictedUrl } from '../features/visible-capture/capture';
import { saveScreenshot, generateThumbnail } from '../services/db';
import { getSettings } from '../services/storage';
import { ScreenshotItem, SliceItem, PageDimensionsData } from '../types/screenshot';
import { ExtensionMessage } from '../types/messages';

interface FullPageSession {
  sessionId: string;
  slices: SliceItem[];
  pageDim?: PageDimensionsData;
  title: string;
  url: string;
  hostname: string;
}

const activeSessions = new Map<string, FullPageSession>();

export default defineBackground(() => {
  // --- KEYBOARD SHORTCUTS ---
  chrome.commands.onCommand.addListener(async (command) => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab || !activeTab.id) return;

      if (isRestrictedUrl(activeTab.url)) {
        console.warn('Cannot capture restricted page:', activeTab.url);
        return;
      }

      switch (command) {
        case 'visible-capture':
          await handleVisibleCapture(activeTab.id);
          break;
        case 'full-page-capture':
          await handleStartFullPageCapture(activeTab.id);
          break;
        case 'area-capture':
          await handleStartAreaCapture(activeTab.id);
          break;
      }
    } catch (err) {
      console.error('Command handling error:', err);
    }
  });

  // --- MESSAGE DISPATCHER ---
  chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
    (async () => {
      try {
        switch (message.type) {
          case 'CAPTURE_VISIBLE': {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = message.payload?.tabId || tabs[0]?.id;
            if (!tabId) throw new Error('No active tab available for capture');

            const result = await handleVisibleCapture(tabId);
            sendResponse({ success: true, id: result.id });
            break;
          }

          case 'START_AREA_CAPTURE': {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = message.payload?.tabId || tabs[0]?.id;
            if (!tabId) throw new Error('No active tab available for area capture');

            await handleStartAreaCapture(tabId);
            sendResponse({ success: true });
            break;
          }

          case 'START_FULL_PAGE_CAPTURE': {
            const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
            const tabId = message.payload?.tabId || tabs[0]?.id;
            if (!tabId) throw new Error('No active tab available for full page capture');

            await handleStartFullPageCapture(tabId);
            sendResponse({ success: true });
            break;
          }

          case 'CAPTURE_VIEWPORT_SLICE': {
            const targetWindowId = sender.tab?.windowId;
            const dataUrl = await captureTabWithRetry(targetWindowId);
            sendResponse({ dataUrl });
            break;
          }

          case 'FULL_PAGE_RECORD_SLICE': {
            const { sessionId, index, y, isLast, overlapY } = message.payload as any;
            const targetWindowId = sender.tab?.windowId;
            const dataUrl = await captureTabWithRetry(targetWindowId);

            let session = activeSessions.get(sessionId);
            if (!session) {
              session = {
                sessionId,
                slices: [],
                title: sender.tab?.title || 'Full Page Screenshot',
                url: sender.tab?.url || '',
                hostname: sender.tab?.url ? new URL(sender.tab.url).hostname : 'webpage'
              };
              activeSessions.set(sessionId, session);
            }

            session.slices.push({
              index,
              y,
              isLast,
              overlapY,
              dataUrl
            });

            sendResponse({ success: true, index });
            break;
          }

          case 'FULL_PAGE_COMPLETE': {
            const { sessionId, title, url, hostname, pageDim } = message.payload as any;
            const session = activeSessions.get(sessionId);
            if (!session || session.slices.length === 0) {
              throw new Error('No captured slices found for full page session');
            }

            session.pageDim = pageDim;
            session.title = title || session.title;
            session.url = url || session.url;
            session.hostname = hostname || session.hostname;

            // Generate thumbnail from first slice
            const firstSliceUrl = session.slices[0].dataUrl;
            const thumb = await generateThumbnail(firstSliceUrl, 320);

            const item: ScreenshotItem = {
              id: sessionId,
              dataUrl: '', // Slices will be stitched in editor tab
              thumbnailUrl: thumb,
              title: session.title,
              url: session.url,
              hostname: session.hostname,
              width: Math.round(pageDim.totalWidth * pageDim.devicePixelRatio),
              height: Math.round(pageDim.totalHeight * pageDim.devicePixelRatio),
              devicePixelRatio: pageDim.devicePixelRatio,
              timestamp: Date.now(),
              mode: 'full-page',
              slices: session.slices,
              pageDim: session.pageDim
            };

            await saveScreenshot(item);
            activeSessions.delete(sessionId);

            const settings = await getSettings();
            if (settings.openEditorAfterCapture) {
              const editorUrl = chrome.runtime.getURL(`/editor.html?id=${sessionId}`);
              await chrome.tabs.create({ url: editorUrl });
            }

            sendResponse({ success: true, id: sessionId });
            break;
          }

          case 'SAVE_SCREENSHOT_AND_OPEN': {
            const payload = message.payload as any;
            if (!payload) throw new Error('No screenshot payload provided');

            const id = 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
            const thumb = await generateThumbnail(payload.dataUrl, 320);

            const item: ScreenshotItem = {
              id,
              dataUrl: payload.dataUrl,
              thumbnailUrl: thumb,
              title: payload.title || 'Screenshot',
              url: payload.url || '',
              hostname: payload.hostname || 'webpage',
              width: payload.width,
              height: payload.height,
              devicePixelRatio: payload.devicePixelRatio || 1,
              timestamp: Date.now(),
              mode: payload.mode
            };

            await saveScreenshot(item);

            const settings = await getSettings();
            if (settings.openEditorAfterCapture) {
              const editorUrl = chrome.runtime.getURL(`/editor.html?id=${id}`);
              await chrome.tabs.create({ url: editorUrl });
            }

            sendResponse({ success: true, id });
            break;
          }

          case 'OPEN_EDITOR': {
            if (message.payload?.screenshotId) {
              const editorUrl = chrome.runtime.getURL(`/editor.html?id=${message.payload.screenshotId}`);
              await chrome.tabs.create({ url: editorUrl });
            }
            sendResponse({ success: true });
            break;
          }

          default:
            sendResponse({ unhandled: true });
        }
      } catch (err: any) {
        console.error('Background message error:', err);
        sendResponse({ success: false, error: err.message || 'Unknown error' });
      }
    })();

    return true; // Keep channel open for async responses
  });
});

/**
 * Capture visible tab with automatic retry to prevent rate limit exceptions
 */
async function captureTabWithRetry(windowId?: number, retries = 3): Promise<string> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const callback = (data?: string) => {
          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
          } else if (!data) {
            reject(new Error('captureVisibleTab returned empty data'));
          } else {
            resolve(data);
          }
        };

        if (typeof windowId === 'number') {
          chrome.tabs.captureVisibleTab(windowId, { format: 'png' }, callback);
        } else {
          chrome.tabs.captureVisibleTab({ format: 'png' }, callback);
        }
      });
      return dataUrl;
    } catch (err) {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 450));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Capture failed after retries');
}

/**
 * Handle Visible Viewport Screenshot
 */
async function handleVisibleCapture(tabId: number): Promise<{ id: string }> {
  const targetTab = await chrome.tabs.get(tabId);
  if (!targetTab) throw new Error('Tab not found');

  if (isRestrictedUrl(targetTab.url)) {
    throw new Error('Chrome does not allow extensions to capture internal browser or Web Store pages.');
  }

  const result = await captureVisibleViewport(tabId);
  const id = 'snap_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const thumb = await generateThumbnail(result.dataUrl, 320);

  const item: ScreenshotItem = {
    id,
    dataUrl: result.dataUrl,
    thumbnailUrl: thumb,
    title: result.title,
    url: result.url,
    hostname: result.hostname,
    width: result.width,
    height: result.height,
    devicePixelRatio: result.devicePixelRatio,
    timestamp: Date.now(),
    mode: 'visible'
  };

  await saveScreenshot(item);

  const settings = await getSettings();
  if (settings.openEditorAfterCapture) {
    const editorUrl = chrome.runtime.getURL(`/editor.html?id=${id}`);
    await chrome.tabs.create({ url: editorUrl });
  }

  return { id };
}

/**
 * Handle Custom Area Capture Initiation
 */
async function handleStartAreaCapture(tabId: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId);
  if (!targetTab) throw new Error('Tab not found');

  if (isRestrictedUrl(targetTab.url)) {
    throw new Error('Chrome does not allow extensions to interact with internal browser or Web Store pages.');
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'START_AREA_CAPTURE' });
  } catch (err) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js']
    });
    await new Promise((r) => setTimeout(r, 120));
    await chrome.tabs.sendMessage(tabId, { type: 'START_AREA_CAPTURE' });
  }
}

/**
 * Handle Full Page Capture Initiation
 */
async function handleStartFullPageCapture(tabId: number): Promise<void> {
  const targetTab = await chrome.tabs.get(tabId);
  if (!targetTab) throw new Error('Tab not found');

  if (isRestrictedUrl(targetTab.url)) {
    throw new Error('Chrome does not allow extensions to interact with internal browser or Web Store pages.');
  }

  try {
    await chrome.tabs.sendMessage(tabId, { type: 'START_FULL_PAGE_CAPTURE' });
  } catch (err) {
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-scripts/content.js']
    });
    await new Promise((r) => setTimeout(r, 120));
    await chrome.tabs.sendMessage(tabId, { type: 'START_FULL_PAGE_CAPTURE' });
  }
}
