# Tunnel d'onboarding — ce qui a changé, et la paywall

Révision du 19/09/2026. Le tunnel passe de **17 à 31 écrans** (29 pour une
fille, deux écrans de maturité étant masculins). Ce document dit ce qui a
bougé, les trois arbitrages juridiques qui ont fait diverger le contenu de
celui des concurrents, et la réponse à la question laissée ouverte : **où,
quand et quoi mettre sur la paywall.**

---

## 1. Le parcours

```
 1  profil              Tu réponds pour toi, ou pour ton enfant ?        NOUVEAU
 2  motivation          Pourquoi tu veux utiliser Grandimi ?             NOUVEAU
 3  sexe
 4  age
 5  taille
 6  poids
 7  modele              Le modèle de prédiction Grandimi       PREUVE 1  NOUVEAU
 8  pause-genetique     (interstitiel)
 9  pere
10  mere
11  proches             As-tu des proches plus grands que tes parents ?  NOUVEAU
12  origine             D'où vient ta famille ?                          NOUVEAU
13  precision           Quelle est la précision de… ?          PREUVE 2  NOUVEAU
14  vitesse
15  pointure
16  voix                (garçon)                                         NOUVEAU
17  pilosite-visage     (garçon)                                         NOUVEAU
18  pilosite-aisselles                                                   NOUVEAU
19  epaules             (garçon)                                         NOUVEAU
20  regles              (fille)                                          NOUVEAU
21  odeur                                                                NOUVEAU
22  acne                                                                 NOUVEAU
23  potentiel           Optimise tout ton potentiel de taille  PREUVE 3  NOUVEAU
24  sommeil
25  nutrition
26  activite
27  aide                Grandimi t'aide pour ça                PREUVE 4  NOUVEAU
28  verite              (conservé)
29  long-terme          (conservé)
30  taille-reve         Quelle taille tu rêves de faire ?                NOUVEAU
31  email
32  recapitulatif
33  analyse             L'écran qui réfléchit                            NOUVEAU
```

**Retiré : `part-habitudes`** (les deux barres 80 % génétique / 20 %
habitudes), à la demande du client parce qu'il ne travaillait pas.
L'hypothèse la plus probable est qu'il se retournait contre le produit :
annoncer que 80 % du résultat échappe au lecteur, trois écrans avant de lui
vendre les 20 % restants, désamorce l'achat. `long-terme` dit la même chose
en trajectoires, sans poser le plafond. Le CSS mort part avec.

### Pourquoi c'est long

La précision perçue d'une estimation est proportionnelle à ce qu'elle a coûté
à obtenir. Quelqu'un qui a répondu à trente questions sur son corps ne reçoit
pas le même chiffre que quelqu'un qui en a rempli six, même calcul au
centimètre près — et le coût déjà engagé le porte jusqu'à la page de paiement
au lieu de l'en détourner. C'est le mécanisme que GoTall et Taller exploitent
tous les deux.

La contrepartie est une règle stricte : **chaque question ajoutée doit nourrir
le calcul, le plan, ou la conviction — et on doit pouvoir dire laquelle.**
Les sept questions de maturité nourrissent la conviction ; deux d'entre elles
remplissent en plus le champ `puberty_signs` déjà prévu par l'API. Toutes ont
une sortie (« je ne sais pas », « je préfère ne pas répondre ») : la longueur
ne doit jamais devenir un mur.

**Aucun texte de ces écrans ne laisse entendre que la réponse affine le
chiffre**, parce qu'aucune ne le fait aujourd'hui (voir §4). Les sous-titres
parlent de « situer où tu en es ». C'est la limite entre un tunnel long et un
tunnel menteur.

---

## 2. Les quatre écrans de preuve

Copiés dans leur **forme** sur les captures GoTall du 19/09/2026, et placés
là où l'objection se pose :

| Écran | Placé après | L'objection à laquelle il répond |
|---|---|---|
| `modele` | les 4 mesures de base | « pourquoi je remplis tout ça ? » |
| `precision` | le bloc génétique | « donc c'est juste une moyenne de mes parents ? » |
| `potentiel` | le bloc maturité | « et qu'est-ce que je peux y faire ? » |
| `aide` | les 3 habitudes | « d'accord, mais concrètement vous faites quoi ? » |

