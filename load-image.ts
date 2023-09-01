export async function loadImage(url: string): Promise<HTMLImageElement> {
  const image = new Image();
  image.src = url;
  await image.decode();
  return image;
}

export function loadAllImages(urls: string[]) {
  const imagePromises = urls.map(async (url: string) => ({
    url,
    image: await loadImage(url),
  }));
  return Promise.all(imagePromises);
}
