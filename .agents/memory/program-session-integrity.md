---
name: Program session integrity
description: Deterministic programs distinguish answer-driven staleness from same-ID content corruption.
---

Rebuild a stored program automatically when its deterministic input fingerprint differs from current valid onboarding/report inputs. Reject it when the fingerprint still matches but the serialized content differs.

**Why:** Answer changes should produce a fresh compatible program without a dead end, while same-ID content changes indicate session corruption and must not be rendered.

**How to apply:** Recompute the expected program at `/program`; replace different-ID valid programs, but redirect on matching-ID content mismatch. Sleep priority must also use calendar age and the authorized age band.