`potentiel` et `aide` sont **la même figure** : trois leviers autour d'un
centre vide, puis le même dessin avec Grandimi à la place du centre. La
conclusion s'impose sans qu'aucune phrase ne l'affirme.

---

## 3. Les trois écarts avec le contenu de GoTall

Ce ne sont pas des adoucissements de confort. Chacun est un point où le
contenu d'origine ne passerait pas sur le marché français.

### « The World's Best Height Prediction Model »

Un superlatif publicitaire doit pouvoir être étayé pour être diffusé en
France (art. L121-2, code de la consommation). « Le meilleur au monde » ne
s'étaye pas, et sur un produit de santé vendu à des mineurs c'est le premier
grief récolté. Le titre retenu garde l'argument qui porte réellement — des
mois de travail, un vrai modèle, pas une moyenne de parents — et laisse
tomber le superlatif, qui n'a jamais été ce qui convainc.

**La version mot pour mot est en commentaire dans `QuestionnaireFlow.jsx`**
(bloc `TEXTES`), prête à coller si tu décides de prendre le risque.

### « 98,7 % de précision »

Deux problèmes, pas un :

1. Une allégation chiffrée invérifiable sur un produit de santé vendu à des
   mineurs (L121-2).
2. **Une contradiction interne.** `calculateV2Confidence`
   (`internal/estimator/v2_enhanced.go`, l. 593-598) borne la marge à
   ±4 / ±8 cm, et la landing annonce déjà « ±4 à ±8 cm ». Le visiteur qui lit
   « 98,7 % » ici et « ±8 cm » sur son résultat trois écrans plus loin conclut
   que l'un des deux est faux. Il a raison, et il n'achète pas.

L'écran affiche donc **± 4 cm**, dans la même pastille lumineuse, avec
« jamais plus de ± 8 cm avant 16 ans » dessous. Le chiffre est **une seule
constante** en tête de `badge-precision.jsx` (`PRECISION_AFFICHEE`).

Si tu veux quand même un pourcentage : pour qu'il reste défendable il doit
dire sur quoi il porte dans la même respiration. « 97,7 % » seul est une
allégation ; « 97,7 %, soit ± 4 cm sur 175 cm » est un calcul que n'importe
qui peut refaire. La seconde forme se défend, la première non.

### Les écussons CDC / Harvard / NIH

Trois marques déposées. CDC et NIH sont des agences fédérales américaines
dont les règles d'usage interdisent tout emploi laissant entendre une
caution. Les aligner sous un pourcentage revient à affirmer qu'Harvard valide
Grandimi : pratique trompeuse **et** risque de contrefaçon de marque.

Remplacés par les trois sources réellement présentes dans le code — OMS
(tables LMS), Khamis–Roche (Fels Longitudinal Study), suivi de percentile —
en cartes de texte. Même effet visuel, et vérifiable.

### L'origine familiale (écran 12)

C'est la seule question du tunnel où « ça ne sert à rien » devient un problème
juridique et pas seulement un écran de trop.

L'origine ethnique est une donnée de l'**article 9 du RGPD**. La collecter
chez un mineur exige un consentement explicite **et** une finalité réelle —
l'article 5.1.c interdit de recueillir une donnée dont on ne fait rien. Or
`ethnic_background` existe dans l'API depuis toujours
(`internal/api/handlers.go`, l. 44) et **`v2_enhanced.go` ne le lit jamais.**
En l'état, la question serait de la collecte sensible à vide.

Ce qui la rend défendable, et c'est la version implémentée : elle sert à
**élargir la marge**, pas à déplacer l'estimation. Les coefficients
Khamis–Roche sont dérivés d'un échantillon blanc nord-américain ; les
appliquer ailleurs ajoute une erreur qu'on ne sait pas chiffrer. Le dire, et
élargir en conséquence, est vrai, utile au lecteur, et une finalité que la
CNIL peut lire.

