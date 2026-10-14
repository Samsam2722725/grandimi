# Vidéo TikTok « 2 erreurs qui freinent ta croissance »

Rendu final : `rendu/grandimi-croissance.mp4` (1080×1920, 30 i/s, 37 s, son normalisé à −14 LUFS).

## Comment c'est fait

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
