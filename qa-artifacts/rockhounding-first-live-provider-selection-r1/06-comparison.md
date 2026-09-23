# Comparison

Retrieval date: 2026-09-23. No numeric score.

| Dimension                  | SGMC geology | USMIN       | NWS alerts  | NASA FIRMS  | BLM MLRS    |
| -------------------------- | ------------ | ----------- | ----------- | ----------- | ----------- |
| Official structured access | PASS         | PASS        | PASS        | PASS        | PASS        |
| Bounded domain             | PASS         | CONDITIONAL | PASS        | PASS        | CONDITIONAL |
| Bounded purpose            | PASS         | CONDITIONAL | PASS        | CONDITIONAL | CONDITIONAL |
| Governance clarity         | CONDITIONAL  | CONDITIONAL | PASS        | PASS        | CONDITIONAL |
| Disclosure safety          | PASS         | CONDITIONAL | PASS        | PASS        | CONDITIONAL |
| No or bounded secret       | PASS         | PASS        | PASS        | CONDITIONAL | PASS        |
| Schema stability           | CONDITIONAL  | CONDITIONAL | PASS        | CONDITIONAL | CONDITIONAL |
| Temporal clarity           | CONDITIONAL  | CONDITIONAL | PASS        | PASS        | CONDITIONAL |
| Coverage clarity           | PASS         | CONDITIONAL | CONDITIONAL | CONDITIONAL | FAIL        |
| Fixtureability             | PASS         | PASS        | PASS        | PASS        | PASS        |
| Provenance                 | PASS         | PASS        | PASS        | PASS        | PASS        |
| Quarantine compatibility   | PASS         | PASS        | PASS        | PASS        | PASS        |
| Admission compatibility    | PASS         | CONDITIONAL | PASS        | PASS        | CONDITIONAL |
| Low consequence            | PASS         | CONDITIONAL | FAIL        | CONDITIONAL | FAIL        |
| Off-switch                 | PASS         | PASS        | PASS        | PASS        | PASS        |
| Rate-limit manageability   | CONDITIONAL  | CONDITIONAL | CONDITIONAL | PASS        | CONDITIONAL |

Material fails: NWS and MLRS fail low consequence. MLRS also fails coverage clarity because missing geometries are documented and an empty map cannot mean unclaimed ground.

SGMC has no material fail. Its condition is to pin the 2017 DOI and layer, keep geologic age out of the truth clock, and refuse a silent jump to the 2026 GeMS download.
