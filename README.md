# 📏 Grandimi - Height Prediction API

Backend Go pour prédire la taille adulte maximale des enfants/jeunes basé sur l'algorithme **Khamis-Roche**.

## 🚀 Démarrage rapide

### Prérequis
- Go 1.22+
- Docker (optionnel)

### Installation locale

```bash
# Clone et initialise
git clone <repo>
cd grandimi
go mod download

# Lance le serveur
go run cmd/server/main.go

# API disponible sur http://localhost:8080
```

### Tests

```bash
go test ./...
```

## 📡 API Endpoints

### 1. Health Check
```
GET /health
```

**Response:**
```json
{
  "status": "ok",
  "app": "Grandimi Height Estimator API"
}
```

### 2. Prédiction de taille
```
POST /api/v1/predict-height
```

**Request Body:**
```json
{
  "age": 14.5,
  "sex": "M",
  "height_cm": 162.0,
  "weight_kg": 52.0,
  "father_height_cm": 178.0,
  "mother_height_cm": 164.0,
  "puberty_signs": {
    "pubic_hair": "2",
    "breast_develop": "",
    "genitalia": "2",
    "axillary_hair": "1",
    "menarche": false
  }
}
```

**Response:**
```json
{
  "predicted_height_cm": 178.5,
  "confidence_range": {
    "min": 175.5,
    "max": 181.5
  },
  "confidence_level": "high",
  "puberty_stage": "Mid puberty",
  "message": "Height prediction successful"
}
```

## 🔧 Architecture

```
grandimi/
├── cmd/
│   └── server/
│       └── main.go                 # Entry point
├── internal/
│   ├── api/
│   │   └── handlers.go            # HTTP handlers
│   └── estimator/
│       ├── khamis_roche.go        # Algorithme principal
│       └── khamis_roche_test.go   # Tests
├── go.mod
└── Dockerfile
```

## 📊 Algorithme Khamis-Roche

Formule déterministe qui utilise :
- **Données de l'enfant** : âge, sexe, taille, poids
- **Données parentales** : taille père + mère
- **Signaux de puberté** : Tanner stages (1-5)
- **Coefficients age-specific** : Optimisés par recherche clinique

**Précision** : ±3 à ±6cm selon l'âge et les données disponibles

### Étapes de puberté (Tanner)
- `N` ou `1`: Pré-puberté
- `2`: Puberté précoce
- `3`: Puberté moyenne
- `4`: Puberté avancée
- `5`: Complètement développé

## 📦 Docker

```bash
# Build
docker build -t grandimi:latest .

# Run
docker run -p 8080:8080 grandimi:latest

# Avec variables d'env
docker run -e PORT=3000 -p 3000:3000 grandimi:latest
```

## 🌍 Déploiement

### AWS ECS
```bash
# Push to ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ecr-url>
docker tag grandimi:latest <ecr-url>/grandimi:latest
docker push <ecr-url>/grandimi:latest
```

### Railway / Fly.io
```bash
# Railway
railway up

# Fly.io
fly deploy
```

## 🔐 Variables d'environnement

```env
PORT=8080                    # Port du serveur (default: 8080)
GIN_MODE=release            # release ou debug
```

## 📈 Prochaines étapes

- [ ] Authentification JWT
- [ ] Database PostgreSQL
- [ ] Gestion des profils utilisateur
- [ ] Intégration Stripe
- [ ] Rapports personnalisés
- [ ] Programme 7 jours

---

**Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>**
