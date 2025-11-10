import { aboutApplication } from "./apps/about";
import { bitmapEditorApplication } from "./apps/bitmap-editor";
import { bitmapPixelEditorApplication } from "./apps/bitmap-pixel-editor";
import { calculatorApplication } from "./apps/calculator";
import { logViewerApplication } from "./apps/log-viewer";
import { renderDemoApplication } from "./apps/render-demo";
import { shellApplication } from "./apps/shell";
import { loadBinaryBitmapFromDiskFormat } from "./bitmap";
import { init } from "./init";
import { type BinaryFont, loadBinaryFrontFromDiskFormat } from "./load-font";
const cursorPath = require("./cursor.bitmap");
const fallbackFontPath = require("./font2.fontbin");

const mapHashFragmentIdentifierToApplication: Record<string, any> = {
  fontedit: bitmapEditorApplication,
  bitmapedit: bitmapPixelEditorApplication,
  calculator: calculatorApplication,
  about: aboutApplication,
  shell: shellApplication,
  logviewer: logViewerApplication,
  renderdemo: renderDemoApplication,
};

async function main() {
  const bitmapData = await fetch(cursorPath);
  const bitmapDataBuffer = await bitmapData.arrayBuffer();
  const cursorBitmap = loadBinaryBitmapFromDiskFormat(
    new Uint8Array(bitmapDataBuffer)
  );

  let fallbackFont: BinaryFont | undefined;
  try {
    const fallbackFontData = await fetch(fallbackFontPath);
    const fallbackFontBuffer = await fallbackFontData.arrayBuffer();
    fallbackFont = loadBinaryFrontFromDiskFormat(
      new Uint8Array(fallbackFontBuffer)
    );
  } catch (error) {
    console.warn("Failed to load fallback font:", error);
  }

  const hashFragment = window.location.hash.substring(1);
  const application =
    mapHashFragmentIdentifierToApplication[hashFragment] ?? shellApplication;
  init("screen", application, fallbackFont, cursorBitmap);
}

main();
