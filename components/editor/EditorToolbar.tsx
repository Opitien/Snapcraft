import React, { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  Download,
  Check,
  Undo2,
  Redo2,
  Crop,
  Square,
  ArrowUpRight,
  Type,
  EyeOff,
  Pencil,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize2
} from 'lucide-react';
import { ToolType } from '../../features/editor/canvas-engine';

interface EditorToolbarProps {
  filename: string;
  onFilenameChange: (name: string) => void;
  dimensions: { width: number; height: number };
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  color: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  isCropping: boolean;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  onCopy: () => Promise<boolean>;
  onDownload: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetZoom: () => void;
  onBack: () => void;
}

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#2563eb' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Black', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' }
];

const STROKE_WIDTHS = [2, 4, 8];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  filename,
  onFilenameChange,
  dimensions,
  activeTool,
  onSelectTool,
  color,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  isCropping,
  onApplyCrop,
  onCancelCrop,
  onCopy,
  onDownload,
  zoom,
  onZoomIn,
  onZoomOut,
  onResetZoom,
  onBack
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyClick = async () => {
    const success = await onCopy();
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <header className="bg-white border-b border-slate-200 select-none shadow-sm sticky top-0 z-40">
      {/* Top Primary Bar */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <div className="flex items-center space-x-3">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1"
            title="Back / Close"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium hidden sm:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-200" />

          {/* Filename Input */}
          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              className="text-sm font-semibold text-slate-800 border border-transparent hover:border-slate-300 focus:border-blue-500 focus:bg-white rounded-md px-2 py-1 max-w-[220px] truncate outline-none transition-all"
              placeholder="screenshot.png"
            />
            <span className="text-[11px] font-mono text-slate-500 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
              {dimensions.width} × {dimensions.height} px
            </span>
          </div>
        </div>

        {/* Center: Tools */}
        <div className="flex items-center space-x-1 bg-slate-100/90 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => onSelectTool('select')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'select'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Select / View"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('crop')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'crop'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Crop Image"
          >
            <Crop className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          <button
            onClick={() => onSelectTool('rectangle')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'rectangle'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Draw Rectangle"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('arrow')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'arrow'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Draw Arrow"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('pen')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'pen'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Freehand Pencil"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('text')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'text'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Add Text"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onSelectTool('blur')}
            className={`p-1.5 rounded-lg text-xs font-medium flex items-center space-x-1 transition-all ${
              activeTool === 'blur'
                ? 'bg-white text-blue-600 shadow-sm font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
            title="Blur / Redact Sensitive Area"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-300 mx-0.5" />

          {/* Undo / Redo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Undo"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white/60 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Redo"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2">
          {isCropping ? (
            <div className="flex items-center space-x-1.5 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg">
              <span className="text-xs font-medium text-blue-700">Crop Active:</span>
              <button
                onClick={onApplyCrop}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded font-medium flex items-center space-x-1 shadow-sm"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply</span>
              </button>
              <button
                onClick={onCancelCrop}
                className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs px-2 py-1 rounded font-medium"
              >
                Cancel
              </button>
            </div>
          ) : null}

          <button
            onClick={handleCopyClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-300 hover:border-slate-400 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-all shadow-sm active:scale-95"
            title="Copy to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onDownload}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold transition-all shadow-sm active:scale-95"
            title="Download PNG"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download PNG</span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar for styling attributes (Color & Stroke Width & Zoom) */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-50/70 border-t border-slate-100 text-xs text-slate-600">
        <div className="flex items-center space-x-4">
          {/* Colors */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-500">Color:</span>
            <div className="flex items-center space-x-1">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => onChangeColor(c.hex)}
                  className={`w-4 h-4 rounded-full border border-slate-300 transition-transform ${
                    color === c.hex ? 'scale-125 ring-2 ring-blue-500 ring-offset-1' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="h-3 w-px bg-slate-200" />

          {/* Stroke Widths */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-500">Thickness:</span>
            <div className="flex items-center space-x-1">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw}
                  onClick={() => onChangeStrokeWidth(sw)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                    strokeWidth === sw
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  {sw}px
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center space-x-1">
          <button
            onClick={onZoomOut}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="font-mono text-[11px] px-1 text-slate-600 min-w-[42px] text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={onZoomIn}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={onResetZoom}
            className="p-1 text-slate-500 hover:text-slate-800 rounded hover:bg-slate-200/60"
            title="Reset Zoom to 100%"
          >
            <Maximize2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