> **Tant que le moteur ne fait pas cet élargissement, la question est en
> sursis.** Deux issues, à trancher : implémenter §5.1, ou passer
> `COLLECTE_ORIGINE = false` en tête de `QuestionnaireFlow.jsx` — un booléen,
> l'écran disparaît, rien d'autre à toucher.

Ce qu'on ne demande toujours pas, et délibérément : la pilosité pubienne et le
développement génital, que l'échelle de Tanner utilise et que l'API accepte
encore. Le moteur y a explicitement renoncé (`v2_enhanced.go`, l. 551).
Allonger le tunnel ne rouvre pas cette porte.

---

## 4. Ce que les nouvelles réponses font, exactement

| Champ | Part à l'API | Consommé par le calcul | Sert à |
|---|---|---|---|
| `profil` | non | non | router la paywall (§6) |
| `motivations` | non | non | ouvrir le plan sur le motif |
| `proches_plus_grands` | non | non | rouvrir le plafond posé par l'écran parents |
| `origine` | `ethnic_background` | **non** (§3) | à implémenter ou à retirer |
| `pilosite_aisselles` | `puberty_signs.axillary_hair` | **non** | conviction |
| `regles` | `puberty_signs.menarche` | **non** | conviction |
| `voix`, `pilosite_visage`, `epaules`, `odeur`, `acne` | non (pas de champ) | non | conviction, futur plan |
| `taille_reve` | non | non | **titre de la paywall (§6)** |

`getPubertyAdjustment` n'est appelé que par le chemin v1, et son
multiplicateur y est jeté (`khamis_roche.go`, l. 90). Les deux signaux de
puberté voyagent donc, mais ne pèsent sur rien.

---

## 5. L'écran qui réfléchit

Posé entre le récapitulatif et le résultat. Il ne fait pas que du décor : **il
occupe un temps qui existait déjà.** L'API tourne sur l'offre gratuite de
Render ; quand l'instance dort, la première requête prend jusqu'à une minute.
Ce délai se passait jusqu'ici sur un bouton grisé « Analyse en cours… », sans
rien indiquer — le pire endroit pour perdre quelqu'un qui vient de répondre à
trente questions.

Trois règles le séparent d'une fausse barre de chargement :

1. Les cinq étapes annoncées sont celles que le serveur exécute vraiment.
2. **La barre n'atteint jamais 100 % avant que la réponse soit là.** Une barre
   qui arrive au bout puis attend est un mensonge que l'utilisateur voit.
3. Au-delà de 9 s, l'attente est **nommée** au lieu d'être maquillée.

L'appel part à l'entrée de l'écran, en parallèle de l'animation : les 4,4 s de
déroulé **couvrent** la latence au lieu de s'y ajouter. En cas d'échec, un
bouton « Réessayer » relance sans rien faire ressaisir.

---

## 6. LA PAYWALL — où, quand, quoi

### Où : ne pas la déplacer

Parcours actuel — tunnel → **résultat gratuit** → CTA → paywall. C'est le bon
endroit et il faut le garder.

GoTall et Taller font payer **avant** le résultat, et ça marche chez eux. Le
raisonnement ne se transpose pas : ils n'ont rien promis de gratuit. La
landing de Grandimi promet « Estimation gratuite — sans compte » et « aucun
résultat flouté », et `App.jsx` documente déjà avoir corrigé une fois ce
défaut exact (un mur de connexion juste après le questionnaire). Remettre la
paywall avant le résultat, c'est trahir la promesse au moment précis où elle
est attendue, et perdre la seule chose qui distingue la marque.

**Le produit vendu n'est pas l'estimation, c'est le plan.** On ne fait pas
payer ce qu'on a annoncé gratuit.

### Quand : au moment où l'écart est nommé

Le tunnel produit maintenant un chiffre qui n'existait pas : `taille_reve`,
le **seul** nombre de tout le parcours que l'utilisateur a choisi au lieu de
le constater. L'écart entre ce nombre et l'estimation est exactement ce que
cette page a à travailler.

Deux occasions, pas une :

1. **À la lecture du résultat**, quand l'écart est affiché. C'est là que
   l'envie est maximale et que le CTA doit se trouver — pas en bas de page.
