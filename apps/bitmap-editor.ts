import glyphNames from "../glyph-names";
import type { SystemContextObject } from "../init";
import { loadFile } from "../load-file";
import {
  type BinaryFont,
  FONT_GLYPH_COUNT,
  convertBinaryFontToDiskFormat,
  loadBinaryFrontFromDiskFormat as loadBinaryFontFromDiskFormat,
} from "../load-font";
import {
  loadBinaryDataFromLocalStorage,
  saveBinaryDataToLocalStorage,
} from "../local-storage";
import type { Manager } from "../manager";
import { type Point, type Rect, origin } from "../rect";
import saveFile from "../save-file";
import { type WindowsInterfaceDrawer, teal } from "../screen";
import BaseWidget from "../widgets/BaseWidget";
import type Button from "../widgets/Button";
import TextButton from "../widgets/TextButton";
import type Widget from "../widgets/Widget";
import type { WidgetEvent } from "../widgets/Widget";

export function bitmapEditorApplication(context: SystemContextObject): {
  draw: (mouseLocation: Point, mouseDownLocation?: Point) => void;
} {
  const { screen, drawer, screenWidth, screenHeight } = context;

  const application = new MyApplication(context.manager, context.font);
  context.manager.setApplicationWidget(application);

  function draw() {
    // Draw the "desktop" background
    screen.drawRect(0, 0, screenWidth, screenHeight, teal);
    drawer.drawWindow(4, 4, screenWidth - 8, screenHeight - 8);

    application.delegateDraw(drawer);
  }

  return { draw };
}

class GlyphGrid extends BaseWidget implements Widget {
  private static rows = 6;
  private static columns = 16;
  private font: DynamicValue<BinaryFont>;
  private currentGlyph: DynamicValue<number>;

  constructor(
    manager: Manager,
    location: Point,
    font: DynamicValue<BinaryFont>,
    currentGlyph: DynamicValue<number>
  ) {
    super(manager, {
      x: location.x,
      y: location.y,
      width: GlyphGrid.columns * 9 + 1,
      height: GlyphGrid.rows * 9 + 1,
    });
    this.font = font;
    this.currentGlyph = currentGlyph;
  }

  handleEvent(event: WidgetEvent): void {
    if (event.type === "mouse" && event.event === "down") {
      const x = Math.floor(event.location.x / 9);
      const y = Math.floor(event.location.y / 9);
      const gridSquareIndex = y * GlyphGrid.columns + x;
      const glyphNumber = gridSquareIndex - 1;
      if (glyphNumber < 0 || glyphNumber >= FONT_GLYPH_COUNT) {
        return;
      }
      this.currentGlyph.set(glyphNumber);
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    const boxColor = 4;
    const font = this.font.get();

    // Draw the right and bottom border of the grid
    ui.drawColumn(GlyphGrid.columns * 9, 0, GlyphGrid.rows * 9, boxColor);
    ui.drawRow(0, GlyphGrid.rows * 9, GlyphGrid.columns * 9, boxColor);

    // Draw BG to highlight the current glyph
    const currentGlyph = this.currentGlyph.get() + 1;
    const currentGlyphX = currentGlyph % GlyphGrid.columns;
    const currentGlyphY = Math.floor(currentGlyph / GlyphGrid.columns);

    ui.drawRect(currentGlyphX * 9 + 1, currentGlyphY * 9 + 1, 9, 9, 3);

    for (let y = 0; y < GlyphGrid.rows; y++) {
      for (let x = 0; x < GlyphGrid.columns; x++) {
        const glyphNumber = y * GlyphGrid.columns + x;
        const adjustedGlyphNumber = glyphNumber - 1;
        // Draw left border of the glyph's box
        ui.drawColumn(x * 9, y * 9, 9, boxColor);

        // Draw Top border of the glyph's box
        ui.drawRow(x * 9, y * 9, 9, boxColor);

        // Draw the glyph from the custom font data
        if (
          adjustedGlyphNumber >= 0 &&
          adjustedGlyphNumber < FONT_GLYPH_COUNT
        ) {
          const glyphOffset = adjustedGlyphNumber * font.fontHeight;
          for (let py = 0; py < font.fontHeight && py < 8; py++) {
            const rowByte = font.data[glyphOffset + py];
            for (let px = 0; px < 8; px++) {
              const bit = rowByte & (1 << (7 - px));
              if (bit) {
                ui.drawPixel(x * 9 + 1 + px, y * 9 + 1 + py, 0);
              }
            }
          }
        }
      }
    }
  }
}

class MyApplication extends BaseWidget implements Widget {
  private buttonPrev: Button;
  private buttonNext: Button;

