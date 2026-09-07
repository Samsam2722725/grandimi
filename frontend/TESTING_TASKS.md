# 🧪 3 Tâches de test sans explication

Pour valider le frontend Grandimi, teste ces trois choses **sans que je te dise où cliquer** :

## Tâche 1 : Affichage page d'accueil
**Objective :** Confirme que la page d'accueil s'affiche correctement.

1. Ouvre http://localhost:5173 dans le navigateur
2. Fais scroller de haut en bas
3. Vérifie que tu vois : titre principal, 3 étapes, 3 cartes différence, FAQ, footer

**Acceptation :** Tous les sections visibles, texte en français, couleurs appliquées.

---

## Tâche 2 : Lancer le questionnaire
**Objective :** Teste le flux questionnaire.

1. Sur la page d'accueil, clique sur un bouton "Estimer ma taille adulte"
2. Remplis l'étape 1 (âge 14.5 + choisis un sexe)
3. Clique suivant
4. Remplis l'étape 2 (taille 165 cm, poids 55 kg)
5. Clique suivant

**Acceptation :** Navigation fonctionne, progress bar se met à jour, étapes s'affichent.

---

## Tâche 3 : Tester le responsive mobile
**Objective :** Confirme que l'interface s'adapte au mobile.

1. Ouvre les DevTools du navigateur (F12)
2. Clique sur "Toggle device toolbar" (Ctrl+Shift+M)
3. Sélectionne iPhone 12 ou viewport 375×812
4. Recharge la page d'accueil
5. Scroll et vérifie que tout reste lisible

**Acceptation :** Texte 16px minimum, boutons 44×44px, pas de débordement horizontal.

---

**Quand fini, me dire :** "Tâches 1, 2, 3 OK" ou détailler ce qui ne marche pas.

