# Skill: Audit & Fix Data Exposure Vulnerabilities

**Category:** Security / API  
**Complexity:** High  
**Time:** 1-2 hours per service  
**Last Updated:** 2026-09-09

---

## Problem This Solves

APIs leak sensitive data because routes accept identifiers from URLs/query params without authentication:

```bash
GET /api/predictions?email=child@example.com → Age, height, weight, parents' heights (EXPOSED)
GET /api/check-premium?user_id=123 → Subscription status (EXPOSED)
```

---

## Audit Checklist

### 1. Identify All Sensitive Data Routes

```bash
# Find all GET/POST routes that could leak PII
grep -rn "Query\|Param" cmd/server/main.go
grep -rn "GetHeader.*Authorization" internal/api/*.go

# Flag routes that:
# - Accept user/email/id in URL/query
# - Return personal data
# - Have no auth middleware
```

### 2. Trace Each Route for Auth

**Question for every route returning personal data:**

| Route | Accepts ID From | Auth? | Data Returned | Risk |
|---|---|---|---|---|
| GET /api/predictions | ?email=x | ❌ NO | {age, height, weight} | 🔴 CRITICAL |
| GET /api/check-premium | ?user_id=x | ❌ NO | {is_premium} | 🟡 HIGH |
| GET /api/user/:id | URL param | ❌ NO | {email, created_at} | 🔴 CRITICAL |

### 3. Design Proper Authentication

```go
// WRONG: Trusts URL parameter
func GetUserData(c *gin.Context) {
    userID := c.Query("user_id")  // ← Attacker supplies this
    user, _ := db.GetUser(userID)
    return user
}

// RIGHT: Trusts session only
func GetUserData(c *gin.Context) {
    userID := c.GetString("userID")  // ← From token middleware
    user, _ := db.GetUser(userID)
    return user
}
```

### 4. Implement Token System

**Minimum requirements:**

- [ ] Sign tokens (HMAC-SHA256, not plain hash)
- [ ] Include expiration (30 days typical)
- [ ] Compare with constant-time function (`hmac.Equal`)
- [ ] Fail-closed: no token = 401, not open access
- [ ] Store secret in env var, not code
- [ ] Never log the token

**Code template:**

```go
// auth.go
func GenerateToken(userID string) (string, error) {
    secret := os.Getenv("AUTH_SECRET")
    expiration := time.Now().Add(30 * 24 * time.Hour)
    message := userID + "." + strconv.FormatInt(expiration.Unix(), 10)
    
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(message))
    signature := base64.StdEncoding.EncodeToString(mac.Sum(nil))
    
    return message + "." + signature, nil
}

func ParseToken(token string) (string, error) {
    parts := strings.Split(token, ".")
    if len(parts) != 3 { return "", ErrInvalid }
    
    userID, expStr, signature := parts[0], parts[1], parts[2]
    
    // Verify signature
    secret := os.Getenv("AUTH_SECRET")
    mac := hmac.New(sha256.New, []byte(secret))
    mac.Write([]byte(userID + "." + expStr))
    expected := base64.StdEncoding.EncodeToString(mac.Sum(nil))
    
    if !hmac.Equal([]byte(signature), []byte(expected)) {
        return "", ErrInvalid
    }
    
    // Check expiration
    exp, _ := strconv.ParseInt(expStr, 10, 64)
    if time.Now().Unix() > exp {
        return "", ErrExpired
    }
    
    return userID, nil
}

// middleware.go
func AuthMiddleware() gin.HandlerFunc {
    return func(c *gin.Context) {
        token := c.GetHeader("Authorization")
        token = strings.TrimPrefix(token, "Bearer ")
        
        userID, err := ParseToken(token)
        if err != nil {
            c.JSON(401, gin.H{"error": "invalid session"})
            c.Abort()
            return
        }
        
        c.Set("userID", userID)
        c.Next()
    }
}
```

### 5. Rewrite Routes to Use Session

