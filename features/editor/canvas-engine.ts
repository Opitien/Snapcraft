import { CropRect } from '../../types/screenshot';

export type ToolType = 'select' | 'crop' | 'arrow' | 'rectangle' | 'text' | 'blur' | 'pen';

export interface EditorState {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  fontSize: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
}

export class ScreenshotEditorEngine {
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;

  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private maxHistory = 20;

  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private penPoints: Array<{ x: number; y: number }> = [];

  // Active crop state
  public cropRect: CropRect | null = null;
  public isCropping = false;

  // Configuration
  public tool: ToolType = 'select';
  public color = '#ef4444'; // Red default
  public strokeWidth = 3;
  public fontSize = 18;
  public zoom = 1;

  public onStateChange: ((state: EditorState) => void) | null = null;

  constructor(baseCanvas: HTMLCanvasElement, previewCanvas: HTMLCanvasElement) {
    this.baseCanvas = baseCanvas;
    const baseCtx = baseCanvas.getContext('2d', { willReadFrequently: true });
    if (!baseCtx) throw new Error('Could not get 2D context for base canvas');
    this.baseCtx = baseCtx;

    this.previewCanvas = previewCanvas;
    const previewCtx = previewCanvas.getContext('2d');
    if (!previewCtx) throw new Error('Could not get 2D context for preview canvas');
    this.previewCtx = previewCtx;

    this.setupListeners();
  }

  /**
   * Load base screenshot image
   */
  public async loadImage(dataUrl: string): Promise<{ width: number; height: number }> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.baseCanvas.width = img.naturalWidth;
        this.baseCanvas.height = img.naturalHeight;
        this.previewCanvas.width = img.naturalWidth;
        this.previewCanvas.height = img.naturalHeight;

        this.baseCtx.clearRect(0, 0, img.naturalWidth, img.naturalHeight);
        this.baseCtx.drawImage(img, 0, 0);

        // Reset history
        this.undoStack = [];
        this.redoStack = [];
        this.saveHistorySnapshot();

