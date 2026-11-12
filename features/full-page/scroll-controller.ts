export interface PageDimensions {
  totalWidth: number;
  totalHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  devicePixelRatio: number;
}

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
  private hiddenFixedElements: Array<{ el: HTMLElement; origVisibility: string }> = [];
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
      body.scrollWidth,
      doc.offsetWidth,
      body.offsetWidth,
      doc.clientWidth
    );

    const totalHeight = Math.max(
      doc.scrollHeight,
      body.scrollHeight,
      doc.offsetHeight,
      body.offsetHeight,
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
    this.originalScrollX = window.scrollX;
    this.originalScrollY = window.scrollY;

    this.createProgressWidget();
  }

  /**
   * Temporarily hide sticky and fixed elements after first slice
   */
  public hideStickyAndFixedElements() {
    this.hiddenFixedElements = [];
    const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));

    for (const el of elements) {
      // Skip our own UI widget
      if (el.id === 'snapcraft-progress-widget' || el.closest('#snapcraft-progress-widget')) {
        continue;
      }

      const style = window.getComputedStyle(el);
      if (style.position === 'fixed' || style.position === 'sticky') {
        this.hiddenFixedElements.push({
          el,
          origVisibility: el.style.visibility
        });
        el.style.visibility = 'hidden';
      }
    }
  }

  /**
   * Restore any hidden fixed elements
   */
  public restoreStickyAndFixedElements() {
    for (const item of this.hiddenFixedElements) {
      item.el.style.visibility = item.origVisibility;
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

    while (currentY < totalHeight) {
      const isLast = currentY + viewportHeight >= totalHeight;
      const targetY = isLast ? Math.max(0, totalHeight - viewportHeight) : currentY;
      const overlapY = (stepIndex > 0 && isLast) ? (currentY - targetY) : 0;

      steps.push({
        index: stepIndex,
        totalSteps: 0, // populated after loop
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
  public async scrollToPosition(y: number, waitMs = 280): Promise<void> {
    if (this.isCancelled) throw new Error('Capture cancelled by user');

    window.scrollTo({
      left: 0,
      top: y,
      behavior: 'instant' as ScrollBehavior
    });

    // Wait for DOM repaint and lazy image loaders
    await new Promise((resolve) => setTimeout(resolve, waitMs));

    // Force frame render
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
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      z-index: 2147483647;
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 240px;
      pointer-events: auto;
      border: 1px solid rgba(255, 255, 255, 0.1);
    `;

    widget.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-size: 13px; font-weight: 600; color: #f8fafc;">Capturing Full Page</span>
        <button id="snapcraft-cancel-btn" style="
          background: rgba(255,255,255,0.12);
          color: #cbd5e1;
          border: none;
          padding: 3px 8px;
          border-radius: 5px;
          font-size: 11px;
          cursor: pointer;
          font-weight: 500;
        ">Cancel</button>
      </div>
      <div style="width: 100%; height: 6px; background: rgba(255,255,255,0.15); border-radius: 9999px; overflow: hidden;">
        <div id="snapcraft-progress-bar" style="width: 0%; height: 100%; background: #3b82f6; border-radius: 9999px; transition: width 0.2s;"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: #94a3b8;">
        <span id="snapcraft-progress-text">Preparing capture...</span>
        <span id="snapcraft-progress-percent">0%</span>
      </div>
    `;

    document.documentElement.appendChild(widget);
    this.progressWidget = widget;

    const cancelBtn = widget.querySelector<HTMLButtonElement>('#snapcraft-cancel-btn');
    if (cancelBtn) {
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

  /**
   * Check if capture was cancelled
   */
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
  }

  private removeProgressWidget() {
    if (this.progressWidget && this.progressWidget.parentNode) {
      this.progressWidget.parentNode.removeChild(this.progressWidget);
    }
    this.progressWidget = null;
  }
}
