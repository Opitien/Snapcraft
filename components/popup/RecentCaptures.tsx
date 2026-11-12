import React from 'react';
import { Download, ExternalLink, Image as ImageIcon, Trash2 } from 'lucide-react';
import { ScreenshotItem } from '../../types/screenshot';
import { downloadScreenshot } from '../../services/downloads';

interface RecentCapturesProps {
  items: ScreenshotItem[];
  onOpenItem: (id: string) => void;
  onDeleteItem: (id: string, e: React.MouseEvent) => void;
  onViewAll: () => void;
}

export const RecentCaptures: React.FC<RecentCapturesProps> = ({
  items,
  onOpenItem,
  onDeleteItem,
  onViewAll
}) => {
  const displayItems = items.slice(0, 3);

  const formatTimestamp = (ts: number): string => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const handleDownload = async (item: ScreenshotItem, e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanHost = item.hostname.replace(/[^a-zA-Z0-9]/g, '_') || 'screenshot';
    const filename = `${cleanHost}-${new Date(item.timestamp).toISOString().slice(0, 10)}.png`;
    await downloadScreenshot(item.dataUrl, filename);
  };

  return (
    <div className="px-4 pb-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
          Recent Captures
        </span>
        {items.length > 0 && (
          <button
            onClick={onViewAll}
            className="text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            View All ({items.length})
          </button>
        )}
      </div>

      {displayItems.length === 0 ? (
        <div className="p-5 border border-dashed border-slate-200 rounded-xl text-center bg-slate-50/50">
          <ImageIcon className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
          <p className="text-xs font-medium text-slate-600">No screenshots yet</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Use any capture mode above to get started
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayItems.map((item) => (
            <div
              key={item.id}
              onClick={() => onOpenItem(item.id)}
              className="group flex items-center justify-between p-2 rounded-xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/80 hover:border-slate-300 cursor-pointer transition-all"
            >
              <div className="flex items-center space-x-2.5 min-w-0">
                <div className="w-11 h-11 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-200/80 flex items-center justify-center">
                  <img
                    src={item.thumbnailUrl || item.dataUrl}
                    alt={item.title}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-medium text-slate-900 truncate">
                    {item.hostname || 'Webpage'}
                  </div>
                  <div className="flex items-center space-x-1.5 text-[11px] text-slate-500 mt-0.5">
                    <span>{formatTimestamp(item.timestamp)}</span>
                    <span>•</span>
                    <span className="text-[10px] bg-slate-200/70 text-slate-600 px-1 rounded font-mono">
                      {item.width}×{item.height}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity pl-2">
                <button
                  onClick={(e) => handleDownload(item, e)}
                  className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-md transition-colors"
                  title="Download PNG"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={(e) => onDeleteItem(item.id, e)}
                  className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-white rounded-md transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
                <div className="p-1.5 text-slate-400 group-hover:text-blue-600">
                  <ExternalLink className="w-3.5 h-3.5" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
