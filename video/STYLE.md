# Style « prédiction à partir de vos commentaires » — référence figée

Validé le 15/10/2026 sur la partie 5. Rendu de référence : `rendu/grandimi-partie5.mp4`.
Point de sauvegarde git : commit `14398f8` (branche `claude/nifty-johnson-y0b55m`) ; pour revenir à ce style : `git checkout 14398f8 -- video/src video/public/episodes/partie-5`. Ne pas modifier ce style sans accord explicite :
les épisodes suivants changent **les personnes et les chiffres**, pas le style.

Le style recopie la vidéo virale de référence (mesures dans
`public/episodes/partie-5/reference.json`, outil `scripts/analyse_reference.py`).

## Déroulé (8 plans, chacun accroché à un mot de la voix)

| # | Plan | Démarre sur | Contenu | Entrée |
|---|---|---|---|---|
| 1 | accroche | 0 | photo de la personne **sans aucun texte**, sous-titres jaunes 2 mots à la fois | — |
| 2 | partie | « partie » − 3 f | 4 photos de papier froissé qui alternent toutes les 7 f, « PARTIE N » tapé lettre par lettre (2 f/lettre, tic à chaque lettre) | coupe |
| 3 | écran taille | 1re phrase après « partie » − 3 f | capture Grandimi (résultat). Caméra : écran entier → zoom taille actuelle sur l'âge/taille → **écran entier sur « Grandimi.com »** → zoom taille prédite 6 f après la taille prédite. Ballon de l'âge 9 f après l'âge, 0,6 s. Pastille « 🔗 grandimi.com » sur « Grandimi.com » | **flash jaune** |
| 4 | routine | « bonnes » (habitudes) − 3 f | capture « Ma routine », **entière et fixe** | whip |
| 5 | chiffre | taille optimisée − 4 f | écorché sur fond topographique, zoom vers le haut du corps, chiffre **rose tapé** (3 f/lettre) + slam | flash blanc |
| 6 | écran stats | mot après « X cm » − 3 f | écran entier ; **flèche jaune** courbe taille actuelle → prédite 12 f après le début, ~1 s ; **flèche rouge verticale** sous « Plus grand que » 9 f après le pourcentage, jusqu'à la fin de la phrase ; zoom sur le bas sur le % de croissance | whip |
| 7 | verdict | « Franchement » − 3 f | photo souriante, sous-titres jaunes majuscules puis pastille **verte sur noir** « LOIN D'ÊTRE FOUTU » | **flash jaune** |
| 8 | appel | phrase d'appel − 3 f | fond topographique qui zoome lentement, sous-titres jaunes majuscules, mots-clés (âge, taille, parents) en pastille orange, 📏, pastille « 🔗 grandimi.com » en haut | flash blanc |

Pas de sous-titres pendant les plans 2 à 6 (comme l'original). La carte « réponse au commentaire »
n'est **pas** dans la vidéo : elle est ajoutée sur TikTok au moment de publier.

## Typographie et couleurs

| Élément | Police | Couleur |
|---|---|---|
| Sous-titres accroche | Inter 600, 88 px, contour noir 4 px, y = 940 | jaune `#fff200` |
| Sous-titres verdict / appel | Inter 800, 92-100 px, majuscules, contour noir 6 px | jaune `#fff200` |
| « PARTIE N » | Inter 800, 210 px, contour noir | jaune `#fff200` |
| Chiffre de l'écorché | Inter 800, 230 px, contour noir 12 px | rose `#ff1a78` |
| Verdict | Inter 800, 96 px, pastille noire | vert `#29e05c` |
| Pastilles lien et mots-clés | Inter 800 | blanc sur orange `#ff5a1f` |
| Flèche courbe / flèche rouge | trait 16 / 20 px, ombre portée | `#fff200` / `#e8202a` |

## Son

**Préférence de l'utilisateur (17/10) : whooshs moins forts et moins fréquents.** Un whoosh seulement
aux changements de plan (pas à chaque zoom, flèche ou secousse), volume ≤ 0,25.

Voix au premier plan ; musique à 8 % ; whoosh à chaque whip et mouvement de caméra (22 %),
pop sur les apparitions, tic par lettre tapée, slam sur le chiffre et le verdict, ding/pop sur les flèches.
Mix final normalisé à −14 LUFS. Viser **30-31 s** au total, comme l'original : voix rapide,
presque sans pause, coupée net sur le dernier mot (la vidéo reboucle).

## Ce qui suit chaque vidéo de référence

Chaque épisode recopie **sa** vidéo de référence (fiche dans `references/<id>/fiche.md`) pour ce qui
varie d'un original à l'autre : flèches (forme, couleur, cible), transitions (flash, lumière jaune,
glissé, rebond de dézoom, secousse), plan supplémentaire (ex. NBA), casse des sous-titres, style du
chiffre de l'écorché. Les zooms sont recalculés pour que chaque carte Grandimi tombe à la même place
et à la même taille à l'écran que dans la référence. Le reste de ce document (déroulé, typographie de
base, sons, durée) reste la règle.

## Ce qui change d'un épisode à l'autre

- le texte (même structure de phrases, autre personne et autres chiffres) ;
- la photo de l'accroche et la photo du verdict (une autre personne à chaque fois) ;
- les captures Grandimi (résultat + routine) avec les chiffres de la personne ;
- le ballon de l'âge (une image par âge : 14, 15, 16, 17…) ;
- le chiffre de l'écorché (texte, généré automatiquement).

Si une capture Grandimi garde la même disposition, les zones de caméra et la position des flèches
(`zones`, éléments `trait` dans `episode.json`) restent valables telles quelles.
