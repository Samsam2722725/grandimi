# ⚡ Quick Start — Frontend Grandimi

## 1️⃣ Installation (une fois)

```powershell
cd C:\Users\Samue\Desktop\grandimi\frontend
npm install
```

**Durée** : ~30s (npm)

## 2️⃣ Lancement développement

```powershell
npm run dev
```

**Résultat** :
```
  ✓ built in 2.15s

  ➜  Local:   http://localhost:5173/
  ➜  press h + enter to show help
```

**Ouvre** : http://localhost:5173 dans ton navigateur  
**Mock API** : activé par défaut (aucun Go requis)

## 3️⃣ Build production

```powershell
npm run build
npm run preview
```

**Résultat** : `./dist/` prêt à déployer  
**Taille** : 206 kB JS + 19 kB CSS (gzip)

## 4️⃣ Lint & vérifications

```powershell
npm run lint
```

**Résultat** : 0 erreurs, 0 warnings

---

## 📋 Commandes disponibles

| Commande | Effet |
|----------|-------|
| `npm run dev` | Démarre Vite :5173 (HMR) |
| `npm run build` | Build production → ./dist/ |
| `npm run preview` | Teste build localement |
| `npm run lint` | Oxlint check src/ |

---

## 🎯 Tâches de test (pour toi ou ton équipe)

Voir `frontend/TESTING_TASKS.md` :
1. **Affichage accueil** : tous éléments visibles, français correct
2. **Questionnaire** : navigation 5 étapes, validation
3. **Responsive mobile** : lisible à 375px

---

## 📁 Structure clé

```
frontend/
├── src/
│   ├── pages/HomePage.jsx          # Accueil (8 sections)
│   ├── pages/QuestionnaireFlow.jsx # Questionnaire (5 étapes)
│   ├── styles/design-system.css    # Charte visuelle (variables)
│   ├── lib/api.js                  # Client API réel
│   └── lib/mock-api.js             # Mock développement
├── docs/design-system.md            # Charte complète
└── .env.development                 # Mock API activé
```

---

## 🔗 URLs utiles

| URL | Effet |
|-----|-------|
| http://localhost:5173 | Frontend dev (Vite) |
| http://localhost:8080/health | Backend Go (si lancé) |

---

## 🚀 Déploiement en 1 ligne

### Vercel
```powershell
npm install -g vercel
vercel
```

### Netlify
```powershell
npm run build
# Déploie ./dist/ sur Netlify Drop
```

---

## 🐛 Troubleshooting

### "Port 5173 déjà utilisé"
```powershell
# Tue le processus sur le port (PowerShell)
Get-Process node | Stop-Process
npm run dev
```

### "Erreur build"
```powershell
rm -r node_modules dist
npm install
npm run build
```

### "Mock API ne marche pas"
Vérifier `.env.development` :
```
VITE_USE_REAL_API=false
```

---

**Plus d'infos** : Voir `FRONTEND_1_LIVRAISON.md` et `docs/design-system.md`

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
