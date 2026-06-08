import type { HashProvider } from './types';

function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Browser SHA-256 provider (Web Crypto API). */
export const browserHashProvider: HashProvider = {
  algorithm: 'sha256-v1',
  async sha256Hex(canonicalJson: string): Promise<string> {
    const subtle = globalThis.crypto.subtle;
    if (subtle == null) {
      throw new Error('Web Crypto API unavailable — use server hash provider');
    }
    const data = new TextEncoder().encode(canonicalJson);
    const digest = await subtle.digest('SHA-256', data);
    return bufferToHex(digest);
  },
};
