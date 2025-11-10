import {
  type BinaryFont,
  type BlittableFont,
  FONT_GLYPH_END,
  FONT_GLYPH_START,
  drawGlyphFromBinaryFont,
} from "./load-font";

type GlyphSetType = "reduced-alpha" | "full-ascii" | "full-ascii-extended";

const GLYPH_SET_TYPE: GlyphSetType = "full-ascii";

export class FontDrawer {
  private screen: CanvasScreen;
  private font: BlittableFont;

  constructor(screen: CanvasScreen, font: BlittableFont) {
    this.screen = screen;
    this.font = font;
  }
}

class StackedDrawer {
  private stack: { x: number; y: number }[] = [];

  pushTransform(x: number, y: number): void {
    const currentTransform = this.getCurrentTransform();
    this.stack.push({ x: x + currentTransform.x, y: y + currentTransform.y });
  }

  popTransform(): void {
    this.stack.pop();
  }

  getCurrentTransform(): { x: number; y: number } {
    return this.stack[this.stack.length - 1] || { x: 0, y: 0 };
  }

  applyTransform(x: number, y: number): { x: number; y: number } {
    const currentTransform = this.getCurrentTransform();
    return { x: x + currentTransform.x, y: y + currentTransform.y };
  }

  clear(): void {
    this.stack = [];
  }
}

export class CanvasScreen extends StackedDrawer {
  private ctx: CanvasRenderingContext2D;
  constructor(ctx: CanvasRenderingContext2D) {
    super();
    this.ctx = ctx;
  }
  private color(color: number): void {
    this.ctx.fillStyle = palette[color];
  }

  private canvasFillRect(
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    width = Math.floor(width);
    height = Math.floor(height);
    const t = this.applyTransform(x, y);
    this.ctx.fillRect(t.x, t.y, width, height);
  }

  drawPixel(x: number, y: number, color: number): void {
    this.color(color);
    this.canvasFillRect(x, y, 1, 1);
  }

  drawRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ): void {
    x = Math.floor(x);
    y = Math.floor(y);
    width = Math.floor(width);
    height = Math.floor(height);
    this.color(color);
    this.canvasFillRect(x, y, width, height);
  }
  /**
   * Draw a horizontal line
   */
  drawRow(x: number, y: number, width: number, color: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    width = Math.floor(width);
    this.color(color);
    this.canvasFillRect(x, y, width, 1);
  }
  /**
   * Draw a vertical line
   */
  drawColumn(x: number, y: number, height: number, color: number): void {
    x = Math.floor(x);
    y = Math.floor(y);
    height = Math.floor(height);
    this.color(color);
    this.canvasFillRect(x, y, 1, height);
  }
  drawBox(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number
  ): void {
    this.color(color);
    this.canvasFillRect(x, y, width, 1);
    this.canvasFillRect(x, y + height - 1, width, 1);
    this.canvasFillRect(x, y, 1, height);
    this.canvasFillRect(x + width - 1, y, 1, height);
  }

  /**
   * Draw a dithered (checkerboard) pattern. Draws the primary color in a checkerboard
   * pattern. Optionally fills the background with a second color.
   * @param color - The color for the checkerboard pattern
   * @param color2 - Optional background fill color. If omitted, transparent.
   */
  drawDitheredRect(
    x: number,
    y: number,
    width: number,
    height: number,
    color: number,
    color2?: number
  ): void {
    if (color2 !== undefined) {
      this.color(color2);
      this.canvasFillRect(x, y, width, height);
    }
    for (let i = 0; i < width; i++) {
      for (let j = 0; j < height; j++) {
        if ((i + j) % 2 === 0) {
          this.drawPixel(x + i, y + j, color);
        }
      }
    }
  }

  /**
   * Draw (aka blit) a rect (defined as rect in the source at sx,sy & sw,sh) to
   * the screen at x,y.
   */
  drawBitmap(
    source: HTMLImageElement,
    x: number,
    y: number,
    sx: number,
    sy: number,
    sw: number,
    sh: number
  ) {
    this.ctx.drawImage(source, sx, sy, sw, sh, x, y, sw, sh);
  }
}

export const palette = [
  "#000000", // Black
  "#808080", // Dark Gray
  "#c0c0c0", // Medium Gray
  "#dfdfdf", // Light Gray
  "#FFFFFF", // White
  "#008080",
  "#FF0000",
  "#000080", // Dark Blue
];

