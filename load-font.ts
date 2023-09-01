import { loadImage } from "./load-image";

export interface BitmapFont {
  image: HTMLImageElement;
  glyphIndexes: number[];
}

export default async function loadFont(url: string): Promise<BitmapFont> {
  const image = await loadImage(url);
  const glyphIndexes = [0];
  // Put into a cavas so that we can read the data
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Canvas getContext('2d') failed.");
  }
  ctx.drawImage(image, 0, 0);
  const imageData = ctx.getImageData(0, 0, image.width, image.height);
  // Iterate over the X axis
  for (let x = 0; x < image.width; x++) {
    // If the top pixel is non-blank, then it's a new glyph
    const alpha = imageData.data[x * 4 + 3];
    if (alpha !== 0) {
      glyphIndexes.push(x);
    }
  }

  return {
    image,
    glyphIndexes,
  };
}
