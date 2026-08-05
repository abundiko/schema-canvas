import type { Diagram } from "#/types/diagram";

function bytesToBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64UrlToBytes(encoded: string): Uint8Array {
  const b64 = encoded.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64 + "=".repeat((4 - (b64.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

export function encodeDiagram(diagram: Diagram): string {
  const json = JSON.stringify(diagram);
  return bytesToBase64Url(new TextEncoder().encode(json));
}

export function decodeDiagram(encoded: string): Diagram | null {
  try {
    const bytes = base64UrlToBytes(encoded);
    const json = new TextDecoder().decode(bytes);
    const parsed = JSON.parse(json) as Diagram;
    if (
      !parsed ||
      typeof parsed !== "object" ||
      !Array.isArray(parsed.tables) ||
      !Array.isArray(parsed.relationships)
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
