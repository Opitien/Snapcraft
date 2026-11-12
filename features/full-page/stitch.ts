import { ScrollStep, PageDimensions } from './scroll-controller';

export interface SliceData {
  step: ScrollStep;
  dataUrl: string;
}

// Maximum dimensions supported safely by modern browser Canvas implementations
const MAX_CANVAS_DIMENSION = 32767;
const MAX_CANVAS_AREA = 268435456; // 16384 * 16384

/**
 * Load image from dataUrl asynchronously
 */
function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image slice'));
    img.src = dataUrl;
  });
}

/**
 * Stitch multiple captured viewport slices into a single continuous full-page screenshot
 */
export async function stitchSlices(
  slices: SliceData[],
  pageDim: PageDimensions
): Promise<string> {
  if (slices.length === 0) {
    throw new Error('No image slices provided for stitching');
  }

  // Load first image to determine device pixel scale
  const firstImg = await loadImage(slices[0].dataUrl);
  const scaleX = firstImg.naturalWidth / pageDim.viewportWidth;
  const scaleY = firstImg.naturalHeight / pageDim.viewportHeight;

  let physicalWidth = firstImg.naturalWidth;
  let physicalHeight = Math.round(pageDim.totalHeight * scaleY);

  // If single slice
  if (slices.length === 1) {
    return slices[0].dataUrl;
  }

  // Handle canvas limit boundaries safely
  let downscale = 1;
  if (physicalHeight > MAX_CANVAS_DIMENSION) {
    downscale = MAX_CANVAS_DIMENSION / physicalHeight;
  }
  if (physicalWidth * downscale * physicalHeight * downscale > MAX_CANVAS_AREA) {
    downscale = Math.min(downscale, Math.sqrt(MAX_CANVAS_AREA / (physicalWidth * physicalHeight)));
  }

  const finalWidth = Math.floor(physicalWidth * downscale);
  const finalHeight = Math.floor(physicalHeight * downscale);

  const canvas = document.createElement('canvas');
  canvas.width = finalWidth;
  canvas.height = finalHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Failed to create 2D canvas context for stitching');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Stitch each slice onto the canvas
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const img = i === 0 ? firstImg : await loadImage(slice.dataUrl);

    const { step } = slice;

    if (step.isLast && step.overlapY > 0) {
      // Overlapping last slice
      const sourceOffsetY = Math.round(step.overlapY * scaleY);
      const sourceHeight = img.naturalHeight - sourceOffsetY;

      const destX = 0;
      const destY = Math.round((step.y + step.overlapY) * scaleY * downscale);
      const destW = finalWidth;
      const destH = Math.round(sourceHeight * downscale);

      if (sourceHeight > 0) {
        ctx.drawImage(
          img,
          0,
          sourceOffsetY,
          img.naturalWidth,
          sourceHeight,
          destX,
          destY,
          destW,
          destH
        );
      }
    } else {
      // Normal slice
      const destX = 0;
      const destY = Math.round(step.y * scaleY * downscale);
      const destW = finalWidth;
      const destH = Math.round(img.naturalHeight * downscale);

      ctx.drawImage(
        img,
        0,
        0,
        img.naturalWidth,
        img.naturalHeight,
        destX,
        destY,
        destW,
        destH
      );
    }
  }

  return canvas.toDataURL('image/png');
}
