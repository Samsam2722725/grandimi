# 📏 Grandimi - Height Prediction API

Backend Go pour estimer la taille adulte des enfants et adolescents à partir de la **méthode mi-parentale (Tanner)**, ajustée par les facteurs de mode de vie.

> **Note sur la méthode.** Le dépôt contient une implémentation de Khamis-Roche
> (`internal/estimator/khamis_roche.go`), mais ses coefficients ne sont pas
> calibrés : elle rend ~219 cm pour un garçon de 14 ans mesurant 165 cm. Sa
> sortie est donc **calculée puis ignorée** — seule sa valeur de confiance
> alimente la largeur de l'intervalle. Le chiffre affiché à l'utilisateur vient
> de la méthode mi-parentale. Ne réintroduisez « Khamis-Roche » dans aucun texte
> destiné au public tant que ces coefficients n'ont pas été remplacés par de
> vraies tables de référence.

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

## 📊 Méthode de calcul réellement appliquée

1. **Taille cible mi-parentale (Tanner)** : `(taille père + taille mère) / 2`,
   `+6,5 cm` pour un garçon, `−6,5 cm` pour une fille.
2. **Facteurs de mode de vie** : sommeil, nutrition et activité déclarés dans le
   questionnaire modulent cette cible dans une fourchette étroite autour de 1,0.
   Ils ne peuvent pas déplacer l'estimation de plusieurs dizaines de centimètres.
3. **Plancher** : l'estimation ne descend jamais sous la taille déjà atteinte.
   Sans cela, un adolescent de 183 cm se voyait annoncer 180,5 cm.
4. **Intervalle de confiance** : sa largeur dépend de l'âge, de la vitesse de
   croissance et du BMI — pas le point estimé. Être plus avancé en puberté ne
   rend pas plus grand, cela rend seulement la prédiction plus sûre.

**Précision** : ±3 à ±6 cm selon l'âge et les données disponibles.

Les stades de Tanner (réponses intimes) **ne sont plus collectés** : le gain
d'information était faible au regard de ce qu'on demandait à un mineur. La
croissance restante est estimée via la vitesse de croissance.

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
