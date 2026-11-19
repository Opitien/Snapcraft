import { CropRect, SliceItem, PageDimensionsData } from '../../types/screenshot';
import { stitchSlices } from '../full-page/stitch';

export type ToolType =
  | 'select'
  | 'crop'
  | 'rectangle'
  | 'circle'
  | 'arrow'
  | 'line'
  | 'pen'
  | 'highlighter'
  | 'text'
  | 'blur'
  | 'callout';

export interface EditorState {
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  fontSize: number;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  stepNumber: number;
}

export class ScreenshotEditorEngine {
  private baseCanvas: HTMLCanvasElement;
  private baseCtx: CanvasRenderingContext2D;
  private previewCanvas: HTMLCanvasElement;
  private previewCtx: CanvasRenderingContext2D;

  private undoStack: ImageData[] = [];
  private redoStack: ImageData[] = [];
  private initialImageData: ImageData | null = null;
  private maxHistory = 25;

  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private penPoints: Array<{ x: number; y: number }> = [];

  // Active crop state
  public cropRect: CropRect | null = null;
  public isCropping = false;

  // Active configuration
  public tool: ToolType = 'select';
  public color = '#ef4444';
  public strokeWidth = 4;
  public fontSize = 20;
  public zoom = 1;
  public stepNumber = 1;

  public onStateChange: ((state: EditorState) => void) | null = null;
  public onTextRequest: ((x: number, y: number, color: string, fontSize: number) => void) | null = null;

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
   * Load base screenshot image from dataUrl
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

        this.initialImageData = this.baseCtx.getImageData(0, 0, img.naturalWidth, img.naturalHeight);
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
   * Stitch full page slices directly on canvas
   */
  public async stitchAndLoadSlices(
    slices: SliceItem[],
    pageDim: PageDimensionsData
  ): Promise<{ width: number; height: number; dataUrl: string }> {
    const stitchedDataUrl = await stitchSlices(slices, pageDim);
    const dims = await this.loadImage(stitchedDataUrl);
    return { ...dims, dataUrl: stitchedDataUrl };
  }

  /**
   * Reset canvas to original initial state
   */
  public resetToOriginal() {
    if (!this.initialImageData) return;

    this.baseCanvas.width = this.initialImageData.width;
    this.baseCanvas.height = this.initialImageData.height;
    this.previewCanvas.width = this.initialImageData.width;
    this.previewCanvas.height = this.initialImageData.height;

    this.baseCtx.putImageData(this.initialImageData, 0, 0);
    this.clearPreview();
    this.undoStack = [];
    this.redoStack = [];
    this.saveHistorySnapshot();
    this.stepNumber = 1;
    this.notifyStateChange();
  }

  /**
   * Push current base canvas state to Undo stack
   */
  public saveHistorySnapshot() {
    const imgData = this.baseCtx.getImageData(0, 0, this.baseCanvas.width, this.baseCanvas.height);
    this.undoStack.push(imgData);
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notifyStateChange();
  }

