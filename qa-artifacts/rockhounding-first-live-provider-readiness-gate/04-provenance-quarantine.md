# Provenance, raw preservation, quarantine, versions

## Resource identity — PASS

Evidence: `ResourceProviderSchema`, `ResourceIdentifiersSchema`, `RawSourceRecordSchema.sourceResourceId` and `sourceRecordId`.

Finding: catalog id, provider id, and provider record id are different fields.

## Source version — PASS

Evidence: `supportedSourceVersions`, `tolerantUnsupportedVersion`, failure `UNSUPPORTED_SOURCE_VERSION`, quarantine status `SOURCE_VERSION_UNSUPPORTED`.

Finding: mismatch fails closed unless an adapter explicitly opts into tolerant parsing. The first live adapter must not opt in.

## Raw preservation — PASS

Evidence: `rawFields` stay on the raw record. Normalized fields and mappings are a second object.

Finding: normalization does not replace the raw record.

## Provenance — PASS

Evidence: `ProvenanceActivityKind.SOURCE_RETRIEVAL`. Adapter provenance records adapter id, version, raw id, and normalized id with `manufacturesTruth: false`.

Finding: a live row without retrieval and processing lineage is outside the contract.

## Quarantine — PASS

Evidence: `EvidenceQuarantineReasonCode` includes unknown enum, unsupported version, temporal and coverage ambiguity, provenance gap, governance prohibition, and authority elevation. `quarantineFromAdapterResult` builds the record. `quarantineAdmitsEvidence` is false.

Finding: the unsafe path is quarantine, not drop or coerce.

Blocker: none on this page.
