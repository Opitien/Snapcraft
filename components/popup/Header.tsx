import React from 'react';
import { Camera, Settings } from 'lucide-react';

interface HeaderProps {
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSettings }) => {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white">
      <div className="flex items-center space-x-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
          <Camera className="w-4 h-4 stroke-[2.5]" />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-slate-900 leading-tight">SnapCraft</h1>
          <p className="text-[11px] text-slate-500 font-medium">Capture & Annotate</p>
        </div>
      </div>

      <button
        onClick={onOpenSettings}
        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
        title="Settings"
        aria-label="Settings"
      >
        <Settings className="w-4 h-4" />
      </button>
    </header>
  );
};