        this.notifyStateChange();
        resolve({ width: img.naturalWidth, height: img.naturalHeight });
      };
      img.onerror = () => reject(new Error('Failed to load image into editor'));
      img.src = dataUrl;
    });
  }

  /**
   * Push current base canvas state to Undo stack
   */
  private saveHistorySnapshot() {
    const imgData = this.baseCtx.getImageData(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    this.undoStack.push(imgData);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = []; // Clear redo when a new action is performed
    this.notifyStateChange();
  }

  public undo() {
    if (this.undoStack.length <= 1) return; // Keep initial state

    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);

    const prevState = this.undoStack[this.undoStack.length - 1];
    this.baseCanvas.width = prevState.width;
    this.baseCanvas.height = prevState.height;
    this.previewCanvas.width = prevState.width;
    this.previewCanvas.height = prevState.height;

    this.baseCtx.putImageData(prevState, 0, 0);
    this.clearPreview();
    this.notifyStateChange();
  }

  public redo() {
    if (this.redoStack.length === 0) return;

    const nextState = this.redoStack.pop()!;
    this.undoStack.push(nextState);

    this.baseCanvas.width = nextState.width;
    this.baseCanvas.height = nextState.height;
    this.previewCanvas.width = nextState.width;
    this.previewCanvas.height = nextState.height;

    this.baseCtx.putImageData(nextState, 0, 0);
    this.clearPreview();
    this.notifyStateChange();
  }

  private notifyStateChange() {
    if (this.onStateChange) {
      this.onStateChange({
        activeTool: this.tool,
        color: this.color,
        strokeWidth: this.strokeWidth,
        fontSize: this.fontSize,
        zoom: this.zoom,
        canUndo: this.undoStack.length > 1,
        canRedo: this.redoStack.length > 0
      });
    }
  }

  private setupListeners() {
    this.previewCanvas.addEventListener('mousedown', this.handleMouseDown);
    window.addEventListener('mousemove', this.handleMouseMove);
    window.addEventListener('mouseup', this.handleMouseUp);
  }

  public destroy() {
    this.previewCanvas.removeEventListener('mousedown', this.handleMouseDown);
    window.removeEventListener('mousemove', this.handleMouseMove);
    window.removeEventListener('mouseup', this.handleMouseUp);
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    const rect = this.previewCanvas.getBoundingClientRect();
    const scaleX = this.baseCanvas.width / rect.width;
    const scaleY = this.baseCanvas.height / rect.height;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button !== 0 || this.tool === 'select') return;

    const coords = this.getCanvasCoordinates(e);
    this.isDrawing = true;
    this.startX = coords.x;
    this.startY = coords.y;

    if (this.tool === 'pen') {
      this.penPoints = [{ x: coords.x, y: coords.y }];
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (!this.isDrawing) return;

    const coords = this.getCanvasCoordinates(e);
    this.clearPreview();

    switch (this.tool) {
      case 'crop':
        this.drawCropPreview(this.startX, this.startY, coords.x, coords.y);
        break;
      case 'rectangle':
        this.drawRectangle(this.previewCtx, this.startX, this.startY, coords.x, coords.y);
        break;
      case 'arrow':
        this.drawArrow(this.previewCtx, this.startX, this.startY, coords.x, coords.y);
        break;
      case 'blur':
        this.drawBlurPreview(coords.x, coords.y);
        break;
      case 'pen':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.previewCtx, this.penPoints);
        break;
    }
  };

  private handleMouseUp = (e: MouseEvent) => {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const coords = this.getCanvasCoordinates(e);
    this.clearPreview();

    switch (this.tool) {
      case 'crop': {
        const x = Math.min(this.startX, coords.x);
        const y = Math.min(this.startY, coords.y);
        const width = Math.abs(coords.x - this.startX);
        const height = Math.abs(coords.y - this.startY);
        if (width > 10 && height > 10) {
          this.cropRect = { x, y, width, height };
          this.isCropping = true;
          this.drawCropOverlay(this.cropRect);
        }
        break;
      }
      case 'rectangle':
        this.drawRectangle(this.baseCtx, this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'arrow':
        this.drawArrow(this.baseCtx, this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'blur':
        this.applyBlur(this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'pen':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.baseCtx, this.penPoints);
        this.penPoints = [];
        this.saveHistorySnapshot();
        break;
      case 'text':
        this.promptAndDrawText(coords.x, coords.y);
        break;
    }
  };

  private clearPreview() {
    this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
  }

  // --- DRAWING HELPERS ---

  private drawRectangle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineJoin = 'round';
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
    const headlen = Math.max(12, this.strokeWidth * 3.5);
    const angle = Math.atan2(toY - fromY, toX - fromX);

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.fillStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Main line
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Arrow head
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawPenPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>) {
    if (points.length < 2) return;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
    ctx.stroke();
    ctx.restore();
  }

  private promptAndDrawText(x: number, y: number) {
    const text = prompt('Enter annotation text:');
    if (!text || text.trim() === '') return;

    this.baseCtx.save();
    this.baseCtx.font = `bold ${this.fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    this.baseCtx.fillStyle = this.color;

    // Draw subtle background pill for readability
    const metrics = this.baseCtx.measureText(text);
    const pad = 4;
    this.baseCtx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    this.baseCtx.fillRect(
      x - pad,
      y - this.fontSize,
      metrics.width + pad * 2,
      this.fontSize + pad * 2
    );

    this.baseCtx.fillStyle = this.color;
    this.baseCtx.fillText(text, x, y + pad);
    this.baseCtx.restore();

    this.saveHistorySnapshot();
  }

  // --- BLUR / REDACTION (PIXELATE) ---

  private drawBlurPreview(toX: number, toY: number) {
    const x = Math.min(this.startX, toX);
    const y = Math.min(this.startY, toY);
    const w = Math.abs(toX - this.startX);
    const h = Math.abs(toY - this.startY);

    this.previewCtx.save();
    this.previewCtx.fillStyle = 'rgba(15, 23, 42, 0.45)';
    this.previewCtx.strokeStyle = '#ef4444';
    this.previewCtx.lineWidth = 1.5;
    this.previewCtx.setLineDash([4, 4]);
    this.previewCtx.fillRect(x, y, w, h);
    this.previewCtx.strokeRect(x, y, w, h);
    this.previewCtx.restore();
  }

  private applyBlur(fromX: number, fromY: number, toX: number, toY: number) {
    const x = Math.max(0, Math.min(fromX, toX));
    const y = Math.max(0, Math.min(fromY, toY));
    const w = Math.min(this.baseCanvas.width - x, Math.abs(toX - fromX));
    const h = Math.min(this.baseCanvas.height - y, Math.abs(toY - fromY));

    if (w < 4 || h < 4) return;

    // High quality pixelation mosaic
    const pixelFactor = 12;
    const sampleW = Math.max(1, Math.floor(w / pixelFactor));
    const sampleH = Math.max(1, Math.floor(h / pixelFactor));

    const offscreen = document.createElement('canvas');
    offscreen.width = sampleW;
    offscreen.height = sampleH;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Step 1: Downscale selected area into tiny buffer
    offCtx.drawImage(this.baseCanvas, x, y, w, h, 0, 0, sampleW, sampleH);

    // Step 2: Draw back with nearest-neighbor scaling (pixelated mosaic)
    this.baseCtx.save();
    this.baseCtx.imageSmoothingEnabled = false;
    this.baseCtx.drawImage(offscreen, 0, 0, sampleW, sampleH, x, y, w, h);
    this.baseCtx.restore();
  }

  // --- CROPPING ---

  private drawCropPreview(x1: number, y1: number, x2: number, y2: number) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);

    this.previewCtx.save();
    this.previewCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewCtx.clearRect(x, y, w, h);

    this.previewCtx.strokeStyle = '#3b82f6';
    this.previewCtx.lineWidth = 2;
    this.previewCtx.strokeRect(x, y, w, h);
    this.previewCtx.restore();
  }

  public drawCropOverlay(rect: CropRect) {
    this.clearPreview();
    this.previewCtx.save();
    this.previewCtx.fillStyle = 'rgba(0, 0, 0, 0.45)';
    this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
    this.previewCtx.clearRect(rect.x, rect.y, rect.width, rect.height);

    this.previewCtx.strokeStyle = '#3b82f6';
    this.previewCtx.lineWidth = 2;
    this.previewCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.previewCtx.restore();
  }

  public applyCrop() {
    if (!this.cropRect) return;

    const { x, y, width, height } = this.cropRect;
    if (width <= 0 || height <= 0) return;

    const croppedData = this.baseCtx.getImageData(x, y, width, height);

    this.baseCanvas.width = width;
    this.baseCanvas.height = height;
    this.previewCanvas.width = width;
    this.previewCanvas.height = height;

    this.baseCtx.putImageData(croppedData, 0, 0);
    this.clearPreview();
    this.cropRect = null;
    this.isCropping = false;

    this.saveHistorySnapshot();
    this.notifyStateChange();
  }

  public cancelCrop() {
    this.cropRect = null;
    this.isCropping = false;
    this.clearPreview();
    this.notifyStateChange();
  }

  public exportImage(format = 'image/png', quality = 0.95): string {
    return this.baseCanvas.toDataURL(format, quality);
  }
}
