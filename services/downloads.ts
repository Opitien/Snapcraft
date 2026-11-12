/**
 * Trigger file download for an image data URL
 */
export async function downloadScreenshot(
  dataUrl: string,
  filename = `screenshot-${new Date().toISOString().replace(/[:.]/g, '-')}.png`
): Promise<number | undefined> {
  // If chrome.downloads API is available
  if (typeof chrome !== 'undefined' && chrome.downloads) {
    try {
      const downloadId = await chrome.downloads.download({
        url: dataUrl,
        filename: filename,
        saveAs: false,
      });
      return downloadId;
    } catch (err) {
      console.warn('chrome.downloads failed, falling back to anchor download:', err);
    }
  }

  // Fallback to DOM anchor tag download
  if (typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }
}

/**
 * Copy image data URL to system clipboard
 */
export async function copyImageToClipboard(dataUrl: string): Promise<boolean> {
  try {
    // Convert base64 dataUrl to Blob
    const res = await fetch(dataUrl);
    const blob = await res.blob();

    // ClipboardItem API requires image/png
    let pngBlob = blob;
    if (blob.type !== 'image/png') {
      pngBlob = await convertBlobToPng(blob);
    }

    if (navigator.clipboard && typeof ClipboardItem !== 'undefined') {
      const item = new ClipboardItem({ 'image/png': pngBlob });
      await navigator.clipboard.write([item]);
      return true;
    }
    return false;
  } catch (err) {
    console.error('Failed to copy image to clipboard:', err);
    return false;
  }
}

/**
 * Helper to convert any image blob into a PNG blob
 */
function convertBlobToPng(blob: Blob): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Canvas 2D context not available'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Failed to create PNG blob'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(blob);
  });
}
