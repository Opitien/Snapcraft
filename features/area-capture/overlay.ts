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
  private badge: HTMLDivElement | null = null;
  private toolbar: HTMLDivElement | null = null;
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
      background: rgba(0, 0, 0, 0.4);
      pointer-events: auto;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    `;

    // Selection cutout box
    const box = document.createElement('div');
    box.id = 'snapcraft-selection-box';
    box.style.cssText = `
      position: absolute;
      display: none;
      border: 2px solid #3b82f6;
      box-shadow: 0 0 0 99999px rgba(0, 0, 0, 0.52);
      pointer-events: auto;
      box-sizing: border-box;
      cursor: move;
    `;

    // Size badge
    const badge = document.createElement('div');
    badge.id = 'snapcraft-size-badge';
    badge.style.cssText = `
      position: absolute;
      top: -30px;
      left: 0;
      background: #1e293b;
      color: #ffffff;
      padding: 3px 8px;
      font-size: 11px;
      font-weight: 600;
      border-radius: 4px;
      white-space: nowrap;
      pointer-events: none;
      letter-spacing: 0.3px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    `;
    box.appendChild(badge);

    // Floating toolbar
    const toolbar = document.createElement('div');
    toolbar.id = 'snapcraft-action-toolbar';
    toolbar.style.cssText = `
      position: absolute;
      bottom: -46px;
      right: 0;
      display: flex;
      gap: 6px;
      background: #ffffff;
      padding: 5px 8px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      pointer-events: auto;
      z-index: 10;
    `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancel (Esc)';
    cancelBtn.style.cssText = `
      background: #f1f5f9;
      color: #334155;
      border: 1px solid #cbd5e1;
      border-radius: 6px;
      padding: 5px 12px;
      font-size: 12px;
      font-weight: 500;
      cursor: pointer;
      transition: background 0.15s;
    `;
    cancelBtn.onmouseenter = () => { cancelBtn.style.background = '#e2e8f0'; };
    cancelBtn.onmouseleave = () => { cancelBtn.style.background = '#f1f5f9'; };
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
      padding: 5px 14px;
      font-size: 12px;
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
    box.appendChild(toolbar);

    // 8 Resize Handles
    const handlePositions = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
    this.handles = [];

    handlePositions.forEach((pos) => {
      const handle = document.createElement('div');
      handle.dataset.handle = pos;
      handle.style.cssText = `
        position: absolute;
        width: 10px;
        height: 10px;
        background: #ffffff;
        border: 2px solid #2563eb;
        border-radius: 2px;
        box-sizing: border-box;
        cursor: ${pos}-resize;
        z-index: 5;
      `;
      this.positionHandle(handle, pos);
      box.appendChild(handle);
      this.handles.push(handle);
    });

    overlay.appendChild(box);
    document.documentElement.appendChild(overlay);

    this.overlay = overlay;
    this.selectionBox = box;
    this.badge = badge;
    this.toolbar = toolbar;
  }

  private positionHandle(handle: HTMLDivElement, pos: string) {
    const offset = '-5px';
    switch (pos) {
      case 'nw': handle.style.top = offset; handle.style.left = offset; break;
      case 'n': handle.style.top = offset; handle.style.left = 'calc(50% - 5px)'; break;
      case 'ne': handle.style.top = offset; handle.style.right = offset; break;
      case 'e': handle.style.top = 'calc(50% - 5px)'; handle.style.right = offset; break;
      case 'se': handle.style.bottom = offset; handle.style.right = offset; break;
      case 's': handle.style.bottom = offset; handle.style.left = 'calc(50% - 5px)'; break;
      case 'sw': handle.style.bottom = offset; handle.style.left = offset; break;
      case 'w': handle.style.top = 'calc(50% - 5px)'; handle.style.left = offset; break;
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
    if (!this.overlay) return;
    if (e.button !== 0) return; // only left click

    const target = e.target as HTMLElement;

    // Check if clicked inside action toolbar
    if (this.toolbar && this.toolbar.contains(target)) {
      return;
    }

    // Check if clicked on a resize handle
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

    // Check if clicked inside selection box (moving)
    if (this.selectionBox && target === this.selectionBox) {
      e.preventDefault();
      e.stopPropagation();
      this.isMoving = true;
      this.moveStartX = e.clientX;
      this.moveStartY = e.clientY;
      this.initialRect = { ...this.currentRect };
      return;
    }

    // Otherwise, start new drawing selection
    e.preventDefault();
    e.stopPropagation();
    this.isDrawing = true;
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.currentRect = { x: e.clientX, y: e.clientY, width: 0, height: 0 };
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
        width = Math.max(10, this.initialRect.width + dx);
      }
      if (this.activeHandle.includes('s')) {
        height = Math.max(10, this.initialRect.height + dy);
      }
      if (this.activeHandle.includes('w')) {
        const newWidth = Math.max(10, this.initialRect.width - dx);
        x = this.initialRect.x + (this.initialRect.width - newWidth);
        width = newWidth;
      }
      if (this.activeHandle.includes('n')) {
        const newHeight = Math.max(10, this.initialRect.height - dy);
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
    }
  };

  private onMouseUp = (e: MouseEvent) => {
    if (this.isDrawing || this.isResizing || this.isMoving) {
      e.preventDefault();
      this.isDrawing = false;
      this.isResizing = false;
      this.isMoving = false;
      this.activeHandle = '';
    }
  };

  private onKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      this.cancel();
    } else if (e.key === 'Enter') {
      if (this.currentRect.width > 5 && this.currentRect.height > 5) {
        e.preventDefault();
        this.confirm();
      }
    }
  };

  private updateBoxDOM() {
    if (!this.selectionBox || !this.badge) return;

    const { x, y, width, height } = this.currentRect;

    if (width > 3 && height > 3) {
      this.selectionBox.style.display = 'block';
      this.selectionBox.style.left = `${x}px`;
      this.selectionBox.style.top = `${y}px`;
      this.selectionBox.style.width = `${width}px`;
      this.selectionBox.style.height = `${height}px`;

      // Device pixel ratio for display
      const dpr = window.devicePixelRatio || 1;
      const realW = Math.round(width * dpr);
      const realH = Math.round(height * dpr);
      this.badge.textContent = `${Math.round(width)} × ${Math.round(height)} px (${realW} × ${realH} physical)`;

      // Reposition badge if near top edge
      if (y < 35) {
        this.badge.style.top = '6px';
        this.badge.style.left = '6px';
      } else {
        this.badge.style.top = '-30px';
        this.badge.style.left = '0';
      }

      // Reposition toolbar if near bottom edge
      if (this.toolbar) {
        if (window.innerHeight - (y + height) < 55) {
          this.toolbar.style.bottom = '8px';
          this.toolbar.style.right = '8px';
        } else {
          this.toolbar.style.bottom = '-46px';
          this.toolbar.style.right = '0';
        }
      }
    } else {
      this.selectionBox.style.display = 'none';
    }
  }

  public confirm() {
    const { width, height } = this.currentRect;
    if (width < 5 || height < 5) {
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
    this.badge = null;
    this.toolbar = null;
    this.handles = [];
    this.isDrawing = false;
    this.isResizing = false;
    this.isMoving = false;
  }
}
