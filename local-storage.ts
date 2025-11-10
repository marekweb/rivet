import { convertFromHexString, convertToHexString } from "./hex";

export function loadBinaryDataFromLocalStorage(key: string): Uint8Array | null {
  const hexString = localStorage.getItem(key);
  if (hexString === null) {
    return null;
  }

  return convertFromHexString(hexString);
}

export function saveBinaryDataToLocalStorage(
  key: string,
  data: Uint8Array
): void {
  const hexString = convertToHexString(data);
  localStorage.setItem(key, hexString);
}
