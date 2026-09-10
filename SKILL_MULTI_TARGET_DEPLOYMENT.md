# Skill: Manage Multi-Target Deployments (Frontend ≠ Backend)

**Category:** DevOps / CI-CD  
**Complexity:** High  
**Time:** 4-5 hours setup, saves 20+ hours debugging  
**Last Updated:** 2026-09-09

---

## Problem This Solves

Many projects ship to multiple targets but treat them as one:

```
❌ Set env vars on Render → Frontend doesn't see them
❌ Push code → Only backend deploys, frontend doesn't rebuild
❌ Think GitHub Actions deployed both → Only one deployed
❌ Change DB schema → Only backend knows about it
❌ Debug for hours wondering why nothing changed
```

---

## The Challenge: Different Deploy Pipelines

| Aspect | Frontend | Backend |
|---|---|---|
| **Source** | docs/ folder | main branch |
| **Build Trigger** | Manual (npm run build) | Auto (push to main) |
| **Built On** | Developer's machine | Render container |
| **Env Vars** | VITE_* inlined at build time | Render dashboard |
| **When Ready** | Commit to git | Auto-redeploy |
| **Rollback** | git revert + rebuild + commit | git revert, auto-redeploy |

**Key difference:** Frontend builds **once** at dev time, backend builds **every** push.

---

## Architecture Diagram

```
Developer Machine
  │
  ├─ npm run build → docs/assets/
  │   (VITE_* inlined here)
  │
  ├─ git commit docs/
  │
  └─ git push origin main
       │
       ├─→ GitHub Pages (docs/)
       │   │
       │   └─→ https://grandimi.com (FRONTEND)
       │
       └─→ Render (main branch)
           │
           └─→ Docker build
               ├─ go mod tidy
               ├─ go build
               └─→ https://grandimi-api.onrender.com (BACKEND)
```

---

## Step 1: Understand Each Target

### Frontend (GitHub Pages)

**Where it lives:**
```bash
docs/  # This folder IS the published website
```

**How to deploy:**
```bash
cd frontend
npm run build          # → outputs dist/
rm -rf ../docs/assets # Keep CNAME, delete old bundle
cp -r dist/. ../docs/ # Copy new bundle
cp CNAME ../docs/     # RESTORE CNAME (critical!)
cd ..
git add docs/
git commit -m "Deploy frontend"
git push origin main
```

**When it updates:**
- Immediately after `git push` (GitHub Pages is instant)
- NOT tied to your backend deploy

**Env vars that work:**
```bash
# frontend/.env.production (VITE_ prefix)
VITE_POSTHOG_KEY=phc_...     ✅ Works (inlined at build time)
VITE_API_URL=https://api...  ✅ Works (inlined at build time)

# Render dashboard env vars
DATABASE_URL=...  ✅ Works for backend only
ADMIN_TOKEN=...   ✅ Works for backend only
```

### Backend (Render)

**Where it lives:**
```bash
cmd/server/main.go  # Entrypoint
internal/api/       # Handlers
internal/db/        # Database
```

**How to deploy:**
```bash
git push origin main
# → Render auto-detects new commit
# → Runs: docker build (go mod tidy + go build)
# → Starts container with env vars from dashboard
```

**When it updates:**
- ~30-60 seconds after `git push`
- Can watch at: https://dashboard.render.com/web/srv-xxx/deploys

**Env vars that work:**
```bash
# Render dashboard only (no git)
DATABASE_URL=...           ✅ Works
AUTH_SECRET=...            ✅ Works
ADMIN_TOKEN=...            ✅ Works
VITE_POSTHOG_KEY=...       ❌ Frontend never sees it (build already happened)
```

---

## Step 2: Document Deployment Instructions

**Create: DEPLOYMENT.md**

