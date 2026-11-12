import test from 'node:test';
import assert from 'node:assert/strict';

// Test 1: Restricted URLs checker
function isRestrictedUrl(url) {
  if (!url) return false;
  return (
    url.startsWith('chrome://') ||
    url.startsWith('chrome-extension://') ||
    url.startsWith('edge://') ||
    url.startsWith('about:') ||
    url.startsWith('view-source:') ||
    url.includes('chrome.google.com/webstore') ||
    url.includes('chromewebstore.google.com')
  );
}

test('isRestrictedUrl correctly identifies protected and standard URLs', () => {
  assert.equal(isRestrictedUrl('chrome://extensions/'), true);
  assert.equal(isRestrictedUrl('chrome-extension://abcdef/popup.html'), true);
  assert.equal(isRestrictedUrl('about:blank'), true);
  assert.equal(isRestrictedUrl('edge://settings'), true);
  assert.equal(isRestrictedUrl('https://chromewebstore.google.com/detail/123'), true);
  assert.equal(isRestrictedUrl('https://chrome.google.com/webstore/category/extensions'), true);

  // Standard web pages should NOT be restricted
  assert.equal(isRestrictedUrl('https://github.com/'), false);
  assert.equal(isRestrictedUrl('https://news.ycombinator.com/'), false);
  assert.equal(isRestrictedUrl('http://localhost:3000/'), false);
  assert.equal(isRestrictedUrl('https://en.wikipedia.org/wiki/Main_Page'), false);
});

// Test 2: Full-Page Scroll Plan calculation with overlap handling
function calculateScrollPlan(dim) {
  const steps = [];
  const { totalHeight, viewportHeight } = dim;

  if (totalHeight <= viewportHeight) {
    return [{
      index: 0,
      totalSteps: 1,
      y: 0,
      isLast: true,
      overlapY: 0
    }];
  }

  let currentY = 0;
  let stepIndex = 0;

  while (currentY < totalHeight) {
    const isLast = currentY + viewportHeight >= totalHeight;
    const targetY = isLast ? Math.max(0, totalHeight - viewportHeight) : currentY;
    const overlapY = (stepIndex > 0 && isLast) ? (currentY - targetY) : 0;

    steps.push({
      index: stepIndex,
      totalSteps: 0,
      y: targetY,
      isLast,
      overlapY
    });

    if (isLast) break;
    currentY += viewportHeight;
    stepIndex++;
  }

  const total = steps.length;
  steps.forEach((s) => (s.totalSteps = total));
  return steps;
}

test('calculateScrollPlan for single viewport (no scroll needed)', () => {
  const plan = calculateScrollPlan({ totalHeight: 600, viewportHeight: 800 });
  assert.equal(plan.length, 1);
  assert.equal(plan[0].y, 0);
  assert.equal(plan[0].isLast, true);
  assert.equal(plan[0].overlapY, 0);
});

test('calculateScrollPlan for exact multiple viewports (no overlap)', () => {
  const plan = calculateScrollPlan({ totalHeight: 2000, viewportHeight: 1000 });
  assert.equal(plan.length, 2);
  assert.equal(plan[0].y, 0);
  assert.equal(plan[0].isLast, false);
  assert.equal(plan[0].overlapY, 0);

  assert.equal(plan[1].y, 1000);
  assert.equal(plan[1].isLast, true);
  assert.equal(plan[1].overlapY, 0);
});

test('calculateScrollPlan for partial viewport at bottom (with calculated overlap)', () => {
  const plan = calculateScrollPlan({ totalHeight: 2500, viewportHeight: 1000 });
  assert.equal(plan.length, 3);

  // Step 0: 0..1000
  assert.equal(plan[0].y, 0);
  assert.equal(plan[0].isLast, false);
  assert.equal(plan[0].overlapY, 0);

  // Step 1: 1000..2000
  assert.equal(plan[1].y, 1000);
  assert.equal(plan[1].isLast, false);
  assert.equal(plan[1].overlapY, 0);

  // Step 2: scrolled to bottom (2500 - 1000 = 1500)
  // Overlap is (2000 - 1500) = 500px!
  assert.equal(plan[2].y, 1500);
  assert.equal(plan[2].isLast, true);
  assert.equal(plan[2].overlapY, 500);
});

// Test 3: Area Crop Coordinate Scaling with DPR
function computeCropCoordinates(rect, windowWidth, windowHeight, imgWidth, imgHeight) {
  const scaleX = imgWidth / windowWidth;
  const scaleY = imgHeight / windowHeight;

  const sx = Math.max(0, Math.round(rect.x * scaleX));
  const sy = Math.max(0, Math.round(rect.y * scaleY));
  const sw = Math.min(imgWidth - sx, Math.round(rect.width * scaleX));
  const sh = Math.min(imgHeight - sy, Math.round(rect.height * scaleY));

  return { sx, sy, sw, sh, scaleX, scaleY };
}

test('computeCropCoordinates with 1x DPR', () => {
  const rect = { x: 100, y: 150, width: 400, height: 300 };
  const coords = computeCropCoordinates(rect, 1920, 1080, 1920, 1080);

  assert.equal(coords.sx, 100);
  assert.equal(coords.sy, 150);
  assert.equal(coords.sw, 400);
  assert.equal(coords.sh, 300);
});

test('computeCropCoordinates with 2x Retina DPR', () => {
  const rect = { x: 100, y: 150, width: 400, height: 300 };
  const coords = computeCropCoordinates(rect, 1920, 1080, 3840, 2160);

  assert.equal(coords.scaleX, 2);
  assert.equal(coords.scaleY, 2);
  assert.equal(coords.sx, 200);
  assert.equal(coords.sy, 300);
  assert.equal(coords.sw, 800);
  assert.equal(coords.sh, 600);
});

test('computeCropCoordinates clamps bounds at right/bottom edges', () => {
  const rect = { x: 1800, y: 1000, width: 300, height: 200 };
  const coords = computeCropCoordinates(rect, 1920, 1080, 1920, 1080);

  assert.equal(coords.sx, 1800);
  assert.equal(coords.sy, 1000);
  assert.equal(coords.sw, 120); // 1920 - 1800 = 120 clamped
  assert.equal(coords.sh, 80);  // 1080 - 1000 = 80 clamped
});
