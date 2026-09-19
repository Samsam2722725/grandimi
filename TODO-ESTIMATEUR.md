# To-do — état au 19 septembre 2026

Production sur `c373292`, vérifiée.

---

## ✅ Fait, déployé, vérifié en production

- **Le défaut à 19,8 %** — l'estimateur rendait sa propre taille saisie à un
  utilisateur sur cinq. Ramené à 0,3 %. Six tests de non-régression.
- **Khamis-Roche** portée en Go, unités impériales, cas de contrôle à 178,9 et
  161,7 cm. Le poids sert enfin.
- **Mi-parentale** rétrogradée en diagnostic (elle était comptée deux fois).
- **Le plancher est devenu une alarme** (`PlancherDeclenche` + log).
- **La vitesse de croissance** entre dans le chiffre, plus seulement dans la
  fourchette.
- **Garde-fou hors domaine** — le modèle annonçait jusqu'à 201,5 cm. Plafonné à
  198,4 (garçons) / 182,8 (filles), signalé, avec renvoi vers un médecin.
  0 faux positif sur 40 profils réalistes P3→P97.
- **Borne basse retirée** — elle rendait une constante (154,6 cm pour toute
  taille entre 105 et 145). 0 inversion, 0 palier sur balayage.
- **Les textes du site** décrivent la méthode réellement exécutée.
- **La ménarche** — troisième ancre (`menarche.go`), question posée aux filles
  de 15 ans et plus, écran vérifié dans le navigateur sur grandimi.com.
- **La pointure** + sa variation, via `maturite.go`. **Auditée.** Un défaut
  trouvé et corrigé : une pointure qui reculait — faute de saisie — déclenchait
  la correction maximale vers le bas, parce qu'une variation nulle est le signal
  le plus fort du barème. Traitée comme non renseignée depuis `ed55e53`. Le test
  qui verrouillait ce défaut est corrigé en `9baad77`.

---

## 🔧 Backend

Le moteur est fini. Un seul point reste, et il touche la base.

- [ ] **Persister `out_of_domain` et `warning`.** La table `predictions`
      stocke `predicted_height`, `confidence_*` et `height_cm`, mais pas le
      signalement. À la reconnexion, `AuthPage` et `SetPasswordPage`
      reconstruisent `predictionData` depuis la base : un utilisateur hors
      des courbes qui revient retrouve donc son chiffre **sans** l'avertissement
      médical. Deux colonnes et une migration. Je ne l'ai pas fait moi-même :
      une migration sur ta base de production n'est pas une action que je
      lance seul. La brèche est documentée en commentaire aux deux endroits.

- [x] ~~`confidence_level`~~ — **écarté après vérification.** Je l'avais testé
      sur v1, qui ne collecte pas la vitesse et n'est pas l'endpoint du site.
      Sur v2, `medium` et `high` sont atteignables. Et le champ n'est jamais
      affiché : il ne sert qu'aux analytics. Un champ `MargeCM` existe déjà par
      ailleurs. Il n'y avait pas de défaut.

## 🎨 Front

- [x] ~~Profils signalés : retirer l'intervalle~~ — **item faux, écarté.**
      L'intervalle n'est affiché nulle part : il est seulement transporté.
      Le 217,9 cm ne sort jamais à l'écran. J'avais raisonné sur la réponse
      de l'API, pas sur ce que voit l'utilisateur.

- [x] **L'avertissement médical manquait là où le chiffre apparaît.** Trouvé
      en cherchant le point ci-dessus. Il s'affichait sur l'écran de résultat,
      où la taille adulte est cadenassée, et nulle part sur la page du plan,
      où elle est révélée après paiement. Un garçon de 11 ans à 180 cm lisait
      « Ta taille estimée : 198,4 cm » sans un mot, juste après avoir payé.
      Corrigé et en ligne.
- [ ] **Questions qui nourrissent le plan** (pas la prédiction) : sport et
      fréquence, heure de coucher semaine/week-end, écrans avant de dormir,
      petit-déjeuner, posture et cartable. Tunnel plus long = plus d'engagement,
      et surtout un plan du mois 2 qui ne ressemble pas au mois 1.

## ⚖️ Tes décisions — rien ne bouge sans toi

- [x] ~~La ménarche~~ — **faite, filles de 15 ans et plus.** Décision prise :
      pas de circuit de consentement, donc la question n'est posée qu'à partir
      de 15 ans. Troisième ancre dans le modèle, éteinte au-delà de 2,5 ans
      post-ménarche. **Gain mesuré : +1,0 à +1,5 cm sur 23 % des filles de
      15 ans et plus** — pas les 5 → 3 cm que j'avais annoncés, ce chiffre
      portait sur les 12-14 ans qu'on a écartées. Écran vérifié en production.
- [ ] **Le pourcentage de précision.** Ma recommandation reste non : tu ne peux
      pas le justifier, et en France c'est une pratique commerciale trompeuse
      (art. L121-2). Eux sont américains, pas toi.

## 🏗️ Le chantier qui vaut le plus

- [ ] **La mesure mensuelle.** Demander une taille chaque mois, la stocker,
      faire rétrécir la fourchette à chaque relevé. Trois effets : la précision
      monte réellement, l'abonné revient voir sa fourchette se resserrer, et tu
      accumules la seule donnée que personne sur ce marché ne possède — du
      suivi réel. C'est ce qui te permettra un jour de publier un taux de
      couverture mesuré, là où la concurrence n'a qu'un chiffre nu.

---

## ⚠️ Ce qui décide vraiment de ton business, et qui n'est pas le modèle

Le moteur est sain. Il ne mérite plus d'être optimisé. Ces quatre points-là
décident si tu as des clients, et ils sont tous dans `BRIEF-BACKEND.md` :

- [ ] **Le paiement.** Tes clients sont mineurs et n'ont pas de carte bancaire.
      La concurrence encaisse en achat in-app (RevenueCat) : un ado paie avec
      une carte cadeau de bureau de tabac. C'est leur seul avantage structurel,
      et il est décisif.
- [ ] **Le trafic.** 100 % direct, zéro acquisition. Le meilleur modèle du monde
      ne sert à rien sans visiteurs.
- [ ] **Les e-mails.** Aucun n'est jamais parti, alors que tu collectes les
      adresses depuis le 13ᵉ écran. Actif le moins cher du produit, il dort.
- [ ] **Le réveil de l'API.** 13,6 s mesurées au premier appel. Un ado qui
      attend 13 secondes après quinze écrans est perdu.

---

## Le filet, qui est l'acquis le plus durable

Cinq interceptions sur ce chantier : la CI a arrêté deux erreurs de l'agent
backend, une des miennes, et deux régressions. Elle a même refusé un correctif
juste parce qu'un test verrouillait le défaut qu'il décrivait.

Aucune application concurrente n'a ça — Taller et GoTall tournent sur Expo et
RevenueCat, sans serveur de calcul ni suite de tests. C'est le seul endroit où
l'écart avec eux est structurel et mesurable.
