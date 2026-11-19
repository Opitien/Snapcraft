import { CropRect } from '../../types/screenshot';

export interface AreaSelectionResult {
  rect: CropRect;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
}

export class AreaSelector {
  private overlay: HTMLDivElement | null = null;
  private selectionBox: HTMLDivElement | null = null;
  private hoverHighlighter: HTMLDivElement | null = null;
  private hoverBadge: HTMLDivElement | null = null;
  private floatingToolbar: HTMLDivElement | null = null;
  private sizeBadge: HTMLElement | null = null;
  private handles: HTMLDivElement[] = [];

  private isDrawing = false;
  private isResizing = false;
  private isMoving = false;
  private activeHandle = '';

  private startX = 0;
  private startY = 0;
  private moveStartX = 0;
  private moveStartY = 0;
  private initialRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  private currentRect: CropRect = { x: 0, y: 0, width: 0, height: 0 };

  private hoveredElementRect: DOMRect | null = null;

  private onConfirmCallback: ((result: AreaSelectionResult) => void) | null = null;
  private onCancelCallback: (() => void) | null = null;

  public start(onConfirm: (result: AreaSelectionResult) => void, onCancel: () => void) {
    this.cleanup();
    this.onConfirmCallback = onConfirm;
    this.onCancelCallback = onCancel;

    this.createOverlay();
    this.attachEventListeners();
  }

  private createOverlay() {
    // Master container
    const overlay = document.createElement('div');
    overlay.id = 'snapcraft-selection-container';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      z-index: 2147483647;
      cursor: crosshair;
      user-select: none;
      -webkit-user-select: none;
      background: rgba(0, 0, 0, 0.42);
      pointer-events: auto;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    // Smart Hover Element Highlighter
    const hoverEl = document.createElement('div');
    hoverEl.id = 'snapcraft-hover-element';
    hoverEl.style.cssText = `
      position: fixed;
      display: none;
      border: 2px dashed #60a5fa;
      background: rgba(59, 130, 246, 0.15);
      border-radius: 4px;
      pointer-events: none;
      z-index: 2147483646;
      transition: all 0.08s ease-out;
      box-sizing: border-box;
    `;
    const hoverBadge = document.createElement('div');
    hoverBadge.style.cssText = `
      position: absolute;
      top: -24px;
      left: 0;
      background: #1e3a8a;
      color: #93c5fd;
      padding: 2px 6px;
      font-size: 10px;
      font-weight: 600;
      border-radius: 3px;
      white-space: nowrap;
      pointer-events: none;
    `;
    hoverEl.appendChild(hoverBadge);
    overlay.appendChild(hoverEl);
    this.hoverHighlighter = hoverEl;
    this.hoverBadge = hoverBadge;

    // Selection cutout box
    const box = document.createElement('div');
    box.id = 'snapcraft-selection-box';
    box.style.cssText = `
      position: fixed;
      display: none;
      border: 2px solid #2563eb;
      box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.55);
      pointer-events: auto;
      box-sizing: border-box;
      cursor: move;
      z-index: 2147483647;
    `;

    // 8 Resize Handles
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    this.handles = [];

    handlePositions.forEach((pos) => {
      const handle = document.createElement('div');
      handle.dataset.handle = pos;
      handle.style.cssText = `
        position: absolute;
        width: 8px;
        height: 8px;
        background: #ffffff;
        border: 2px solid #2563eb;
        border-radius: 2px;
        box-sizing: border-box;
        cursor: ${pos}-resize;
        z-index: 10;
      `;
      this.positionHandle(handle, pos);
      box.appendChild(handle);
      this.handles.push(handle);
    });

    overlay.appendChild(box);

    // Floating Toolbar & Size Badge (Docked separately to prevent clipping on small boxes)
    const toolbar = document.createElement('div');
    toolbar.id = 'snapcraft-floating-toolbar';
    toolbar.style.cssText = `
      position: fixed;
      display: none;
      align-items: center;
      gap: 8px;
      background: #0f172a;
      color: #ffffff;
      padding: 6px 10px;
      border-radius: 10px;
      box-shadow: 0 10px 25px -3px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.15);
      pointer-events: auto;
      z-index: 2147483647;
      font-size: 12px;
    `;

    const sizeBadge = document.createElement('span');
    sizeBadge.style.cssText = `
      font-weight: 600;
      font-family: monospace;
      color: #93c5fd;
      padding-right: 6px;
      border-right: 1px solid rgba(255,255,255,0.2);
      font-size: 11px;
    `;
    toolbar.appendChild(sizeBadge);

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel (Esc)';
    cancelBtn.style.cssText = `
      background: rgba(255,255,255,0.1);
      color: #cbd5e1;
      border: none;
      border-radius: 6px;
      padding: 4px 10px;
      font-size: 11px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    `;
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = 'rgba(255,255,255,0.2)'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = 'rgba(255,255,255,0.1)'; };
    cancelBtn.onclick = (e) => {
      e.stopPropagation();
      this.cancel();
    };

