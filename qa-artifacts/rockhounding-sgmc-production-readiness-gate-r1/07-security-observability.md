# Security and observability

No provider credential is required. Production requests use the fixed endpoint and an allowlisted query. User-supplied URLs, fields, and unbounded envelopes are rejected.

Observability counts requests, successes, failure class, latency, HTTP 5xx, HTTP 429, schema drift, quarantine, admission, and disclosure blocks. Raw bodies are not written to logs.

Normal CI stays off the network. A live smoke test is operator-triggered only.