  private buttonGlyphWidthPlus: Button;
  private buttonGlyphWidthMinus: Button;

  private buttonSaveFont: Button;
  private buttonLoadFont: Button;

  private buttonSaveFile: Button;
  private buttonLoadFile: Button;

  private canvas: BitmapEditorCanvas;
  private glyphGrid: GlyphGrid;
  private font: DynamicValue<BinaryFont>;
  private currentGlyph: DynamicValue<number> = new DynamicValue(0);

  private fontFileHandle: FileSystemFileHandle | null = null;

  constructor(manager: Manager, font: BinaryFont) {
    super(manager, { ...origin, ...manager.getScreenSize() });
    this.font = new DynamicValue(font);

    this.glyphGrid = new GlyphGrid(
      manager,
      { x: 102, y: 38 },
      this.font,
      this.currentGlyph
    );
    this.addWidget(this.glyphGrid);

    this.canvas = new BitmapEditorCanvas(
      manager,
      { x: 8, y: 8 },
      this.font,
      this.currentGlyph
    );
    this.addWidget(this.canvas);

    this.buttonPrev = new TextButton(manager, { x: 8, y: 100 }, "<", () => {
      this.currentGlyph.set(mod(this.currentGlyph.get() - 1, FONT_GLYPH_COUNT));
      console.log("Prev button pressed, new glyph", this.currentGlyph);
    });

    this.addWidget(this.buttonPrev);

    this.buttonNext = new TextButton(
      manager,
      { x: 8 + this.buttonPrev.rect.width, y: 100 },
      ">",
      () => {
        this.currentGlyph.set(
          mod(this.currentGlyph.get() + 1, FONT_GLYPH_COUNT)
        );
      }
    );
    this.addWidget(this.buttonNext);

    this.buttonGlyphWidthPlus = new TextButton(
      manager,
      {
        x: 8 + this.buttonPrev.rect.width + this.buttonNext.rect.width + 40,
        y: 100,
      },
      "+",
      () => {
        const font = this.font.get();
        if (font.type === "variable") {
          const glyphWidth = font.glyphWidths[this.currentGlyph.get()];
          const newWidth = clamp(glyphWidth + 1, 1, 8);
          font.glyphWidths[this.currentGlyph.get()] = newWidth;

          this.buttonGlyphWidthMinus.disabled = newWidth <= 1;
          this.buttonGlyphWidthPlus.disabled = newWidth >= 8;
        }
      }
    );
    this.addWidget(this.buttonGlyphWidthPlus);

    this.buttonGlyphWidthMinus = new TextButton(
      manager,
      {
        x: 96,
        y: 100,
      },
      "-",
      () => {
        const font = this.font.get();
        if (font.type === "variable") {
          const glyphWidth = font.glyphWidths[this.currentGlyph.get()];
          const newWidth = clamp(glyphWidth - 1, 1, 8);
          font.glyphWidths[this.currentGlyph.get()] = newWidth;

          this.buttonGlyphWidthMinus.disabled = newWidth <= 1;
          this.buttonGlyphWidthPlus.disabled = newWidth >= 8;
        }
      }
    );
    this.addWidget(this.buttonGlyphWidthMinus);

    // Initialize button states based on current glyph
    if (font.type === "variable") {
      const initialWidth = font.glyphWidths[this.currentGlyph.get()];
      this.buttonGlyphWidthMinus.disabled = initialWidth <= 1;
      this.buttonGlyphWidthPlus.disabled = initialWidth >= 8;
    }

    // Save font button
    this.buttonSaveFont = new TextButton(
      manager,
      { x: 8, y: 170 },
      "St",
      async () => {
        const font = this.font.get();
        const fontData = convertBinaryFontToDiskFormat(font);
        saveBinaryDataToLocalStorage("font", fontData);
      }
    );
    this.addWidget(this.buttonSaveFont);

    // Load font button
    this.buttonLoadFont = new TextButton(
      manager,
      { x: 30, y: 170 },
      "Ld",
      () => {
        const fontData = loadBinaryDataFromLocalStorage("font");
        if (fontData) {
          console.log(
            `Loaded font data from local storage (${fontData.length} bytes)`
          );
          const loadedFont = loadBinaryFontFromDiskFormat(fontData);
          this.font.set(loadedFont);
          console.log("Set the font to", this.font);
          ("");
        }
      }
    );
    this.addWidget(this.buttonLoadFont);

    this.buttonLoadFile = new TextButton(
      manager,
      { x: 60, y: 170 },
      "Load",
      async () => {
        try {
          const fontData = await loadFile();
          if (!fontData) {
            console.error("No font data loaded");
            return;
          }

          console.log(`Loaded font data from file (${fontData.length} bytes)`);
          const loadedFont = loadBinaryFontFromDiskFormat(fontData);
          this.font.set(loadedFont);
        } catch (err) {
          console.error("Error loading file:", err);
        }
      }
    );
    this.addWidget(this.buttonLoadFile);

    console.log("File handle", this.fontFileHandle);
    this.buttonSaveFile = new TextButton(
      manager,
      { x: 110, y: 170 },
      "Save",
      async () => {
        try {
          const fontData = convertBinaryFontToDiskFormat(this.font.get());
          await saveFile(fontData, "font.fontbin");
          console.log("Font saved successfully!");
        } catch (err) {
          console.error("Error saving file:", err);
        }
      }
    );
    this.addWidget(this.buttonSaveFile);

    const clockOffset = 8;
    const clockX = this.rect.width - CLOCK_WIDTH - clockOffset;
    const clockY = this.rect.height - CLOCK_HEIGHT - clockOffset;
    this.addWidget(new Clock(manager, { x: clockX, y: clockY }));

    // Update button states when glyph changes
    this.currentGlyph.onChange(() => {
      const font = this.font.get();
      if (font.type === "variable") {
        const glyphWidth = font.glyphWidths[this.currentGlyph.get()];
        this.buttonGlyphWidthMinus.disabled = glyphWidth <= 1;
        this.buttonGlyphWidthPlus.disabled = glyphWidth >= 8;
      }
    });
  }

