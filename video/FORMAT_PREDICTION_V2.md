# Format prédiction **V2** (parties 21 et 22 du 01/11 : `manzi-21`, `paul-22`)

Recette **séparée** : elle ne remplace ni `FORMAT_PREDICTION.md` (style d'hier, `cory-19`) ni
`FORMAT_PREDICTION_TELEPHONE.md` (`louis-23`), que d'autres conversations utilisent. Ne pas modifier ces deux
fichiers ni les épisodes qu'ils citent.

Modèle à copier : **`paul-22`** (`manzi-21` = même chose, voix plus courte). Le montage, les effets, les sons et
la technique ne changent pas : seuls la voix, le texte, le prénom, les chiffres, les photos et la carte changent.

## Ce que contient le style V2

- Le style d'hier (accroche avec dézoom lent et carte commentaire Taller, « PARTIE N » sur papier, dashboard avec
  barre « grandimi.com » en haut, ballon de l'âge, zoom taille actuelle puis prédite, topo + silhouette avec le
  chiffre tapé, flèche sur « +X cm », doigt sur le rang + flash, photo verdict « PAS FOUTU ✅ », fin topo
  « ANALYSÉ » / ordinateur / règle, sous-titres jaunes Montserrat).
- **Routine nette qui se coche** (comme Taller, sans 🤫 ni flou) sur le début de la phrase « programme » :
  élément `{"type":"routine","url":"grandimi.com","flou":0,"coche":{"de":…,"a":…}}` (~2,5 s, entre floue → nette,
  avance lentement, habitudes cochées une à une, « En cours » qui compte).
- **Écran « Création de ton plan… »** (copie du site, `src/episode/CalculGrandimi.tsx`) sur la suite de la phrase
  (« découvre… exercices, alimentation, routines ») jusqu'au chiffre optimisé :
  `{"type":"calcul","a":0,"fin":"<ligne>:<chiffre>-3","url":"grandimi.com"}`.
- **Mouvement continu** : `"pousse": 0.04` sur tous les plans dashboard ; si un rapport reste > 2 s sans zoom,
  ajouter une caméra (ex. paul-22 `ecran2` : zoom « +X cm », glissement vers la courbe, retour avant le doigt).
- **Voix ×1,1** (`atempo=1.1`) après le retrait des blancs (0,08 s).
- Si l'appel final est long : `appel` (ANALYSÉ…) sur la 1ʳᵉ phrase, `programme_fin` (routine qui se coche) sur
  « ton propre programme… », `appel2` (topo + « 🔗 grandimi.com ») sur « va directement sur grandimi.com » ;
  sous-titres coupés pendant `programme_fin` (voir les fenêtres de paul-22).

## Étapes

```bash
S=<dossier temporaire>; cd video
# outils : .claude/skills/video/SKILL.md « Démarrage » (venv, Parakeet, npm install)
ls public/episodes            # choisir un id libre : prenom-N, sinon prenom-N-v2 (ne jamais écraser un épisode existant)
python scripts/nouvel_episode.py prenom-N --depuis paul-22
cp public/episodes/paul-22/images/{silhouette.png,curseur.png,ordi.png,regle.png,papy.png,papier*.jpg} public/episodes/prenom-N/images/
python scripts/ballon.py <âge> public/episodes/prenom-N/images/ballon_<âge>.png 569 argent
```

1. **Voix** : `ffmpeg -i voix.mp3 -ar 44100 -ac 1 brut.wav` → `scripts/blancs.py brut.wav trim.wav 0.08` →
   `ffmpeg -i trim.wav -af "atempo=1.1,apad=pad_dur=0.3" -ar 44100 public/episodes/prenom-N/voice/voix.wav`.
   Transcrire (`scripts/transcrire.py`) et vérifier la voix ; un passage qui sort en anglais ou « grandini » :
   le retranscrire seul avant de le signaler.
2. **Photos et carte** (envoyées par l'utilisateur, hors git via `.git/info/exclude`) : `accroche.jpg` (1ʳᵉ photo),
   `verdict.jpg` (2ᵉ photo), `avatar.png` découpé dans la carte ; `images` avec les vraies dimensions et les
   caméras `accroche` / `verdict` centrées sur la photo.
3. **episode.json** : `lines` = texte de la voix mot pour mot (une ligne par phrase, ids proches de paul-22 :
   hook, stats, age, norme, predit, habitudes, atteint, optim, pct, cta, cta2, site) ; `partie` ;
   `carteCommentaire` (nom, texte de la carte telle quelle) ; `dashboard.donnees` des deux rapports (actuelle,
   prédite, optimiser, courbe 7 points de l'âge à 21 ans, rang, chances, croissance = actuelle ÷ prédite) ;
   chiffre tapé du plan `chiffre` ; puis recaler chaque ancre `"ligne:mot"` sur les mots du nouveau texte.
4. `scripts/voix_fichier.py prenom-N MODELE` puis rendu, son normalisé (`loudnorm=I=-14:TP=-1.5:LRA=7`) dans
   `rendu/grandimi-partieN-prenom.mp4`.
5. **Contrôle** : planche d'images (1,5 i/s) et `scripts/statique.py VIDEO 0.6` : aucun passage figé > 2 s.
6. Livrer la vidéo, commit en français, push. Signaler une seule fois : chiffres choisis (courbe, chances),
   incohérences carte / voix, calculs faux du script, vidéo > 40 s.
