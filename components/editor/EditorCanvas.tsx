import React, { useEffect, useRef } from 'react';
import { ToolType, ScreenshotEditorEngine } from '../../features/editor/canvas-engine';

interface EditorCanvasProps {
  dataUrl: string;
  activeTool: ToolType;
  color: string;
  strokeWidth: number;
  zoom: number;
  onEngineReady: (engine: ScreenshotEditorEngine) => void;
  onDimensionsLoaded: (dims: { width: number; height: number }) => void;
}

export const EditorCanvas: React.FC<EditorCanvasProps> = ({
  dataUrl,
  activeTool,
  color,
  strokeWidth,
  zoom,
  onEngineReady,
  onDimensionsLoaded
}) => {
  const baseCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<ScreenshotEditorEngine | null>(null);

  useEffect(() => {
    if (!baseCanvasRef.current || !previewCanvasRef.current || !dataUrl) return;

    const engine = new ScreenshotEditorEngine(baseCanvasRef.current, previewCanvasRef.current);
    engineRef.current = engine;
    onEngineReady(engine);

    engine.loadImage(dataUrl).then((dims) => {
      onDimensionsLoaded(dims);
    }).catch((err) => {
      console.error('Failed to load image in editor canvas:', err);
    });

    return () => {
      engine.destroy();
    };
  }, [dataUrl]);

  // Sync engine tool properties when props update
  useEffect(() => {
    if (!engineRef.current) return;
    engineRef.current.tool = activeTool;
    engineRef.current.color = color;
    engineRef.current.strokeWidth = strokeWidth;
  }, [activeTool, color, strokeWidth]);

  const getCursor = () => {
    switch (activeTool) {
      case 'select': return 'default';
      case 'crop': return 'crosshair';
      case 'rectangle': return 'crosshair';
      case 'arrow': return 'crosshair';
      case 'pen': return 'crosshair';
      case 'blur': return 'crosshair';
      case 'text': return 'text';
      default: return 'default';
    }
  };

  return (
    <div className="flex-1 overflow-auto bg-slate-100 flex items-center justify-center p-8 select-none min-h-[500px]">
      <div
        className="relative bg-white shadow-xl rounded-lg overflow-hidden border border-slate-300 transition-transform origin-center"
        style={{
          transform: `scale(${zoom})`,
          cursor: getCursor()
        }}
      >
        {/* Base Canvas */}
        <canvas
          ref={baseCanvasRef}
          className="block max-w-none"
        />

        {/* Overlay Interactive Preview Canvas */}
        <canvas
          ref={previewCanvasRef}
          className="absolute inset-0 block max-w-none pointer-events-auto"
        />
      </div>
    </div>
  );
};
