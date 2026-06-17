# @hutchstack/core-certification

## Responsibility

Milestone certification gates: entry/exit criteria, sign-off templates, PASS/FAIL/PENDING verdicts, git profile SHA recording.

**Phase 0:** Interface definitions only. Rockhound cert docs remain authoritative.

## Public interfaces

| Symbol                 | Description                                         |
| ---------------------- | --------------------------------------------------- |
| `CertificationGate`    | Gate definition with sections                       |
| `GateSection`          | Checklist section                                   |
| `GateBlocker`          | Fail-closed blocker                                 |
| `CertificationRecord`  | Signed certification artifact                       |
| `GateEvaluator`        | Evaluate checklist → verdict                        |
| `CertificationVerdict` | `PASS` \| `FAIL` \| `PENDING` \| `PASS_WITH_WAIVER` |

## Dependencies

None (Phase 0).

## Extension points

| Extension           | Purpose                          |
| ------------------- | -------------------------------- |
| `AutomatedGate`     | CI test → pass/fail              |
| `ManualGate`        | Human sign-off                   |
| `KnownRiskRegister` | Documented waivers (e.g. KR-001) |

## Golden fixtures

- [`../fixtures/certification-gate.golden.json`](../fixtures/certification-gate.golden.json)
