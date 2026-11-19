import React, { useEffect, useState, useRef, useCallback } from 'react';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { EditorCanvas } from '../../components/editor/EditorCanvas';
import { ToolType, ScreenshotEditorEngine, EditorState } from '../../features/editor/canvas-engine';
import { getScreenshot, getRecentScreenshots, saveScreenshot } from '../../services/db';
import { downloadScreenshot, copyImageToClipboard } from '../../services/downloads';
import { ScreenshotItem, SliceItem, PageDimensionsData } from '../../types/screenshot';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [screenshotItem, setScreenshotItem] = useState<ScreenshotItem | null>(null);
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [slices, setSlices] = useState<SliceItem[] | undefined>(undefined);
  const [pageDim, setPageDim] = useState<PageDimensionsData | undefined>(undefined);

  const [filename, setFilename] = useState('screenshot.png');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(4);
  const [fontSize, setFontSize] = useState(20);
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isCropping, setIsCropping] = useState(false);
  const [stepNumber, setStepNumber] = useState(1);

  const engineRef = useRef<ScreenshotEditorEngine | null>(null);

  useEffect(() => {
    loadScreenshotData();
  }, []);

  const loadScreenshotData = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams(window.location.search);
      const id = params.get('id');

      let item = id ? await getScreenshot(id) : undefined;

      // Fallback to most recent screenshot if id not found or omitted
      if (!item) {
        const recent = await getRecentScreenshots(1);
        if (recent.length > 0) {
          item = recent[0];
        }
      }

      if (!item) {
        setError('No screenshot found to edit. Please capture a screen first.');
        setLoading(false);
        return;
      }

      setScreenshotItem(item);
      const cleanHost = item.hostname.replace(/[^a-zA-Z0-9]/g, '_') || 'screenshot';
      setFilename(`${cleanHost}-${new Date(item.timestamp).toISOString().slice(0, 10)}.png`);
      setDimensions({ width: item.width, height: item.height });

      if (item.slices && item.slices.length > 0 && item.pageDim && !item.dataUrl) {
        setSlices(item.slices);
        setPageDim(item.pageDim);
      } else {
        setDataUrl(item.dataUrl);
      }
    } catch (err: any) {
      console.error('Failed to load screenshot data:', err);
      setError(err.message || 'Failed to load screenshot');
    } finally {
      setLoading(false);
    }
  };

  const handleEngineReady = (engine: ScreenshotEditorEngine) => {
    engineRef.current = engine;
    engine.onStateChange = (state: EditorState) => {
      setCanUndo(state.canUndo);
      setCanRedo(state.canRedo);
      setIsCropping(engine.isCropping);
      setStepNumber(state.stepNumber);
      if (engine.cropRect) {
        setDimensions({ width: engine.cropRect.width, height: engine.cropRect.height });
      }
    };
  };

  const handleDimensionsLoaded = (dims: { width: number; height: number }) => {
    setDimensions(dims);
  };

  const handleStitchComplete = async (stitchedDataUrl: string) => {
    setDataUrl(stitchedDataUrl);
    if (screenshotItem) {
      const updated: ScreenshotItem = {
        ...screenshotItem,
        dataUrl: stitchedDataUrl
      };
      await saveScreenshot(updated);
      setScreenshotItem(updated);
    }
  };

  const handleSelectTool = (tool: ToolType) => {
    setActiveTool(tool);
    if (engineRef.current) {
      engineRef.current.tool = tool;
      if (tool !== 'crop' && engineRef.current.isCropping) {
        engineRef.current.cancelCrop();
        setIsCropping(false);
      }
    }
  };

  const handleUndo = () => engineRef.current?.undo();
  const handleRedo = () => engineRef.current?.redo();
  const handleReset = () => {
    if (confirm('Revert all annotations and reset to original screenshot?')) {
      engineRef.current?.resetToOriginal();
      handleFitScreen();
    }
  };

  const handleApplyCrop = () => {
    if (engineRef.current) {
      engineRef.current.applyCrop();
      setIsCropping(false);
      setActiveTool('select');
      handleFitScreen();
    }
  };

  const handleCancelCrop = () => {
    if (engineRef.current) {
      engineRef.current.cancelCrop();
      setIsCropping(false);
      setActiveTool('select');
    }
  };

  const handleCopy = async (): Promise<boolean> => {
    if (!engineRef.current) return false;
    const exportedUrl = engineRef.current.exportImage();
    return await copyImageToClipboard(exportedUrl);
  };

  const handleDownload = () => {
    if (!engineRef.current) return;
    const exportedUrl = engineRef.current.exportImage();
    downloadScreenshot(exportedUrl, filename.endsWith('.png') ? filename : `${filename}.png`);
  };

  const handleFitScreen = useCallback(() => {
    if (!dimensions.width || !dimensions.height) return;
    const pad = 64;
    const availW = Math.max(200, window.innerWidth - pad);
    const availH = Math.max(200, window.innerHeight - 120 - pad); // subtracting header heights

    const fitW = availW / dimensions.width;
    const fitH = availH / dimensions.height;
    const fitFactor = Math.min(fitW, fitH, 1);

    const newZoom = Math.max(0.05, +fitFactor.toFixed(2));
    setZoom(newZoom);
  }, [dimensions]);

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.08, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  // Keyboard Shortcuts in Editor
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') {
        return;
      }

      const ctrlOrCmd = e.ctrlKey || e.metaKey;

      if (ctrlOrCmd && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) handleRedo();
        else handleUndo();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (ctrlOrCmd && e.key.toLowerCase() === 's') {
        e.preventDefault();
        handleDownload();
      } else if (e.key === 'Escape') {
        if (isCropping) handleCancelCrop();
      } else if (e.key === 'Enter') {
        if (isCropping) handleApplyCrop();
      } else if (e.key.toLowerCase() === 'v') {
        handleSelectTool('select');
      } else if (e.key.toLowerCase() === 'c') {
        handleSelectTool('crop');
      } else if (e.key.toLowerCase() === 'r') {
        handleSelectTool('rectangle');
      } else if (e.key.toLowerCase() === 'a') {
        handleSelectTool('arrow');
      } else if (e.key.toLowerCase() === 't') {
        handleSelectTool('text');
      } else if (e.key.toLowerCase() === 'b') {
        handleSelectTool('blur');
      } else if (e.key.toLowerCase() === 'p') {
        handleSelectTool('pen');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCropping, canUndo, canRedo]);

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-3" />
        <span className="text-sm font-medium">Loading screenshot editor...</span>
      </div>
    );
  }

  if (error || (!dataUrl && !slices)) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-950 p-6">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 text-center shadow-xl">
          <AlertCircle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-white mb-1">Screenshot Not Found</h2>
          <p className="text-xs text-slate-400 mb-5 leading-relaxed">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-950 overflow-hidden font-sans">
      <EditorToolbar
        filename={filename}
        onFilenameChange={setFilename}
        dimensions={dimensions}
        mode={screenshotItem?.mode}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        color={color}
        onChangeColor={setColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        fontSize={fontSize}
        onChangeFontSize={setFontSize}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onReset={handleReset}
        isCropping={isCropping}
        onApplyCrop={handleApplyCrop}
        onCancelCrop={handleCancelCrop}
        onCopy={handleCopy}
        onDownload={handleDownload}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onFitScreen={handleFitScreen}
        onResetZoom={handleResetZoom}
        onBack={handleBack}
        stepNumber={stepNumber}
      />

      <EditorCanvas
        dataUrl={dataUrl || undefined}
        slices={slices}
        pageDim={pageDim}
        activeTool={activeTool}
        color={color}
        strokeWidth={strokeWidth}
        fontSize={fontSize}
        zoom={zoom}
        onZoomChange={setZoom}
        onEngineReady={handleEngineReady}
        onDimensionsLoaded={handleDimensionsLoaded}
        onApplyCrop={handleApplyCrop}
        onCancelCrop={handleCancelCrop}
        isCropping={isCropping}
        onStitchComplete={handleStitchComplete}
      />
    </div>
  );
};
export default App;
