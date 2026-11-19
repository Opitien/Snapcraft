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
  Circle,
  ArrowUpRight,
  Minus,
  Type,
  EyeOff,
  Pencil,
  Highlighter,
  ListOrdered,
  MousePointer,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { ToolType } from '../../features/editor/canvas-engine';

interface EditorToolbarProps {
  filename: string;
  onFilenameChange: (name: string) => void;
  dimensions: { width: number; height: number };
  mode?: string;
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
  color: string;
  onChangeColor: (color: string) => void;
  strokeWidth: number;
  onChangeStrokeWidth: (width: number) => void;
  fontSize: number;
  onChangeFontSize: (size: number) => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onReset: () => void;
  isCropping: boolean;
  onApplyCrop: () => void;
  onCancelCrop: () => void;
  onCopy: () => Promise<boolean>;
  onDownload: () => void;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitScreen: () => void;
  onResetZoom: () => void;
  onBack: () => void;
  stepNumber?: number;
}

const COLORS = [
  { name: 'Red', hex: '#ef4444' },
  { name: 'Blue', hex: '#3b82f6' },
  { name: 'Emerald', hex: '#10b981' },
  { name: 'Amber', hex: '#f59e0b' },
  { name: 'Purple', hex: '#8b5cf6' },
  { name: 'Pink', hex: '#ec4899' },
  { name: 'Dark Slate', hex: '#0f172a' },
  { name: 'White', hex: '#ffffff' }
];