    const confirmBtn = document.createElement('button');
    confirmBtn.textContent = 'Capture (Enter)';
    confirmBtn.style.cssText = `
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 11px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.15s;
    `;
    confirmBtn.onmouseenter = () => { confirmBtn.style.background = '#1d4ed8'; };
    confirmBtn.onmouseleave = () => { confirmBtn.style.background = '#2563eb'; };
    confirmBtn.onclick = (e) => {
      e.stopPropagation();
      this.confirm();
    };

    toolbar.appendChild(cancelBtn);
    toolbar.appendChild(confirmBtn);
    overlay.appendChild(toolbar);

    document.documentElement.appendChild(overlay);

    this.overlay = overlay;
    this.selectionBox = box;
    this.floatingToolbar = toolbar;
    this.sizeBadge = sizeBadge;
  }

  private positionHandle(handle: HTMLDivElement, pos: string) {
    const offset = '-4px';
    switch (pos) {
      case 'nw': handle.style.top = offset; handle.style.left = offset; break;
      case 'n': handle.style.top = offset; handle.style.left = 'calc(50% - 4px)'; break;
      case 'ne': handle.style.top = offset; handle.style.right = offset; break;
      case 'e': handle.style.top = 'calc(50% - 4px)'; handle.style.right = offset; break;
      case 'se': handle.style.bottom = offset; handle.style.right = offset; break;
      case 's': handle.style.bottom = offset; handle.style.left = 'calc(50% - 4px)'; break;
      case 'sw': handle.style.bottom = offset; handle.style.left = offset; break;
      case 'w': handle.style.top = 'calc(50% - 4px)'; handle.style.left = offset; break;
    }
  }

  private attachEventListeners() {
    window.addEventListener('mousedown', this.onMouseDown, true);
    window.addEventListener('mousemove', this.onMouseMove, true);
    window.addEventListener('mouseup', this.onMouseUp, true);
    window.addEventListener('keydown', this.onKeyDown, true);
  }

  private detachEventListeners() {
    window.removeEventListener('mousedown', this.onMouseDown, true);
    window.removeEventListener('mousemove', this.onMouseMove, true);
    window.removeEventListener('mouseup', this.onMouseUp, true);
    window.removeEventListener('keydown', this.onKeyDown, true);
  }

  private onMouseDown = (e: MouseEvent) => {
    if (!this.overlay || e.button !== 0) return;

    const target = e.target as HTMLElement;

    // Clicked inside action toolbar
    if (this.floatingToolbar && this.floatingToolbar.contains(target)) {
      return;
    }

    // Clicked on a resize handle
    if (target.dataset.handle) {
      e.preventDefault();
      e.stopPropagation();
      this.isResizing = true;
      this.activeHandle = target.dataset.handle;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialRect = { ...this.currentRect };
      return;
    }

    // Clicked inside existing selection box to move it
    if (this.selectionBox && target === this.selectionBox && this.currentRect.width > 10) {
      e.preventDefault();
      e.stopPropagation();
      this.isMoving = true;
      this.moveStartX = e.clientX;
      this.moveStartY = e.clientY;
      this.initialRect = { ...this.currentRect };
      return;
    }

    // Start drawing a new selection
    e.preventDefault();
    e.stopPropagation();
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentRect = { x: e.clientX, y: e.clientY, width: 0, height: 0 };
    this.hideHoverHighlighter();
    this.updateBoxDOM();
  };

  private onMouseMove = (e: MouseEvent) => {
    if (!this.overlay) return;

    if (this.isDrawing) {
      e.preventDefault();
      const currentX = e.clientX;
      const currentY = e.clientY;

      const x = Math.min(this.startX, currentX);
      const y = Math.min(this.startY, currentY);
      const width = Math.abs(currentX - this.startX);
      const height = Math.abs(currentY - this.startY);

      this.currentRect = { x, y, width, height };
      this.updateBoxDOM();
      return;
    }

    if (this.isResizing) {
      e.preventDefault();
      const dx = e.clientX - this.startX;
      const dy = e.clientY - this.startY;

      let { x, y, width, height } = this.initialRect;

      if (this.activeHandle.includes('e')) {
        width = Math.max(4, this.initialRect.width + dx);
      }
      if (this.activeHandle.includes('s')) {
        height = Math.max(4, this.initialRect.height + dy);
      }
      if (this.activeHandle.includes('w')) {
        const newWidth = Math.max(4, this.initialRect.width - dx);
        x = this.initialRect.x + (this.initialRect.width - newWidth);
        width = newWidth;
      }
      if (this.activeHandle.includes('n')) {
        const newHeight = Math.max(4, this.initialRect.height - dy);
        y = this.initialRect.y + (this.initialRect.height - newHeight);
        height = newHeight;
      }

      this.currentRect = { x, y, width, height };
      this.updateBoxDOM();
      return;
    }

    if (this.isMoving) {
      e.preventDefault();
      const dx = e.clientX - this.moveStartX;
      const dy = e.clientY - this.moveStartY;

      const maxX = window.innerWidth - this.initialRect.width;
      const maxY = window.innerHeight - this.initialRect.height;

      const x = Math.max(0, Math.min(maxX, this.initialRect.x + dx));
      const y = Math.max(0, Math.min(maxY, this.initialRect.y + dy));

      this.currentRect = { ...this.initialRect, x, y };
      this.updateBoxDOM();
      return;
    }

    // If idle: smart element hover detection
    if (this.currentRect.width <= 0) {
      this.checkElementUnderCursor(e.clientX, e.clientY);
    }
  };

  private checkElementUnderCursor(clientX: number, clientY: number) {
    if (!this.overlay) return;

    this.overlay.style.pointerEvents = 'none';
    const el = document.elementFromPoint(clientX, clientY);
    this.overlay.style.pointerEvents = 'auto';

    if (!el || el === document.documentElement || el === document.body) {
      this.hideHoverHighlighter();
      this.hoveredElementRect = null;
      return;
    }

    const rect = el.getBoundingClientRect();
    if (rect.width > 2 && rect.height > 2 && rect.width < window.innerWidth && rect.height < window.innerHeight) {
      this.hoveredElementRect = rect;
      if (this.hoverHighlighter && this.hoverBadge) {
        this.hoverHighlighter.style.display = 'block';
        this.hoverHighlighter.style.left = `${rect.left}px`;
        this.hoverHighlighter.style.top = `${rect.top}px`;
        this.hoverHighlighter.style.width = `${rect.width}px`;
        this.hoverHighlighter.style.height = `${rect.height}px`;

        const tag = el.tagName.toLowerCase();
        this.hoverBadge.textContent = `${tag} (${Math.round(rect.width)} × ${Math.round(rect.height)}) • Click to snap`;
      }
    } else {
      this.hideHoverHighlighter();
      this.hoveredElementRect = null;
    }
  }

  private hideHoverHighlighter() {
    if (this.hoverHighlighter) {
      this.hoverHighlighter.style.display = 'none';
    }
  }

  private onMouseUp = (e: MouseEvent) => {
    // Check if user clicked on a hovered element without dragging (snap to element!)
    if (this.isDrawing) {
      const movedX = Math.abs(e.clientX - this.startX);
      const movedY = Math.abs(e.clientY - this.startY);

      if (movedX < 5 && movedY < 5 && this.hoveredElementRect) {
        // Snap to hovered element
        this.currentRect = {
          x: Math.round(this.hoveredElementRect.left),
          y: Math.round(this.hoveredElementRect.top),
          width: Math.round(this.hoveredElementRect.width),
          height: Math.round(this.hoveredElementRect.height)
        };
        this.updateBoxDOM();
      }
    }

    this.isDrawing = false;
    this.isResizing = false;
    this.isMoving = false;
    this.activeHandle = '';
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    } else if (e.key === 'Enter') {
      if (this.currentRect.width >= 4 && this.currentRect.height >= 4) {
        e.preventDefault();
        this.confirm();
      }
    }
  };

  private updateBoxDOM() {
    if (!this.selectionBox || !this.floatingToolbar || !this.sizeBadge) return;

    const { x, y, width, height } = this.currentRect;

    if (width >= 4 && height >= 4) {
      this.selectionBox.style.display = 'block';
      this.selectionBox.style.left = `${x}px`;
      this.selectionBox.style.top = `${y}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;

      // Update badge text
      const dpr = window.devicePixelRatio || 1;
      const realW = Math.round(width * dpr);
      const realH = Math.round(height * dpr);
      this.sizeBadge.textContent = `${Math.round(width)}×${Math.round(height)} (${realW}×${realH}px)`;

      // Position floating toolbar intelligently OUTSIDE the selection box
      this.floatingToolbar.style.display = 'flex';

      const toolbarHeight = 40;
      const toolbarWidth = 240;

      // Vertical positioning: default below selection, fallback above if near bottom edge
      let toolbarTop = y + height + 10;
      if (toolbarTop + toolbarHeight > window.innerHeight) {
        toolbarTop = Math.max(10, y - toolbarHeight - 10);
      }

      // Horizontal positioning: align with right edge of selection, clamped to viewport
      let toolbarLeft = Math.max(10, Math.min(window.innerWidth - toolbarWidth - 10, x + width - toolbarWidth));

      this.floatingToolbar.style.top = `${toolbarTop}px`;
      this.floatingToolbar.style.left = `${toolbarLeft}px`;

      // If selection is very small (< 25px), hide handles to keep view clean
      const showHandles = width >= 25 && height >= 25;
      this.handles.forEach((h) => {
        h.style.display = showHandles ? 'block' : 'none';
      });
    } else {
      this.selectionBox.style.display = 'none';
      this.floatingToolbar.style.display = 'none';
    }
  }

  public confirm() {
    const { width, height } = this.currentRect;
    if (width < 4 || height < 4) {
      this.cancel();
      return;
    }

    const result: AreaSelectionResult = {
      rect: { ...this.currentRect },
      windowWidth: window.innerWidth,
      windowHeight: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio || 1,
    };

    this.cleanup();

    if (this.onConfirmCallback) {
      this.onConfirmCallback(result);
    }
  }

  public cancel() {
    this.cleanup();
    if (this.onCancelCallback) {
      this.onCancelCallback();
    }
  }

  public cleanup() {
    this.detachEventListeners();
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    this.selectionBox = null;
    this.hoverHighlighter = null;
    this.hoverBadge = null;
    this.floatingToolbar = null;
    this.sizeBadge = null;
    this.handles = [];
    this.isDrawing = false;
    this.isResizing = false;
    this.isMoving = false;
  }
}
