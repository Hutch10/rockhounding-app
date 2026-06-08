/**
 * HutchStack Canonical Serialization Spec — canonical-v1
 *
 * Rules:
 * 1. Objects: keys sorted lexicographically at every nesting level
 * 2. Arrays: order preserved (caller must sort evidence lists if order-independent)
 * 3. undefined/null: omitted from output objects
 * 4. Numbers: JSON number representation (no special float normalization)
 * 5. Strings: Unicode NFC normalized
 * 6. Dates: must be ISO 8601 strings before canonicalization (Date objects rejected)
 * 7. Schema version byte included in hash preimage via CANONICAL_SERIALIZATION_VERSION
 */
export const CANONICAL_SERIALIZATION_VERSION = 'canonical-v1';

function normalizeString(value: string): string {
  return value.normalize('NFC');
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === 'object' && value !== null && !Array.isArray(value) && !(value instanceof Date)
  );
}

function sortObject(value: Record<string, unknown>): Record<string, unknown> {
  const sorted: Record<string, unknown> = {};
  for (const key of Object.keys(value).sort()) {
    const v = value[key];
    if (v === undefined || v === null) continue;
    sorted[key] = canonicalizeValue(v);
  }
  return sorted;
}

function canonicalizeValue(value: unknown): unknown {
  if (value === undefined || value === null) return undefined;
  if (value instanceof Date) {
    throw new Error('Date objects must be converted to ISO strings before canonicalization');
  }
  if (typeof value === 'string') return normalizeString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.map((item) => canonicalizeValue(item));
  if (isPlainObject(value)) return sortObject(value);
  return value;
}

/** Produce deterministic canonical JSON for hashing and replay. */
export function canonicalize(value: unknown): string {
  const wrapped = {
    _canonical: CANONICAL_SERIALIZATION_VERSION,
    payload: canonicalizeValue(value),
  };
  return JSON.stringify(wrapped);
}
