# Ce qui bloque encore la mise en vente

Établi en vérifiant le code et les pages réellement servies en production, pas
la documentation. Trois catégories : ce que j'ai corrigé, ce que personne
d'autre que toi ne peut lever, et ce qui dépend d'une décision produit.

Je ne suis pas juriste. Les points 1 à 3 s'appuient sur des textes cités
nommément ; fais-les valider, mais ne les ignore pas : ils sont vérifiables en
ouvrant les pages du site.

---

## A. Bloquants que je ne peux pas lever

### 1. Les mentions légales sont un gabarit vide, en ligne

`frontend/public/mentions-legales.html` et `docs/mentions-legales.html`
contiennent **huit champs `[À REMPLIR]`** : raison sociale, SIRET, adresse,
responsable, téléphone, hébergeur, directeur de publication, médiateur.

Ces pages sont servies en production aujourd'hui.

L'identification de l'éditeur est imposée par l'article 6-III-1 de la
**LCEN** (loi 2004-575), et l'identité du professionnel par l'article
**L221-5** du code de la consommation avant tout contrat à distance. Le défaut
d'identification est sanctionné pénalement.

**À faire :** remplir les huit champs. L'hébergeur est GitHub Pages pour le
site et Render pour l'API — les deux doivent figurer avec leurs coordonnées.

### 2. Aucun médiateur de la consommation n'est désigné

Article **L616-1** du code de la consommation : tout professionnel vendant à
des consommateurs doit adhérer à un dispositif de médiation et en communiquer
les coordonnées. L'adhésion est payante (CMAP, MEDICYS, et autres).

La page mentions légales dit « vous pouvez saisir le médiateur compétent »
sans en nommer aucun, ce qui ne remplit pas l'obligation.

**À faire :** adhérer, puis inscrire le nom et l'URL du médiateur dans les
mentions légales et les CGV.

### 3. Le second produit Whop et l'envoi d'e-mail

Détaillés dans `BRIEF-BACKEND.md`. Ils ne bloquent pas la légalité de la vente,
ils en plafonnent le rendement. Le front est prêt pour les deux.

---

## B. Corrigé par moi — à faire relire

### 4. La politique de confidentialité affirmait quelque chose de faux

Elle disait, en gras et en rouge :

> « Nous ne stockons **jamais** les données corporelles (taille, poids) hors de
> votre session locale. »
> « Vos mesures corporelles ne quittent jamais votre navigateur. »

C'est inexact. `internal/api/handlers.go` appelle `db.SavePrediction`, qui
écrit en base l'âge, le sexe, la taille, le poids, la taille des deux parents
et le résultat, rattachés à l'adresse e-mail. Cela a toujours été le cas.

Une information inexacte dans une notice RGPD contrevient à l'obligation de
transparence (articles 12 et 13 du règlement), et il s'agit ici de données
d'enfants.

**Ce que j'ai fait :** réécrit la section pour décrire le traitement réel — ce
qui est envoyé, où c'est conservé, pourquoi, et comment demander l'effacement.
J'ai aussi retiré le bandeau « ✅ RGPD compliant », qui est une auto-déclaration
sans valeur.

**Ce qu'il reste à décider :** soit on garde ce comportement et la notice
corrigée le décrit (état actuel), soit on veut vraiment que les mesures ne
quittent pas le navigateur — et il faut alors retirer `SavePrediction`, ce qui
coûte l'historique, le plan personnalisé et le panneau d'administration.

### 5. Les CGV citaient un article abrogé

« article L121-21 du code de la consommation » est la numérotation d'avant la
recodification de 2016. Le droit de rétractation à distance est désormais à
**L221-18**. Corrigé dans les deux copies.

Note au passage : les CGV promettent 14 jours de rétractation **et** un accès
immédiat. C'est le choix favorable au client et il est tenable — mais il faut
alors honorer les remboursements sans discuter, y compris après usage. Si tu
veux couper la rétractation, il faut recueillir le renoncement exprès prévu à
l'article L221-28 3°, au moment du paiement.

---

## C. Décision produit en attente

### 6. `consent_parental` existe en base et n'est jamais renseigné

La colonne est déclarée (`internal/db/supabase.go`, `migrations/001`), lue dans
la structure `User`, et **aucun code ne l'écrit jamais**. Elle vaut `false`
pour tout le monde.

Le service s'adresse à partir de 12 ans et vend un abonnement. En droit
français, l'engagement d'un mineur non émancipé est rescindable pour lésion :
le parent peut demander l'annulation et le remboursement.

Trois options, à trancher par toi :

1. **Ne rien changer.** Le risque est commercial (remboursements) plus que
   pénal. C'est ce que fait la concurrence.
2. **Cocher une case au paiement** (« j'ai l'accord de mon responsable
   légal ») et écrire la valeur dans `consent_parental`. Peu coûteux, et ça
   donne une trace.
3. **Faire du parcours parent le chemin de paiement par défaut** pour les
   moins de 15 ans. Le plus propre, le plus coûteux en conversion.

Le front est déjà prêt pour la 2 et la 3 : le bouton « Je n'ai pas de carte —
faire payer par un parent » est une action de plein droit sur la paywall.

---

## D. Vérifié et clos

Ces points étaient cassés et ne le sont plus. Détail dans les messages de
commit.

- `go build` échouait sur un dépôt cloné : `go.sum` absent. Versionné.
- La suite de tests était rouge. Verte, et réécrite contre le contrat réel.
- L'écart de mode de vie sur l'estimation était de 7,2 cm, jusqu'à 14 cm de
  pénalité sur une cible haute. Ramené à 2,3 cm, appliqué à la croissance
  restante, plafonné au potentiel génétique.
- `/api/v1/predict-height` servait publiquement des coefficients inventés
  (jusqu'à 229 cm). Délègue au moteur v2.
- Les réponses d'API exposaient trois valeurs de diagnostic fausses.
  Supprimées.
- Toute panne de base renvoyait un 500 après quatorze écrans de questionnaire,
  et un serveur sans `DATABASE_URL` **paniquait**. L'estimation est servie même
  base absente.
- `/health` annonçait « ok » pendant que l'endpoint principal plantait.
- « Failed to fetch » s'affichait tel quel à l'utilisateur.
- Build Docker non reproductible (`go mod tidy` au build, sans `go.sum`).
