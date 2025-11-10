export async function loadFile(): Promise<Uint8Array | null> {
  try {
    const [fileHandle] = await window.showOpenFilePicker({
      types: [
        {
          description: "Binary Bitmap Fonts",
          accept: { "application/octet-stream": [".fontbin"] },
        },
      ],
    });

    const file = await fileHandle.getFile();
    const arrayBuffer = await file.arrayBuffer();
    console.log("File loaded successfully!");
    return new Uint8Array(arrayBuffer);
  } catch (err) {
    console.error("Error loading file:", err);
    return null;
  }
}
