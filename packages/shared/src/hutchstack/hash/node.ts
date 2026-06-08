import { createHash } from 'node:crypto';

import type { SyncHashProvider } from './types';

/** Server-only SHA-256 provider (node:crypto). */
export const nodeHashProvider: SyncHashProvider = {
  algorithm: 'sha256-v1',
  sha256HexSync(canonicalJson: string): string {
    return createHash('sha256').update(canonicalJson, 'utf8').digest('hex');
  },
};

export function sha256HexSync(canonicalJson: string): string {
  return nodeHashProvider.sha256HexSync(canonicalJson);
}
