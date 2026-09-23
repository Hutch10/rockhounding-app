# Adversarial cases

No network calls. Each case is judged from the current contracts.

A. HTTP 200 and zero results. Held. `confirmedAbsence` is false. `NO_RECORD_RETURNED` is not confirmed absence unless admission's negative-evidence conditions hold.

B. Enum change without a version bump. Held. `UNKNOWN_ENUM_VALUE` and `UNKNOWN_REQUIRED_SEMANTIC` quarantine or fail. They do not guess a canonical value.

C. Schema version change. Held when `tolerantUnsupportedVersion` is false. The first live adapter must keep that flag false.

D. Provider down. Held. `FETCH_FAILED` and `NETWORK_FAILURE` are not `MISSING`. Incomplete evidence does not become an allow.

E. Public page, terms prohibit bulk redistribution. Conditional. `redistribution: PROHIBITED` can be recorded, and `BULK_DOWNLOAD` is a separate operation, but the adapter does not read the license profile.

F. High-quality geology and no legal permission. Held. Collection permission does not treat a geology domain as collection authority. Governance cannot set collection authorization to allowed.

G. Stale but authoritative data. Held. Stale freshness can require revalidation. It does not flip the record to false or to prohibited.

H. Exact sensitive coordinates. Not held. No disclosure contract can stop public materialization. This is the disclosure condition.

I. Rate limit after a partial page. Held if the future adapter sets record coverage to `PARTIAL` and reason `RATE_LIMITED`. The types can say that. They do not upgrade partial coverage to complete.

J. Provider corrects a record after a receipt. Held. The receipt hash and pins stay. A new snapshot and receipt are reanalysis. The original is not edited.