  downloadCurrentFont() {
    const font = this.font.get();
    const fontDiskFile = convertBinaryFontToDiskFormat(font);
    return saveFile(fontDiskFile, "font.fontbin");
  }

  async uploadFontFromFile(): Promise<void> {
    const fontDiskFile = await loadFile();
    if (!fontDiskFile) {
      return;
    }
    const loadedFont = loadBinaryFontFromDiskFormat(fontDiskFile);
    this.font.set(loadedFont);
  }

  draw(ui: WindowsInterfaceDrawer) {
    const pangram = "Hark! Alas, the quick brown fox jumps over the lazy dog.";
    const headingX = 102;
    ui.drawText("Bitmap Font Editor", headingX, 8);
    ui.drawText(pangram, headingX, 16);
    ui.drawText(pangram.toUpperCase(), headingX, 24);
  }
}

type ValueListener<T> = (value: T) => void;
class DynamicValue<T> {
  private value: T;
  private eventListeners: ValueListener<T>[] = [];

  constructor(value: T) {
    this.value = value;
  }

  get() {
    return this.value;
  }

  onChange(listener: ValueListener<T>) {
    this.eventListeners.push(listener);
  }

  emit() {
    for (const listener of this.eventListeners) {
      listener(this.value);
    }
  }

  set(value: T) {
    this.value = value;
    this.emit();
  }
}

class BitmapEditorCanvas extends BaseWidget implements Widget {
  private readonly gridWidth = 8;
  private readonly gridHeight = 8;
  private readonly tileSize = 10;
  public currentGlyph: DynamicValue<number>;
  public font: DynamicValue<BinaryFont>;

  constructor(
    manager: Manager,
    location: Point,
    font: DynamicValue<BinaryFont>,
    currentGlyph: DynamicValue<number>
  ) {
    super(manager, { x: location.x, y: location.y, width: 0, height: 0 });
    this.rect.width = this.gridWidth * (this.tileSize + 1) + 4;
    this.rect.height = this.gridHeight * (this.tileSize + 1) + 4;
    this.font = font;
    this.font.onChange(() => {
      this.draw(manager.ui);
    });
    this.currentGlyph = currentGlyph;
    this.currentGlyph.onChange(() => {
      this.draw(manager.ui);
    });
  }

  handleEvent(event: WidgetEvent): void {
    const detail = "event" in event ? event.event : undefined;
    console.log("BitmapEditorCanvas handling event", event.type, detail);
    if (event.type === "mouse" && event.event === "down") {
      const x = Math.floor(event.location.x / (this.tileSize + 1));
      const y = Math.floor(event.location.y / (this.tileSize + 1));
      const index = y * this.gridWidth + x;

      const font = this.font.get();

      const rowByte = font.data[this.currentGlyph.get() * font.fontHeight + y];
      const bit = rowByte & (1 << (7 - x));
      const newByte = bit
        ? rowByte & ~(1 << (7 - x))
        : rowByte | (1 << (7 - x));
      font.data[this.currentGlyph.get() * font.fontHeight + y] = newByte;
    }
  }

