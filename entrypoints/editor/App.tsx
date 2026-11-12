import React, { useEffect, useState, useRef } from 'react';
import { EditorToolbar } from '../../components/editor/EditorToolbar';
import { EditorCanvas } from '../../components/editor/EditorCanvas';
import { ToolType, ScreenshotEditorEngine, EditorState } from '../../features/editor/canvas-engine';
import { getScreenshot, getRecentScreenshots } from '../../services/db';
import { downloadScreenshot, copyImageToClipboard } from '../../services/downloads';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';

export const App: React.FC = () => {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [filename, setFilename] = useState('screenshot.png');
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [activeTool, setActiveTool] = useState<ToolType>('select');
  const [color, setColor] = useState('#ef4444');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [zoom, setZoom] = useState(1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [isCropping, setIsCropping] = useState(false);

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

      setDataUrl(item.dataUrl);
      const cleanHost = item.hostname.replace(/[^a-zA-Z0-9]/g, '_') || 'screenshot';
      setFilename(`${cleanHost}-${new Date(item.timestamp).toISOString().slice(0, 10)}.png`);
      setDimensions({ width: item.width, height: item.height });
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
      if (engine.cropRect) {
        setDimensions({ width: engine.cropRect.width, height: engine.cropRect.height });
      }
    };
  };

  const handleDimensionsLoaded = (dims: { width: number; height: number }) => {
    setDimensions(dims);
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

  const handleApplyCrop = () => {
    if (engineRef.current) {
      engineRef.current.applyCrop();
      setIsCropping(false);
      setActiveTool('select');
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

  const handleZoomIn = () => setZoom((z) => Math.min(3, +(z + 0.15).toFixed(2)));
  const handleZoomOut = () => setZoom((z) => Math.max(0.2, +(z - 0.15).toFixed(2)));
  const handleResetZoom = () => setZoom(1);

  const handleBack = () => {
    if (window.history.length > 1) {
      window.history.back();
    } else {
      window.close();
    }
  };

  if (loading) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-3" />
        <span className="text-sm font-medium">Loading screenshot editor...</span>
      </div>
    );
  }

  if (error || !dataUrl) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 p-6">
        <div className="max-w-md w-full bg-white border border-slate-200 rounded-2xl p-6 text-center shadow-sm">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <h2 className="text-base font-semibold text-slate-900 mb-1">Screenshot Not Found</h2>
          <p className="text-xs text-slate-500 mb-5 leading-relaxed">{error}</p>
          <button
            onClick={handleBack}
            className="inline-flex items-center space-x-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Go Back</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-slate-100 overflow-hidden font-sans">
      <EditorToolbar
        filename={filename}
        onFilenameChange={setFilename}
        dimensions={dimensions}
        activeTool={activeTool}
        onSelectTool={handleSelectTool}
        color={color}
        onChangeColor={setColor}
        strokeWidth={strokeWidth}
        onChangeStrokeWidth={setStrokeWidth}
        canUndo={canUndo}
        canRedo={canRedo}
        onUndo={handleUndo}
        onRedo={handleRedo}
        isCropping={isCropping}
        onApplyCrop={handleApplyCrop}
        onCancelCrop={handleCancelCrop}
        onCopy={handleCopy}
        onDownload={handleDownload}
        zoom={zoom}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onResetZoom={handleResetZoom}
        onBack={handleBack}
      />

      <EditorCanvas
        dataUrl={dataUrl}
        activeTool={activeTool}
        color={color}
        strokeWidth={strokeWidth}
        zoom={zoom}
        onEngineReady={handleEngineReady}
        onDimensionsLoaded={handleDimensionsLoaded}
      />
    </div>
  );
};
export default App;
