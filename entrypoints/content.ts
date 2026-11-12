import { defineContentScript } from 'wxt/sandbox';
import { AreaSelector } from '../features/area-capture/overlay';
import { cropViewportScreenshot } from '../features/area-capture/crop';
import { ScrollCaptureController } from '../features/full-page/scroll-controller';
import { stitchSlices, SliceData } from '../features/full-page/stitch';
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
              // User cancelled area selection
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

          // Run full page capture workflow asynchronously
          (async () => {
            try {
              if (!scrollController) return;

              const dims = scrollController.getPageDimensions();
              const plan = scrollController.calculateScrollPlan(dims);
              const slices: SliceData[] = [];

              for (let i = 0; i < plan.length; i++) {
                if (scrollController.cancelled) break;

                const step = plan[i];

                // Scroll to target offset
                await scrollController.scrollToPosition(step.y, 280);

                // Hide sticky/fixed headers on subsequent slices so they don't repeat
                if (i > 0) {
                  scrollController.hideStickyAndFixedElements();
                }

                scrollController.updateProgress(i + 1, plan.length);

                // Ask background to capture this viewport slice
                const sliceRes = await chrome.runtime.sendMessage({ type: 'CAPTURE_VIEWPORT_SLICE' });
                if (!sliceRes || !sliceRes.dataUrl) {
                  throw new Error(`Failed to capture viewport slice ${i + 1}`);
                }

                slices.push({
                  step,
                  dataUrl: sliceRes.dataUrl
                });
              }

              if (scrollController.cancelled) {
                return;
              }

              // Update widget
              scrollController.updateProgress(plan.length, plan.length);

              // Stitch slices together
              const stitchedDataUrl = await stitchSlices(slices, dims);

              // Clean up page styles and scroll position
              scrollController.cleanup();

              // Send result to background to save and open editor
              await chrome.runtime.sendMessage({
                type: 'SAVE_SCREENSHOT_AND_OPEN',
                payload: {
                  mode: 'full-page',
                  dataUrl: stitchedDataUrl,
                  width: Math.round(dims.totalWidth * dims.devicePixelRatio),
                  height: Math.round(dims.totalHeight * dims.devicePixelRatio),
                  title: document.title || 'Full Page Screenshot',
                  url: window.location.href,
                  hostname: window.location.hostname,
                  devicePixelRatio: dims.devicePixelRatio
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