```markdown
# Deployment Checklist

## Frontend Deployment (GitHub Pages)

When: You make changes to `frontend/src/**`

```bash
# 1. Build locally
cd frontend
npm run build

# 2. Copy to docs/ (careful: preserve CNAME!)
rm -rf ../docs/assets
cp -r dist/. ../docs/
ls ../docs/CNAME || echo "ERROR: CNAME missing!"

# 3. Verify key is in bundle
grep phc_ ../docs/assets/*.js || echo "ERROR: PostHog key missing"

# 4. Commit and push
cd ..
git add -A
git commit -m "Deploy frontend: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
git push origin main

# 5. Verify (wait 10 sec, then check)
sleep 10
curl -sI https://grandimi.com | head -5
# Should show: HTTP/2 200, server: GitHub.com
```

## Backend Deployment (Render)

When: You make changes to `internal/`, `cmd/`, `go.mod`

```bash
# 1. Test locally
go mod tidy
go build -o bin/server cmd/server/main.go
./bin/server  # Should start without error

# 2. Ensure env vars set in Render dashboard
# Required:
# - DATABASE_URL
# - AUTH_SECRET (generated, 32+ chars)
# - ADMIN_TOKEN (generated, random string)
# - WHOP_PLAN_ID
# - WHOP_WEBHOOK_SECRET

# 3. Commit and push
git add -A
git commit -m "Backend: $(git log --oneline -1 | cut -d' ' -f2-)"
git push origin main

# 4. Watch deploy (takes 30-60 sec)
open https://dashboard.render.com/web/srv-xxx/deploys

# 5. Verify API health
sleep 10
curl https://grandimi-api.onrender.com/health
# Should return: {"status":"ok"}
```

## Shared Migrations (Both)

When: You change database schema

```bash
# 1. Create migration file
cat > migrations/00N_description.sql << 'EOF'
-- 00N — description
...migration SQL...
EOF

# 2. Commit (don't execute yet)
git add migrations/00N_description.sql
git commit -m "Schema: add ..."
git push origin main

# 3. Execute manually in Supabase SQL Editor
# (This is manual because data loss is possible)
```

## Deploy Both Simultaneously

```bash
# 1. Frontend build
cd frontend && npm run build
rm -rf ../docs/assets && cp -r dist/. ../docs/
cp CNAME ../docs/

# 2. Check for issues
grep phc_ ../docs/assets/*.js
cd ..

# 3. Commit everything
git add -A
git commit -m "Release: frontend + backend $(date +%Y-%m-%d)"
git push origin main

# 4. Watch both
# Frontend: live in 10 seconds (GitHub Pages)
# Backend: live in 30-60 seconds (Render)
```
```

---

## Step 3: Test Deployment Isolation

**Verify frontend and backend deploy independently:**

```bash
# Make ONLY frontend change
echo "<!-- test $(date) -->" >> frontend/src/App.jsx
npm run build
cp -r frontend/dist/. docs/
git add docs/ && git commit -m "Frontend only"
git push origin main

# Wait, check: does frontend update? (should yes)
# Check: does backend restart? (should no, no code change)

# Make ONLY backend change
echo "// test $(date)" >> cmd/server/main.go
git add cmd/ && git commit -m "Backend only"
git push origin main

# Wait, check: does backend restart? (should yes)
# Check: does frontend change? (should no, no rebuild)
```

---

## Step 4: Environment Variable Checklist

Before any deploy, verify these are set/used correctly:

### Frontend (in code)

```javascript
// frontend/src/lib/analytics.js
const key = process.env.VITE_POSTHOG_KEY
if (!key) { return }  // Silent fail if missing

// Test: check bundle
grep -n "phc_" frontend/dist/assets/*.js
// Should find key embedded (not placeholder)
```

### Backend (in code)

```go
// internal/api/auth.go
secret := os.Getenv("AUTH_SECRET")
if len(secret) < 32 {
    return nil, fmt.Errorf("AUTH_SECRET too short")  // Fail-closed
}
```

### Render Dashboard

Set exactly these:
- DATABASE_URL (from Supabase)
- AUTH_SECRET (random 32+ chars)
- ADMIN_TOKEN (random string)
- WHOP_PLAN_ID (from Whop)
- WHOP_WEBHOOK_SECRET (from Whop)

**Do NOT set:**
- VITE_* vars (frontend doesn't see them)
- FRONTEND_* vars (meaningless)

---

## Step 5: CI/CD Automation (GitHub Actions)

**Create: .github/workflows/deploy.yml**

```yaml
name: Deploy Frontend & Backend

on:
  push:
    branches: [main]

jobs:
  frontend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: cd frontend && npm ci && npm run build
      - run: |
          rm -rf docs/assets
          cp -r frontend/dist/. docs/
          test -f docs/CNAME || exit 1  # Fail if CNAME missing
      - run: git config user.name "CI" && git config user.email "ci@example.com"
      - run: |
          if [ -z "$(git status --porcelain)" ]; then
            echo "No changes"
            exit 0
          fi
          git add docs/
          git commit -m "Deploy frontend [skip ci]"
          git push origin main
        if: github.event_name == 'push'

  backend:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-go@v4
        with:
          go-version: '1.22'
      - run: go mod tidy && go build -o bin/server cmd/server/main.go
      # GitHub sees new commit, Render auto-deploys (no action needed)
```

---

## Real Example: Grandimi Disaster

### What Went Wrong

```
Day 1:
  ✓ Backend env vars set on Render
  ✗ Frontend env vars set on Render (useless)
  ✗ Frontend not rebuilt after env var change
  → Analytics key missing from frontend
  → Analytics silent-fails
  → Team doesn't notice for weeks

Day 9 (this session):
  ✓ Discovered frontend built on dev machine only
  ✓ Rebuilt frontend with correct env vars
  ✓ Deployed docs/ to GitHub Pages
  ✓ Analytics now working
```

### How It Was Fixed

1. **Understood separation:** Frontend = GitHub Pages, Backend = Render
2. **Created build script:**
   ```bash
   npm run build
   cp -r frontend/dist/. docs/
   git commit docs/
   ```
3. **Verified key in bundle:**
   ```bash
   grep phc_ docs/assets/*.js
   # Should print actual key
   ```
4. **Documented in deployment guide**

---

## Checklist: Multi-Target Deployment

- [ ] Document where each target lives (docs/ vs cmd/)
- [ ] Separate build & deploy commands for each
- [ ] Frontend env vars in `.env.production` (VITE_ prefix)
- [ ] Backend env vars in Render dashboard (or .env locally)
- [ ] Rebuild frontend when VITE_* changes
- [ ] Verify keys in bundle after build
- [ ] Test independent deploy (frontend without backend, vice versa)
- [ ] CI/CD auto-rebuilds frontend on main push
- [ ] Render auto-deploys backend on main push
- [ ] Document: "When you change X, run these steps"

---

## Lessons

1. **Different build times = different caches**
   - Frontend: inlines env vars at build time (one-time)
   - Backend: reads env vars at runtime (per-deploy)

2. **Two deploy pipelines, not one**
   - Manual frontend rebuild + commit
   - Auto backend redeploy
   - They're independent!

3. **Test each independently**
   - "Does frontend work without backend changes?" → Yes
   - "Does backend work without frontend changes?" → Yes

4. **Document like it's infrastructure**
   - Team must know which env vars go where
   - New dev won't guess "Render env vars don't reach frontend"

---

## Status

✅ Applied to Grandimi 2026-09-09  
✅ Frontend rebuilt with correct key  
✅ GitHub Pages deployment working  
✅ Backend auto-deploy working  
✅ Documented in this skill  

---

*End of skill.*
