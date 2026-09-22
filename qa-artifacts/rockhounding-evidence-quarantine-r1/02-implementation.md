# Implementation

Persistence-free contract in `packages/shared/src/evidence-quarantine.ts`.

The original capture is immutable. History, dispositions, resolutions, reprocessing links, and duplicate assessments are append-only. Adapter quarantine candidates are copied without mutating the adapter result.

No persistence, review UI, admission, or live adapter.