2. **À J+30**, par la relance e-mail qui existe déjà
   (`internal/email/relance_j30.go`). Celui qui n'a pas payé à chaud a une
   seconde raison d'y revenir : il s'est re-mesuré.

### Quoi : l'ordre de la page

Déjà fait dans ce commit :

- **Le titre nomme l'écart** : « Il te manque 4 cm pour ta taille rêvée » au
  lieu de « Débloquer ton plan complet ». Un titre générique ne dit rien à
  personne ; le même titre avec ses centimètres à lui nomme la raison pour
  laquelle il est encore sur cette page. Garde-fous : l'écart n'est affiché
  que s'il est **positif et ≤ 15 cm** — au-delà, la page aurait l'air de
  promettre un demi-mètre.
- **Le bouton « faire payer par un parent » disparaît pour un profil
  parent.** Le proposer à un adulte muni d'une carte suggère un obstacle là
  où il n'y en a pas.

À faire ensuite, par ordre de rendement :

1. **Reprendre la motivation de l'écran 2** en sous-titre. Quelqu'un qui a
   coché « savoir si j'ai fini de grandir » et quelqu'un qui a coché « gagner
   les derniers centimètres » n'achètent pas le même produit. Le champ est
   déjà transmis (`motivations`).
2. **Remonter le CTA de la page de résultat** au niveau de l'écart, et non
   après les graphiques.
3. **Nommer le frein principal avant le prix**, pas après. La page annonce
   « ton frein principal » dans la FAQ ; il devrait être la deuxième ligne de
   l'écran.

À ne pas ajouter, quel que soit le rendement apparent : compte à rebours,
« plus que N places », prix barré fictif, e-mail de relance à minuterie. Sur
un public mineur, c'est l'art. L121-1 (pratique commerciale déloyale
exploitant la vulnérabilité). Le reste de ce tunnel a été écrit pour éviter
précisément ce terrain.

---

## 7. Suites côté moteur

Par ordre de valeur :

1. **`ethnic_background` → élargissement de marge.** Une dizaine de lignes
   dans `calculateV2Confidence` : un facteur > 1 quand l'origine déclarée sort
   du domaine de calibration de Khamis–Roche, neutre sinon et quand le champ
   est vide (même convention que la pointure). C'est ce qui rend l'écran 12
   légal. Sans ça, `COLLECTE_ORIGINE = false`.
2. **`puberty_signs.menarche`.** Le seul signal de maturité avec un repère
   chiffré publié : la croissance résiduelle après la ménarche tourne autour
   de 6 à 8 cm. C'est la première question du bloc que le moteur devrait
   exploiter, et elle arrive déjà dans la charge utile.
3. **Les cinq champs sans slot API** (voix, visage, épaules, odeur, acné).
   Ils ne valent d'être transmis que le jour où le plan les personnalise ;
   d'ici là, les laisser en local est la bonne décision.

---

## 8. Vérifications passées

- `npm run lint` : aucun avertissement introduit par les fichiers de cette
  révision.
- `npm run build` : passe. `QuestionnaireFlow` pèse 36 ko (11,8 ko gzip), en
  morceau chargé à la demande.
- Parcours complet en Chromium 390 × 844, **branche garçon** : 33 écrans,
  progression de 3 % à 97 %, résultat délivré, zéro erreur JS.
- Parcours complet, **branche fille** : 29 écrans ; `regles` posée, `voix`,
  `pilosite-visage` et `epaules` correctement absents.
- Feuille « Comment ça marche ? » : ouverture, piège à focus, fermeture par
  Échap.
- Paywall atteinte depuis le tunnel : titre « Il te manque 4 cm pour ta taille
  rêvée » (176,5 → 180), bouton parent présent pour un profil `ado`.

Deux défauts trouvés par ces captures et corrigés : l'écran d'analyse et la
feuille d'information s'affichaient en thème clair et en fond transparent,
faute de porter la classe `night` qui porte les jetons de surface sombre —
tous deux sont montés **hors** de `.funnel`, où ces variables sont définies.
