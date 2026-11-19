import { defineContentScript } from 'wxt/sandbox';
import { AreaSelector } from '../features/area-capture/overlay';
import { cropViewportScreenshot } from '../features/area-capture/crop';
import { ScrollCaptureController } from '../features/full-page/scroll-controller';
import { ExtensionMessage } from '../types/messages';

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_idle',
  main() {
    let areaSelector: AreaSelector | null = null;
    let scrollController: ScrollCaptureController | null = null;
    let isCapturingFullPage = false;

    // Listen for extension messages
    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      switch (message.type) {
        case 'PING':
          sendResponse({ ready: true });
          return true;

        case 'START_AREA_CAPTURE': {
          if (!areaSelector) {
            areaSelector = new AreaSelector();
          }

          areaSelector.start(
            async (result) => {
              try {
                // Request viewport capture from background
                const res = await chrome.runtime.sendMessage({ type: 'CAPTURE_VIEWPORT_SLICE' });
                if (!res || !res.dataUrl) {
                  throw new Error('Failed to capture viewport for area crop');
                }

                // Crop image
                const croppedDataUrl = await cropViewportScreenshot({
                  dataUrl: res.dataUrl,
                  rect: result.rect,
                  windowWidth: result.windowWidth,
                  windowHeight: result.windowHeight,
                  devicePixelRatio: result.devicePixelRatio
                });

                // Request background to save and open editor
                await chrome.runtime.sendMessage({
                  type: 'SAVE_SCREENSHOT_AND_OPEN',
                  payload: {
                    mode: 'area',
                    dataUrl: croppedDataUrl,
                    width: Math.round(result.rect.width * result.devicePixelRatio),
                    height: Math.round(result.rect.height * result.devicePixelRatio),
                    title: document.title || 'Selected Area',
                    url: window.location.href,
                    hostname: window.location.hostname,
                    devicePixelRatio: result.devicePixelRatio
                  }
                });
              } catch (err: any) {
                console.error('Area capture error:', err);
                alert(`Area capture failed: ${err.message || 'Unknown error'}`);
              }
            },
            () => {
              chrome.runtime.sendMessage({ type: 'AREA_CANCELLED' });
            }
          );

          sendResponse({ started: true });
          return true;
        }

        case 'START_FULL_PAGE_CAPTURE': {
          if (isCapturingFullPage) {
            sendResponse({ started: false, error: 'Capture already in progress' });
            return true;
          }

          isCapturingFullPage = true;
          scrollController = new ScrollCaptureController();

          scrollController.initialize(() => {
            isCapturingFullPage = false;
            chrome.runtime.sendMessage({ type: 'FULL_PAGE_CANCEL' });
          });

          // Run full-page capture workflow
          (async () => {
            try {
              if (!scrollController) return;

              const sessionId = 'fullpage_' + Date.now();
              const dims = scrollController.getPageDimensions();
              const plan = scrollController.calculateScrollPlan(dims);

              for (let i = 0; i < plan.length; i++) {
                if (scrollController.cancelled) break;

                const step = plan[i];

                // Scroll to target offset
                await scrollController.scrollToPosition(step.y, 350);

                // Hide sticky/fixed headers on subsequent slices
                if (i > 0) {
                  scrollController.hideStickyAndFixedElements();
                }

                scrollController.updateProgress(i + 1, plan.length);

                // Tell background to record slice into session
                const recRes = await chrome.runtime.sendMessage({
                  type: 'FULL_PAGE_RECORD_SLICE',
                  payload: {
                    sessionId,
                    index: step.index,
                    y: step.y,
                    isLast: step.isLast,
                    overlapY: step.overlapY
                  }
                });

                if (!recRes || !recRes.success) {
                  throw new Error(recRes?.error || `Failed to record slice ${i + 1}`);
                }

                // Throttle pause between slices to respect Chrome limits
                await new Promise((r) => setTimeout(r, 200));
              }

              if (scrollController.cancelled) {
                return;
              }

              scrollController.updateProgress(plan.length, plan.length);

              // Clean up styles and scroll position immediately
              scrollController.cleanup();

              // Tell background that all slices are captured
              await chrome.runtime.sendMessage({
                type: 'FULL_PAGE_COMPLETE',
                payload: {
                  sessionId,
                  title: document.title || 'Full Page Screenshot',
                  url: window.location.href,
                  hostname: window.location.hostname,
                  pageDim: dims
                }
              });
            } catch (err: any) {
              console.error('Full page capture error:', err);
              if (scrollController) {
                scrollController.cleanup();
              }
              alert(`Full-page capture failed: ${err.message || 'Unknown error'}`);
            } finally {
              isCapturingFullPage = false;
            }
          })();

          sendResponse({ started: true });
          return true;
        }

        case 'FULL_PAGE_CANCEL': {
          if (scrollController) {
            scrollController.cancel();
          }
          isCapturingFullPage = false;
          sendResponse({ cancelled: true });
          return true;
        }
      }
    });
  }
});