export const black = 0;
export const darkGray = 1;
export const mediumGray = 2;
export const lightGray = 3;
export const white = 4;
export const teal = 5;
export const red = 6;
export const darkBlue = 7;

export class WindowsInterfaceDrawer extends CanvasScreen {
  private font2: BinaryFont;
  constructor(ctx: CanvasRenderingContext2D, font2: BinaryFont) {
    super(ctx);
    this.font2 = font2;
  }

  public drawWindow(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, lightGray);
    this.drawColumn(x, y, h - 1, lightGray);
    this.drawRow(x, y + h - 1, w, black);
    this.drawColumn(x + w - 1, y, h, black);
    this.drawRow(x + 1, y + 1, w - 2, white);
    this.drawColumn(x + 1, y + 1, h - 2, white);
    this.drawRow(x + 1, y + h - 2, w - 2, darkGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, darkGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawButton(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, white);
    this.drawColumn(x, y, h - 1, white);
    this.drawRow(x, y + h - 1, w, black);
    this.drawColumn(x + w - 1, y, h, black);
    this.drawRow(x + 1, y + 1, w - 2, lightGray);
    this.drawColumn(x + 1, y + 1, h - 2, lightGray);
    this.drawRow(x + 1, y + h - 2, w - 2, darkGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, darkGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawButtonPressed(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, black);
    this.drawColumn(x, y, h - 1, black);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);
    this.drawRow(x + 1, y + 1, w - 2, darkGray);
    this.drawColumn(x + 1, y + 1, h - 2, darkGray);
    this.drawRow(x + 1, y + h - 2, w - 2, lightGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, lightGray);
    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawShallowPanel(x: number, y: number, w: number, h: number) {
    this.drawRow(x, y, w - 1, darkGray);
    this.drawColumn(x, y, h - 1, darkGray);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);

    this.drawRect(x + 2, y + 2, w - 4, h - 4, mediumGray);
  }

  public drawPanel(
    x: number,
    y: number,
    w: number,
    h: number,
    backgroundColor?: number
  ) {
    this.drawRow(x, y, w - 1, darkGray);
    this.drawColumn(x, y, h - 1, darkGray);
    this.drawRow(x, y + h - 1, w, white);
    this.drawColumn(x + w - 1, y, h, white);
    this.drawRow(x + 1, y + 1, w - 2, black);
    this.drawColumn(x + 1, y + 1, h - 2, black);
    this.drawRow(x + 1, y + h - 2, w - 2, lightGray);
    this.drawColumn(x + w - 2, y + 1, h - 2, lightGray);
    if (backgroundColor !== undefined) {
      this.drawRect(x + 2, y + 2, w - 4, h - 4, backgroundColor);
    }
  }

  // Drawing bold text is done by doubling the glyph on the x axis with a
  // 1-pixel offset in the same color.
  drawGlyphBold(glyph: number, x: number, y: number, color: number): number {
    const glyphWidth = this.drawGlyphBinary(glyph, x, y, color);
    this.drawGlyphBinary(glyph, x + 1, y, color);
    // Bold glyph is 1 pixel wider
    return glyphWidth + 1;
  }

  private getGlyphPixelWidth(glyph: number): number {
    if (this.font2.type === "monospace") {
      return this.font2.glyphWidth;
    }
    return this.font2.glyphWidths[glyph] ?? 0;
  }

  calculateTextWidthBinary(
    text: string,
    letterSpacing = 1,
    wordSpacing = 4,
    bold = false
  ): number {
    let accumulatedWidth = 0;
    let previousWasGlyph = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === " ") {
        accumulatedWidth += wordSpacing;
        previousWasGlyph = false;
        continue;
      }

      const glyph = convertAsciiToGlyph(char.charCodeAt(0));
      if (glyph === -1) {
        continue;
      }

