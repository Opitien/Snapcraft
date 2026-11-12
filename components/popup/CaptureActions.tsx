import React from 'react';
import { Monitor, Scroll, Crop, Loader2 } from 'lucide-react';
import { CaptureMode } from '../../types/screenshot';

interface CaptureActionsProps {
  onCapture: (mode: CaptureMode) => void;
  loadingMode: CaptureMode | null;
  disabled?: boolean;
}

export const CaptureActions: React.FC<CaptureActionsProps> = ({
  onCapture,
  loadingMode,
  disabled = false
}) => {
  return (
    <div className="p-4 space-y-2.5">
      {/* Prominent Select Area Button */}
      <button
        onClick={() => onCapture('area')}
        disabled={disabled || loadingMode !== null}
        className="w-full relative group overflow-hidden bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl p-3.5 shadow-sm hover:shadow transition-all text-left flex items-center justify-between disabled:opacity-60 disabled:cursor-not-allowed"
      >
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
            {loadingMode === 'area' ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Crop className="w-5 h-5" />
            )}
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-semibold tracking-tight">Select Custom Area</span>
              <span className="text-[10px] font-bold uppercase tracking-wider bg-white/25 px-1.5 py-0.5 rounded">
                Popular
              </span>
            </div>
            <p className="text-xs text-blue-100 font-normal mt-0.5">
              Drag mouse to capture rectangular region
            </p>
          </div>
        </div>
        <kbd className="hidden sm:inline-block text-[10px] font-mono font-medium bg-black/20 text-white/90 px-1.5 py-0.5 rounded border border-white/20">
          ⌥⇧A
        </kbd>
      </button>

      {/* Grid for Visible & Full Page options */}
      <div className="grid grid-cols-2 gap-2.5">
        {/* Visible Screen */}
        <button
          onClick={() => onCapture('visible')}
          disabled={disabled || loadingMode !== null}
          className="p-3 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 hover:border-slate-300 rounded-xl text-left transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-blue-600 transition-colors">
              {loadingMode === 'visible' ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Monitor className="w-4 h-4" />
              )}
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-white px-1 py-0.5 rounded border border-slate-200">
              ⌥⇧V
            </kbd>
          </div>
          <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
            Visible Screen
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            Current viewport
          </div>
        </button>

        {/* Full Page */}
        <button
          onClick={() => onCapture('full-page')}
          disabled={disabled || loadingMode !== null}
          className="p-3 bg-slate-50 hover:bg-slate-100/90 border border-slate-200/90 hover:border-slate-300 rounded-xl text-left transition-all group disabled:opacity-60 disabled:cursor-not-allowed"
        >
          <div className="flex items-center justify-between mb-2">
            <div className="w-8 h-8 rounded-lg bg-white border border-slate-200 flex items-center justify-center text-slate-700 group-hover:text-blue-600 transition-colors">
              {loadingMode === 'full-page' ? (
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
              ) : (
                <Scroll className="w-4 h-4" />
              )}
            </div>
            <kbd className="text-[10px] font-mono text-slate-400 bg-white px-1 py-0.5 rounded border border-slate-200">
              ⌥⇧F
            </kbd>
          </div>
          <div className="text-xs font-semibold text-slate-800 group-hover:text-slate-900">
            Full Page
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
            Scroll & stitch
          </div>
        </button>
      </div>
    </div>
  );
};
