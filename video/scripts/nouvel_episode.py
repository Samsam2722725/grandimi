"""Crée un épisode à partir d'un épisode existant (même structure de plans).

Usage : python scripts/nouvel_episode.py partie-6 [--depuis partie-5]

Copie episode.json et met à jour le numéro de partie. Ensuite :
  1. public/episodes/partie-6/images/ : les nouvelles captures (scripts/prep_partie5.py pour les nettoyer)
  2. episode.json : le texte (lines) et les ancres des plans qui citent des mots qui ont changé
  3. la voix : scripts/voice.py (synthèse) ou votre enregistrement
  4. aperçu : npm run studio ; rendu : npx remotion render Episode out/partie-6.mp4 --props='{"episode":"partie-6"}'
  5. kit : python scripts/kit.py partie-6
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "public" / "episodes"
new = sys.argv[1]
src = sys.argv[sys.argv.index("--depuis") + 1] if "--depuis" in sys.argv else "partie-5"
dst = ROOT / new
if dst.exists():
    sys.exit(f"{dst} existe déjà")
ep = json.loads((ROOT / src / "episode.json").read_text())
m = re.search(r"(\d+)$", new)
if m:
    ep["partie"] = int(m.group(1))
(dst / "images").mkdir(parents=True)
(dst / "voice").mkdir()
(dst / "episode.json").write_text(json.dumps(ep, ensure_ascii=False, indent=2) + "\n")
print(f"Créé {dst} (structure de {src}, partie {ep['partie']}).")
print(__doc__.split("Ensuite :")[1])
