import React, { useEffect, useState } from 'react';
import { Header } from '../../components/popup/Header';
import { CaptureActions } from '../../components/popup/CaptureActions';
import { RecentCaptures } from '../../components/popup/RecentCaptures';
import { Footer } from '../../components/popup/Footer';
import { CaptureMode, ScreenshotItem } from '../../types/screenshot';
import { getRecentScreenshots, deleteScreenshot } from '../../services/db';
import { isRestrictedUrl } from '../../features/visible-capture/capture';
import { AlertCircle } from 'lucide-react';

export const App: React.FC = () => {
  const [recentItems, setRecentItems] = useState<ScreenshotItem[]>([]);
  const [loadingMode, setLoadingMode] = useState<CaptureMode | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isRestricted, setIsRestricted] = useState(false);

  // Load recent captures and active tab state on mount
  useEffect(() => {
    loadRecent();
    checkActiveTab();
  }, []);

  const loadRecent = async () => {
    try {
      const items = await getRecentScreenshots(10);
      setRecentItems(items);
    } catch (err) {
      console.warn('Failed to load recent screenshots:', err);
    }
  };

  const checkActiveTab = async () => {
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs[0]?.url && isRestrictedUrl(tabs[0].url)) {
        setIsRestricted(true);
        setErrorMsg('Chrome prevents capturing internal browser and Web Store pages.');
      }
    } catch {
      // Ignore in development
    }
  };

  const handleCapture = async (mode: CaptureMode) => {
    setErrorMsg(null);
    setLoadingMode(mode);

    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];

      if (!activeTab || !activeTab.id) {
        throw new Error('No active browser tab found.');
      }

      if (isRestrictedUrl(activeTab.url)) {
        throw new Error('Chrome does not allow capturing internal browser or Web Store pages.');
      }

      if (mode === 'visible') {
        const res = await chrome.runtime.sendMessage({
          type: 'CAPTURE_VISIBLE',
          payload: { tabId: activeTab.id }
        });

        if (res && res.error) {
          throw new Error(res.error);
        }
        await loadRecent();
      } else if (mode === 'area') {
        // Send start message and close popup so user can select
        const res = await chrome.runtime.sendMessage({
          type: 'START_AREA_CAPTURE',
          payload: { tabId: activeTab.id }
        });

        if (res && res.error) {
          throw new Error(res.error);
        }
        window.close();
      } else if (mode === 'full-page') {
        // Send start message and close popup so page can scroll cleanly
        const res = await chrome.runtime.sendMessage({
          type: 'START_FULL_PAGE_CAPTURE',
          payload: { tabId: activeTab.id }
        });

        if (res && res.error) {
          throw new Error(res.error);
        }
        window.close();
      }
    } catch (err: any) {
      console.error('Capture trigger failed:', err);
      setErrorMsg(err.message || 'Capture failed');
    } finally {
      setLoadingMode(null);
    }
  };

  const handleOpenItem = (id: string) => {
    const editorUrl = chrome.runtime.getURL(`/editor.html?id=${id}`);
    chrome.tabs.create({ url: editorUrl });
  };

  const handleDeleteItem = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteScreenshot(id);
      setRecentItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  const handleOpenSettings = () => {
    const url = chrome.runtime.getURL('/settings.html');
    chrome.tabs.create({ url });
  };

  const handleOpenHistory = () => {
    const url = chrome.runtime.getURL('/settings.html#history');
    chrome.tabs.create({ url });
  };

  return (
    <div className="w-[360px] bg-white font-sans text-slate-900 select-none flex flex-col justify-between shadow-lg">
      <div>
        <Header onOpenSettings={handleOpenSettings} />

        {errorMsg && (
          <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-start space-x-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
            <div className="leading-relaxed">{errorMsg}</div>
          </div>
        )}

        <CaptureActions
          onCapture={handleCapture}
          loadingMode={loadingMode}
          disabled={isRestricted}
        />

        <RecentCaptures
          items={recentItems}
          onOpenItem={handleOpenItem}
          onDeleteItem={handleDeleteItem}
          onViewAll={handleOpenHistory}
        />
      </div>

      <Footer
        onOpenSettings={handleOpenSettings}
        onOpenHistory={handleOpenHistory}
      />
    </div>
  );
};
export default App;
