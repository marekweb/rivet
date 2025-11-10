import { loadImage } from "./load-image";

export const FONT_GLYPH_START = 33;
export const FONT_GLYPH_END = 127;
export const FONT_GLYPH_COUNT = FONT_GLYPH_END - FONT_GLYPH_START;

export interface BlittableFont {
  image: HTMLImageElement;
  glyphIndexes: number[];
}

/**
 * Load a bitmap font image from a url. The top row of the image is used to
 * determine the width of each glyph. This row is transparent, except for
 * non-transparent pixels that are markers for the start of each glyph.
 */
export default async function loadFont(url: string): Promise<BlittableFont> {
  const image = await loadImage(url);
  const glyphIndexes = [0];
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas getContext('2d') failed.");
  }
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  for (let x = 0; x < image.width; x++) {
    const alpha = imageData.data[x * 4 + 3];
    if (alpha !== 0) {
      glyphIndexes.push(x + 1);
    }
  }

  return {
    image,
    glyphIndexes,
  };
}

export type BinaryFont = VariableBinaryFont | MonospaceBinaryFont;

export interface VariableBinaryFont {
  type: "variable";
  fontHeight: number;
  glyphWidths: number[];
  data: Uint8Array;
}
export interface MonospaceBinaryFont {
  type: "monospace";
  fontHeight: number;
  glyphWidth: number;
  data: Uint8Array;
}

/*
 * Returns the width of the glyph drawn. Uses the provided drawer (dependency injection)
 * to draw the glyph. The drawer must implement the drawPixel method.
 */
export function drawGlyphFromBinaryFont(
  font: BinaryFont,
  glyph: number,
  x: number,
  y: number,
  color: number,
  drawer: { drawPixel(x: number, y: number, color: number): void }
): number {
  x = Math.floor(x);
  y = Math.floor(y);
  if (font.type === "monospace") {
    drawGlyphFromBuffer(
      font.data,
      glyph * font.fontHeight,
      font.glyphWidth,
      font.fontHeight,
      x,
      y,
      color,
      drawer
    );
    return font.glyphWidth;
  }

  if (font.type === "variable") {
    const width = font.glyphWidths[glyph];
    drawGlyphFromBuffer(
      font.data,
      glyph * font.fontHeight,
      width,
      font.fontHeight,
      x,
      y,
      color,
      drawer
    );
    return width;
  }
  throw new Error("Unknown font type");
}

function getImageDataFromHtmlImageElement(image: HTMLImageElement): ImageData {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas getContext('2d') failed.");
  }
  ctx.drawImage(image, 0, 0);
  return ctx.getImageData(0, 0, image.width, image.height);
}

export function createBinaryFontFromImage(image: HTMLImageElement): BinaryFont {
  // For now, this can only create variable fonts. Even if all of the characters have the same width.
  const glyphOffsets: number[] = [];
  const glyphWidths: number[] = [];
  let fontHeight = image.height - 1; // the top row is the glyph markers, so we account for it.

  if (fontHeight < 1) {
    throw new Error("Font height must be at least 1");
  }

  if (fontHeight > 8) {
    fontHeight = 8;
  }
  const imageData = getImageDataFromHtmlImageElement(image);

  let lastOffset = 0;
  for (let x = 0; x < image.width; x++) {
    const alpha = imageData.data[x * 4 + 3];
    if (alpha !== 0) {
      glyphOffsets.push(lastOffset);
      let width = x - lastOffset;
      if (width === 0) {
        throw new Error("Glyph has zero width");
      }
      if (width > 8) {
        width = 8;
      }
      glyphWidths.push(width);
      lastOffset = x + 1;
    }
  }
  // Final glyph
  glyphOffsets.push(lastOffset);
  glyphWidths.push(image.width - lastOffset);

  const data = new Uint8Array(FONT_GLYPH_COUNT * fontHeight);
  // Now we can populate the array. If alpha is zero, set bit to zero, otherwise set bit to 1.
  for (let i = 0; i < FONT_GLYPH_COUNT; i++) {
    const offset = glyphOffsets[i];
    const width = glyphWidths[i];
    // y is in the image and we have to skip the first row, which has the markers.
    for (let y = 0; y < fontHeight; y++) {
      for (let x = 0; x < width; x++) {
        const sy = y + 1;
        const alpha = imageData.data[(sy * image.width + (offset + x)) * 4 + 3];
        if (alpha !== 0) {
          const byteIndex = i * fontHeight + y;
          data[byteIndex] |= 1 << (7 - x);
        }
      }
    }
  }

  return {
    type: "variable",
    fontHeight,
    glyphWidths,
    data,
  };
}

