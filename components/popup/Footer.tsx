import React, { useState } from 'react';
import { Settings, History, Keyboard, ChevronRight, X } from 'lucide-react';

interface FooterProps {
  onOpenSettings: () => void;
  onOpenHistory: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onOpenSettings, onOpenHistory }) => {
  const [showShortcuts, setShowShortcuts] = useState(false);

  return (
    <footer className="border-t border-slate-200 bg-slate-50/70 p-3">
      {showShortcuts && (
        <div className="mb-3 p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-xs space-y-2 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between font-semibold text-slate-900 pb-1 border-b border-slate-100">
            <span className="flex items-center space-x-1.5">
              <Keyboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Keyboard Shortcuts</span>
            </span>
            <button
              onClick={() => setShowShortcuts(false)}
              className="text-slate-400 hover:text-slate-600 p-0.5 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Visible Screenshot</span>
            <kbd className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-800">
              Alt + Shift + V
            </kbd>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Full-Page Screenshot</span>
            <kbd className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-800">
              Alt + Shift + F
            </kbd>
          </div>
          <div className="flex items-center justify-between text-slate-600">
            <span>Select Area Screenshot</span>
            <kbd className="font-mono bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded text-[11px] text-slate-800">
              Alt + Shift + A
            </kbd>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center space-x-3">
          <button
            onClick={onOpenSettings}
            className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Settings</span>
          </button>

          <button
            onClick={onOpenHistory}
            className="flex items-center space-x-1 hover:text-slate-900 transition-colors"
          >
            <History className="w-3.5 h-3.5" />
            <span>History</span>
          </button>
        </div>

        <button
          onClick={() => setShowShortcuts(!showShortcuts)}
          className="flex items-center space-x-1 text-slate-500 hover:text-slate-800 transition-colors font-medium"
        >
          <Keyboard className="w-3.5 h-3.5" />
          <span>Shortcuts</span>
        </button>
      </div>
    </footer>
  );
};
