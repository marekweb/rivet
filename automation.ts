/**
 * Playwright automation helpers for RetroOS
 * These functions abstract screen pixel coordinates to CSS/client coordinates
 */

export const SCREEN_WIDTH = 256;
export const SCREEN_HEIGHT = 192;
export const SCALE_FACTOR = 2;

/**
 * Get the canvas element and its bounding rectangle
 */
function getCanvasInfo() {
  const canvas = document.getElementById('screen') as HTMLCanvasElement;
  if (!canvas) {
    throw new Error('Canvas element with id "screen" not found');
  }
  const rect = canvas.getBoundingClientRect();
  return { canvas, rect };
}

/**
 * Convert screen pixel coordinates to CSS client coordinates
 * @param screenX - X coordinate in screen pixels (0-255)
 * @param screenY - Y coordinate in screen pixels (0-191)
 */
export function screenToClient(screenX: number, screenY: number): { clientX: number; clientY: number } {
  const { rect } = getCanvasInfo();
  return {
    clientX: rect.left + screenX * SCALE_FACTOR,
    clientY: rect.top + screenY * SCALE_FACTOR
  };
}

/**
 * Emit a mousedown event at screen coordinates
 * @param screenX - X coordinate in screen pixels (0-255)
 * @param screenY - Y coordinate in screen pixels (0-191)
 */
export function mouseDown(screenX: number, screenY: number): void {
  const { canvas } = getCanvasInfo();
  const { clientX, clientY } = screenToClient(screenX, screenY);

  console.log(`[Automation] Mouse down at screen coords (${screenX}, ${screenY}), client coords (${clientX}, ${clientY})`);

  const event = new MouseEvent('mousedown', {
    clientX,
    clientY,
    bubbles: true,
    button: 0
  });
  canvas.dispatchEvent(event);
}

/**
 * Emit a mouseup event at screen coordinates
 * @param screenX - X coordinate in screen pixels (0-255)
 * @param screenY - Y coordinate in screen pixels (0-191)
 */
export function mouseUp(screenX: number, screenY: number): void {
  const { canvas } = getCanvasInfo();
  const { clientX, clientY } = screenToClient(screenX, screenY);

  console.log(`[Automation] Mouse up at screen coords (${screenX}, ${screenY}), client coords (${clientX}, ${clientY})`);

  const event = new MouseEvent('mouseup', {
    clientX,
    clientY,
    bubbles: true,
    button: 0
  });
  canvas.dispatchEvent(event);
}

/**
 * Emit a mousemove event at screen coordinates
 * @param screenX - X coordinate in screen pixels (0-255)
 * @param screenY - Y coordinate in screen pixels (0-191)
 */
export function mouseMove(screenX: number, screenY: number): void {
  const { canvas } = getCanvasInfo();
  const { clientX, clientY } = screenToClient(screenX, screenY);

  const event = new MouseEvent('mousemove', {
    clientX,
    clientY,
    bubbles: true
  });
  canvas.dispatchEvent(event);
}

/**
 * Emit a complete click (mousedown + mouseup) at screen coordinates
 * @param screenX - X coordinate in screen pixels (0-255)
 * @param screenY - Y coordinate in screen pixels (0-191)
 * @param delay - Optional delay in ms between down and up (default: 50)
 */
export async function click(screenX: number, screenY: number, delay = 50): Promise<void> {
  mouseDown(screenX, screenY);

  if (delay > 0) {
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  mouseUp(screenX, screenY);
}

/**
 * Emit a drag from one screen position to another
 * @param startX - Starting X coordinate in screen pixels
 * @param startY - Starting Y coordinate in screen pixels
 * @param endX - Ending X coordinate in screen pixels
 * @param endY - Ending Y coordinate in screen pixels
 * @param steps - Number of intermediate mousemove events (default: 10)
 * @param stepDelay - Delay between each step in ms (default: 10)
 */
export async function drag(
  startX: number,
  startY: number,
  endX: number,
  endY: number,
  steps = 10,
  stepDelay = 10
): Promise<void> {
  mouseDown(startX, startY);

  // Emit intermediate mousemove events
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const x = Math.round(startX + (endX - startX) * t);
    const y = Math.round(startY + (endY - startY) * t);

    mouseMove(x, y);

    if (stepDelay > 0) {
      await new Promise(resolve => setTimeout(resolve, stepDelay));
    }
  }

  mouseUp(endX, endY);
}

/**
 * Helper to expose these functions to the global window object for Playwright
 * Call this in your test setup to make functions available in browser context
 */
export function installAutomationHelpers(): void {
  (window as any).automation = {
    mouseDown,
    mouseUp,
    mouseMove,
    click,
    drag,
    screenToClient,
    SCREEN_WIDTH,
    SCREEN_HEIGHT,
    SCALE_FACTOR
  };
  console.log('[Automation] Helpers installed on window.automation');
}
