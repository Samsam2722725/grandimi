# Vidéos TikTok Grandimi

| Vidéo | Composition | Rendu |
|---|---|---|
| « 2 erreurs qui freinent ta croissance » | `Croissance` | `rendu/grandimi-croissance.mp4` (37 s) |
| « Prédiction à partir de nos commentaires », partie 5 | `Episode` (`{"episode":"partie-5"}`) | `rendu/grandimi-partie5.mp4` (39 s) |
| « Prédiction à partir de nos commentaires », partie 6 | `Episode` (`{"episode":"partie-6"}`) | `rendu/grandimi-partie6.mp4` (33 s) |
| « Prédiction à partir de nos commentaires », partie 7 | `Episode` (`{"episode":"partie-7"}`) | `rendu/grandimi-partie7.mp4` (32 s) |
| « Prédiction à partir de nos commentaires », partie 8 | `Episode` (`{"episode":"partie-8"}`) | `rendu/grandimi-partie8.mp4` (34 s) |
| « Prédiction à partir de nos commentaires », partie 9 | `Episode` (`{"episode":"partie-9"}`) | `rendu/grandimi-partie9.mp4` (34 s) |
| « Prédiction à partir de nos commentaires », partie 10 | `Episode` (`{"episode":"partie-10"}`) | `rendu/grandimi-partie10.mp4` (35 s) |
| « Prédiction à partir de nos commentaires », partie 11 | `Episode` (`{"episode":"partie-11"}`) | `rendu/grandimi-partie11.mp4` (35 s, photo de verdict à fournir) |
| « Prédiction », partie 13 (format Steve, Parsa) | `Episode` (`{"episode":"steve-13"}`) | `rendu/grandimi-partie13-parsa.mp4` (30 s) |
| « 1m60 à 13 ans » (format rayan.taller, voix seule) | `Episode` (`{"episode":"rayan-1"}`) | `rendu/grandimi-1m60-13ans.mp4` (26 s) |
| « 1m75 à 17 ans » (photo + saisie Grandimi) | `Episode` (`{"episode":"photo-15"}`) | `rendu/grandimi-photo-15.mp4` (35 s, photos tierces non versionnées) |
| « Addy, 14 ans 1m63 » (format Steve amélioré, version de travail) | `Episode` (`{"episode":"addy-16"}`) | `rendu/grandimi-addy-16.mp4` (33 s, photo tierce non versionnée) |
| Partie 15 « Addy » (accroche glowup complète + format Taller) | `Episode` (`{"episode":"addy-15"}`) | `rendu/grandimi-partie15.mp4` (34 s, photo tierce non versionnée) |
| « 15 ans 1m68 » (chats 3D, format Tallex) | `Episode` (`{"episode":"chats-16"}`) | `rendu/grandimi-chats-16.mp4` (26 s) |
| « Ta mère mesure 1m57 » (scène famille sur grille verte, format TallUp) | `Episode` (`{"episode":"famille-17"}`) | `rendu/grandimi-famille-17.mp4` (31 s) |
| Partie 16 « Paul » (copie de la partie 15, bonhomme fourni) | `Episode` (`{"episode":"paul-16"}`) | `rendu/grandimi-partie16-paul.mp4` (34 s, photo tierce non versionnée) |
| « 1m60 à 13 ans » rhinos 3D (format tallertips) | `Episode` (`{"episode":"rhino-1"}`) | `rendu/grandimi-rhino-1m60.mp4` (22 s) |
| Partie 18 « Heyam » (format Taller « Predicting height potential ») | `Episode` (`{"episode":"heyam-18"}`) | `rendu/grandimi-partie18-heyam.mp4` (39 s, photos tierces non versionnées) |
| Partie 39 « Sam » (même format) | `Episode` (`{"episode":"sam-39"}`) | `rendu/grandimi-partie39-sam.mp4` (38 s, photos tierces non versionnées) |
| Partie 19 « Cory » (même format, extraterrestre) | `Episode` (`{"episode":"cory-19"}`) | `rendu/grandimi-partie19-cory.mp4` (40 s, photos tierces non versionnées) |
| « Comment il fait 1m85 ? » (explicatif bonshommes, référence p25) | `Episode` (`{"episode":"jordan-1"}`) | `rendu/grandimi-jordan.mp4` (54 s) |

| « 2 raisons pour lesquelles tu ne grandis plus » (texte animé) | `TexteAnime` (`{"video":"deux-raisons"}`) | `rendu/grandimi-deux-raisons.mp4` (46 s) |

Format 1080×1920, 30 i/s, son normalisé à −14 LUFS.

## Texte animé mot par mot (« 2 raisons », « signes »…)

Une vidéo = un dossier `public/textes/<id>/` :
- `ecrans.json` : les écrans (lignes de texte, couleurs `*violet*` `!rouge!` `+vert+` `~gris~`, illustrations et leur mot d'apparition) ;
- `voice/voix.wav` et `mots.json` : voix et transcription datée, par morceaux de ~9 s (un bloc unique saute des phrases) ;
- `illustrations.json` + `images/` : illustrations extraites de la référence.

```bash
python scripts/extraire_illustrations.py REF.mp4 public/textes/<id>/illustrations.json public/textes/<id>/images
python scripts/texte_anime.py <id>      # → timeline.json (tailles ×1,3 plafonnées à la largeur de l'écran)
npx remotion render TexteAnime out/<id>.mp4 --props='{"video":"<id>"}'
```

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
Ballon de l'âge : `python scripts/ballon.py 14 SORTIE.png [dore|argent]`. Émojis et flèche 3D : `python scripts/emoji.py DOSSIER main=👆 fleche_doree=dore`.
Plan filmé recopié de l'original (ex. figurine alien) : `sequence` dans le plan (une image par frame, la dernière reste).
Accroche dessinée « 1m78, c'est la taille moyenne en France » (bonhomme + barre, puis carte) : `"hookTaille": {"cm", "carte", "moyenne"}`
dans le plan, sous-titres `"style": "condense"` (Barlow Condensed, mot prononcé surligné) ; carte : `scripts/carte_france.py` (Natural Earth, domaine public).
Accroche « on prédit votre potentiel… à partir de vos commentaires » : `"hookCommentaires"` (barre jusqu'à la taille actuelle, potentiel « 1?? », bulles de commentaires).
Fond topographique animé comme les références (lignes qui ondulent) : `"fond": "topo"` (+ `"topo": {"zoomDe", "d", "coup"}`). Fin qui reboucle sur l'accroche : `"sortie": "blanc"`.
Entrées `etire` (étirement vertical), `radial` (flou radial), `lumiere-rouge` ; sortie `lumiere-forte` (jaune-orangé couvrant), `noir` (fond noir, éléments gardés).
Texte tapé avec curseur et pastille : élément `tape` + `"curseur": true, "fond": "#8100fe"` ; texte `"effet": "glitch"` ou `"fondu"`.
Entrée inclinée qui se redresse : `"transition": "bascule"`. Élément qui glisse en entrant : `depuis` ; qui alterne deux images : `alterne`.
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
