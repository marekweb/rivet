export default async function saveFile(
  data: Uint8Array,
  suggestedName = "file.bin"
) {
  try {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName,
      types: [
        {
          description: "Binary Bitmap Fonts",
          accept: { "application/octet-stream": [".fontbin"] },
        },
      ],
    });

    const writable = await fileHandle.createWritable();
    await writable.write(data);
    await writable.close();
    console.log("File saved successfully!");
    return fileHandle;
  } catch (err) {
    console.error("Error saving file:", err);
    return null;
  }
}
