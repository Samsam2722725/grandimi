# 🧪 FRONTEND 1+2 — PARCOURS COMPLET À TESTER

## Lancer le frontend

```bash
cd frontend
npm install        # Une fois
npm run dev        # À chaque session
```

Ouvre : **http://localhost:5173**

---

## Flux à tester (10 min)

### ✅ Étape 1 : Page d'accueil
- [ ] Logo Grandimi visible
- [ ] Titre "Comprends ton potentiel de croissance"
- [ ] 3 étapes (Comment ça marche)
- [ ] 3 cartes (Notre différence)
- [ ] FAQ avec accordéons (5 questions)
- [ ] Disclaimer orange
- [ ] Footer

**Action** : Clique sur "Estimer ma taille adulte"

---

### ✅ Étape 2 : Questionnaire (5 étapes)

**Étape 1 - Âge et sexe :**
- [ ] Input âge (tape 14.5)
- [ ] Radio Masculin ou Féminin (sélectionne un)
- [ ] Bouton Suivant s'active
- [ ] Barre progress "Étape 1 sur 5"

**Étape 2 - Mesures :**
- [ ] Input taille (tape 165)
- [ ] Input poids (tape 55)
- [ ] Bouton Suivant s'active
- [ ] Progress "Étape 2 sur 5"

**Étape 3 - Parents :**
- [ ] Input père (tape 180)
- [ ] Input mère (tape 165)
- [ ] Bouton Suivant s'active
- [ ] Progress "Étape 3 sur 5"

**Étape 4 - Puberté :**
- [ ] Selects Tanner 1-5
- [ ] Si garçon : génitalia select
- [ ] Si fille : seins select + ménarche checkbox
- [ ] Bouton Suivant s'active
- [ ] Progress "Étape 4 sur 5"

**Étape 5 - Vérification :**
- [ ] Résumé 6 champs affichés
- [ ] Bouton "Obtenir ma prédiction"
- [ ] Progress "Étape 5 sur 5"

**Action** : Clique "Obtenir ma prédiction" → attends 1.5s (mock API)

---

### ✅ Étape 3 : Page de résultats

**Hero section :**
- [ ] Grande affichage "178.5 cm" (ou autre)
- [ ] Badge "Confiance : Élevée"
- [ ] Fond gradient vert

**Intervalle de confiance :**
- [ ] Min : 175.5 cm
- [ ] Max : 181.5 cm
- [ ] Barre visuelle avec indicateur

**Disclaimer :**
- [ ] Alerte orange : "Une estimation n'est pas une garantie"

**Limitations (accordéon) :**
- [ ] Clique "Voir les limites"
- [ ] 5 limitations affichées
- [ ] Sources mentionnées
- [ ] Clique "Masquer" (referme)

**CTA :**
- [ ] Bouton "Voir mon plan de croissance"

**Actions possibles :**
- [ ] Clique "Retour" → retour accueil

---

### ✅ Étape 4 : Plan de croissance 12 mois

**Onglets :**
- [ ] "Aperçu" ← actif par défaut
- [ ] "Timeline"
- [ ] "Exercices"
- [ ] "Nutrition"
- [ ] "Sommeil"

**Onglet Aperçu :**
- [ ] Message motivation
- [ ] 4 cards : croissance, exercices, suppléments, sommeil
- [ ] Alerte info

**Onglet Timeline :**
- [ ] Voir 4 phases (mois 1, 3, 6, 12)
- [ ] Chaque phase affiche focus + actions
- [ ] Croissance attendue par phase

**Onglet Exercices :**
- [ ] 3 exercices : spinal, wall angels, hanging
- [ ] Durée + fréquence
- [ ] Lien "Voir le guide complet"

**Onglet Nutrition :**
- [ ] 4 cibles : calories, protéines, calcium, vitamin D
- [ ] Affichage en cards

**Onglet Sommeil :**
- [ ] Horaires : coucher (22:00), réveil (07:00), durée (8h)
- [ ] 5 conseils (chambre sombre, température, silence, etc.)

**Suppléments (visibles partout) :**
- [ ] 3 cartes : calcium+D, zinc, magnésium
- [ ] Dosages + fréquence

**CTA final :**
- [ ] Bouton "Commencer mon parcours"
- [ ] Retour accueil après

---

## ✅ Checklist finale

- [ ] Aucune erreur console (F12)
- [ ] Pas de bouton cassé
- [ ] Navigation fluide partout
- [ ] Texte français correct
- [ ] Couleurs : vert profond, blanc cassé, anthracite
- [ ] Responsive mobile (DevTools → 375px) : tout lisible
- [ ] Desktop (1440px) : layout full
- [ ] Formulaires valides (requis → active bouton)
- [ ] Accordéons s'ouvrent/ferment
- [ ] Onglets switch sans rechargement
- [ ] Mock data affichée (après 1.5s attente)

---

## 🎯 Résumé parcours

**5 pages :**
1. HomePage (8 sections) ✅
2. QuestionnaireFlow (5 étapes) ✅
3. ResultsPage (prédiction + intervalle) ✅
4. GrowthPlanPage (5 onglets + timeline) ✅
5. Navigation retour partout ✅

**Temps complet :** ~10 minutes

---

**Succès = tout passe la checklist**

Rapporte tout bug/observation :
- Bouton qui ne marche pas
- Texte manquant
- Layout cassé
- Erreur console

Co-Authored-By: Claude Haiku 4.5 <noreply@anthropic.com>
