# Format « Je prédis vos tailles, partie N » (copie de Taller, partie 39)

Recette pour refaire une partie dans ce format **sans rien remesurer** : tout le montage est déjà réglé dans
`public/episodes/cory-19/episode.json` (dernière version validée, 29/10 ; `sam-39` = même format avec la
silhouette violette au lieu de l'extraterrestre). On copie cet épisode et on change seulement : la voix, le texte,
le nom, l'âge, les chiffres, la photo, l'avatar, le ballon de l'âge.

## Ce que l'utilisateur envoie (dans un seul message si possible)

1. Le texte (script) : on le recopie **mot pour mot** dans `lines`. On ne l'améliore pas ; on signale une erreur
   une seule fois. Fin conseillée (31/10, le site d'abord, pas « gratuit » : le site est payant) :
   « Tu veux connaître ta taille adulte et ton programme pour grandir au max ? Lien en bio, grandimi.com.
   Et dis ton âge en commentaire, je ferai peut-être ta prédiction. » (ids `cta`, `site`, `com`).
2. La voix ElevenLabs (mp3).
3. La photo de la personne (accroche) et la photo « verdict » (fin), plus l'avatar du commentaire si différent.
4. Le commentaire affiché sur la carte (pseudo + texte), et les chiffres : âge, taille actuelle, taille prédite,
   taille optimisée, gain, rang (%), croissance accomplie (%). S'il manque un chiffre : le calculer avec le moteur
   Grandimi (`artifacts/grandimi/src/domain/growth/`, Khamis-Roche) et **dire lesquels sont calculés**.

## Étapes (dans le conteneur cloud)

```bash
S=<dossier temporaire>; cd video
# outils (une fois par session) : voir .claude/skills/video/SKILL.md « Démarrage » (venv, Parakeet, npm install)
python scripts/nouvel_episode.py prenom-N --depuis louis-23
cp public/episodes/louis-23/images/{alien.png,curseur.png,ordi.png,papy.png,regle.png,papier*.jpg,site_*.png} public/episodes/prenom-N/images/
#   (silhouette violette : prendre silhouette.png dans sam-39 et l'élément image du plan « chiffre » de sam-39)
python scripts/ballon.py 13 public/episodes/prenom-N/images/ballon_13.png argent   # âge de la personne
```

1. **Voix** : `ffmpeg -i voix.mp3 -ar 44100 -ac 1 brut.wav` → `$S/venv/bin/python scripts/blancs.py brut.wav trim.wav 0.08`
   → `ffmpeg -i trim.wav -af "apad=pad_dur=0.5" -ar 44100 public/episodes/prenom-N/voice/voix.wav`
   (accélérer avec `atempo=1.1` seulement si la vidéo dépasse nettement la durée de l'original).
   Vérifier la voix : `ffmpeg -i trim.wav -ar 16000 t16.wav` puis `scripts/transcrire.py t16.wav MODELE out.json`.
   ElevenLabs dérive parfois en anglais ou dit « Grandini » : **réécouter le passage seul** (le retranscrire
   isolé) avant de le signaler, car Parakeet peut lui-même basculer en anglais sur un long morceau.
2. **episode.json** :
   - `lines` = le texte de l'utilisateur, phrase par phrase, mêmes `id` que cory-19 (hook, stats, age, norme,
     predit, habitudes, optim, pct, fini, foutu, cta, com, site). Prononciation différente de l'écrit :
     `{Cory|Corée}`.
   - `partie` = N ; `carteCommentaire.nom`, `.texte`, `.photo` ; `ballon.fichier` et ses ancres `age:13`.
   - `dashboard.donnees` des plans `ecran` et `ecran2` : tailles, courbe (7 points de l'âge à 21 ans), âges,
     rang, chances, croissance.
   - le chiffre tapé du plan `chiffre` (`"texte":"2m00"`) et les ancres qui citent un mot qui a changé
     (`"ligne:mot"`, `#2` pour la 2ᵉ occurrence, `±images`).
3. **Alignement** : `$S/venv/bin/python scripts/voix_fichier.py prenom-N MODELE` (erreur « mot introuvable » →
   corriger l'ancre).
4. **Rendu** :
   `npx remotion render Episode out/prenom-N.mp4 --props='{"episode":"prenom-N"}' --browser-executable=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell --log=error`
   puis son normalisé : `ffmpeg -i out/prenom-N.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=7 rendu/grandimi-partieN-prenom.mp4`.
5. **Contrôle** : quelques images clés (accroche, ballon, zoom taille prédite, routine floutée, chiffre, flèche
   +5 cm, curseur, zoom croissance, verdict, grandimi.com) et `scripts/statique.py VIDEO` (pas de passage figé
   anormal). Côte à côte seulement si l'original est fourni : `scripts/cote_a_cote.py ORIGINAL VIDEO out/`.
6. **Livrer** la vidéo (+ un seul côte à côte, son Grandimi), commit en français, push.
   Les photos de tiers (accroche, verdict) et le rendu qui les contient restent hors git (`.git/info/exclude`).

## Ce qui est réglé et ne doit pas bouger (validé par l'utilisateur)

- Depuis le 31/10 (vendre le site ; corrigé le jour même après une capture Instagram) :
  - **écrans de l'appli en mode téléphone** (`"telephone": true` sur le plan) : page réduite qui finit à y 1520,
    barre Safari « grandimi.com » **en bas**, onglets de l'appli juste au-dessus. Plus bas, la légende et le pseudo
    TikTok / Instagram cachent tout ; la colonne d'icônes couvre x > 900. Plus de barre d'adresse en haut.
    `python scripts/telephone.py <id>` convertit un épisode fait avec l'ancien modèle (parties 19 à 22).
  - **plus de pastille « lien en bio » en haut** (jugée « nulle » au début de la vidéo) ;
  - onglets « Rapport · Programme · Exercices · Routine » sur le dashboard, « Programme · Exercices · Routine » sur
    la routine (on montre que ça existe, pas leur contenu) ;
  - routine **comme Taller** (« Routine quotidienne », mêmes habitudes traduites : routine physique, lait + miel,
    moringa 4 g, zinc 13 mg, dormir +8 h, oméga 3, soleil), nette, sans 🤫 ;
  - vraies captures du site (`site_accueil`, `site_sexe`, `site_poids`, pleine largeur dans la page), doigt qui
    appuie sur « Je commence », « Garçon », puis glisse sur le poids. À placer **quand la voix parle du site**
    (louis-23 : « va sur grandimi.com. Tu rentres ton âge, ta taille… »), puis le plan `resultat` (zoom sur la
    taille prédite) ;
  - fin `fin-site` : « grandimi.com » en gros, capture du site, « Lien en bio 👉 » ; pas de sous-titres dessus.
  - Si le script ne dit pas « pas foutu », garder quand même la photo verdict + « PAS FOUTU ✅ » (elle répond au
    commentaire « suis-je foutu ? »), sans sous-titres par-dessus.
  Si le site change, refaire les captures sur le téléphone (barre Safari en bas) et remplacer `site_*.png`.

- Accroche : dézoom lent constant ×1,13 → ×1 ; carte commentaire au format Taller (x 88, y 1045, l 905), jamais
  sur la tête, jusqu'à « 13 ans ».
- « PARTIE N » tapé en jaune sur papier froissé.
- Dashboard avec barre d'adresse Safari « grandimi.com », ballon de l'âge qui tombe du haut, zoom taille actuelle
  puis taille prédite.
- « Avec les bonnes habitudes » : écran « Ma routine » en français, net, onglets du site en bas.
- Topo + silhouette (ou extraterrestre) qui grandit, chiffre tapé sur fond violet.
- Flèche vers « +5 cm », curseur main sur le rang, zoom centré sur « Croissance accomplie ».
- Photo verdict + « PAS FOUTU ✅ » ; topo « ANALYSÉ », 🧓, règle, puis la fin dédiée au site.
- Sons : whoosh à chaque zoom avant, son sur la première flèche, rien sur la deuxième flèche ni sur le flash.
- Sous-titres jaunes Montserrat 600, 86 px, y 822.
