# Format prédiction, **style « téléphone »** (partie 23, `louis-23`, 31/10)

Variante du format prédiction (`FORMAT_PREDICTION.md`, modèle `cory-19`, qui reste le style par défaut et ne
change pas). À utiliser **seulement** quand l'utilisateur demande ce style. Tout est réglé dans
`public/episodes/louis-23/episode.json` : on le copie et on change la voix, le texte, les chiffres, les photos.

Pour tout le reste (voix, alignement, rendu, contrôle, livraison), suivre `FORMAT_PREDICTION.md`, en remplaçant
`cory-19` par `louis-23`.

## Ce qui change par rapport au style par défaut

- **Écrans de l'appli cadrés comme Taller** (`"telephone": {...}` sur le plan) : écran ×0,86 sur fond noir, à 175 px
  du haut ; en haut de l'écran, la barre Safari « grandimi.com » puis les onglets « Rapport · Programme · Exercices ·
  Routine ». Rien en bas : la légende TikTok / Instagram le cacherait.
- **Routine comme Taller**, nette, sans 🤫 : élément `routine` avec `"flou": 0, "taller": true` (« Routine
  quotidienne », 3-9 nov, 0/9).
- **Vraies captures du site** (`site_accueil`, `site_sexe`, `site_poids`) quand la voix parle du site.
- **Fin qui vend le programme** (voix de l'utilisateur, exemple de louis-23) :
  « Louis, il a encore 2 cm à aller chercher. Toi aussi, t'en as probablement. Va sur grandimi.com, et suis le
  programme fait pour toi. » → lignes `fin`, `toi`, `site` ; plans :
  - `verdict` (photo) : « PAS FOUTU ✅ » puis « ENCORE +2 CM » sur le chiffre ;
  - `toi` (topo) : « TOI AUSSI ? » tapé en jaune, 🫵 ;
  - `site` (téléphone) : accueil, doigt sur « Je commence » ;
  - `programme` (téléphone) : doigt sur l'onglet « Programme » (`telephone.tap`), puis `programme2` : la routine ;
  - `appel` : topo + « 🔗 grandimi.com », 1,2 s de silence ajoutées après la voix.
- Pas de pastille « lien en bio », pas de « gratuit » (le site est payant), pas de « écris ton âge en commentaire ».
  Grandimi se vend comme **programme personnalisé pour grandir**, pas comme simple prédiction.

## À demander / vérifier (audit du 31/10)

- Dire « grandimi.com » **tôt** dans la voix : « Selon **grandimi.com**, sa taille adulte prédite est de … » (la
  plupart des spectateurs partent avant la fin).
- Toute la voix avec **la même voix ElevenLabs** (Lucas) ; vérifier que « grandimi.com » est bien prononcé
  (réécouter le passage seul).
- Photo d'accroche et photo verdict : **la même personne**.
- Le lien en première ligne de la légende et en commentaire épinglé (fait par l'utilisateur, hors vidéo).
