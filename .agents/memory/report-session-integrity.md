---
name: Report session integrity
description: Personalized reports must be rebuilt and cross-checked against current onboarding inputs.
---

Never trust a stored report object by TypeScript assertion alone. Validate its runtime structure, recompute the deterministic engine result from the stored onboarding inputs, and require the key estimates to match before rendering.

**Why:** Corrupted or stale session objects can otherwise render `NaN`, crash optional collections, or pair a valid-looking result with different calculation inputs.

**How to apply:** At report entry, require both session records, validate the result shape, rerun the engine from the onboarding projection, compare central/range/age values, and redirect on any mismatch.