const STROKE_WIDTHS = [2, 4, 8];
const FONT_SIZES = [14, 18, 24, 32];

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  filename,
  onFilenameChange,
  dimensions,
  mode,
  activeTool,
  onSelectTool,
  color,
  onChangeColor,
  strokeWidth,
  onChangeStrokeWidth,
  fontSize,
  onChangeFontSize,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onReset,
  isCropping,
  onApplyCrop,
  onCancelCrop,
  onCopy,
  onDownload,
  zoom,
  onZoomIn,
  onZoomOut,
  onFitScreen,
  onResetZoom,
  onBack,
  stepNumber = 1
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
    <header className="bg-slate-900 text-white select-none shadow-md sticky top-0 z-40 border-b border-slate-800">
      {/* Top Main Navigation & Tool Island */}
      <div className="flex items-center justify-between px-4 py-2.5 gap-2">
        {/* Left: Back & Filename & Dimensions */}
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={onBack}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors flex items-center space-x-1"
            title="Back / Close"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-xs font-medium hidden md:inline">Back</span>
          </button>

          <div className="h-5 w-px bg-slate-800" />

          <div className="flex items-center space-x-2">
            <input
              type="text"
              value={filename}
              onChange={(e) => onFilenameChange(e.target.value)}
              className="text-xs font-semibold text-slate-200 bg-slate-800/80 hover:bg-slate-800 border border-slate-700 focus:border-blue-500 rounded-md px-2.5 py-1 max-w-[190px] truncate outline-none transition-all"
              placeholder="screenshot.png"
            />
            <span className="text-[11px] font-mono text-slate-400 bg-slate-800 border border-slate-700/80 px-2 py-0.5 rounded-full">
              {dimensions.width} × {dimensions.height} px
            </span>
            {mode && (
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/50 hidden sm:inline-block">
                {mode}
              </span>
            )}
          </div>
        </div>

        {/* Center: Sleek Tool Island */}
        <div className="flex items-center space-x-1 bg-slate-800/90 p-1 rounded-xl border border-slate-700/80 shadow-inner overflow-x-auto">
          {/* Select / Hand */}
          <button
            onClick={() => onSelectTool('select')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'select'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Select & Pan (V)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Crop */}
          <button
            onClick={() => onSelectTool('crop')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'crop'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Crop Image (C)"
          >
            <Crop className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Rectangle */}
          <button
            onClick={() => onSelectTool('rectangle')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'rectangle'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Rectangle (R)"
          >
            <Square className="w-3.5 h-3.5" />
          </button>

          {/* Circle */}
          <button
            onClick={() => onSelectTool('circle')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'circle'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Circle / Ellipse (O)"
          >
            <Circle className="w-3.5 h-3.5" />
          </button>

          {/* Arrow */}
          <button
            onClick={() => onSelectTool('arrow')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'arrow'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Arrow (A)"
          >
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>

          {/* Line */}
          <button
            onClick={() => onSelectTool('line')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'line'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Straight Line (L)"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Pen */}
          <button
            onClick={() => onSelectTool('pen')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Freehand Pen (P)"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>

          {/* Highlighter */}
          <button
            onClick={() => onSelectTool('highlighter')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'highlighter'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Highlighter (H)"
          >
            <Highlighter className="w-3.5 h-3.5" />
          </button>

          {/* Text */}
          <button
            onClick={() => onSelectTool('text')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Text Label (T)"
          >
            <Type className="w-3.5 h-3.5" />
          </button>

          {/* Step Callout */}
          <button
            onClick={() => onSelectTool('callout')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all flex items-center space-x-1 ${
              activeTool === 'callout'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title={`Numbered Step Callout (Next: #${stepNumber})`}
          >
            <ListOrdered className="w-3.5 h-3.5" />
            <span className="text-[10px] font-bold bg-white/20 px-1 rounded-full">{stepNumber}</span>
          </button>

          {/* Blur / Redact */}
          <button
            onClick={() => onSelectTool('blur')}
            className={`p-1.5 rounded-lg text-xs font-medium transition-all ${
              activeTool === 'blur'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
            title="Blur / Redact Sensitive Area (B)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-700 mx-0.5" />

          {/* Undo */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>

          {/* Redo */}
          <button
            onClick={onRedo}
            disabled={!canRedo}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>

          {/* Revert to Original */}
          <button
            onClick={onReset}
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-700 rounded-lg transition-colors"
            title="Reset All Edits to Original"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center space-x-2 shrink-0">
          {isCropping && (
            <div className="flex items-center space-x-1.5 bg-blue-950/80 border border-blue-700/60 px-2 py-1 rounded-lg">
              <button
                onClick={onApplyCrop}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-2.5 py-1 rounded font-semibold flex items-center space-x-1 shadow-sm transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Apply Crop</span>
              </button>
              <button
                onClick={onCancelCrop}
                className="bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs px-2 py-1 rounded font-medium transition-all"
              >
                Cancel
              </button>
            </div>
          )}

          <button
            onClick={handleCopyClick}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all active:scale-95 shadow-sm"
            title="Copy to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-300" />
                <span>Copy</span>
              </>
            )}
          </button>

          <button
            onClick={onDownload}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-all shadow-md active:scale-95"
            title="Download PNG Screenshot"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Sub-toolbar: Colors, Line thickness, Font size, and Screen Fitting Controls */}
      <div className="flex items-center justify-between px-4 py-1.5 bg-slate-950 border-t border-slate-800/80 text-xs text-slate-400">
        {/* Left: Color Palette & Sizing */}
        <div className="flex items-center space-x-4">
          {/* Colors */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-400">Color:</span>
            <div className="flex items-center space-x-1.5">
              {COLORS.map((c) => (
                <button
                  key={c.hex}
                  onClick={() => onChangeColor(c.hex)}
                  className={`w-4 h-4 rounded-full border border-slate-600 transition-all ${
                    color === c.hex ? 'scale-125 ring-2 ring-blue-500 ring-offset-1 ring-offset-slate-900' : 'hover:scale-110'
                  }`}
                  style={{ backgroundColor: c.hex }}
                  title={c.name}
                />
              ))}
            </div>
          </div>

          <div className="h-3 w-px bg-slate-800" />

          {/* Stroke Width */}
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] font-medium text-slate-400">Stroke:</span>
            <div className="flex items-center space-x-1">
              {STROKE_WIDTHS.map((sw) => (
                <button
                  key={sw}
                  onClick={() => onChangeStrokeWidth(sw)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                    strokeWidth === sw
                      ? 'bg-blue-600 text-white border-blue-500'
                      : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                  }`}
                >
                  {sw}px
                </button>
              ))}
            </div>
          </div>

          {activeTool === 'text' && (
            <>
              <div className="h-3 w-px bg-slate-800" />
              <div className="flex items-center space-x-1.5">
                <span className="text-[11px] font-medium text-slate-400">Font:</span>
                <div className="flex items-center space-x-1">
                  {FONT_SIZES.map((sz) => (
                    <button
                      key={sz}
                      onClick={() => onChangeFontSize(sz)}
                      className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border transition-all ${
                        fontSize === sz
                          ? 'bg-blue-600 text-white border-blue-500'
                          : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-600'
                      }`}
                    >
                      {sz}px
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Right: Screen Fitting & Zoom Controls */}
        <div className="flex items-center space-x-2">
          {/* Fit to Screen Button */}
          <button
            onClick={onFitScreen}
            className="flex items-center space-x-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-semibold transition-all shadow-sm"
            title="Auto-Fit Screenshot to Screen"
          >
            <Maximize2 className="w-3.5 h-3.5 text-blue-400" />
            <span>Fit Screen</span>
          </button>

          {/* 100% Actual Size Button */}
          <button
            onClick={onResetZoom}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg text-xs font-medium transition-all"
            title="Reset to 100% Actual Size"
          >
            100%
          </button>

          <div className="h-3 w-px bg-slate-800" />

          {/* Zoom stepper */}
          <div className="flex items-center space-x-1 bg-slate-800/80 border border-slate-700 rounded-lg px-1.5 py-0.5">
            <button
              onClick={onZoomOut}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom Out (-)"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="font-mono text-[11px] px-1 text-slate-200 min-w-[38px] text-center font-medium">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={onZoomIn}
              className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700"
              title="Zoom In (+)"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};
