# Brief backend — ce qui bloque la conversion

Rédigé après une revue du tunnel complet. Le front est livré et **prêt à
recevoir** chacun de ces points : les hooks existent déjà, ils sont inertes tant
que le serveur ne répond pas.

Classé par rendement décroissant. Le point 1 conditionne tout le reste.

---

## 1. Second produit Whop : un paiement unique

### Le problème

Le produit vise des adolescents de 12 à 17 ans. Le paiement est un checkout Whop
sur le web, carte bancaire obligatoire. **Un mineur n'a pas de carte.** La
conversion à cette étape est structurellement plafonnée, quelle que soit la
qualité de la page.

La concurrence qui fonctionne vend en achat in-app à 4,99 €/semaine, payable
avec une carte cadeau achetée en bureau de tabac. Nous ne pouvons pas répliquer
ça sans application mobile, mais nous pouvons retirer la deuxième objection :
le caractère récurrent.

Un paiement unique :
- se règle avec une carte cadeau prépayée ou la carte d'un parent, **une fois** ;
- lève l'objection « encore un abonnement », qui est la vraie objection du parent,
  pas le montant ;
- sert d'ancre au mensuel, qui n'en a aucune aujourd'hui. Un prix seul ne peut
  pas paraître avantageux, il n'y a rien à côté de quoi le mettre.

Ordre de grandeur à garder en tête : 9,99 €/mois sur douze mois font 120 €.
La concurrence propose l'accès à vie à 29,99 €. Un parent qui compare ne compare
pas la qualité.

### Ce qui est déjà fait côté front

`frontend/src/pages/PaywallPage.jsx` contient un tableau `FORMULES` à deux
entrées. La seconde est **désactivée** — elle ne s'affiche pas tant que le
produit n'existe pas, parce que deux cartes menant au même paiement seraient un
mensonge. Le rendu à deux colonnes, la sélection, le badge et le libellé de
bouton sont écrits et testés.

`POST /api/v1/checkout` reçoit **déjà** un champ supplémentaire :

```json
{
  "email": "…",
  "user_id": "…",
  "child_user_id": "…",
  "plan": "mensuel"      // ← nouveau. Valeurs : "mensuel" | "unique"
}
```

Le backend actuel l'ignore, sans erreur.

### À faire

1. Créer le second produit dans Whop (paiement unique). Prix suggéré : **29,99 €**,
   à valider par toi.
2. Dans `internal/api/whop_handlers.go`, remplacer le `productSlug` codé en dur
   par une résolution sur le champ `plan` :
   - `"mensuel"` → slug de l'abonnement actuel ;
   - `"unique"` → slug du nouveau produit ;
   - champ absent ou inconnu → **repli sur le mensuel**, jamais une erreur 400
     (un client plus ancien ne doit pas casser).
3. Les deux slugs en variables d'environnement, pas en dur :
   `WHOP_PLAN_MENSUEL`, `WHOP_PLAN_UNIQUE`.
4. Webhook : `membership.activated` doit accorder le premium dans les deux cas.
   Pour le paiement unique il n'y aura **jamais** de `membership.deactivated` —
   vérifier que l'accès ne s'auto-révoque pas au bout d'une période.
5. Décider ce que « unique » débloque exactement. Le front annonce aujourd'hui
   « les 12 plans mensuels ». Si c'est autre chose, dis-le, je change le texte.

### Quand c'est prêt

Poser `VITE_WHOP_ONETIME_ENABLED=true` dans l'environnement du front. Rien
d'autre à modifier : les deux cartes apparaissent.

### Critère de réussite

Taux `paywall affichée → checkout Whop ouvert` (PostHog). Attendu : ×2 à ×3.

---

## 2. Aucun e-mail n'est jamais envoyé

### Le problème

`grep -rn "smtp\|resend\|sendgrid\|mailer" --include=*.go .` ne renvoie **rien**.

Or le questionnaire demande son adresse à l'utilisateur au 13ᵉ écran et la
stocke. Deux conséquences :

**Commerciale.** L'utilisateur qui ne paie pas aujourd'hui n'a strictement
aucune raison de revenir. Il a son chiffre, il part. C'est l'actif le moins cher
et le plus rentable du produit, et il dort.

**Juridique.** Une donnée personnelle collectée auprès d'un mineur sans finalité
effective, c'est exactement ce que le RGPD interdit (principe de minimisation,
art. 5.1.c). Le code montre déjà cette hygiène ailleurs — les stades de Tanner
ont été retirés pour cette raison, commentaire à l'appui dans
`QuestionnaireFlow.jsx`. Il faut soit se servir de l'adresse, soit cesser de la
collecter.

### À faire

