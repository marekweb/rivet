import { type BinaryBitmap, renderBitmapToCanvas } from "./bitmap";
import { type BinaryFont, loadBinaryFrontFromDiskFormat } from "./load-font";
import { loadBinaryDataFromLocalStorage } from "./local-storage";
import { Manager } from "./manager";
import { type Point } from "./rect";
import {
  CanvasScreen,
  WindowsInterfaceDrawer,
  black,
  darkGray,
} from "./screen";

const SCALE_FACTOR = 2;
export const WIDTH = 256;
export const HEIGHT = 192;

export interface SystemContextObject {
  screen: CanvasScreen;
  drawer: WindowsInterfaceDrawer;
  screenWidth: number;
  screenHeight: number;
  manager: Manager;
  font: BinaryFont;
}

export type ApplicationFunction = (context: SystemContextObject) => {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
};

// Retro 90s GUI style cursor palette (4 colors for 2bpp)
const CURSOR_PALETTE: [number, number, number][] = [
  [255, 255, 255], // White
  [0, 0, 0], // Black
  [128, 128, 128], // Gray
  [0, 0, 0], // Black (duplicate)
];

export function init(
  canvasElementId: string,
  application: ApplicationFunction,
  fallbackFont?: BinaryFont,
  cursorBitmap?: BinaryBitmap
) {
  const canvas = document.getElementById(canvasElementId) as HTMLCanvasElement;
  canvas.style.width = `${WIDTH * SCALE_FACTOR}px`;
  canvas.style.height = `${HEIGHT * SCALE_FACTOR}px`;
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not get canvas context");
  }

  // Create virtual canvas for UI content
  const virtualCanvas = document.createElement("canvas");
  virtualCanvas.width = WIDTH;
  virtualCanvas.height = HEIGHT;
  const virtualCtx = virtualCanvas.getContext("2d");
  if (!virtualCtx) {
    throw new Error("Could not get virtual canvas context");
  }

  const screen = new CanvasScreen(virtualCtx);

  let binaryFont: BinaryFont | undefined;
  const savedFontBinary = loadBinaryDataFromLocalStorage("font");
  if (savedFontBinary) {
    binaryFont = loadBinaryFrontFromDiskFormat(savedFontBinary);
  }
  if (!binaryFont) {
    if (fallbackFont) {
      binaryFont = fallbackFont;
    } else {
      alert("Please load a font.");
      throw new Error("No font loaded. Please load a font from the menu.");
    }
  }

  const drawer = new WindowsInterfaceDrawer(virtualCtx, binaryFont);
  let mouseLocation = { x: 0, y: 0 };
  let previousMouseLocation = { x: 0, y: 0 };
  let mouseDownLocation: { x: number; y: number } | undefined;

  const manager = new Manager(drawer);

  function getScreenCoordinates(event: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    const x = Math.floor((event.clientX - rect.left) / SCALE_FACTOR);
    const y = Math.floor((event.clientY - rect.top) / SCALE_FACTOR);
    return { x, y };
  }

  const contextObject: SystemContextObject = {
    screen,
    drawer,
    screenHeight: HEIGHT,
    screenWidth: WIDTH,
    manager,
    font: binaryFont,
  };
  const { draw: applicationDraw } = application(contextObject);

  // Render cursor to canvas for blitting (with transparency)
  let cursorCanvas: HTMLCanvasElement | undefined;
  if (cursorBitmap) {
    cursorCanvas = renderBitmapToCanvas(cursorBitmap, CURSOR_PALETTE, 0); // 0 = transparent
  }

  // Track if UI needs redrawing
  let uiDirty = true;

  function drawUI() {
    // Clear virtual canvas
    virtualCtx?.clearRect(0, 0, WIDTH, HEIGHT);

    // Draw application UI to virtual canvas
    applicationDraw(mouseLocation, mouseDownLocation);

    // If a modal is present, draw it on top of the application
    const modalWidget = manager.getModalWidget();
    if (modalWidget) {
      // Draw dimmed overlay (transparent dither - only pattern color, no background fill)
      screen.drawDitheredRect(0, 0, WIDTH, HEIGHT, black);

      const modalDrawer = new WindowsInterfaceDrawer(virtualCtx!, binaryFont);
      modalWidget.delegateDraw(modalDrawer);
    }

    uiDirty = false;
  }

  function drawCursor() {
    // Copy virtual canvas to real canvas
    ctx?.clearRect(0, 0, WIDTH, HEIGHT);
    ctx?.drawImage(virtualCanvas, 0, 0);

    // Draw cursor on real canvas if available
    if (cursorCanvas) {
      ctx?.drawImage(cursorCanvas, mouseLocation.x, mouseLocation.y);
    }
  }

  function draw() {
    if (uiDirty) {
      drawUI();
    }
    drawCursor();
  }

  // Initial draw
  draw();

  canvas.addEventListener("mousedown", (event) => {
    mouseDownLocation = getScreenCoordinates(event);

    manager.emitEvent({
      type: "mouse",
      location: mouseDownLocation,
      button: event.button,
      event: "down",
    });

    uiDirty = true;
    draw();
  });

  canvas.addEventListener("mousemove", (event) => {
    previousMouseLocation = { ...mouseLocation };
    mouseLocation = getScreenCoordinates(event);

    manager.emitEvent({
      type: "mouse",
      location: mouseLocation,
      previousLocation: previousMouseLocation,
      event: "move",
    });

    // Only redraw cursor, not full UI
    drawCursor();
  });

  canvas.addEventListener("mouseup", (event) => {
    if (!mouseDownLocation) {
      return;
    }

    const mouseUpLocation = getScreenCoordinates(event);
    mouseDownLocation = undefined;

    manager.emitEvent({
      type: "mouse",
      location: mouseUpLocation,
      button: event.button,
      event: "up",
    });

    uiDirty = true;
    draw();
  });

  window.addEventListener("keydown", (event) => {
    manager.emitEvent({
      type: "key",
      key: event.keyCode,
      event: "down",
    });

    const printable =
      event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey;

    if (printable) {
      manager.emitEvent({
        type: "typed",
        char: event.key,
      });
      event.preventDefault();
    }

    uiDirty = true;
    draw();
  });
}
