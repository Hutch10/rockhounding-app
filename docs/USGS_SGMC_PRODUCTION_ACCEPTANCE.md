# USGS SGMC production acceptance

`ROCKHOUNDING_SGMC_PRODUCTION_ACCEPTANCE_R1` is CONDITIONAL.

Production authority remains `PRODUCTION_READ_ONLY_GEOLOGICAL_CONTEXT` on Site Detail. Scope remains GEOLOGY and `GEOLOGICAL_CONTEXT`. This phase did not add a provider, a map overlay, a cache, or a wider query.

## What was checked

Mocked production-path tests cover success, HTTP 504, timeout, zero features, Alaska and Hawaii, partial pages, suspended governance, a denied `PUBLIC_DISPLAY` grant, unknown disclosure, a rejected admission, malformed and oversized boxes, and the product switch turned off. Each blocked case makes no legal or access decision.

Site Detail shows the geological section apart from the access banner and site trust badge. Success copy uses map unit, lithology, and geologic age. Attribution names the U.S. Geological Survey, State Geologic Map Compilation, and DOI `10.5066/F7WH2N65`, and says Rockhounding is not a USGS product. Compilation year 2017 is separate from the retrieval time.

Provider failure says geological context is temporarily unavailable. Zero features say no SGMC map unit was returned. Outside coverage does not call the provider. An incomplete page is not shown as complete. Offline copy says geological context is unavailable offline, which is not a claim that no geology exists.

The browser does not receive the FeatureServer URL. One Site Detail request builds one server query. There is no public proxy and no durable raw cache. The service worker does not name the provider. High-glare mode is not a product mode. The section uses text, a heading, and a status line, not color alone. Loading stays inside the geological section so the rest of Site Detail can render.

## Open condition

An authenticated browser session of a real Site Detail page was not run. Doing so would issue a live provider query, and no signed-in path was available. Live feature-query count is 0. That is the only open acceptance condition.

## Remediation

Sign in, open one ordinary Site Detail page, and confirm the geological section, attribution, and that the browser network log contains no USGS FeatureServer request. Do not retry, paginate, or open a second site for this check.
