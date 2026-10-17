"""Planche de comparaison : vidéo de référence (gauche) / épisode (droite), sur des moments clés.

Usage : BROWSER_EXECUTABLE=… python scripts/comparer.py EPISODE_ID REFERENCE.mp4 SORTIE.jpg
Les moments sont dans public/episodes/<id>/comparaison.json : [[nom, temps_reference_s, ancre], …]
(ancres : même grammaire que episode.json).
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ep_id, ref, out = sys.argv[1:4]
SRC = ROOT / "public" / "episodes" / ep_id
tl = json.loads((SRC / "timeline.json").read_text())
L = {l["id"]: l for l in tl["lines"]}
events = json.loads((SRC / "comparaison.json").read_text())


def clean(s):
    return re.sub(r"[^a-z0-9']", "", unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode())


def resolve(a):
    if isinstance(a, (int, float)):
        return int(a)
    lid, word, off = re.match(r"^([A-Za-z0-9_]+)(?::(.+?))?([+-]\d+)?$", a).groups()
    l = L[lid]
    if not word:
        base = l["from"]
    elif word == "fin":
        base = l["from"] + l["duration"]
    else:
        base = next(w["f"] for w in l["words"] if clean(w["w"]).startswith(clean(word)))
    return base + int(off or 0)


tmp = Path(tempfile.mkdtemp())
font = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
for i, (nom, t, anc) in enumerate(events):
    fr = resolve(anc)
    a, b, c = tmp / f"{i:02d}a.png", tmp / f"{i:02d}b.png", tmp / f"{i:02d}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", ref, "-frames:v", "1", "-vf", "scale=360:640", str(a)], check=True)
    subprocess.run(["npx", "remotion", "still", "Episode", str(b), f"--frame={fr}", f"--props={json.dumps({'episode': ep_id})}", "--log=error"],
                   cwd=ROOT, env=os.environ, check=True)
    label = f"{i + 1}. {nom}  ({t:.1f} s / {fr / tl['fps']:.1f} s)".replace("'", "’").replace(":", "\\:")
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(a), "-i", str(b), "-filter_complex",
                    f"[1]scale=360:640[b];[0][b]hstack,pad=iw:ih+50:0:50:white,drawtext=fontfile={font}:text='{label}':x=10:y=12:fontsize=22:fontcolor=black",
                    str(c)], check=True)
    print(i + 1, nom, f"référence {t} s ↔ épisode {fr / tl['fps']:.2f} s")
cols = 4
rows = (len(events) + cols - 1) // cols
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(tmp / "%02d.png"), "-vf",
                f"tile={cols}x{rows}:padding=8:color=gray,scale=1600:-1", "-frames:v", "1", out], check=True)
print(out)
