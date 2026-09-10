# Skill: Version & Validate Database Schema in Git

**Category:** Backend / DevOps  
**Complexity:** Medium  
**Time:** 2-3 hours setup, saves 10+ hours debugging  
**Last Updated:** 2026-09-09

---

## Problem This Solves

Database schema lives only in cloud UI, never versioned:

```
✗ Column password_hash missing → signup fails at runtime → 500 error
✗ Table webhook_logs missing → admin dashboard broken → 500 error
✗ Column type mismatch → NULL scanning fails → 500 error
✗ Production has real customers → downtime costs money
✗ Errors only discovered when code tries to use them (TOO LATE)
```

---

## Solution: Version Schema in migrations/ Folder

```
migrations/
  001_initial_schema.sql
  002_add_auth.sql
  003_fix_nullable_columns.sql
  004_add_indexes.sql
```

Each numbered file:
- Sequential (001, 002, 003...)
- Idempotent (safe to run twice with IF NOT EXISTS)
- Documented (comments explain why)
- Tracks ALL schema changes

---

## Step 1: Create migrations/ Folder

```bash
mkdir -p migrations
cd migrations
```

---

## Step 2: Write First Migration (001)

**File: migrations/001_password_hash.sql**

```sql
-- 001 — add password_hash column
--
-- PROBLEM: code tries to UPDATE users SET password_hash = ?, 
--          but column doesn't exist
--
-- SOLUTION: add column
--
-- TESTING: run this in Supabase SQL Editor, then test:
--   POST /api/v1/auth/signup → should 200, not 500

ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash text;

-- Validate: check column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name='users' AND column_name='password_hash';
-- Should print: password_hash
```

**How to execute:**
1. Log in to Supabase → Project → SQL Editor
2. Copy-paste entire file
3. Click Run
4. See "Query successful"
5. Test API: `curl -X POST https://grandimi-api.onrender.com/api/v1/auth/signup ...`

---

## Step 3: Document What Went Wrong

Add to each migration file:

```sql
-- ERRORS THAT TRIGGERED THIS MIGRATION:
--
-- Error in logs:
--   [signup] UpdateUserPassword: pq: column "password_hash" of relation "users" does not exist
--
-- When discovered:
--   2026-09-09 during security audit
--
-- Impact:
--   ✗ Nobody could create accounts
--   ✗ Production 500 errors
--   ✗ Real customers couldn't sign up
--
-- Root cause:
--   Schema created manually in Supabase UI, never committed to git
--   New column added in code but not in database
```

---

## Step 4: Validate Schema Matches Code

**Create: scripts/validate_schema.sh**

```bash
#!/bin/bash
# Ensure database schema matches what code expects

set -e

echo "Checking schema..."

# Expected tables
TABLES=(users predictions subscriptions webhook_logs)

# Expected columns in 'users'
USERS_COLUMNS=(
  id
  email
  is_premium
  password_hash
  whop_customer_id
  whop_subscription_id
  consent_parental
  created_at
)

# Query: does each column exist?
for col in "${USERS_COLUMNS[@]}"; do
  RESULT=$(psql $DATABASE_URL -c \
    "SELECT column_name FROM information_schema.columns 
     WHERE table_name='users' AND column_name='$col';" \
    2>/dev/null || echo "")
  
  if [ -z "$RESULT" ]; then
    echo "❌ MISSING: users.$col"
    echo "   Run: migrations/$(ls migrations | tail -1)"
    exit 1
  fi
done

echo "✅ Schema valid"
```

Run before deploy:
```bash
bash scripts/validate_schema.sh
```

---

## Step 5: Document All Expected Tables & Columns

**Create: docs/SCHEMA.md**

