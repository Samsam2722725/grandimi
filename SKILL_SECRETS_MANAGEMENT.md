# Skill: Manage Secrets & Sensitive Variables Securely

**Category:** Security / DevOps  
**Complexity:** High  
**Time:** 2-3 hours setup, prevents breach  
**Last Updated:** 2026-09-09

---

## Problem This Solves

Secrets leak because they're treated like regular variables:

```
❌ API key in source code → committed to git (visible to all)
❌ Secret in logs → readable in dashboard (anyone with access)
❌ Env var with same name everywhere → confusion about which is live
❌ Token in URL → visible in browser history
❌ Secret written manually → typos break production
❌ Secret rotation → update everywhere, miss one place
```

---

## What Are Secrets?

| Secret | Where | Leak Risk |
|---|---|---|
| Database URL | Backend only | Connects to real data |
| API key (Stripe, PostHog) | Frontend/Backend | Unmetered API usage |
| Webhook secret | Backend only | Accept fake webhooks |
| Password hash salt | Backend only | Weak password verification |
| JWT signing key | Backend only | Forge sessions |
| Admin token | Backend only | Unauthorized admin access |

---

## Rule 1: Never Commit Secrets

```bash
# ❌ WRONG
DATABASE_URL="postgresql://user:password123@host/db"  # In git!
STRIPE_KEY="sk_live_abc123"                           # In git!

# ✅ RIGHT
# .gitignore
.env
.env.*.local
.env.production
*.key
secrets/

# Actual files stay out of git
echo "DATABASE_URL=..." > .env
git add .gitignore
```

---

## Rule 2: Never Log Secrets

```go
// ❌ WRONG
fmt.Printf("[DEBUG] Token: %s\n", secret)
log.Printf("Auth check: %s vs %s", provided, expected)

// ✅ RIGHT
if len(secret) < 32 {
    log.Printf("[ERROR] Secret too short (not printing value)")
    return nil, ErrInvalid
}
if hmac.Equal([]byte(provided), []byte(expected)) {
    log.Printf("[OK] Auth passed (not printing values)")
} else {
    log.Printf("[FAIL] Auth failed (not printing values)")
}
```

**Test:** Grep for secrets in logs
```bash
# Should find nothing
grep -r "sk_\|phc_\|token\|password" /var/log/app.log
```

---

## Rule 3: Store Secrets Only in Env Vars (or Vault)

**Option A: Environment Variables (Simple)**

```bash
# Set in deployment platform
export DATABASE_URL="..."
export AUTH_SECRET="..."  # 32+ random chars

# Read in code
db_url := os.Getenv("DATABASE_URL")
if db_url == "" {
    return fmt.Errorf("DATABASE_URL not set")  // Fail-closed
}
```

**Option B: Secrets Vault (Better for Scale)**

```go
// Use a tool like Vault, AWS Secrets Manager, or Doppler
client := vault.NewClient()
secret := client.GetSecret("database-url")
// Never store secret in memory if not in use
```

---

## Rule 4: Secrets Have Different Scopes

| Secret | Frontend | Backend | CI/CD | Admin |
|---|---|---|---|---|
| PostHog key | ✅ (public) | ✗ | ✗ | ✗ |
| Database URL | ✗ | ✅ | ✅ | ✗ |
| API key | ✗ | ✅ | ✅ | ✗ |
| Admin token | ✗ | ✅ | ✗ | ✅ |
| Signing secret | ✗ | ✅ | ✗ | ✗ |

```javascript
// frontend/.env.production (safe to commit)
VITE_POSTHOG_KEY=phc_xxx  // Public key (anyone can use it)
```

```bash
# Render dashboard (secret, not in git)
DATABASE_URL=postgresql://...  // Private
AUTH_SECRET=random_secret_123   // Private
ADMIN_TOKEN=token_abc          // Private
```

---

## Rule 5: Rotate Secrets Periodically

**Every 90 days:**

```bash
# Generate new secret (don't do manually!)
openssl rand -base64 32

# Update in deployment platform
# Render dashboard: edit AUTH_SECRET
# Supabase: change database password
# Stripe: rotate API keys

# Old sessions/tokens expire naturally (30-day TTL)
# New deployments use new secrets
```

**Emergency rotation (if leaked):**
```bash
# Immediately
# 1. Change secret in deployment platform
# 2. Redeploy code (no code change needed, env var changed)
# 3. Notify users if credentials involved
# 4. Revoke old API keys
```

---

## Real Example: Grandimi Breaches

### Breach 1: ADMIN_TOKEN in Logs

**Discovery:**
```
Grep logs: found "Bearer xxx" in plaintext
```

**Damage:**
```
Anyone with dashboard access could:
✗ Delete users
✗ Revoke subscriptions
✗ View audit logs
```

**Fix:**
```go
// ❌ Before: printed token
fmt.Printf("[DEBUG] Auth check: token='%s'", token)

// ✅ After: print nothing
if hmac.Equal([]byte(provided), []byte(expected)) {
    log.Println("[OK] Auth passed")
}
```

### Breach 2: PostHog Key Transcription

**Discovery:**
```
Manually typed key from screenshot → typos
```

**Damage:**
```
Analytics disabled silently for months
```

**Fix:**
```
Always copy from UI, never manual transcription
Verify key in bundle after build
```

### Breach 3: No Auth Secret Set

**Discovery:**
```
AUTH_SECRET not in Render env vars
```

**Damage:**
```
Token generation fails, auth broken
```

