const { test, expect } = require('@playwright/test');

test('verify game mechanics', async ({ page }) => {
  await page.goto('http://localhost:8080');

  // Wait for game to load
  await page.waitForSelector('#app', { state: 'visible', timeout: 30000 });

  // Wait a bit for animations/init
  await page.waitForTimeout(2000);

  await page.screenshot({ path: 'verify_initial.png' });

  // Try to drag a card
  // We don't know the exact positions of cards because they are shuffled,
  // but we can try to find one by its texture if possible, or just click at stack positions.

  // Stack positions from Game.js:
  // { x: -300, y: -400 }, { x: 300, y: -400 },
  // { x: -300, y: 400 }, { x: 300, y: 400 }
  // These are relative to mainContainer center.

  const width = page.viewportSize().width;
  const height = page.viewportSize().height;
  const centerX = width / 2;
  const centerY = height / 2;

  // Estimate screen positions based on scaling
  // Assuming 720x1280 base size
  const scale = Math.min(width / 720, height / 1280);

  const stack1X = centerX - 300 * scale;
  const stack1Y = centerY - 400 * scale;

  const edibleZoneY = centerY - 180 * scale;
  const nonEdibleZoneY = centerY + 180 * scale;

  console.log(`Dragging from ${stack1X},${stack1Y} to ${centerX},${edibleZoneY}`);

  // Perform drag
  await page.mouse.move(stack1X, stack1Y);
  await page.mouse.down();
  await page.mouse.move(centerX, edibleZoneY, { steps: 10 });
  await page.waitForTimeout(500);
  await page.mouse.up();

  await page.waitForTimeout(1000);
  await page.screenshot({ path: 'verify_after_drag.png' });
});
