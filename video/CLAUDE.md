# Dossier video/ — consignes pour Claude

- Les vidéos TikTok de Grandimi se font ici avec Remotion. Le format principal est décrit dans
  `STYLE.md` : **ce style est figé** (tag git `style-v1`). Ne le modifie pas sans accord explicite de
  l'utilisateur ; un nouvel épisode change les personnes, les chiffres et le texte, pas le style.
- Un épisode = `public/episodes/<id>/` (voir `README.md`). Créer avec `python scripts/nouvel_episode.py`,
  jamais en modifiant `partie-5`, qui sert de référence.
- Ordre de travail : texte → voix → images → montage → rendu → planche de comparaison avec
  l'original → retours de l'utilisateur. La voix vient toujours avant le montage ; tant qu'elle
  manque, une voix de synthèse provisoire (Kokoro) sert à monter.
- Avant de livrer, compare toujours à la vidéo de référence image par image (zones et moments),
  et vérifie la durée totale (cible 30-31 s).
- Outils (à réinstaller dans une nouvelle session, dans un venv du dossier temporaire) :
  - voix de synthèse : `pip install kokoro-onnx soundfile`, modèles sur
    https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0 (voix `ff_siwis`) ;
  - transcription avec temps par mot : `pip install sherpa-onnx`, modèle
    https://github.com/k2-fsa/sherpa-onnx/releases/download/asr-models/sherpa-onnx-nemo-parakeet-tdt-0.6b-v3-int8.tar.bz2 ;
  - analyse d'une vidéo de référence : `pip install opencv-python-headless`, `scripts/analyse_reference.py` ;
  - rendu dans le conteneur cloud : `BROWSER_EXECUTABLE=/opt/pw-browsers/chromium_headless_shell-1194/chrome-linux/headless_shell`.
- L'utilisateur parle français, veut des réponses directes et concrètes, et livre ses images en
  captures d'écran : les nettoyer avec `scripts/prep_partie5.py` (barre d'état, interface de l'éditeur).
