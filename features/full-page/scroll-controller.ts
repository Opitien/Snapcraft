import { PageDimensionsData } from '../../types/screenshot';

export interface PageDimensions extends PageDimensionsData {}

export interface ScrollStep {
  index: number;
  totalSteps: number;
  y: number;
  isLast: boolean;
  overlapY: number;
}

export class ScrollCaptureController {
  private originalScrollX = 0;
  private originalScrollY = 0;
  private hiddenFixedElements: Array<{ el: HTMLElement; origVisibility: string; origOpacity: string }> = [];
  private progressWidget: HTMLDivElement | null = null;
  private isCancelled = false;
  private onCancelCallback: (() => void) | null = null;

  /**
   * Measure full page dimensions accurately
   */
  public getPageDimensions(): PageDimensions {
    const doc = document.documentElement;
    const body = document.body;

    const totalWidth = Math.max(
      doc.scrollWidth,
      body ? body.scrollWidth : 0,
      doc.offsetWidth,
      doc.clientWidth
    );

    const totalHeight = Math.max(
      doc.scrollHeight,
      body ? body.scrollHeight : 0,
      doc.offsetHeight,
      body ? body.offsetHeight : 0,
      doc.clientHeight
    );

    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const devicePixelRatio = window.devicePixelRatio || 1;

    return {
      totalWidth,
      totalHeight,
      viewportWidth,
      viewportHeight,
      devicePixelRatio
    };
  }

  /**
   * Initialize capture session: save scroll position, prepare styles
   */
  public initialize(onCancel: () => void) {
    this.isCancelled = false;
    this.onCancelCallback = onCancel;
    this.originalScrollX = window.scrollX || window.pageXOffset || 0;
    this.originalScrollY = window.scrollY || window.pageYOffset || 0;

    this.createProgressWidget();
  }

  /**
   * Target and temporarily hide sticky and fixed navigation elements after first slice
   * Uses targeted queries instead of querying every DOM node for high performance.
   */
  public hideStickyAndFixedElements() {
    if (this.hiddenFixedElements.length > 0) return; // already hidden

    const candidates = new Set<HTMLElement>();

    // Target common headers and fixed navigation candidates
    const selectors = [
      'header',
      'nav',
      '[class*="header"]',
      '[class*="navbar"]',
      '[class*="sticky"]',
      '[class*="fixed"]',
      '[class*="topbar"]',
      '[style*="position: fixed"]',
      '[style*="position: sticky"]'
    ];

    try {
      document.querySelectorAll<HTMLElement>(selectors.join(',')).forEach((el) => candidates.add(el));
      // Also check top-level body children
      if (document.body) {
        Array.from(document.body.children).forEach((child) => {
          if (child instanceof HTMLElement) candidates.add(child);
        });
      }
    } catch {
      // Fallback
    }

    for (const el of candidates) {
      if (el.id === 'snapcraft-progress-widget' || el.closest('#snapcraft-progress-widget')) {
        continue;
      }

      try {
        const style = window.getComputedStyle(el);
        if (style.position === 'fixed' || style.position === 'sticky') {
          this.hiddenFixedElements.push({
            el,
            origVisibility: el.style.visibility,
            origOpacity: el.style.opacity
          });
          el.style.visibility = 'hidden';
          el.style.opacity = '0';
        }
      } catch {
        // Skip un-computable element
      }
    }
  }

  /**
   * Restore any hidden fixed elements
   */
  public restoreStickyAndFixedElements() {
    for (const item of this.hiddenFixedElements) {
      item.el.style.visibility = item.origVisibility;
      item.el.style.opacity = item.origOpacity;
    }
    this.hiddenFixedElements = [];
  }

  /**
   * Calculate all vertical scroll coordinates to cover the entire page
   */
  public calculateScrollPlan(dim: PageDimensions): ScrollStep[] {
    const steps: ScrollStep[] = [];
    const { totalHeight, viewportHeight } = dim;

    // Single viewport page
    if (totalHeight <= viewportHeight) {
      return [{
        index: 0,
        totalSteps: 1,
        y: 0,
        isLast: true,
        overlapY: 0
      }];
    }

    let currentY = 0;
    let stepIndex = 0;

    // To prevent infinite captures on extreme pages, cap at 30 slices (~30,000px)
    const MAX_STEPS = 30;

    while (currentY < totalHeight && stepIndex < MAX_STEPS) {
      const isLast = (currentY + viewportHeight >= totalHeight) || (stepIndex === MAX_STEPS - 1);
      const targetY = isLast ? Math.max(0, totalHeight - viewportHeight) : currentY;
      const overlapY = (stepIndex > 0 && isLast) ? Math.max(0, currentY - targetY) : 0;

      steps.push({
        index: stepIndex,
        totalSteps: 0,
        y: targetY,
        isLast,
        overlapY
      });

      if (isLast) break;
      currentY += viewportHeight;
      stepIndex++;
    }

    const total = steps.length;
    steps.forEach((s) => (s.totalSteps = total));
    return steps;
  }

