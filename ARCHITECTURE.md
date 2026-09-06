# 🏗️ Architecture Backend - Grandimi

## Vue d'ensemble

Grandimi est un **API REST lean** construit en **Go** pour prédire la taille adulte maximale des enfants/jeunes.

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Frontend)                     │
└──────────────────────┬──────────────────────────────────┘
                       │
                       ↓
        ┌──────────────────────────────┐
        │   API REST (Gin Framework)   │
        │  POST /api/v1/predict-height │
        └───────────────┬──────────────┘
                        │
                        ↓
        ┌────────────────────────────────┐
        │   Validation Layer             │
        │ - Input sanitization           │
        │ - Range checks                 │
        │ - Sex/Age validation           │
        └───────────────┬────────────────┘
                        │
                        ↓
        ┌────────────────────────────────┐
        │  Khamis-Roche Algorithm        │
        │  - Coefficients lookup         │
        │  - Math computation            │
        │  - Puberty adjustment          │
        │  - Confidence calculation      │
        └───────────────┬────────────────┘
                        │
                        ↓
        ┌────────────────────────────────┐
        │  Response Formatter            │
        │  - JSON marshalling            │
        │  - HTTP status codes           │
        └──────────────────────────────────┘
```

## 📁 Structure des fichiers

```
grandimi/
├── cmd/
│   └── server/
│       └── main.go                 # Point d'entrée
│                                   # - Initialise Gin
│                                   # - Configure les routes
│                                   # - Lance le serveur
│
├── internal/
│   ├── api/
│   │   └── handlers.go            # HTTP Handlers
│   │                              # - PredictHeight endpoint
│   │                              # - HealthCheck endpoint
│   │                              # - Request parsing/validation
│   │
│   └── estimator/
│       ├── khamis_roche.go        # Logique métier
│       │                          # - Algorithme Khamis-Roche
│       │                          # - Calcul coefficients
│       │                          # - Ajustements puberté
│       │                          # - Confidence scoring
│       │
│       └── khamis_roche_test.go   # Tests unitaires
│                                  # - Validation des calculs
│                                  # - Tests de confiance
│                                  # - Edge cases
│
├── examples/
│   ├── predict.json              # Exemple de requête
│   └── test.sh                   # Scripts de test cURL
│
├── go.mod                         # Dépendances Go
├── go.sum                         # Checksums
├── Dockerfile                     # Image Docker
├── Makefile                       # Commands utiles
├── README.md                      # Documentation
└── .gitignore                     # Git configuration
```

## 🔄 Flow de données

### Request Flow
```
1. Client POST /api/v1/predict-height
   ├─ Headers: Content-Type: application/json
   └─ Body: PredictHeightRequest

2. Gin Router
   └─ Route matching → handlers.PredictHeight()

3. Request Parsing
   ├─ JSON unmarshalling
   ├─ Input validation (Gin bindings)
   └─ Field conversion

4. Business Logic
   ├─ estimator.HeightPredictionRequest construction
   ├─ estimator.PredictHeight() call
   └─ Response build

5. JSON Response
   ├─ HTTP 200 OK
   └─ Body: HeightPredictionResponse
```

### Algorithme Khamis-Roche
```
Input:
├─ Age (8-18 ans)
├─ Sex (M/F)
├─ Height (cm)
├─ Weight (kg)
├─ Father Height (cm)
├─ Mother Height (cm)
└─ Puberty Signs (Tanner stages)

Process:
1. Input Validation
   └─ Range checks pour tous les champs

2. Mid-Parent Height Calculation
   ├─ Moyenne: (H_père + H_mère) / 2
   ├─ Ajustement sexe:
   │  ├─ Mâle: +6.5 cm
   │  └─ Femelle: -6.5 cm
   └─ Utilisé comme variable prédictive

3. Coefficients Lookup
   ├─ Récupère coeff_age_spécifique[age][sex]
   └─ Coefficients:
      ├─ Intercept
      ├─ HeightCoeff (0.4-0.7)
      ├─ WeightCoeff (0.05-0.17)
      └─ MidParentCoeff (0.54-0.67)

4. Formula:
   Predicted Height = 
     Intercept +
     (HeightCoeff × Current Height) +
     (WeightCoeff × Weight) +
     (MidParentCoeff × Mid Parent Height)

5. Puberty Adjustment
   ├─ Tanner stage → multiplier (0.98-1.05)
   └─ Predicted Height *= multiplier

6. Confidence Range
   ├─ Age < 10:  ±6.0 cm
   ├─ Age 10-13: ±4.5 cm
   ├─ Age 13-16: ±3.0 cm
   └─ Age > 16:  ±2.0 cm

7. Confidence Level
   ├─ HIGH: age 13-16 + Tanner 2-4
   ├─ MEDIUM: age 10-13 + Tanner ≥ 1
   └─ LOW: autres cas

Output:
├─ Predicted Height (cm)
├─ Confidence Range [min, max]
├─ Confidence Level string
├─ Puberty Stage
└─ Message
```

## 🧪 Testing Strategy

```
Unit Tests
├─ Valid inputs → Correct predictions
├─ Age validation → Rejection < 8 or > 18
├─ Height validation → Rejection < 100 or > 210
├─ Sex validation → Only M/F accepted
├─ Confidence scoring → HIGH/MEDIUM/LOW levels
└─ Puberty adjustments → Stage-specific multipliers

Integration Tests (futur)
├─ Full API request/response
├─ Error handling
└─ Edge cases

Performance Tests (futur)
├─ Prediction latency
└─ Concurrent requests
```

## 📊 Données & Coefficients

**Coefficients Khamis-Roche** basés sur:
- Recherche clinique (Khamis & Roche, 1994)
- 1,000+ mesures d'enfants
- Validé pour:
  - Âges: 8-18 ans
  - Précision: ±3 à ±6 cm
  - Populations: Caucasienne, Africaine, Asiatique

**Tanner Stages** pour puberté:
- N/1: Pré-puberté (immature)
- 2: Puberté précoce (début changements)
- 3: Puberté moyenne (croissance rapide)
- 4: Puberté avancée (presque maturité)
- 5: Complètement développé (croissance terminée)

## 🚀 Scalabilité

### Actuellement (MVP)
- Single Go process
- No database
- All computations in-memory
- Stateless

### Phase 2 (Croissance)
- Load balancer (nginx)
- Multiple instances
- Redis cache (résultats fréquents)
- PostgreSQL (profils utilisateur)

### Phase 3 (Production $10k/day)
- Kubernetes (auto-scaling)
- API Gateway
- Database sharding
- Analytics pipeline
- Payment gateway (Stripe)

## 🔐 Sécurité

```
✓ Input validation (tous les champs)
✓ Type checking (compile-time)
✓ Range validation (8-18 ans)
✓ CORS middleware
✓ Error handling (no stack traces)
✓ Stateless (no auth secrets)

TODO:
□ Rate limiting
□ Request signing
□ API authentication
□ HTTPS/TLS
□ WAF rules
```

## 📈 Monitoring

```
Health Endpoint: GET /health
├─ Status: ok/error
└─ Uptime check

Metrics (futur):
├─ Predictions/sec
├─ Response time (p50, p95, p99)
├─ Error rate
├─ Confidence level distribution
└─ Age/sex demographics
```

---

**Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>**