  public undo() {
    if (this.undoStack.length <= 1) return;

    const currentState = this.undoStack.pop()!;
    this.redoStack.push(currentState);

    const prevState = this.undoStack[this.undoStack.length - 1];
    this.baseCanvas.width = prevState.width;
    this.baseCanvas.height = prevState.height;
    this.previewCanvas.width = prevState.width;
    this.previewCanvas.height = prevState.height;

    this.baseCtx.putImageData(prevState, 0, 0);
    this.clearPreview();
    if (this.stepNumber > 1) this.stepNumber--;
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
    this.stepNumber++;
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
        canRedo: this.redoStack.length > 0,
        stepNumber: this.stepNumber
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

  public getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
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

    if (this.tool === 'pen' || this.tool === 'highlighter') {
      this.penPoints = [{ x: coords.x, y: coords.y }];
    } else if (this.tool === 'callout') {
      this.drawCalloutBadge(this.baseCtx, coords.x, coords.y, this.stepNumber);
      this.stepNumber++;
      this.saveHistorySnapshot();
      this.isDrawing = false;
    } else if (this.tool === 'text') {
      if (this.onTextRequest) {
        this.onTextRequest(coords.x, coords.y, this.color, this.fontSize);
      }
      this.isDrawing = false;
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
      case 'circle':
        this.drawCircle(this.previewCtx, this.startX, this.startY, coords.x, coords.y);
        break;
      case 'arrow':
        this.drawArrow(this.previewCtx, this.startX, this.startY, coords.x, coords.y);
        break;
      case 'line':
        this.drawLine(this.previewCtx, this.startX, this.startY, coords.x, coords.y);
        break;
      case 'blur':
        this.drawBlurPreview(coords.x, coords.y);
        break;
      case 'pen':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.previewCtx, this.penPoints, false);
        break;
      case 'highlighter':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.previewCtx, this.penPoints, true);
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
        if (width > 8 && height > 8) {
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
      case 'circle':
        this.drawCircle(this.baseCtx, this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'arrow':
        this.drawArrow(this.baseCtx, this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'line':
        this.drawLine(this.baseCtx, this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'blur':
        this.applyBlur(this.startX, this.startY, coords.x, coords.y);
        this.saveHistorySnapshot();
        break;
      case 'pen':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.baseCtx, this.penPoints, false);
        this.penPoints = [];
        this.saveHistorySnapshot();
        break;
      case 'highlighter':
        this.penPoints.push({ x: coords.x, y: coords.y });
        this.drawPenPath(this.baseCtx, this.penPoints, true);
        this.penPoints = [];
        this.saveHistorySnapshot();
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
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(x, y, w, h, 6) : ctx.rect(x, y, w, h);
    ctx.stroke();
    ctx.restore();
  }

  private drawCircle(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x2 - x1);
    const h = Math.abs(y2 - y1);
    const cx = x + w / 2;
    const cy = y + h / 2;
    const rx = w / 2;
    const ry = h / 2;

    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }

  private drawLine(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
    ctx.save();
    ctx.strokeStyle = this.color;
    ctx.lineWidth = this.strokeWidth;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();
    ctx.restore();
  }

  private drawArrow(ctx: CanvasRenderingContext2D, fromX: number, fromY: number, toX: number, toY: number) {
    const headlen = Math.max(14, this.strokeWidth * 3.8);
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

    // Arrowhead
    ctx.beginPath();
    ctx.moveTo(toX, toY);
    ctx.lineTo(toX - headlen * Math.cos(angle - Math.PI / 6), toY - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(toX - headlen * Math.cos(angle + Math.PI / 6), toY - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  private drawPenPath(ctx: CanvasRenderingContext2D, points: Array<{ x: number; y: number }>, isHighlighter: boolean) {
    if (points.length < 2) return;

    ctx.save();
    if (isHighlighter) {
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = this.color;
      ctx.lineWidth = Math.max(18, this.strokeWidth * 4.5);
    } else {
      ctx.strokeStyle = this.color;
      ctx.lineWidth = this.strokeWidth;
    }
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

  private drawCalloutBadge(ctx: CanvasRenderingContext2D, x: number, y: number, step: number) {
    const radius = Math.max(14, this.fontSize * 0.75);

    ctx.save();
    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 6;
    ctx.shadowOffsetY = 2;

    // Outer circle
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowColor = 'transparent';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Text number
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${Math.round(radius * 1.15)}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(step.toString(), x, y + 1);
    ctx.restore();
  }

  /**
   * Commit inline text directly onto base canvas
   */
  public commitText(text: string, x: number, y: number, textColor?: string, size?: number) {
    if (!text || text.trim() === '') return;

    const chosenColor = textColor || this.color;
    const chosenSize = size || this.fontSize;

    this.baseCtx.save();
    this.baseCtx.font = `bold ${chosenSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const metrics = this.baseCtx.measureText(text);
    const pad = 6;

    // High contrast backdrop pill
    this.baseCtx.fillStyle = 'rgba(15, 23, 42, 0.75)';
    this.baseCtx.beginPath();
    this.baseCtx.roundRect
      ? this.baseCtx.roundRect(x - pad, y - chosenSize, metrics.width + pad * 2, chosenSize + pad * 2, 6)
      : this.baseCtx.rect(x - pad, y - chosenSize, metrics.width + pad * 2, chosenSize + pad * 2);
    this.baseCtx.fill();

    // Text label
    this.baseCtx.fillStyle = chosenColor;
    this.baseCtx.textBaseline = 'bottom';
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

    const pixelFactor = 12;
    const sampleW = Math.max(1, Math.floor(w / pixelFactor));
    const sampleH = Math.max(1, Math.floor(h / pixelFactor));

    const offscreen = document.createElement('canvas');
    offscreen.width = sampleW;
    offscreen.height = sampleH;
    const offCtx = offscreen.getContext('2d');
    if (!offCtx) return;

    // Downscale and upscale with nearest-neighbor
    offCtx.drawImage(this.baseCanvas, x, y, w, h, 0, 0, sampleW, sampleH);

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
    this.previewCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
    this.previewCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
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