export function drawGlyphFromBuffer(
  font: Uint8Array,
  offset: number,
  glyphWidth: number,
  glyphHeight: number,
  x: number,
  y: number,
  color: number,
  drawer: { drawPixel(x: number, y: number, color: number): void }
) {
  // for each row of height
  for (let j = 0; j < glyphHeight; j++) {
    // for each column of width
    const rowByte = font[offset + j];
    for (let i = 0; i < glyphWidth; i++) {
      const bit = rowByte & (1 << (7 - i));
      if (bit) {
        drawer.drawPixel(x + i, y + j, color);
      }
    }
  }
}

export function loadBinaryFrontFromDiskFormat(data: Uint8Array): BinaryFont {
  const type = data[0] === 0 ? "monospace" : "variable";
  const fontHeight = data[1];
  const glyphCount = data[2];

  console.log("Loaded font so far", {
    type,
    fontHeight,
    glyphCount,
  });
  if (glyphCount !== FONT_GLYPH_COUNT) {
    throw new Error(
      `Font glyph count is ${glyphCount}, expected ${FONT_GLYPH_COUNT}`
    );
  }

  const glyphDataSize = fontHeight * glyphCount;

  const glyphData = data.slice(3, 3 + glyphDataSize);

  if (type === "monospace") {
    return {
      type: "monospace",
      fontHeight,
      glyphWidth: 8,
      data: glyphData,
    };
  }
  const glyphWidths = data.slice(
    3 + glyphDataSize,
    3 + glyphDataSize + glyphCount
  );
  return {
    type: "variable",
    fontHeight,
    glyphWidths: Array.from(glyphWidths),
    data: glyphData,
  };
}

export function convertBinaryFontToDiskFormat(font: BinaryFont): Uint8Array {
  // Determine total size of the buffer
  const glyphDataSize =
    font.type === "monospace"
      ? font.fontHeight * FONT_GLYPH_COUNT
      : font.fontHeight * FONT_GLYPH_COUNT; // total bytes for glyph data

  const glyphWidthsSize = font.type === "variable" ? FONT_GLYPH_COUNT : 0; // total bytes for glyph widths

  const totalSize = 1 + 1 + 1 + glyphDataSize + glyphWidthsSize; // Type (1 byte) + Height (1 byte) + Glyph Count (1 byte) + Glyph Data + Glyph Widths

  // Create the output buffer
  const buffer = new Uint8Array(totalSize);

  // Write the header
  buffer[0] = font.type === "monospace" ? 0 : 1; // Font type: 0 = Monospace, 1 = Variable
  buffer[1] = font.fontHeight; // Font height
  buffer[2] = FONT_GLYPH_COUNT; // Number of glyphs

  // Write glyph data
  buffer.set(font.data, 3); // Start writing data after header

  // Write glyph widths (if variable font)
  if (font.type === "variable") {
    const glyphWidthsOffset = 3 + glyphDataSize; // Calculate offset for glyph widths
    buffer.set(font.glyphWidths, glyphWidthsOffset);
  }

  return buffer;
}

// Font format
// Font type/version (1 byte)
// 0: Monospace
// 1: Variable
// Font height (1 byte)
// G: Number of glyphs (1 byte) normally 94
// Array[G*H]: Glyph data (H bytes each)
// Array[G]: Glyph widths (1 byte each) (only for variable fonts)
