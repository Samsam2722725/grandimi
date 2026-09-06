# 🚀 Guide de Déploiement - Grandimi

## 1️⃣ Développement Local

### Installation

```bash
# Clone le repo
git clone <repo> grandimi
cd grandimi

# Copie la config
cp .env.example .env

# Télécharge les dépendances
go mod download

# Lance le serveur
make dev
# OU
go run cmd/server/main.go
```

### Test l'API

```bash
# Health check
curl http://localhost:8080/health

# Prédiction de taille
curl -X POST http://localhost:8080/api/v1/predict-height \
  -H "Content-Type: application/json" \
  -d @examples/predict.json | jq .

# OU utilise le script
bash examples/test.sh
```

## 2️⃣ Docker Local

```bash
# Build l'image
make docker-build

# Lance le container
make docker-run

# Test depuis le container
curl http://localhost:8080/health
```

## 3️⃣ Déploiement Cloud

### Option A: Railway (Recommandé pour MVP)

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login
railway login

# Deploy
cd grandimi
railway up

# Get URL
railway domain
```

**Avantages:**
- ✅ Deploy ultra-simple (1 cmd)
- ✅ Auto-scaling
- ✅ Domain HTTPS inclus
- ✅ Logs en temps réel
- ✅ $5/mois minimum

### Option B: Fly.io

```bash
# Install Fly CLI
curl https://fly.io/install.sh | sh

# Login
fly auth login

# Launch
cd grandimi
fly launch --image grandimi:latest

# Deploy
fly deploy
```

**Avantages:**
- ✅ Edge computing (ultra-rapide)
- ✅ Multi-régions
- ✅ Performance optimale

### Option C: AWS ECS + Fargate

```bash
# 1. Créer ECR repository
aws ecr create-repository --repository-name grandimi

# 2. Login ECR
aws ecr get-login-password | docker login --username AWS --password-stdin <ECR_URL>

# 3. Build & Push
docker build -t grandimi:latest .
docker tag grandimi:latest <ECR_URL>/grandimi:latest
docker push <ECR_URL>/grandimi:latest

# 4. Créer ECS cluster (via AWS Console)
# - Fargate launch type
# - 0.25 CPU, 512 MB RAM (pour MVP)
# - Auto-scaling min=1, max=10

# 5. Service se scale automatiquement avec la charge
```

**Avantages:**
- ✅ Scalabilité enterprise
- ✅ RDS database support
- ✅ Load balancer inclus
- ✅ $0.0117/hour pour Fargate

### Option D: Render.com (Gratuit pour tester)

```bash
# 1. Connect GitHub
# https://render.com/

# 2. Créer New Web Service
# - Repository: grandimi
# - Build command: go build -o bin/server cmd/server/main.go
# - Start command: ./bin/server
# - Environment: PORT=10000

# 3. Deploy automatique à chaque push
```

## 4️⃣ Configuration Production

### Environnement

```env
PORT=8080
GIN_MODE=release              # Désactiver debug logs
DB_URL=postgresql://...       # (futur)
STRIPE_KEY=sk_live_...        # (futur)
JWT_SECRET=your_secret_key    # (futur)
```

### HTTPS/TLS
- Railway: Auto inclus ✅
- Fly.io: Auto inclus ✅
- AWS: CloudFront + ACM
- Render: Auto inclus ✅

### Monitoring

```bash
# Logs (Railway)
railway logs

# Logs (Fly.io)
fly logs

# Logs (AWS)
aws logs tail /ecs/grandimi --follow
```

## 5️⃣ Performance Check

### Load Test
```bash
# Install Apache Bench
brew install httpd  # macOS
apt-get install apache2-utils  # Linux

# Test 1000 requêtes, 10 concurrent
ab -n 1000 -c 10 http://localhost:8080/health

# Test avec données
ab -n 1000 -c 10 -p examples/predict.json \
  -T application/json \
  http://localhost:8080/api/v1/predict-height
```

### Expected Performance (Go)
- ✅ ~10,000 req/sec sur 1 CPU
- ✅ ~5ms latency (p50)
- ✅ ~10ms latency (p95)
- ✅ ~20ms latency (p99)

## 6️⃣ Checklist Pré-Production

- [ ] `.env` configuré
- [ ] `GIN_MODE=release`
- [ ] Tests passent: `go test ./...`
- [ ] Docker build OK: `make docker-build`
- [ ] Load tests OK: ab -n 10000 -c 50
- [ ] Logs structurés
- [ ] CORS configuré
- [ ] Domain HTTPS
- [ ] Monitoring actif
- [ ] Backup strategy

## 7️⃣ CI/CD Pipeline

### GitHub Actions (`.github/workflows/deploy.yml`)

```yaml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - uses: actions/setup-go@v4
        with:
          go-version: 1.22
      
      - run: go test ./...
      
      - run: docker build -t grandimi:latest .
      
      - run: |
          echo ${{ secrets.RAILWAY_TOKEN }} | railway login
          railway up
```

## 🆘 Troubleshooting

### Port déjà utilisé
```bash
# Trouver le process
lsof -i :8080
# Kill
kill -9 <PID>
# OU utiliser un autre port
PORT=3000 make dev
```

### Module not found
```bash
go mod tidy
go mod download
```

### Docker build échoue
```bash
# Clean build
docker build --no-cache -t grandimi:latest .
```

### API ne répond pas
```bash
# Test direct
curl http://localhost:8080/health -v
# Check logs
go run cmd/server/main.go 2>&1 | grep -i error
```

---

**Prochaines étapes:**
1. ✅ Estimateur de taille (DONE)
2. ⏭️ Database + authentification
3. ⏭️ Intégration Stripe
4. ⏭️ Dashboard frontend

**Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>**
