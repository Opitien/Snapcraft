import { ScreenshotItem } from '../types/screenshot';

const DB_NAME = 'SnapCraftScreenshotsDB';
const DB_VERSION = 1;
const STORE_NAME = 'screenshots';

/**
 * Open or create IndexedDB database instance
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('timestamp', 'timestamp', { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Save screenshot item to IndexedDB
 */
export async function saveScreenshot(item: ScreenshotItem): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(item);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get screenshot by ID
 */
export async function getScreenshot(id: string): Promise<ScreenshotItem | undefined> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);

    request.onsuccess = () => resolve(request.result as ScreenshotItem | undefined);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get list of recent screenshots sorted by timestamp descending
 */
export async function getRecentScreenshots(limit = 10): Promise<ScreenshotItem[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor(null, 'prev'); // descending order

    const results: ScreenshotItem[] = [];
    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && results.length < limit) {
        results.push(cursor.value);
        cursor.continue();
      } else {
        resolve(results);
      }
    };

    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete a screenshot by ID
 */
export async function deleteScreenshot(id: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Clear all screenshots from IndexedDB
 */
export async function clearAllScreenshots(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

/**
 * Generate a compressed thumbnail dataURL for fast popup loading
 */
export async function generateThumbnail(dataUrl: string, maxDimension = 320): Promise<string> {
  // DOM context (Editor, Content Script, Popup)
  if (typeof Image !== 'undefined' && typeof document !== 'undefined') {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
        const targetW = Math.max(1, Math.round(img.width * scale));
        const targetH = Math.max(1, Math.round(img.height * scale));

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'medium';
        ctx.drawImage(img, 0, 0, targetW, targetH);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  // Service Worker context (OffscreenCanvas & createImageBitmap)
  if (typeof OffscreenCanvas !== 'undefined' && typeof createImageBitmap !== 'undefined') {
    try {
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const bitmap = await createImageBitmap(blob);

      const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
      const targetW = Math.max(1, Math.round(bitmap.width * scale));
      const targetH = Math.max(1, Math.round(bitmap.height * scale));

      const offscreen = new OffscreenCanvas(targetW, targetH);
      const ctx = offscreen.getContext('2d');
      if (!ctx) return dataUrl;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'medium';
      ctx.drawImage(bitmap, 0, 0, targetW, targetH);

      const thumbBlob = await offscreen.convertToBlob({ type: 'image/jpeg', quality: 0.8 });
      const buffer = await thumbBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return `data:image/jpeg;base64,${btoa(binary)}`;
    } catch (err) {
      console.warn('Offscreen thumbnail generation fallback:', err);
    }
  }

  return dataUrl;
}