  draw(ui: WindowsInterfaceDrawer): void {
    const font = this.font.get();
    const glyphGrid = convertGlyphToGrid(font, this.currentGlyph.get());
    this.drawGrid(ui, glyphGrid);
    // Draw the name of the current glyph
    const glyphName = glyphNames[this.currentGlyph.get()];
    ui.drawText(glyphName, 2, 118);

    // Draw the width of the current glyph
    if (font.type === "variable") {
      const glyphWidth = font.glyphWidths[this.currentGlyph.get()];
      ui.drawText(`Width: ${glyphWidth}`, 2, 128);
    }
    // Draw font height
    ui.drawText(`Height: ${font.fontHeight}`, 2, 138);
  }

  private drawGrid(ui: WindowsInterfaceDrawer, grid: number[]) {
    const backgroundColor = 4;
    ui.drawPanel(
      0,
      0,
      this.gridWidth * (this.tileSize + 1) + 4 - 1,
      this.gridHeight * (this.tileSize + 1) + 4 - 1
    );

    ui.drawRect(
      2,
      2,
      this.gridWidth * (this.tileSize + 1) - 1,
      this.gridHeight * (this.tileSize + 1) - 1,
      backgroundColor
    );

    for (let y = 0; y < this.gridHeight - 1; y++) {
      ui.drawRow(
        2,
        2 + (y + 1) * (this.tileSize + 1) - 1,
        this.gridWidth * (this.tileSize + 1) - 1,
        0
      );
    }

    for (let x = 0; x < this.gridWidth - 1; x++) {
      ui.drawColumn(
        2 + (x + 1) * (this.tileSize + 1) - 1,
        2,
        this.gridHeight * (this.tileSize + 1) - 1,
        0
      );
    }

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        const index = y * this.gridWidth + x;
        const color = grid[index];
        if (color !== backgroundColor) {
          ui.drawRect(
            2 + x * (this.tileSize + 1),
            2 + y * (this.tileSize + 1),
            this.tileSize,
            this.tileSize,
            color
          );
        }
      }
    }
  }

  drawSpriteFromGrid(ui: WindowsInterfaceDrawer, rect: Rect, sprite: number[]) {
    const { x, y, width, height } = rect;
    for (let i = 0; i < width * height; i++) {
      const spriteX = i % width;
      const spriteY = Math.floor(i / width);
      if (sprite[i]) {
        ui.drawPixel(x + spriteX, y + spriteY, 0);
      }
    }
  }
}

const CLOCK_WIDTH = 63;
const CLOCK_HEIGHT = 22;

class Clock extends BaseWidget {
  constructor(manager: Manager, location: Point) {
    const rect = { ...location, width: CLOCK_WIDTH, height: CLOCK_HEIGHT };
    super(manager, rect);
  }
  draw(ui: WindowsInterfaceDrawer): void {
    const now = new Date();
    let hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, "0");
    let amOrPm = "AM";
    if (hours > 12) {
      amOrPm = "PM";
      hours -= 12;
    }

    const timeString = `${hours}:${minutes} ${amOrPm}`;
    const textWidth = ui.calculateTextWidthBinary(timeString);

    ui.drawShallowPanel(0, 0, this.rect.width, this.rect.height);

    // center it inside of the rect
    const x = Math.round((this.rect.width - textWidth) / 2);

    ui.drawText(timeString, x, 7);
  }
}

function convertGlyphToGrid(font: BinaryFont, glyph: number): number[] {
  const grid: number[] = [];
  const glyphOffset = glyph * font.fontHeight;
  const glyphWidth =
    font.type === "variable" ? font.glyphWidths[glyph] : font.glyphWidth;
  for (let y = 0; y < font.fontHeight; y++) {
    const rowByte = font.data[glyphOffset + y];
    for (let x = 0; x < 8; x++) {
      const bit = rowByte & (1 << (7 - x));
      let color = bit ? 0 : 4;
      if (!bit && x >= glyphWidth) {
        color = 1;
      }
      if (bit && y >= font.fontHeight) {
        color = 3;
      }
      grid.push(color);
    }
  }
  return grid;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function mod(value: number, mod: number): number {
  return ((value % mod) + mod) % mod;
}
