# Provenance and replay

The capture chain is resource, `SOURCE_RETRIEVAL`, raw entity, adapter `IMPORT` 1.0.0, then the candidate. Replay calls the same adapter with `provenanceMode` `REPLAY` and does not create a new `SOURCE_RETRIEVAL`. Reanalysis writes a new record id and leaves the prior result unchanged. The committed hash matches the local raw bytes.
