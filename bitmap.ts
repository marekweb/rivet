/**
 * Binary bitmap format loader and serializer
 */

/** Supported modes: 0 = 1bpp (2 colors), 1 = 2bpp (4 colors), 2 = 4bpp (16 colors) */
export type BitmapMode = 0 | 1 | 2;

/**
 * In-memory representation of a binary bitmap.
 */
export interface BinaryBitmap {
  version: number;
  mode: BitmapMode;
  width: number;
  height: number;
  /**
   * Raw pixel buffer: bit-packed values, length = ceil(width * bpp / 8) * height
   */
  data: Uint8Array;
}

/**
 * Load a BinaryBitmap from a disk format Uint8Array.
 * Layout:
 * [0]: version (high nibble) | mode (low nibble)
 * [1]: width  (1–256)
 * [2]: height (1–256)
 * [3...]: pixel data, bit-packed (ignores extra bytes, pads missing as zero)
 */
export function loadBinaryBitmapFromDiskFormat(data: Uint8Array): BinaryBitmap {
  if (data.length < 3) {
    throw new Error(`Buffer too small (${data.length} bytes)`);
  }

  const header = data[0];
  const version = header >> 4;
  const mode = (header & 0x0f) as BitmapMode;
  if (![0, 1, 2].includes(mode)) {
    throw new Error(`Invalid mode ${mode}`);
  }

  const width = data[1];
  const height = data[2];
  if (width < 1 || width > 256 || height < 1 || height > 256) {
    throw new Error(`Invalid dimensions: ${width}x${height}`);
  }

  // Pixel data begins at offset 3
  const pixelData = data.slice(3);

  return { version, mode, width, height, data: pixelData };
}

/**
 * Serialize a BinaryBitmap into disk format Uint8Array.
 * Inverse of loadBinaryBitmapFromDiskFormat.
 */
export function convertBinaryBitmapToDiskFormat(
  bitmap: BinaryBitmap
): Uint8Array {
  const { version, mode, width, height, data } = bitmap;
  if (![0, 1, 2].includes(mode)) {
    throw new Error(`Invalid mode ${mode}`);
  }

  const header = (version << 4) | (mode & 0x0f);
  const out = new Uint8Array(3 + data.length);
  out[0] = header;
  out[1] = width;
  out[2] = height;
  out.set(data, 3);
  return out;
}

/**
 * Render a BinaryBitmap to a Canvas element given a palette and optional transparent index.
 * @param bitmap The binary bitmap object
 * @param palette Array of [r, g, b] tuples (0–255), length must be at least 2^bpp
 * @param transparentIndex Optional palette index to treat as transparent
 * @returns HTMLCanvasElement with the rendered image
 */
export function renderBitmapToCanvas(
  bitmap: BinaryBitmap,
  palette: [number, number, number][],
  transparentIndex?: number
): HTMLCanvasElement {
  const { mode, width, height, data } = bitmap;
  const bpp = mode === 0 ? 1 : mode === 1 ? 2 : 4;
  const maxColors = 1 << bpp;
  if (palette.length < maxColors) {
    throw new Error(`Palette length ${palette.length} < required ${maxColors}`);
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Unable to get 2D context");

  const imageData = ctx.createImageData(width, height);
  const out = imageData.data;
  const mask = maxColors - 1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const pixelIndex = y * width + x;
      const bitPos = pixelIndex * bpp;
      const byteIndex = bitPos >> 3;
      const bitOffset = bitPos & 7;
      let raw = data[byteIndex] << 8;
      if (byteIndex + 1 < data.length) raw |= data[byteIndex + 1];
      const shift = 16 - bpp - bitOffset;
      const idx = (raw >> shift) & mask;

      const [r, g, b] = palette[idx];
      const alpha = idx === transparentIndex ? 0 : 255;
      const outIdx = pixelIndex * 4;
      out[outIdx] = r;
      out[outIdx + 1] = g;
      out[outIdx + 2] = b;
      out[outIdx + 3] = alpha;
    }
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}
