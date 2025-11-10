export function convertToHexString(data: Uint8Array): string {
  return Array.from(data).map(convertByteToHexString).join("");
}

export function convertFromHexString(hexString: string): Uint8Array {
  const hexPairs = splitHexStringToPairs(hexString);
  const bytes = hexPairs.map(convertHexByteToNumber);
  return new Uint8Array(bytes);
}

export function convertByteToHexString(byte: number): string {
  return byte.toString(16).padStart(2, "0");
}

function convertHexByteToNumber(hexPair: string): number {
  const parsed = Number.parseInt(hexPair, 16);
  if (Number.isNaN(parsed)) {
    throw new Error(`Invalid hex byte: "${hexPair}"`);
  }
  return parsed;
}

function splitHexStringToPairs(hexString: string): string[] {
  if (hexString.length % 2 !== 0) {
    throw new Error("Invalid hex string length");
  }
  const pairs: string[] = [];
  for (let i = 0; i < hexString.length; i += 2) {
    pairs.push(hexString.slice(i, i + 2));
  }
  return pairs;
}
