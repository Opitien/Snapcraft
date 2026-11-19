import React, { useEffect, useRef, useState, useCallback } from 'react';
import { ToolType, ScreenshotEditorEngine } from '../../features/editor/canvas-engine';
import { SliceItem, PageDimensionsData } from '../../types/screenshot';
import { Check, X, Loader2 } from 'lucide-react';

interface EditorCanvasProps {
  dataUrl?: string;
  slices?: SliceItem[];
  pageDim?: PageDimensionsData;
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  fontSize: number;
  zoom: number;
  onZoomChange: (z: number) => void;
  onEngineReady: (engine: ScreenshotEditorEngine) => void;
  onDimensionsLoaded: (dims: { width: number; height: number }) => void;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  isCropping: boolean;
  onStitchComplete?: (stitchedDataUrl: string) => void;
}

interface InlineTextState {
  visible: boolean;
  x: number; // canvas logical x
  y: number; // canvas logical y
  text: string;
  color: string;
  fontSize: number;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  dataUrl,
  slices,
  pageDim,
  activeTool,
  color,
  strokeWidth,
  fontSize,
  zoom,
  onZoomChange,
  onEngineReady,
  onDimensionsLoaded,
  onApplyCrop,
  onCancelCrop,
  isCropping,
  onStitchComplete
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ScreenshotEditorEngine | null>(null);

  const [naturalDims, setNaturalDims] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [inlineText, setInlineText] = useState<InlineTextState>({
    visible: false,
    x: 0,
    y: 0,
    text: '',
    color: '#ef4444',
    fontSize: 20
  });
  const [stitching, setStitching] = useState(false);

  // Compute and apply Auto-Fit zoom
  const autoFitZoom = useCallback((imgW: number, imgH: number) => {
    if (!containerRef.current || imgW === 0 || imgH === 0) return;

    const pad = 64;
    const availW = Math.max(200, containerRef.current.clientWidth - pad);
    const availH = Math.max(200, containerRef.current.clientHeight - pad);

    const fitW = availW / imgW;
    const fitH = availH / imgH;
    const fitFactor = Math.min(fitW, fitH, 1);

    const newZoom = Math.max(0.05, +(fitFactor).toFixed(2));
    onZoomChange(newZoom);
  }, [onZoomChange]);

  // Load screenshot image or stitch slices
  useEffect(() => {
    if (!baseCanvasRef.current || !previewCanvasRef.current) return;

    const engine = new ScreenshotEditorEngine(baseCanvasRef.current, previewCanvasRef.current);
    engineRef.current = engine;
    onEngineReady(engine);

    // Setup inline text handler
    engine.onTextRequest = (x, y, txtColor, txtSize) => {
      setInlineText({
        visible: true,
        x,
        y,
        text: '',
        color: txtColor,
        fontSize: txtSize
      });
    };

    (async () => {
      try {
        if (slices && slices.length > 0 && pageDim) {
          // Full-page screenshot requiring stitching
          setStitching(true);
          const result = await engine.stitchAndLoadSlices(slices, pageDim);
          setNaturalDims({ width: result.width, height: result.height });
          onDimensionsLoaded({ width: result.width, height: result.height });
          if (onStitchComplete) {
            onStitchComplete(result.dataUrl);
          }
          autoFitZoom(result.width, result.height);
          setStitching(false);
        } else if (dataUrl) {
          // Single image (visible or cropped area capture)
          const dims = await engine.loadImage(dataUrl);
          setNaturalDims(dims);
          onDimensionsLoaded(dims);
          autoFitZoom(dims.width, dims.height);
        }
      } catch (err) {
        console.error('Failed to load image in editor canvas:', err);
        setStitching(false);
      }
    })();

    return () => {
      engine.destroy();
    };
  }, [dataUrl, slices]);