      const glyphWidth = this.getGlyphPixelWidth(glyph) + (bold ? 1 : 0);
      const spacing = previousWasGlyph ? letterSpacing : 0;
      accumulatedWidth += spacing + glyphWidth;
      previousWasGlyph = true;
    }

    return accumulatedWidth;
  }

  drawGlyphBinary(glyph: number, x: number, y: number, color: number): number {
    return drawGlyphFromBinaryFont(this.font2, glyph, x, y, color, this);
  }

  drawTextBinary(
    text: string,
    x: number,
    y: number,
    letterSpacing = 1,
    wordSpacing = 4,
    color = 0,
    bold = false
  ): number {
    let currentX = x;
    let previousWasGlyph = false;

    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);
      if (c === 32) {
        currentX += wordSpacing;
        previousWasGlyph = false;
        continue;
      }
      const glyph = convertAsciiToGlyph(c);
      if (glyph === -1) {
        continue;
      }

      if (previousWasGlyph) {
        currentX += letterSpacing;
      }

      let glyphWidth: number;
      if (bold) {
        glyphWidth = this.drawGlyphBold(glyph, currentX, y, color);
      } else {
        glyphWidth = this.drawGlyphBinary(glyph, currentX, y, color);
      }

      currentX += glyphWidth;
      previousWasGlyph = true;
    }

    return currentX - x;
  }

  drawTextBlock(
    text: string,
    x: number,
    y: number,
    lineSpacing?: number,
    options: {
      letterSpacing?: number;
      wordSpacing?: number;
      color?: number;
      bold?: boolean;
    } = {}
  ): { width: number; height: number } {
    const {
      letterSpacing = 1,
      wordSpacing = 4,
      color = 0,
      bold = false,
    } = options;
    const lines = text.split("\n");
    let totalWidth = 0;
    let totalHeight = 0;
    const lineHeight = this.font2.fontHeight + (lineSpacing || 0);
    for (const line of lines) {
      const lineWidth = this.drawTextBinary(
        line,
        x,
        y + totalHeight,
        letterSpacing,
        wordSpacing,
        color,
        bold
      );
      totalWidth = Math.max(totalWidth, lineWidth);
      totalHeight += lineHeight;
    }

    return { width: totalWidth, height: totalHeight };
  }

  drawText(
    text: string,
    x: number,
    y: number,
    letterSpacing?: number,
    wordSpacing?: number,
    color?: number,
    bold?: boolean
  ): number {
    return this.drawTextBinary(
      text,
      x,
      y,
      letterSpacing,
      wordSpacing,
      color,
      bold
    );
  }

  /**
   * Draw a string with optional max width constraint.
   * Returns the actual width drawn.
   *
   * @param text - The text to draw
   * @param x - X coordinate
   * @param y - Y coordinate
   * @param maxWidth - Optional maximum width. If provided, stops drawing when next glyph would exceed this width.
   * @param letterSpacing - Spacing between letters (default: 1)
   * @param wordSpacing - Spacing for space characters (default: 4)
   * @param color - Text color (default: 0/black)
   * @param bold - Whether to draw bold text (default: false)
   * @returns The actual width drawn
   */
  drawString(
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
    letterSpacing = 1,
    wordSpacing = 4,
    color = 0,
    bold = false
  ): number {
    if (maxWidth === undefined) {
      return this.drawTextBinary(text, x, y, letterSpacing, wordSpacing, color, bold);
    }

    if (maxWidth <= 0) {
      return 0;
    }

    let currentX = x;
    let accumulatedWidth = 0;
    let previousWasGlyph = false;

    for (let i = 0; i < text.length; i++) {
      const c = text.charCodeAt(i);

      if (c === 32) {
        const nextWidth = accumulatedWidth + wordSpacing;
        if (nextWidth > maxWidth) {
          break;
        }
        accumulatedWidth = nextWidth;
        currentX += wordSpacing;
        previousWasGlyph = false;
        continue;
      }

      const glyph = convertAsciiToGlyph(c);
      if (glyph === -1) {
        continue;
      }

      const spacing = previousWasGlyph ? letterSpacing : 0;
      const glyphWidth = this.getGlyphPixelWidth(glyph) + (bold ? 1 : 0);

      if (accumulatedWidth + spacing + glyphWidth > maxWidth) {
        break;
      }

      currentX += spacing;
      accumulatedWidth += spacing;

      if (bold) {
        this.drawGlyphBold(glyph, currentX, y, color);
      } else {
        this.drawGlyphBinary(glyph, currentX, y, color);
      }

      currentX += glyphWidth;
      accumulatedWidth += glyphWidth;
      previousWasGlyph = true;
    }

    return accumulatedWidth;
  }

  getFontHeight(): number {
    return this.font2.fontHeight;
  }

  /**
   * Draw multiline text with support for \n newlines and optional word wrapping.
   * Returns the total width and height of the drawn text.
   */
  drawMultilineText(
    text: string,
    x: number,
    y: number,
    maxWidth?: number,
    letterSpacing = 1,
    wordSpacing = 4,
    lineSpacing = 2,
    color = 0,
    bold = false
  ): { width: number; height: number } {
    const lineHeight = this.getFontHeight() + lineSpacing;
    let lineNumber = 0;
    let maxLineWidth = 0;

    const paragraphs = text.split('\n');

    for (const paragraph of paragraphs) {
      if (maxWidth === undefined) {
        const width = this.drawString(paragraph, x, y + lineNumber * lineHeight, undefined, letterSpacing, wordSpacing, color, bold);
        maxLineWidth = Math.max(maxLineWidth, width);
        lineNumber++;
      } else {
        const words = paragraph.split(' ');
        let currentLine = '';

        for (let i = 0; i < words.length; i++) {
          const word = words[i];
          const testLine = currentLine ? `${currentLine} ${word}` : word;
          const testWidth = this.calculateTextWidthBinary(testLine, letterSpacing, wordSpacing, bold);

          if (testWidth <= maxWidth) {
            currentLine = testLine;
          } else {
            if (currentLine) {
              const width = this.drawString(currentLine, x, y + lineNumber * lineHeight, maxWidth, letterSpacing, wordSpacing, color, bold);
              maxLineWidth = Math.max(maxLineWidth, width);
              lineNumber++;
            }
            currentLine = word;
          }
        }

        if (currentLine) {
          const width = this.drawString(currentLine, x, y + lineNumber * lineHeight, maxWidth, letterSpacing, wordSpacing, color, bold);
          maxLineWidth = Math.max(maxLineWidth, width);
          lineNumber++;
        }
      }
    }

    const totalHeight = lineNumber * lineHeight;
    return { width: maxLineWidth, height: totalHeight };
  }

  drawTextClamped(
    text: string,
    x: number,
    y: number,
    maxWidth: number,
    letterSpacing?: number,
    wordSpacing?: number,
    color?: number,
    bold?: boolean
  ): number {
    if (maxWidth <= 0) {
      return 0;
    }

    const truncated = this.truncateTextToWidth(
      text,
      maxWidth,
      letterSpacing ?? 1,
      wordSpacing ?? 4,
      bold ?? false
    );

    if (!truncated) {
      return 0;
    }

    return this.drawText(
      truncated,
      x,
      y,
      letterSpacing,
      wordSpacing,
      color,
      bold
    );
  }

  truncateTextToWidth(
    text: string,
    maxWidth: number,
    letterSpacing = 1,
    wordSpacing = 4,
    bold = false
  ): string {
    if (maxWidth <= 0) {
      return "";
    }

    let accumulatedWidth = 0;
    let previousWasGlyph = false;
    let truncated = "";

    for (let i = 0; i < text.length; i++) {
      const char = text[i];

      if (char === " ") {
        const nextWidth = accumulatedWidth + wordSpacing;
        if (nextWidth > maxWidth) {
          break;
        }
        truncated += char;
        accumulatedWidth = nextWidth;
        previousWasGlyph = false;
        continue;
      }

      const glyph = convertAsciiToGlyph(char.charCodeAt(0));
      if (glyph === -1) {
        continue;
      }

      const glyphWidth = this.getGlyphPixelWidth(glyph) + (bold ? 1 : 0);
      const spacing = previousWasGlyph ? letterSpacing : 0;
      if (accumulatedWidth + spacing + glyphWidth > maxWidth) {
        break;
      }

      accumulatedWidth += spacing + glyphWidth;
      truncated += char;
      previousWasGlyph = true;
    }

    return truncated;
  }
}

function convertToLetterGlyph(char: number): number {
  // Bitwise AND with ~32 converts lowercase to uppercase efficiently
  const upperChar = char & ~32;

  // Single range check for uppercase A-Z (65-90)
  if (upperChar >= 65 && upperChar <= 90) {
    return upperChar - 65;
  }

  return -1;
}

function convertAsciiToGlyph(char: number): number {
  if (char >= FONT_GLYPH_START && char <= FONT_GLYPH_END) {
    return char - 33;
  }
  return -1;
}
