export type Rect = Point & Size;

export interface Point {
  x: number;
  y: number;
}

export interface Size {
  width: number;
  height: number;
}

export const origin: Point = { x: 0, y: 0 };

export function isInRect(point: Point, rect: Rect): boolean {
  return (
    point.x >= rect.x &&
    point.x < rect.x + rect.width &&
    point.y >= rect.y &&
    point.y < rect.y + rect.height
  );
}

/**
 * Check if a rect is fully contained within another rect. Returns true if both
 * rects are the same size.
 */
export function isRectContained(inner: Rect, outer: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y >= outer.y &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

export function rectIntersects(rect1: Rect, rect2: Rect): boolean {
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
 * Normalize a rect relative to the screen, such that if the location is negative then it means
 * that the rect's right or bottom edge is that many pixels from the right or bottom edge of the screen.
 * So for example, if the screen is 100x100 and the rect is { x: -10, y: -10, width: 20, height: 20 } then
 * the rect's right edge is 10 pixels from the right and its bottom edge is 10 pixels from the bottom edge of the screen.
 */
export function normalizeRect(rect: Rect, screen: Size): Rect {
  if (rect.x < 0) {
    rect.x = screen.width + rect.x - rect.width;
  }
  if (rect.y < 0) {
    rect.y = screen.height + rect.y - rect.height;
  }
  return rect;
}
/*
 * Center a rect horizontally within a container rect. Returns the x coordinate
 * of the left edge of the rect.
 */
export function centerHorizontally(rect: Size, container: Rect): number {
  return Math.floor(container.x + (container.width - rect.width) / 2);
}
/**
 * Center a rect vertically within a container rect. Returns the y coordinate
 * of the top edge of the rect.
 */
export function centerVertically(rect: Size, container: Rect): number {
  return Math.floor(container.y + (container.height - rect.height) / 2);
}

/**
 * Center a rect within a container rect. Returns the x and y coordinates
 * of the top left corner of the rect.
 */
export function centerRect(rect: Size, container: Rect): Point {
  return {
    x: centerHorizontally(rect, container),
    y: centerVertically(rect, container),
  };
}
