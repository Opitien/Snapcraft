import { CaptureMode, CropRect } from './screenshot';

export type ExtensionMessageType =
  | 'PING'
  | 'PONG'
  | 'CAPTURE_VISIBLE'
  | 'START_AREA_CAPTURE'
  | 'AREA_SELECTED'
  | 'AREA_CANCELLED'
  | 'START_FULL_PAGE_CAPTURE'
  | 'FULL_PAGE_PROGRESS'
  | 'FULL_PAGE_CANCEL'
  | 'CAPTURE_VIEWPORT_SLICE'
  | 'SAVE_SCREENSHOT_AND_OPEN'
  | 'OPEN_EDITOR'
  | 'GET_PAGE_INFO';

export interface BaseMessage<T extends ExtensionMessageType = ExtensionMessageType, P = unknown> {
  type: T;
  payload?: P;
}

export interface PingMessage extends BaseMessage<'PING'> {}
export interface PongMessage extends BaseMessage<'PONG'> {
  payload: { ready: boolean };
}

export interface CaptureVisibleMessage extends BaseMessage<'CAPTURE_VISIBLE'> {
  payload?: { tabId?: number };
}

export interface StartAreaCaptureMessage extends BaseMessage<'START_AREA_CAPTURE'> {
  payload?: { tabId?: number };
}

export interface AreaSelectedPayload {
  rect: CropRect;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio: number;
  url: string;
  title: string;
}

export interface AreaSelectedMessage extends BaseMessage<'AREA_SELECTED', AreaSelectedPayload> {}
export interface AreaCancelledMessage extends BaseMessage<'AREA_CANCELLED'> {}

export interface StartFullPageCaptureMessage extends BaseMessage<'START_FULL_PAGE_CAPTURE'> {
  payload?: { tabId?: number };
}

export interface FullPageProgressPayload {
  step: number;
  totalSteps: number;
  percentage: number;
}

export interface FullPageProgressMessage extends BaseMessage<'FULL_PAGE_PROGRESS', FullPageProgressPayload> {}
export interface FullPageCancelMessage extends BaseMessage<'FULL_PAGE_CANCEL'> {}

export interface CaptureViewportSliceMessage extends BaseMessage<'CAPTURE_VIEWPORT_SLICE'> {
  payload?: {
    y?: number;
    x?: number;
    isLast?: boolean;
  };
}

export interface SaveScreenshotPayload {
  mode: CaptureMode;
  dataUrl: string;
  width: number;
  height: number;
  title: string;
  url: string;
  hostname: string;
  devicePixelRatio: number;
}

export interface SaveScreenshotAndOpenMessage extends BaseMessage<'SAVE_SCREENSHOT_AND_OPEN', SaveScreenshotPayload> {}

export interface OpenEditorMessage extends BaseMessage<'OPEN_EDITOR', { screenshotId: string }> {}

export type ExtensionMessage =
  | PingMessage
  | PongMessage
  | CaptureVisibleMessage
  | StartAreaCaptureMessage
  | AreaSelectedMessage
  | AreaCancelledMessage
  | StartFullPageCaptureMessage
  | FullPageProgressMessage
  | FullPageCancelMessage
  | CaptureViewportSliceMessage
  | SaveScreenshotAndOpenMessage
  | OpenEditorMessage;
