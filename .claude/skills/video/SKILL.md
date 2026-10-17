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
   jusqu'à zéro écart, puis livrer : vidéo, comparaison côte à côte, kit CapCut (`scripts/kit.py`).
6. **Enregistrer et pousser** après chaque étape (commit en français, branche de travail de la session).

## Préférences de l'utilisateur (à respecter sans qu'il le redise)

- Whooshs rares et discrets : un par changement de plan, volume ≤ 0,25.
- Carte « réponse au commentaire » jamais dans la vidéo (ajoutée sur TikTok).
- Lien `grandimi.com` bien visible.
- Copier l'original au maximum ; les chiffres affichés suivent le texte de l'utilisateur.
- Alternance V1 / V2 d'un épisode à l'autre pour le test (voir `STYLE.md`).
