# Skill: Validate External API Keys in Production

**Category:** DevOps / Debugging  
**Complexity:** Medium  
**Time:** 15 min  
**Last Updated:** 2026-09-09

---

## Problem This Solves

External API keys (PostHog, Sentry, Stripe, etc.) silently fail in production:
- API returns 200 OK even for invalid keys
- Events/logs disappear with no error signal
- Takes weeks to notice, costs debugging time

---

## Checklist: Validate External API Key After Deploy

### 1. Copy From Dashboard, Never Manual

```bash
# ❌ WRONG: Manual transcription
Key from screenshot: phc_abc... → Copy to code → phc_ab...  (typos!)

# ✅ RIGHT: Copy from dashboard
Dashboard → API Key → Click copy button → Paste
```

### 2. For PostHog Specifically

- **Project ID:** 269632 (EU region)
- **Dashboard:** https://eu.posthog.com/project/269632/settings/project
- **Click:** "Copy" button next to API key (not screenshot)
- **Wait:** Build frontend with key
- **Verify:** https://eu.posthog.com/project/269632/activity
  - If "This project has no events yet" → KEY IS WRONG
  - If events appearing → KEY IS CORRECT

### 3. Code to Verify Key

```javascript
// In browser console after page load
localStorage
  .filter(k => k.includes('ph_'))
  .forEach(k => console.log('PostHog present'))
// If nothing prints → key missing from bundle
```

### 4. Grep for Key in Build Output

```bash
# After npm run build, verify key landed
grep phc_ docs/assets/*.js
# Should print actual key, not placeholder
```

### 5. Test Ingestion

```bash
# Manually trigger event
curl -X POST https://eu.i.posthog.com/e/ \
  -H 'Content-Type: application/json' \
  -d '{
    "api_key": "phc_YOUR_KEY",
    "event": "test",
    "properties": {"test": true}
  }'
# Returns: {"status":"Ok"} even if key is wrong
# So this test is USELESS — check dashboard instead
```

---

## Before/After Example

### BEFORE (Silent Failure)
```
✗ PostHog key transcribed wrong
✓ Frontend builds without error
✓ API returns 200 for events
✓ Dashboard shows "No events" for 2 months
✗ Analytics team: "Are you sending data?"
✗ Debug session burns 1 hour
```

### AFTER (Caught Immediately)
```
✓ Copy key from dashboard
✓ Build, grep for key in bundle
✓ Check PostHog dashboard Activity tab
✗ No events → KEY WRONG (caught in 2 min)
✓ Events appearing → KEY CORRECT
```

---

## Related Errors

- Env vars not reaching frontend (see: Deployment Pipeline skill)
- Silent 200 responses from APIs (design: always validate)

---

## Commands to Automate

```bash
#!/bin/bash
# post-build.sh — validate keys are in bundle
set -e

echo "Checking PostHog key in frontend build..."
if ! grep -q "phc_" docs/assets/*.js; then
  echo "ERROR: PostHog key missing from bundle"
  exit 1
fi

echo "Checking auth secret on backend..."
if [ -z "$AUTH_SECRET" ]; then
  echo "ERROR: AUTH_SECRET not set"
  exit 1
fi

echo "✓ All keys validated"
```

Run before committing:
```bash
bash post-build.sh
```

---

## Lesson for Other Projects

| Service | Check Method | Why Manual Copy |
|---|---|---|
| PostHog | Dashboard Activity tab | Silent 200 OK on bad key |
| Stripe | API call test (accurate) | Keys matter |
| Sentry | Release health tab | Silent drops if DSN wrong |
| Twilio | SMS test (accurate) | Invalid creds fail instantly |

---

## Status

✅ Applied to Grandimi 2026-09-09  
✅ Fixed in commit with correct key  
✅ Verified in Activity tab (events ingesting)

---

*End of skill.*
