# Vidéos TikTok Grandimi

| Vidéo | Composition | Rendu |
|---|---|---|
| « 2 erreurs qui freinent ta croissance » | `Croissance` | `rendu/grandimi-croissance.mp4` (37 s) |
| « Prédiction à partir de nos commentaires », partie 5 | `Episode` (`{"episode":"partie-5"}`) | `rendu/grandimi-partie5.mp4` (39 s) |
| « Prédiction à partir de nos commentaires », partie 6 | `Episode` (`{"episode":"partie-6"}`) | `rendu/grandimi-partie6.mp4` (33 s) |
| « Prédiction à partir de nos commentaires », partie 7 | `Episode` (`{"episode":"partie-7"}`) | `rendu/grandimi-partie7.mp4` (32 s) |

Format 1080×1920, 30 i/s, son normalisé à −14 LUFS.

## Format « prédiction à partir de vos commentaires »

Un épisode = un dossier `public/episodes/<id>/` :

| Fichier | Rôle |
|---|---|
| `episode.json` | tout ce qui change d'un épisode à l'autre : texte de la voix, images, zones de l'écran, plans |
| `timeline.json` | généré : début de chaque phrase et de chaque mot |
| `images/`, `voice/` | captures nettoyées, voix découpée par phrase |

Le moteur (`src/episode/Episode.tsx`) lit ce dossier : aucun code à toucher pour un nouvel épisode.
Le format de `episode.json` est décrit dans `src/episode/types.ts`. Les plans s'accrochent à la voix par
des ancres : `"age:1m73-2"` = deux frames avant le mot « 1m73 » de la phrase `age`.

```bash
python scripts/nouvel_episode.py partie-6            # copie la structure de la partie 5
python scripts/prep_partie5.py CAPTURES public/episodes/partie-6/images
KOKORO_DIR=… python scripts/voice.py public/episodes/partie-6/episode.json public/episodes/partie-6/voice public/episodes/partie-6/timeline.json
npm run studio                                       # aperçu, composition « Episode »
npx remotion render Episode out/partie-6.mp4 --props='{"episode":"partie-6"}'
python scripts/kit.py partie-6                       # kit CapCut (clips, pistes, .srt)
python scripts/comparer.py partie-6 REF.mp4 out/comparaison.jpg   # planche référence / épisode
```

Voix enregistrée (au lieu de la synthèse) : un seul fichier `voice/voix.wav`, puis
`python scripts/voix_fichier.py partie-6 DOSSIER_PARAKEET` (transcription + alignement sur le texte).
Capture Grandimi avec d'autres chiffres : `python scripts/modifier_capture.py SOURCE.png SORTIE.png capture.json`.
Ballon de l'âge : `python scripts/ballon.py 14 SORTIE.png [dore]`. Émojis et flèche 3D : `python scripts/emoji.py DOSSIER main=👆 fleche_doree=dore`.
Un nouvel épisode reprend `episode.json` mais pas les images : copier papiers, routine, anatomie et topo depuis l'épisode précédent.

```bash
```

Dans `{affiché|prononcé}`, la voix dit la seconde partie et l'écran montre la première : `{1m73|un mètre soixante-treize}`.

## « 2 erreurs » : comment c'est fait

| Élément | Source |
|---|---|
| Texte de la voix off | `script.json` (une entrée par phrase, avec la pause qui suit) |
| Voix off | `scripts/voice.py` : Kokoro (voix française `ff_siwis`), écrit `public/voice/*.wav` et `src/timeline.json` (début de chaque phrase et estimation du début de chaque mot) |
| Bruitages et musique | `scripts/sfx.py` : tout est synthétisé, aucun fichier externe |
| Animation | Remotion (React) : `src/Scenes.tsx` (une scène par idée), `src/components/` (silhouette animable, accessoires, sous-titres) |

## Modifier puis refaire la vidéo

```bash
cd video
npm install

# 1. Modifier le texte dans script.json, puis régénérer la voix et la timeline
#    (modèles : https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0)
pip install kokoro-onnx soundfile
KOKORO_DIR=/dossier/des/modeles python scripts/voice.py

# 2. Aperçu en direct dans le navigateur
npm run studio

# 3. Rendu
npm run render
ffmpeg -i out/croissance.mp4 -c:v copy -af loudnorm=I=-14:TP=-1.5:LRA=7 -c:a aac -b:a 192k rendu/grandimi-croissance.mp4
```

Les scènes retrouvent leurs moments clés par mot (`wordAt('kine', 'coach')`). Si vous changez une phrase,
gardez les mots utilisés comme repères dans `src/Scenes.tsx`, ou mettez-les à jour.

Licence Remotion : gratuite pour les particuliers et les entreprises de 3 personnes au plus, licence payante au-delà.