1. Brancher un fournisseur transactionnel (Resend, Postmark — peu importe, un
   seul suffit).
2. **Un seul e-mail pour commencer**, la relance à J+30 :
   > « Ça fait un mois. Re-mesure-toi : on met ton estimation à jour, gratuitement. »
   Lien direct vers le questionnaire pré-rempli. C'est honnête — la croissance
   a bougé, l'estimation change vraiment — et c'est la seule raison qu'un
   non-acheteur a de revenir.
3. Lien de désinscription dans le pied de chaque envoi (obligatoire).
4. Consentement : l'écran e-mail du questionnaire dit aujourd'hui « pas de
   newsletter ». Si on envoie la relance, **ce texte doit changer** et annoncer
   exactement ce qui sera envoyé. Dis-moi quand le fournisseur est choisi, je
   réécris l'écran.

### Critère de réussite

Taux d'ouverture de la relance, et surtout nombre de secondes visites de la
paywall en provenance de ce lien.

---

## 3. Vérifier le parcours parent de bout en bout

### Le problème

Le lien parent (`?parent=<id enfant>`) est maintenant une **action de premier
rang** sur la paywall : « Je n'ai pas de carte — faire payer par un parent »,
bouton plein format sous le CTA. Avant, c'était un lien replié que personne ne
voyait.

Ça veut dire que ce chemin va enfin être emprunté. Il n'a jamais été testé en
conditions réelles.

### À faire

1. Test complet : l'enfant génère le lien → le parent l'ouvre sur **un autre
   appareil**, sans session → paie → le webhook crédite **le compte de l'enfant**,
   pas celui du payeur. La résolution existe
   (`resoudreBeneficiaire` dans `whop_handlers.go`), elle n'est pas prouvée.
2. Vérifier le cas de repli : si `child_user_id` est introuvable, le code retombe
   aujourd'hui sur l'e-mail du payeur — l'enfant ne reçoit alors rien. Ce cas
   doit au minimum produire une alerte, pas seulement un `fmt.Printf`.
3. `ParentPage` est restée en thème clair alors que tout le reste est passé en
   sombre. Décision à prendre : je la bascule ou on l'assume comme page
   « adulte ». Dis-moi.

### Critère de réussite

Un paiement parent réel, sur deux appareils distincts, qui ouvre l'accès du bon
compte.

---

## 4. Le vrai risque : le plan du mois 2

### Le problème

`internal/planner/growth_plan.go` génère le plan à partir de l'âge, du sexe et
de la taille. C'est du conseil de qualité, mais **peu personnalisé**, et surtout
la variation d'un mois à l'autre est faible.

Or la promesse vendue est « un plan différent à chaque mois d'abonnement ».
Si l'abonné ouvre le mois 2 et reconnaît le mois 1, il résilie. Aucun travail
sur la page de vente ne compense ça : c'est le produit qui décide de la
rétention, pas la paywall.

C'est le point le plus coûteux à traiter et le plus important à moyen terme.

### Pistes, par effort croissant

1. **Utiliser les réponses qu'on a déjà.** Le questionnaire collecte désormais
   le sommeil, la nutrition et l'activité réels (ils étaient codés en dur
   auparavant — voir plus bas). Le plan doit cibler **le levier le plus faible**
   de l'utilisateur, pas les trois à égalité. Un ado qui dort 6 h et mange
   correctement ne doit pas recevoir le même mois 1 que l'inverse.
2. **Re-mesure mensuelle qui change le plan.** Si l'utilisateur a pris 0,3 cm au
   lieu de 0,8, le mois suivant doit le dire et s'ajuster. C'est ce qui rend
   l'abonnement justifiable.
3. Suivi quotidien (cases à cocher, score du jour). Gros chantier, à ne lancer
   qu'une fois 1 et 2 faits.

---

## Changement déjà en production côté front, à connaître

Le questionnaire **demande** maintenant le sommeil, la nutrition et l'activité.
Ces trois champs étaient auparavant codés en dur dans le front (`'good'`, 8 h,
30 min) et envoyés au modèle — qui s'en sert réellement
(`internal/estimator/v2_enhanced.go`, à partir de la ligne 298). Autrement dit,
chaque estimation intégrait trois réponses que personne n'avait données.

Valeurs transmises désormais :
- `sleep_hours_per_night` : `6 | 7.5 | 8.5 | 9.5`
- `nutrition_level` : `"poor" | "fair" | "good" | "excellent"`
- `exercise_min_per_day` : `10 | 30 | 60 | 120`

Rien à changer côté serveur, le contrat est respecté. Mais les estimations vont
se disperser davantage qu'avant, ce qui est le comportement correct.
