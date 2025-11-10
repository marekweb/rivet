import type { SystemContextObject } from "../init";
import type { Manager } from "../manager";
import { type Point, isInRect } from "../rect";
import {
  type WindowsInterfaceDrawer,
  black,
  darkBlue,
  darkGray,
  lightGray,
  mediumGray,
  teal,
  white,
} from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import type Widget from "../widgets/Widget";
import type { WidgetEvent } from "../widgets/Widget";

export function bitmapPixelEditorApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new BitmapPixelEditorApplication(context.manager);
  context.manager.setApplicationWidget(application);

  function draw() {
    // Draw the "desktop" background
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);

    application.delegateDraw(drawer);
  }

  return { draw };
}

class BitmapPixelEditorApplication extends BaseWidget implements Widget {
  private bitmap: number[][] = []; // 16x16 grid of color indices (0-3)
  private selectedColor = 1; // Currently selected color index
  private pixelSize = 8; // Size of each pixel in the editor
  private gridStartX = 10;
  private gridStartY = 20;

  constructor(manager: Manager) {
    super(manager, { x: 10, y: 10, width: 220, height: 180 });

    // Initialize empty 16x16 bitmap
    for (let y = 0; y < 16; y++) {
      this.bitmap[y] = [];
      for (let x = 0; x < 16; x++) {
        this.bitmap[y][x] = 0; // Start with transparent/white
      }
    }
  }

  handleEvent(event: WidgetEvent): void {
    if (event.type === "mouse") {
      const gridWidth = 16 * this.pixelSize;
      const gridHeight = 16 * this.pixelSize;
      const paletteX = this.gridStartX + 16 * this.pixelSize + 20;
      const paletteY = this.gridStartY;

      if (event.event === "down") {
        // Check if clicking in the bitmap canvas
        if (
          isInRect(event.location, {
            x: this.gridStartX,
            y: this.gridStartY,
            width: gridWidth,
            height: gridHeight,
          })
        ) {
          this.manager.requestCapture(this);
          this.paintPixel(event.location);
        }

        // Check if clicking in the palette
        for (let i = 0; i < 4; i++) {
          if (
            isInRect(event.location, {
              x: paletteX,
              y: paletteY + i * 20,
              width: 16,
              height: 16,
            })
          ) {
            this.selectedColor = i;
            break;
          }
        }
      } else if (event.event === "move") {
        // Continue painting while dragging (only if mouse is pressed)
        if (
          this.manager.getMousePressed() &&
          isInRect(event.location, {
            x: this.gridStartX,
            y: this.gridStartY,
            width: gridWidth,
            height: gridHeight,
          })
        ) {
          this.paintPixel(event.location);
        }
      } else if (event.event === "up") {
        this.manager.releaseCapture();
      }
    }
  }

  private paintPixel(location: Point): void {
    // Calculate which pixel was clicked/dragged over
    const pixelX = Math.floor((location.x - this.gridStartX) / this.pixelSize);
    const pixelY = Math.floor((location.y - this.gridStartY) / this.pixelSize);

    if (pixelX >= 0 && pixelX < 16 && pixelY >= 0 && pixelY < 16) {
      this.bitmap[pixelY][pixelX] = this.selectedColor;
    }
  }

  private getScreenColorFromIndex(index: number): number {
    // Map 2bpp color indices to screen palette colors
    switch (index) {
      case 0:
        return white; // Transparent/White
      case 1:
        return black; // Black
      case 2:
        return darkGray; // Gray
      case 3:
        return lightGray; // Light Gray
      default:
        return white;
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    // Draw main window
    ui.drawWindow(0, 0, this.rect.width, this.rect.height);

    // Draw title bar
    const titleBarX = 3;
    const titleBarY = 3;
    const titleBarWidth = this.rect.width - 6;
    const titleBarHeight = 14;
    ui.drawRect(titleBarX, titleBarY, titleBarWidth, titleBarHeight, darkBlue);
    ui.drawText(
      "Bitmap Pixel Editor",
      titleBarX + 4,
      titleBarY + 3,
      undefined,
      undefined,
      white,
      true
    );

    // Draw bitmap canvas
    const gridWidth = 16 * this.pixelSize;
    const gridHeight = 16 * this.pixelSize;

    // Draw canvas background with inset panel border
    ui.drawPanel(
      this.gridStartX - 2,
      this.gridStartY - 2,
      gridWidth + 4,
      gridHeight + 4
    );

    // Draw all 256 pixels from bitmap data
    for (let y = 0; y < 16; y++) {
      for (let x = 0; x < 16; x++) {
        const pixelX = this.gridStartX + x * this.pixelSize;
        const pixelY = this.gridStartY + y * this.pixelSize;
        const colorIndex = this.bitmap[y][x];
        const screenColor = this.getScreenColorFromIndex(colorIndex);

        // Draw 7x7 pixel squares with 1px gap for grid lines
        ui.drawRect(
          pixelX,
          pixelY,
          this.pixelSize - 1,
          this.pixelSize - 1,
          screenColor
        );
      }
    }

    // Draw horizontal and vertical grid separators
    for (let i = 1; i <= 16; i++) {
      // Draw vertical grid lines between columns
      ui.drawColumn(
        this.gridStartX + i * this.pixelSize - 1,
        this.gridStartY,
        gridHeight,
        darkGray
      );
      // Draw horizontal grid lines between rows
      ui.drawRow(
        this.gridStartX,
        this.gridStartY + i * this.pixelSize - 1,
        gridWidth,
        darkGray
      );
    }

    // Draw palette widget
    const paletteX = this.gridStartX + gridWidth + 20;
    const paletteY = this.gridStartY;

    for (let i = 0; i < 4; i++) {
      const colorY = paletteY + i * 20;
      const screenColor = this.getScreenColorFromIndex(i);

      // Draw color swatch button
      if (i === this.selectedColor) {
        ui.drawButtonPressed(paletteX, colorY, 16, 16);
      } else {
        ui.drawButton(paletteX, colorY, 16, 16);
      }
      ui.drawRect(paletteX + 2, colorY + 2, 12, 12, screenColor);
    }

    // Draw current selection indicator
    ui.drawText(
      `Selected: ${this.selectedColor}`,
      paletteX,
      paletteY + 90,
      undefined,
      undefined,
      black
    );
  }
}
