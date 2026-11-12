import { CropRect } from '../../types/screenshot';

export interface CropOptions {
  dataUrl: string;
  rect: CropRect;
  windowWidth: number;
  windowHeight: number;
  devicePixelRatio?: number;
}

/**
 * Crop a viewport screenshot to the requested rectangle with exact DPR mapping
 */
export async function cropViewportScreenshot(options: CropOptions): Promise<string> {
  const { dataUrl, rect, windowWidth, windowHeight } = options;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        // Compute exact physical coordinate scaling
        const scaleX = img.naturalWidth / windowWidth;
        const scaleY = img.naturalHeight / windowHeight;

        const sx = Math.max(0, Math.round(rect.x * scaleX));
        const sy = Math.max(0, Math.round(rect.y * scaleY));
        const sw = Math.min(img.naturalWidth - sx, Math.round(rect.width * scaleX));
        const sh = Math.min(img.naturalHeight - sy, Math.round(rect.height * scaleY));

        if (sw <= 0 || sh <= 0) {
          reject(new Error('Invalid crop dimensions'));
          return;
        }

        const canvas = document.createElement('canvas');
        canvas.width = sw;
        canvas.height = sh;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Could not get 2D canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // Draw cropped section
        ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

        resolve(canvas.toDataURL('image/png'));
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error('Failed to load image for cropping'));
    };

    img.src = dataUrl;
  });
}