```go
// BEFORE
func GetPredictions(c *gin.Context) {
    email := c.Query("email")  // ← User supplies
    predictions := db.GetByEmail(email)
    c.JSON(200, predictions)
}

// AFTER
protected := router.Group("")
protected.Use(AuthMiddleware())
{
    protected.GET("/api/predictions", func(c *gin.Context) {
        userID := c.GetString("userID")  // ← From session
        predictions := db.GetByUserID(userID)
        c.JSON(200, predictions)
    })
}
```

### 6. Fix Other Common Leaks

**CORS:** Restrict to your domain

```go
var allowedOrigins = map[string]bool{
    "https://example.com": true,
    "http://localhost:3000": true,
}

c.Writer.Header().Set("Access-Control-Allow-Origin", 
    allowedOrigins[c.GetHeader("Origin")])
```

**Rate Limiting:** Prevent brute force on login

```go
router.POST("/login", RateLimit(10, 15*time.Minute), LoginHandler)
```

**Secrets in Logs:** Never printf() API keys

```go
// ❌ WRONG
fmt.Printf("Token: %s\n", secret)

// ✅ RIGHT
if hmac.Equal([]byte(provided), []byte(expected)) {
    // matched — don't print either
}
```

---

## Validation

After fixing, test each endpoint:

```bash
# 1. Without token → should 401
curl https://api.example.com/api/user/predictions
# → 401 Unauthorized

# 2. With invalid token → should 401
curl -H "Authorization: Bearer invalid" \
  https://api.example.com/api/user/predictions
# → 401 Unauthorized

# 3. With valid token → should 200
TOKEN=$(curl -X POST .../login -d '{"email":"...","password":"..."}' | jq .token)
curl -H "Authorization: Bearer $TOKEN" \
  https://api.example.com/api/user/predictions
# → 200 with data
```

---

## Real Impact (Grandimi Example)

### Exposed Data
```bash
GET /api/user/predictions?email=enfant@example.com
→ {
  "age": 14,
  "sex": "M",
  "height_cm": 165,
  "weight_kg": 55,
  "father_height_cm": 178,
  "mother_height_cm": 164,
  "predicted_height": 181.1
}
```

**Risk:** Anyone with email can access child's measurements  
**Real customers:** 2 premium accounts exposed before fix

### How Discovered
```bash
# Simple test in audit
curl https://grandimi-api.onrender.com/api/user/predictions?email=lucabandalo7@gmail.com
→ Returns everything (EXPOSED)
```

### Fix Applied
- Implemented HMAC-SHA256 tokens
- Added AuthMiddleware to protected routes
- Changed endpoints to use session, not URL params
- Tested: 401 without token, 200 with valid token

---

## Files to Check in Your Project

```go
// Review these for data leaks
internal/api/handlers.go
  - All endpoints returning user data
  - Check: does route read ID from c.Query() or c.Param()?
  
internal/api/whop_handlers.go
  - CheckPremium, webhook handlers
  - Check: are they verifying signatures?
  
cmd/server/main.go
  - Which routes have middleware?
  - Are protected routes using it?
  
internal/api/auth.go
  - Token generation and validation
  - Are tokens time-limited?
```

---

## Deployment Checklist

- [ ] Tokens implemented and tested locally
- [ ] AuthMiddleware added to protected routes
- [ ] All sensitive routes return 401 without token
- [ ] Tokens expire (test after expiration)
- [ ] No secrets in logs (grep for token, key, password)
- [ ] CORS restricted to your domain
- [ ] Rate limiting on login/signup
- [ ] Test admin panel requires auth
- [ ] Production env vars set (AUTH_SECRET, etc.)

---

## Lessons

1. **Trust session, not URL:** c.GetString("userID") not c.Query("user_id")
2. **Always sign tokens:** sha256(data + constant) is predictable
3. **Fail closed:** No auth = 401, not open access
4. **Time limit tokens:** 30 days typical, 7 days for sensitive ops
5. **Constant-time comparison:** Use hmac.Equal, not ==

---

## Status

✅ Applied to Grandimi 2026-09-09  
✅ Commit: cd1759c  
✅ All routes now require authentication  
✅ CORS restricted to grandimi.com  

---

*End of skill.*