**Fix:**
```bash
# Generate once
openssl rand -base64 32
# Set in Render dashboard
# Code fails-closed if not set
```

---

## Checklist: Secrets Management

### Local Development

- [ ] Create `.env.local` (gitignored)
- [ ] Never commit `.env.local`
- [ ] Local .env different from production
- [ ] Document in README: "Copy .env.example to .env.local"

```bash
# .env.local (NEVER commit)
DATABASE_URL=postgresql://localhost/db_dev
AUTH_SECRET=dev_secret_do_not_use_in_production

# .gitignore
.env.local
.env.*.local
```

### Production Deployment

- [ ] All secrets in deployment platform (Render, AWS, Heroku)
- [ ] No secrets in code or git
- [ ] All env var reads have fallback + error message
- [ ] Secrets never printed to logs
- [ ] Use constant-time comparison (hmac.Equal)

```go
// Good: fails if secret missing
func init() {
    secret := os.Getenv("AUTH_SECRET")
    if len(secret) < 32 {
        log.Fatal("AUTH_SECRET not set or too short")
    }
}
```

### CI/CD Pipeline

- [ ] Secrets passed via deployment platform only
- [ ] Build logs scrubbed of secrets (Render, GitHub Actions do this)
- [ ] Test env uses different secrets than prod
- [ ] CI doesn't have access to production secrets

```yaml
# ✅ GitHub Actions (safe)
- run: npm build
  env:
    VITE_API_URL: https://staging.example.com  # Not a secret

# ✅ Render (safe)
# Set secrets in dashboard, not in code
```

### Monitoring & Auditing

- [ ] Who accessed each secret? (audit log)
- [ ] When was it last rotated? (calendar alert)
- [ ] Is it actually being used? (search code)
- [ ] Could it be more restrictive? (scope down)

```bash
# Audit: find all env var reads
grep -r "os.Getenv\|process.env" --include="*.go" --include="*.js" .

# Check: what secrets are actually used?
grep -r "os.Getenv.*DATABASE\|STRIPE\|AUTH" cmd/

# Verify: is every secret in code also set in production?
# List env var names from code
grep -oE 'os.Getenv\("[A-Z_]+"\)' cmd/ | sort -u
# List env vars actually set
# ... compare
```

---

## Secrets Rotation Template

**Create: scripts/rotate-secrets.sh**

```bash
#!/bin/bash
# Generate new secrets and guide for rotation

set -e

echo "=== Secret Rotation ==="
echo
echo "1. AUTH_SECRET (30 char minimum)"
AUTH_SECRET=$(openssl rand -base64 32 | tr -d '\n')
echo "   $AUTH_SECRET"
echo

echo "2. ADMIN_TOKEN (random string)"
ADMIN_TOKEN=$(openssl rand -hex 24)
echo "   $ADMIN_TOKEN"
echo

echo "Next steps:"
echo "  1. Update Render dashboard → Settings → Environment"
echo "  2. Replace AUTH_SECRET: $AUTH_SECRET"
echo "  3. Replace ADMIN_TOKEN: $ADMIN_TOKEN"
echo "  4. Render auto-redeploys"
echo "  5. Old sessions expire after 30 days (TTL in code)"
echo
echo "NEVER share these secrets in messages/email"
echo "NEVER commit them to git"
echo "NEVER log them to stdout"
```

Run:
```bash
bash scripts/rotate-secrets.sh
# Then manually copy values to Render dashboard
```

---

## File Checklist

```
✅ .gitignore
  ✅ .env
  ✅ .env.local
  ✅ .env.production
  ✅ secrets/
  ✅ *.key
  ✅ *.pem

✅ .env.example (template, no values)
  DATABASE_URL=postgresql://user:password@host/dbname
  AUTH_SECRET=your-32-char-secret-here
  ADMIN_TOKEN=your-admin-token-here

✅ Code: env var reads
  ✅ All have fallback: if not set, error
  ✅ None are logged to stdout
  ✅ Used with constant-time comparison

✅ Deployment platform (Render, AWS, Heroku)
  ✅ DATABASE_URL set
  ✅ AUTH_SECRET set (32+ chars)
  ✅ ADMIN_TOKEN set
  ✅ All secrets in dashboard, not in git

✅ Documentation
  ✅ README: "How to set up .env.local"
  ✅ DEPLOYMENT.md: "Which secrets where"
  ✅ scripts/rotate-secrets.sh: automation
```

---

## Security Best Practices

1. **Principle of Least Privilege**
   - Frontend doesn't need database URL
   - API key needs only what it uses
   - Admin token only for admin endpoints

2. **Fail Closed**
   - If secret missing → error, don't continue
   - If verification fails → 401, not OK

3. **Temporal Isolation**
   - Don't keep secrets longer than needed
   - TTL on sessions (30 days)
   - Rotate secrets every 90 days

4. **Audit Everything**
   - Who accessed secret? (logs)
   - When did rotation happen? (calendar)
   - Is it still needed? (review code)

5. **Encrypt at Rest & In Transit**
   - HTTPS for all API calls
   - Secrets in database encrypted
   - Deployment platform encryption enabled

---

## Status

✅ Applied to Grandimi 2026-09-09  
✅ AUTH_SECRET generated and set in Render  
✅ ADMIN_TOKEN regenerated (old one was lost)  
✅ Secrets never logged (AdminAuthMiddleware fixed)  
✅ Constant-time comparison used (hmac.Equal)  

**Remaining:**
⏳ Rotate secrets in 90 days (set calendar reminder)
⏳ Add secret rotation script to automated deploys

---

*End of skill.*