  /**
   * Scroll to specified Y offset and wait for content/lazy images to render
   */
  public async scrollToPosition(y: number, waitMs = 350): Promise<void> {
    if (this.isCancelled) throw new Error('Capture cancelled by user');

    window.scrollTo({
      left: 0,
      top: y,
      behavior: 'instant' as ScrollBehavior
    });

    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = y;
    }

    // Wait for DOM repaint and lazy image loaders
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Force animation frame render
    await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
  }

  /**
   * Create floating on-screen progress indicator
   */
  private createProgressWidget() {
    this.removeProgressWidget();

    const widget = document.createElement('div');
    widget.id = 'snapcraft-progress-widget';
    widget.style.cssText = `
      position: fixed;
      top: 24px;
      right: 24px;
      background: #0f172a;
      color: #ffffff;
      padding: 14px 18px;
      border-radius: 12px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45), 0 0 0 1px rgba(255, 255, 255, 0.1);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 250px;
      pointer-events: auto;
      backdrop-filter: blur(8px);
      box-sizing: border-box;
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <div style="width: 8px; height: 8px; border-radius: 50%; background: #3b82f6; animation: pulse 1.5s infinite;"></div>
          <span style="font-size: 13px; font-weight: 600; color: #f8fafc;">Capturing Full Page</span>
        </div>
        <button id="snapcraft-cancel-btn" style="
          background: rgba(255,255,255,0.12);
          color: #cbd5e1;
          border: none;
          padding: 4px 10px;
          border-radius: 6px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
          transition: background 0.15s;
        ">Cancel</button>
      </div>
      <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 9999px; overflow: hidden;">
        <div id="snapcraft-progress-bar" style="width: 5%; height: 100%; background: #3b82f6; border-radius: 9999px; transition: width 0.25s ease-out;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
        <span id="snapcraft-progress-text">Scrolling & stitching...</span>
        <span id="snapcraft-progress-percent">0%</span>
      </div>
    `;

    document.documentElement.appendChild(widget);
    this.progressWidget = widget;

    const cancelBtn = widget.querySelector<HTMLButtonElement>('#snapcraft-cancel-btn');
    if (cancelBtn) {
      cancelBtn.onmouseenter = () => { cancelBtn.style.background = 'rgba(255,255,255,0.22)'; };
      cancelBtn.onmouseleave = () => { cancelBtn.style.background = 'rgba(255,255,255,0.12)'; };
      cancelBtn.onclick = (e) => {
        e.stopPropagation();
        this.cancel();
      };
    }
  }

  /**
   * Update progress UI on screen
   */
  public updateProgress(current: number, total: number) {
    if (!this.progressWidget) return;

    const percent = Math.min(100, Math.round((current / total) * 100));
    const bar = this.progressWidget.querySelector<HTMLDivElement>('#snapcraft-progress-bar');
    const text = this.progressWidget.querySelector<HTMLSpanElement>('#snapcraft-progress-text');
    const pct = this.progressWidget.querySelector<HTMLSpanElement>('#snapcraft-progress-percent');

    if (bar) bar.style.width = `${percent}%`;
    if (text) text.textContent = `Section ${current} of ${total}`;
    if (pct) pct.textContent = `${percent}%`;
  }

  /**
   * Cancel ongoing capture
   */
  public cancel() {
    this.isCancelled = true;
    this.cleanup();
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }

  public get cancelled(): boolean {
    return this.isCancelled;
  }

  /**
   * Restore page state and remove widget
   */
  public cleanup() {
    this.restoreStickyAndFixedElements();
    this.removeProgressWidget();
    window.scrollTo({
      left: this.originalScrollX,
      top: this.originalScrollY,
      behavior: 'instant' as ScrollBehavior
    });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTop = this.originalScrollY;
    }
  }

  private removeProgressWidget() {
    if (this.progressWidget && this.progressWidget.parentNode) {
      this.progressWidget.parentNode.removeChild(this.progressWidget);
    }
    this.progressWidget = null;
  }
}
