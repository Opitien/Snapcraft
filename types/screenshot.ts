export type CaptureMode = 'visible' | 'full-page' | 'area';

export interface ScreenshotDimensions {
  width: number;
  height: number;
}

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface ScreenshotItem {
  id: string;
  dataUrl: string;
  thumbnailUrl: string;
  title: string;
  url: string;
  hostname: string;
  width: number;
  height: number;
  devicePixelRatio: number;
  timestamp: number;
  mode: CaptureMode;
}

export interface ScreenshotMetadata {
  id: string;
  title: string;
  url: string;
  hostname: string;
  width: number;
  height: number;
  timestamp: number;
  mode: CaptureMode;
  thumbnailUrl: string;
}

export interface ExtensionSettings {
  imageFormat: 'png' | 'jpeg';
  jpegQuality: number;
  saveHistory: boolean;
  maxHistoryItems: number;
  openEditorAfterCapture: boolean;
  autoCopyAfterCapture: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: ExtensionSettings = {
  imageFormat: 'png',
  jpegQuality: 0.92,
  saveHistory: true,
  maxHistoryItems: 10,
  openEditorAfterCapture: true,
  autoCopyAfterCapture: false,
  theme: 'system'
};
