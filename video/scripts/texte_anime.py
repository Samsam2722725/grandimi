"""Construit la timeline d'une vidéo en texte animé : chaque mot affiché reçoit l'instant où il est prononcé.

Dossier public/textes/<id>/ : ecrans.json (écrans, lignes, images), mots.json (transcription datée),
voice/voix.wav, images/. Sortie : timeline.json, lue par la composition TexteAnime.
Usage : python scripts/texte_anime.py <id>        (ex. deux-raisons)
"""
import difflib
import json
import re
import unicodedata
from pathlib import Path

import soundfile

import sys

ROOT = Path(__file__).resolve().parent.parent / "public" / "textes" / sys.argv[1]
FPS = 30
spec = json.loads((ROOT / "ecrans.json").read_text())
heard = json.loads((ROOT / "mots.json").read_text())
info = soundfile.info(str(ROOT / "voice" / "voix.wav"))
duration = info.frames / info.samplerate

STYLE = {"*": "violet", "!": "rouge", "+": "vert", "~": "gris"}
NUM = {"2": "deux", "1": "un", "17": "17", "23": "23"}


def norm(w):
    w = NUM.get(w.strip(".,!?"), w)
    w = unicodedata.normalize("NFD", w.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", w)


def parse(line):
    out, style = [], None
    for tok in line.split():
        st = style
        for mark, name in STYLE.items():
            if tok.startswith(mark):
                st = name
                tok = tok[1:]
                style = name
        end = False
        for mark in STYLE:
            if tok.endswith(mark) or tok.rstrip(".,").endswith(mark):
                tok = tok.replace(mark, "")
                end = True
        out.append({"w": tok, "style": st})
        if end:
            style = None
    return out


tokens = []  # (écran, ligne, index du mot)
for si, s in enumerate(spec["ecrans"]):
    for li, l in enumerate(s["lignes"]):
        l["mots"] = parse(l["t"])
        for wi, w in enumerate(l["mots"]):
            tokens.append((si, li, wi))
a = [norm(spec["ecrans"][si]["lignes"][li]["mots"][wi]["w"]) for si, li, wi in tokens]
b = [norm(h["w"]) for h in heard]
times = [None] * len(tokens)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if tag in ("equal", "replace"):
        for k in range(i2 - i1):
            times[i1 + k] = heard[j1 + min(k * max(1, j2 - j1) // max(1, i2 - i1), j2 - j1 - 1)]["t"]
for k in range(len(times)):  # mots sans voix (émoji…) : même instant que le mot précédent
    if times[k] is None:
        times[k] = times[k - 1] if k else 0.0
for (si, li, wi), t in zip(tokens, times):
    spec["ecrans"][si]["lignes"][li]["mots"][wi]["f"] = round(t * FPS)

for si, s in enumerate(spec["ecrans"]):
    words = [w for l in s["lignes"] for w in l["mots"]]
    s["debut"] = max(0, min(w["f"] for w in words) - 3)

    def anchor(a, words=words):
        m = re.match(r"^(.+?)(?:#(\d+))?([+-]\d+)?$", a)
        word, nth, off = m.groups()
        hits = [w["f"] for w in words if norm(w["w"]).startswith(norm(word))]
        return hits[int(nth) - 1 if nth else 0] + int(off or 0)

    for im in s.get("images", []):
        im["a"] = anchor(im["a"])
        if "fin" in im:
            im["fin"] = anchor(im["fin"])
        if "vers" in im:
            im["vers"]["a"] = anchor(im["vers"]["a"])
    if "icone" in s:
        s["icone"]["a"] = anchor(s["icone"]["a"])
    for l in s["lignes"]:
        if "monte" in l:
            l["monte"]["a"] = anchor(l["monte"]["a"])
# Taille : ×1,3 (mesuré sur l'original), plafonnée pour que la ligne tienne dans l'écran.
# Largeur Poppins 800 ≈ 0,56 × taille (marge comprise) par caractère (mesuré sur le rendu).
GROS, RATIO = 1.3, 0.56
for s in spec["ecrans"]:
    def fit(l):
        avail = (1080 - l.get("x", 0) - 50) if l.get("align") == "left" else 1000
        g = 1 if l.get("fixe") else GROS
        return min(l["taille"] * g, avail / (len(l["t"].replace("*", "").replace("!", "").replace("+", "").replace("~", "")) * RATIO))
    gauche = [l for l in s["lignes"] if l.get("align") == "left"]
    if gauche:
        t = min(fit(l) for l in gauche)
        for l in gauche:
            l["taille"] = round(t)
    for l in s["lignes"]:
        if l.get("align") != "left":
            l["taille"] = round(fit(l))
    # Lignes empilées : écart minimal proportionnel à la taille (les lignes ont grossi).
    ls = sorted(s["lignes"], key=lambda l: l["y"])
    for a, b in zip(ls, ls[1:]):
        if b["y"] - a["y"] < 200:  # même bloc de texte
            b["y"] = max(b["y"], round(a["y"] + 0.58 * (a["taille"] + b["taille"])))
for si, s in enumerate(spec["ecrans"]):
    s["fin"] = spec["ecrans"][si + 1]["debut"] if si + 1 < len(spec["ecrans"]) else round(duration * FPS) + 6
spec["totalFrames"] = round(duration * FPS) + 6
spec["fps"] = FPS
(ROOT / "timeline.json").write_text(json.dumps(spec, ensure_ascii=False, indent=1))
print(f"{len(tokens)} mots affichés, {len(spec['ecrans'])} écrans, {duration:.1f} s")
for s in spec["ecrans"]:
    print(s["debut"], "→", s["fin"], " | ", " / ".join(" ".join(f"{w['w']}@{w['f']}" for w in l["mots"]) for l in s["lignes"]))