  // Sync engine configuration when props change
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.tool = activeTool;
    engineRef.current.color = color;
    engineRef.current.strokeWidth = strokeWidth;
    engineRef.current.fontSize = fontSize;
    engineRef.current.zoom = zoom;
  }, [activeTool, color, strokeWidth, fontSize, zoom]);

  // Commit inline text onto canvas
  const handleCommitText = () => {
    if (!inlineText.visible) return;
    if (inlineText.text.trim().length > 0 && engineRef.current) {
      engineRef.current.commitText(
        inlineText.text,
        inlineText.x,
        inlineText.y,
        inlineText.color,
        inlineText.fontSize
      );
    }
    setInlineText((prev) => ({ ...prev, visible: false, text: '' }));
  };

  const getCursor = () => {
    switch (activeTool) {
      case 'select': return 'default';
      case 'crop': return 'crosshair';
      case 'rectangle':
      case 'circle':
      case 'arrow':
      case 'line':
      case 'pen':
      case 'highlighter':
      case 'blur':
      case 'callout':
        return 'crosshair';
      case 'text': return 'text';
      default: return 'default';
    }
  };

  return (
    <div
      ref={containerRef}
      className="flex-1 overflow-auto bg-slate-950 flex items-center justify-center p-6 select-none relative"
    >
      {stitching && (
        <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md z-30 flex flex-col items-center justify-center text-white">
          <Loader2 className="w-9 h-9 animate-spin text-blue-500 mb-3" />
          <p className="text-sm font-semibold">Stitching Full-Page Screenshot...</p>
          <p className="text-xs text-slate-400 mt-1">Combining captured sections seamlessly</p>
        </div>
      )}

      {naturalDims.width > 0 && (
        <div
          className="relative bg-white shadow-2xl rounded-lg overflow-visible border border-slate-700/80 shrink-0 transition-[width,height] duration-75"
          style={{
            width: `${Math.round(naturalDims.width * zoom)}px`,
            height: `${Math.round(naturalDims.height * zoom)}px`,
            cursor: getCursor()
          }}
        >
          {/* Base Drawn Canvas */}
          <canvas
            ref={baseCanvasRef}
            className="block"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Interactive Preview Canvas */}
          <canvas
            ref={previewCanvasRef}
            className="absolute inset-0 block pointer-events-auto"
            style={{ width: '100%', height: '100%' }}
          />

          {/* Floating On-Canvas Crop Action Pill */}
          {isCropping && engineRef.current?.cropRect && (
            <div
              className="absolute z-20 flex items-center space-x-1.5 bg-slate-900 text-white px-2.5 py-1.5 rounded-lg shadow-xl border border-slate-700 text-xs font-semibold"
              style={{
                left: `${Math.min(
                  naturalDims.width * zoom - 160,
                  Math.max(10, (engineRef.current.cropRect.x + engineRef.current.cropRect.width) * zoom - 150)
                )}px`,
                top: `${(engineRef.current.cropRect.y + engineRef.current.cropRect.height) * zoom + 12}px`
              }}
            >
              <button
                onClick={onApplyCrop}
                className="bg-blue-600 hover:bg-blue-500 px-2.5 py-1 rounded text-white flex items-center space-x-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
              <button
                onClick={onCancelCrop}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2.5 py-1 rounded flex items-center space-x-1"
              >
                <X className="w-3.5 h-3.5" />
                <span>Cancel</span>
              </button>
            </div>
          )}

          {/* Inline Text Box Overlay */}
          {inlineText.visible && (
            <div
              className="absolute z-20"
              style={{
                left: `${inlineText.x * zoom}px`,
                top: `${inlineText.y * zoom - inlineText.fontSize * zoom}px`
              }}
            >
              <input
                autoFocus
                type="text"
                value={inlineText.text}
                onChange={(e) => setInlineText((prev) => ({ ...prev, text: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCommitText();
                  if (e.key === 'Escape') setInlineText((prev) => ({ ...prev, visible: false }));
                }}
                onBlur={handleCommitText}
                placeholder="Type annotation and press Enter..."
                className="bg-slate-900/90 text-white font-bold border-2 border-blue-500 rounded px-2 py-1 outline-none shadow-lg min-w-[200px]"
                style={{
                  color: inlineText.color,
                  fontSize: `${Math.max(12, Math.round(inlineText.fontSize * zoom))}px`
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
