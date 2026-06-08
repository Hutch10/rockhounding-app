/**
 * HashProvider — platform-neutral SHA-256 over canonical UTF-8 strings.
 * Server uses Node.js crypto; browser uses crypto.subtle (async).
 */
export interface HashProvider {
  readonly algorithm: 'sha256-v1';
  sha256Hex(canonicalJson: string): Promise<string>;
}

export interface SyncHashProvider {
  readonly algorithm: 'sha256-v1';
  sha256HexSync(canonicalJson: string): string;
}