```markdown
# Database Schema

## Table: users

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| email | text | NO | | Unique |
| is_premium | boolean | YES | false | |
| password_hash | text | YES | | bcrypt hash |
| whop_customer_id | text | YES | | From Whop API |
| whop_subscription_id | text | YES | | From Whop API |
| consent_parental | boolean | YES | false | Age verification |
| created_at | timestamptz | YES | now() | |

## Table: predictions

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | uuid | NO | gen_random_uuid() | Primary key |
| user_id | uuid | NO | | Foreign key: users(id) |
| age | float | NO | | Years |
| sex | text | NO | | 'M' or 'F' |
| height_cm | float | NO | | Current height |
| predicted_height | float | NO | | Estimated adult height |
| confidence_level | text | NO | | 'low', 'medium', 'high' |
| created_at | timestamptz | YES | now() | |

[... continue for each table ...]
```

Reference this in code reviews:
- "New column must be documented in docs/SCHEMA.md"
- "Migration must be in migrations/ before merge to main"

---

## Step 6: CI/CD Integration (Optional)

**Dockerfile (if using Docker):**

```dockerfile
# ... existing build ...

# Validate schema before starting service
RUN bash scripts/validate_schema.sh

CMD ["./binary"]
```

**GitHub Actions (if using CI):**

```yaml
name: Validate Schema
on: [pull_request]
jobs:
  schema:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Check migrations exist
        run: ls -1 migrations/ | wc -l | grep -qv '^0$'
      - name: Validate schema
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}
        run: bash scripts/validate_schema.sh
```

---

## Real Example: Grandimi

### The Errors

```
2026-09-09 production errors:
  ✗ pq: column "password_hash" of relation "users" does not exist
  ✗ pq: relation "webhook_logs" does not exist
  ✗ sql: Scan error converting NULL to string
```

### The Cause

```go
// Code expects these columns:
UPDATE users SET password_hash = ?
SELECT ... FROM webhook_logs
SELECT expires_at FROM subscriptions
// But database didn't have them
```

### The Solution

```
migrations/001_password_hash.sql ← adds column
migrations/002_webhook_logs.sql ← creates table
migrations/003_fix_nullable_columns.sql ← adds COALESCE
```

**Cost:** 3 hours to write migrations + validate  
**Benefit:** Prevents future 500 errors on prod

---

## Checklist Before Deploying New Feature

- [ ] New column? → Add to migrations/00X_*.sql
- [ ] New table? → Add to migrations/00X_*.sql
- [ ] New code references column? → Run validate_schema.sh locally
- [ ] Migration documented? → Include error that triggered it
- [ ] Tested locally? → Actually run the migration, test API
- [ ] docs/SCHEMA.md updated? → Matches code expectations

---

## Lessons Learned

1. **Schema must be versioned**
   - UI-only schemas are invisible to code review
   - Errors happen at runtime, not at review time

2. **Migrations must be idempotent**
   - `IF NOT EXISTS` prevents re-run errors
   - Safe to apply multiple times

3. **Test migrations locally first**
   - Run against staging DB before production
   - Catch typos/syntax before breaking real data

4. **Document the error that triggered each migration**
   - "Why was this needed?" helps future maintainers
   - Links code changes to schema changes

5. **Validate schema in CI/CD**
   - Don't wait for runtime errors
   - Fail deployment if schema invalid

---

## File Checklist

```
✅ migrations/
  ✅ 001_password_hash.sql
  ✅ 002_webhook_logs.sql
  ✅ 003_normaliser_emails.sql

✅ docs/SCHEMA.md
  ✅ All tables documented
  ✅ All columns with types

✅ scripts/validate_schema.sh
  ✅ Checks each expected column
  ✅ Exits with error if missing

✅ Code reviews check:
  ✅ "New DB code → new migration?"
  ✅ "Migration idempotent?"
  ✅ "Schema.md updated?"
```

---

## Status

✅ Applied to Grandimi 2026-09-09  
✅ migrations/ folder created  
✅ 3 migrations documented & waiting for manual execution  
✅ docs/SCHEMA.md created  

---

*End of skill.*
