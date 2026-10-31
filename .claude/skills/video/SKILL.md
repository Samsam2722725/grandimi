---
name: video
description: Produire une vidéo TikTok Grandimi en recopiant une vidéo virale (format « prédiction à partir de vos commentaires » ou « 2 raisons » en texte animé). À utiliser dès que l'utilisateur envoie une vidéo à recopier, une voix, un script ou des images pour une vidéo.
---

# Vidéo TikTok Grandimi

Tout le savoir est dans `video/` : lis d'abord `video/CLAUDE.md`, `video/PROCESSUS.md`, `video/STYLE.md`
et `video/README.md`. Réponds en français, directement, sans flatterie. Ne modifie jamais le texte de
l'utilisateur : signale un problème une seule fois, puis applique son choix.

## Démarrage (outils absents d'une nouvelle session)

Dans un venv du dossier temporaire (scratchpad) :
```bash
python3 -m venv $S/venv && $S/venv/bin/pip install -q sherpa-onnx soundfile opencv-python-headless pillow kokoro-onnx
curl -sSL https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2 | tar xj -C $S
cd video && npm install
export BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell
```
Transcrire par morceaux de ~9 s (un bloc unique saute des phrases).

## Déroulé (une étape à la fois, attendre l'utilisateur quand c'est son tour)

1. **Vidéo à recopier reçue** → l'enregistrer dans `video/references/<id>/original.mp4`, transcrire,
   **inventaire image par image** (méthode de `PROCESSUS.md`), écrire `fiche.md`. Envoyer : fiche,
   transcription anglaise, chiffres convertis, liste exacte des images à fournir. Ne rien construire.
2. **Texte français + voix ElevenLabs** de l'utilisateur → retirer les blancs, caler la durée sur
   l'original (accélération ≤ ~12-14 %, au-delà le dire), transcrire, aligner sur le texte.
3. **Images** → nettoyer (barre d'état, interface d'éditeur), fabriquer ce qui manque :
   capture Grandimi « résultat » aux chiffres de la personne (`modifier_capture.py` + `capture.json` :
   tailles, gain, pourcentages, courbe), ballon de l'âge (`ballon.py`, `dore` possible), émojis et flèche 3D
   (`emoji.py`), illustrations d'une référence (`extraire_illustrations.py`). L'utilisateur n'a pas à
   fabriquer ces images lui-même.
4. **Montage** — choisir le moteur d'après l'analyse :
   - captures d'écran filmées (zooms, flèches, photos ; série « prédiction ») → `public/episodes/<id>/`
     + composition `Episode` (`scripts/nouvel_episode.py`) ;
   - texte animé mot par mot + illustrations (« 2 raisons », « signes »…) → `public/textes/<id>/`
     + composition `TexteAnime` (`scripts/texte_anime.py <id>`) ;
   - autre chose (personne filmée, 3D…) → le dire à l'utilisateur avant de construire un nouveau moteur.
5. **Contrôle chiffré** original / épisode (moments ±2 images, positions ±3 %, tailles ±5 %), corriger
   jusqu'à zéro écart, puis livrer **seulement** : la vidéo finale + **une seule** vidéo côte à côte en entier,
   avec le son Grandimi (`scripts/cote_a_cote.py ORIGINAL EPISODE out/` → `out/cote-a-cote-son-grandimi.mp4` ;
   demande du 29/10 : « j'en ai besoin que d'une »). Plus de kit CapCut ni de zip (demande du 21/10).
   Recopier aussi les **personnages** à l'identique (forme, visage, membres arrière, pieds) et les **polices**
   (famille, graisse, taille mesurée sur l'original ramené en 1080 × 1920) : les mesurer, ne pas les approximer.
6. **Enregistrer et pousser** après chaque étape (commit en français, branche de travail de la session).

## Préférences de l'utilisateur (à respecter sans qu'il le redise)

- Whooshs rares et discrets : un par changement de plan, volume ≤ 0,25.
- Carte « réponse au commentaire » jamais dans la vidéo (ajoutée sur TikTok).
- Lien `grandimi.com` bien visible.
- Copier l'original au maximum ; les chiffres affichés suivent le texte de l'utilisateur.
- Alternance V1 / V2 d'un épisode à l'autre pour le test (voir `STYLE.md`).
- **Format prédiction actuel (29/10) : « Je prédis vos tailles, partie N », copie de Taller partie 39.**
  Pour une nouvelle partie : suivre `video/FORMAT_PREDICTION.md` (copier `cory-19`, changer voix, texte, chiffres,
  photos ; ne rien remesurer). Outils voix : `scripts/blancs.py`, `scripts/transcrire.py`, contrôle `scripts/statique.py`.
- Ancien format de référence : copie de la vidéo « Steve » (`references/p12-steve`, épisodes `steve-1`, `steve-12`) :
  dashboard Grandimi animé (`src/episode/Dashboard.tsx`), transitions `TransitionsSteve.tsx`, sous-titres Montserrat.
  Nouvel épisode : `python scripts/nouvel_episode.py steve-N --depuis steve-12`, changer voix, chiffres, photos, ancres.
- Sons du format Steve : whoosh sur chaque zoom avant, son sur la première flèche, rien sur la deuxième flèche ni le flash.
- Carte commentaire jamais sur la tête de la personne (réglages `x`, `y`).

- Format « face caméra » (référence `references/p14-rayan`, rayan.taller) refait sans personne filmée : épisode `rayan-1`.
  Titre fixe en haut (`titre`), carte commentaire, écran « Création de ton plan… » (élément `chargement`,
  `src/episode/ChargementPlan.tsx`), liste à gauche (élément `texte` avec `x`), puis dashboard avec « ??? cm » révélé.

## Résultats mesurés (TikTok, à garder en tête pour chaque script)

| Vidéo | Vues | Visionnage moyen | Vue en entier | Accroche |
|---|---|---|---|---|
| Partie 9 | 1,1 k | 12,0 s / 34 s | 9,8 % | « 1m78, c'est la taille moyenne… » (dessinée) |
| Partie 12 (Hugo) | 828 | 5,1 s | 1,4 % | « Prédiction de la taille maximale » + photo : 75 % partis en 3 s |
| Partie 13 (Parsa) | 834 (6 h) | 12,9 s / 29,6 s | 11,2 % | accroche 1m78 + « Devine… » + « ??? cm » révélé ; ~2 k vues sur Instagram |

Garder l'accroche 1m78 qui parle au spectateur, la valeur cachée puis révélée, pas de temps mort après l'accroche.
Les vues TikTok plafonnent vers 800-1 100 quel que soit le visionnage : publier aussi sur Instagram Reels.
