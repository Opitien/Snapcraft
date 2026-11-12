import React, { useEffect, useState } from 'react';
import {
  Settings as SettingsIcon,
  History as HistoryIcon,
  Keyboard,
  Trash2,
  Download,
  ExternalLink,
  Check,
  AlertTriangle,
  Camera
} from 'lucide-react';
import { ExtensionSettings, DEFAULT_SETTINGS, ScreenshotItem } from '../../types/screenshot';
import { getSettings, saveSettings } from '../../services/storage';
import { getRecentScreenshots, deleteScreenshot, clearAllScreenshots } from '../../services/db';
import { downloadScreenshot } from '../../services/downloads';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'settings' | 'history'>('settings');
  const [settings, setSettings] = useState<ExtensionSettings>(DEFAULT_SETTINGS);
  const [historyItems, setHistoryItems] = useState<ScreenshotItem[]>([]);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  useEffect(() => {
    // Check hash for direct navigation (#history)
    if (window.location.hash === '#history') {
      setActiveTab('history');
    }

    loadSettingsAndHistory();
  }, []);

  const loadSettingsAndHistory = async () => {
    const s = await getSettings();
    setSettings(s);

    const items = await getRecentScreenshots(50);
    setHistoryItems(items);
  };

  const handleUpdateSetting = async <K extends keyof ExtensionSettings>(
    key: K,
    val: ExtensionSettings[K]
  ) => {
    const updated = await saveSettings({ [key]: val });
    setSettings(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 1500);
  };

  const handleDeleteItem = async (id: string) => {
    await deleteScreenshot(id);
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const handleClearAll = async () => {
    await clearAllScreenshots();
    setHistoryItems([]);
    setShowClearConfirm(false);
  };

  const handleDownloadItem = async (item: ScreenshotItem) => {
    const cleanHost = item.hostname.replace(/[^a-zA-Z0-9]/g, '_') || 'screenshot';
    const filename = `${cleanHost}-${new Date(item.timestamp).toISOString().slice(0, 10)}.png`;
    await downloadScreenshot(item.dataUrl, filename);
  };

  const handleOpenEditor = (id: string) => {
    const editorUrl = chrome.runtime.getURL(`/editor.html?id=${id}`);
    chrome.tabs.create({ url: editorUrl });
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
              <Camera className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-slate-900">SnapCraft</h1>
              <p className="text-[11px] text-slate-500 font-medium">Settings & Screenshot History</p>
            </div>
          </div>

          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setActiveTab('settings')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <SettingsIcon className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === 'history'
                  ? 'bg-white text-blue-600 shadow-sm font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <HistoryIcon className="w-3.5 h-3.5" />
              <span>History ({historyItems.length})</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl mx-auto px-6 pt-8">
        {savedSuccess && (
          <div className="mb-6 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center space-x-2 text-xs text-emerald-800">
            <Check className="w-4 h-4 text-emerald-600" />
            <span>Settings updated successfully!</span>
          </div>
        )}

        {activeTab === 'settings' ? (
          <div className="space-y-6">
            {/* General Preferences */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Capture Preferences</h2>
              <p className="text-xs text-slate-500 mb-5">Configure how screenshots are processed and saved.</p>

              <div className="space-y-4">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Open in Editor after Capture</div>
                    <div className="text-[11px] text-slate-500">Automatically open the preview and editor tab after capturing.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.openEditorAfterCapture}
                    onChange={(e) => handleUpdateSetting('openEditorAfterCapture', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Auto-copy to Clipboard</div>
                    <div className="text-[11px] text-slate-500">Automatically copy captured image to clipboard.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.autoCopyAfterCapture}
                    onChange={(e) => handleUpdateSetting('autoCopyAfterCapture', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Save Screenshot History</div>
                    <div className="text-[11px] text-slate-500">Keep recent captures in local IndexedDB storage.</div>
                  </div>
                  <input
                    type="checkbox"
                    checked={settings.saveHistory}
                    onChange={(e) => handleUpdateSetting('saveHistory', e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Default Image Format</div>
                    <div className="text-[11px] text-slate-500">Format used when exporting and saving captures.</div>
                  </div>
                  <select
                    value={settings.imageFormat}
                    onChange={(e) => handleUpdateSetting('imageFormat', e.target.value as 'png' | 'jpeg')}
                    className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium outline-none focus:border-blue-500"
                  >
                    <option value="png">PNG (Lossless)</option>
                    <option value="jpeg">JPEG (Compressed)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Keyboard Shortcuts Reference */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center space-x-2 mb-1">
                <Keyboard className="w-4 h-4 text-slate-500" />
                <h2 className="text-sm font-semibold text-slate-900">Default Keyboard Shortcuts</h2>
              </div>
              <p className="text-xs text-slate-500 mb-5">
                Trigger captures from anywhere on the web using standard shortcuts.
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Visible Screenshot</div>
                    <div className="text-[11px] text-slate-500">Captures the current visible browser viewport</div>
                  </div>
                  <kbd className="font-mono bg-white border border-slate-200 px-2 py-1 rounded text-xs font-semibold text-slate-800 shadow-2xs">
                    Alt + Shift + V
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Full-Page Screenshot</div>
                    <div className="text-[11px] text-slate-500">Scrolls and stitches the entire webpage content</div>
                  </div>
                  <kbd className="font-mono bg-white border border-slate-200 px-2 py-1 rounded text-xs font-semibold text-slate-800 shadow-2xs">
                    Alt + Shift + F
                  </kbd>
                </div>

                <div className="flex items-center justify-between p-3 bg-slate-50 border border-slate-200/80 rounded-xl">
                  <div>
                    <div className="text-xs font-medium text-slate-800">Custom Draggable Area</div>
                    <div className="text-[11px] text-slate-500">Selects and crops a custom rectangular region</div>
                  </div>
                  <kbd className="font-mono bg-white border border-slate-200 px-2 py-1 rounded text-xs font-semibold text-slate-800 shadow-2xs">
                    Alt + Shift + A
                  </kbd>
                </div>
              </div>
            </div>

            {/* Storage & Privacy */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900 mb-1">Local Data & Privacy</h2>
              <p className="text-xs text-slate-500 mb-4 leading-relaxed">
                All screenshots and image data are processed 100% locally on your machine using IndexedDB. No images are ever uploaded to remote servers.
              </p>

              <div className="pt-2">
                {showClearConfirm ? (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-xs text-red-800 font-medium">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span>Are you sure you want to delete all saved screenshots?</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={handleClearAll}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold shadow-sm"
                      >
                        Confirm Delete
                      </button>
                      <button
                        onClick={() => setShowClearConfirm(false)}
                        className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowClearConfirm(true)}
                    className="flex items-center space-x-1.5 text-xs text-red-600 hover:text-red-700 font-medium border border-red-200 hover:bg-red-50 px-3 py-2 rounded-xl transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Clear All Local Screenshot History</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* History View */
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Saved Screenshots</h2>
                <p className="text-xs text-slate-500">Previously captured screenshots stored in local IndexedDB.</p>
              </div>

              {historyItems.length > 0 && (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="text-xs text-red-600 hover:text-red-700 font-medium flex items-center space-x-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear All</span>
                </button>
              )}
            </div>

            {historyItems.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-2xl p-12 text-center shadow-sm">
                <HistoryIcon className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h3 className="text-xs font-semibold text-slate-800">No screenshot history</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Captures you take will appear here for easy access.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {historyItems.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow transition-shadow flex flex-col"
                  >
                    <div
                      onClick={() => handleOpenEditor(item.id)}
                      className="h-44 bg-slate-100 border-b border-slate-200/80 cursor-pointer overflow-hidden flex items-center justify-center group relative"
                    >
                      <img
                        src={item.thumbnailUrl || item.dataUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-200"
                      />
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white text-xs font-medium space-x-1.5">
                        <ExternalLink className="w-4 h-4" />
                        <span>Open Editor</span>
                      </div>
                    </div>

                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between text-xs font-semibold text-slate-900">
                          <span className="truncate">{item.hostname || 'Webpage'}</span>
                          <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                            {item.mode}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">{item.title}</div>
                        <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-2">
                          <span>{new Date(item.timestamp).toLocaleString()}</span>
                          <span>•</span>
                          <span className="font-mono">{item.width} × {item.height} px</span>
                        </div>
                      </div>

                      <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100 mt-3">
                        <button
                          onClick={() => handleDownloadItem(item)}
                          className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors flex items-center space-x-1 text-xs"
                          title="Download PNG"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Download</span>
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
export default App;
