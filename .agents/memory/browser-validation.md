---
name: Browser validation
description: Headless Chromium keyboard checks should target explicit focusable controls.
---

Headless Chromium checks are more reliable when onboarding options expose their own focusable, keyboard-activatable control rather than relying only on a visually hidden native input.

**Why:** Native activation of visually hidden radio inputs was inconsistent during CDP validation, while explicit focusable option and Continue controls verified the real keyboard path deterministically.

**How to apply:** Keep keyboard validation focused on the visible option controls, Space/Enter activation, and the subsequent step transition.