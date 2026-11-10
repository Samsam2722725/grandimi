"""Prépare une recopie : sous-titres mesurés (inventaire_soustitres.py) → public/recopies/<id>/recopie.json.

Usage : python scripts/recopie.py <id> POLICE.woff
- taille de police tirée de la hauteur des capitales mesurée, interlettrage et marge ajustés sur la
  largeur de chaque ligne de l'original (moindres carrés) ;
- pour chaque image, le mot surligné (centre du rose mesuré → mot) et l'opacité du rose ;
- remplacements de texte (config.json « remplace ») : le nouveau texte reprend les instants de l'ancien,
  mot à mot via la table « mots » (ancien index → nouvel index).
Coordonnées de l'original (576×1024) ; le moteur les multiplie par 1080/576.
"""
import json
import sys
from pathlib import Path

import numpy as np
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
vid, font_p = sys.argv[1], sys.argv[2]
D = ROOT / "public" / "recopies" / vid
cfg = json.loads((D / "config.json").read_text())
groups = json.loads((ROOT / cfg["reference"] / "soustitres.json").read_text())

t = TTFont(font_p)
cmap, hm, upm = t.getBestCmap(), t["hmtx"], t["head"].unitsPerEm
cap = t["OS/2"].sCapHeight / upm


def adv(s):
    return sum(hm[cmap[ord(c)]][0] for c in s) / upm


CAP_MESURE = 31.5  # hauteur des capitales sans contour, en px de l'original (image 18, « SI TU DORS »)
TAILLE = CAP_MESURE / cap
X, Y = [], []
for g in groups:
    if g["boite"]:
        X.append([len(g["texte"]) - 1, 1])
        Y.append(g["boite"][2] - g["boite"][0] - TAILLE * adv(g["texte"]))
(track, marge), *_ = np.linalg.lstsq(np.array(X, float), np.array(Y), rcond=None)
print(f"taille {TAILLE:.2f} px, interlettrage {track:.2f} px, marge OCR {marge:.1f} px")

sortie = []
for g in groups:
    mots = g["texte"].split(" ")
    x0, _, x1, _ = g["boite"]
    # cellules des mots le long de la ligne (proportionnelles aux avances de la police)
    larg = [TAILLE * adv(m) + track * len(m) for m in mots]
    esp = TAILLE * adv(" ") + track
    total = sum(larg) + esp * (len(mots) - 1)
    gauche = (x0 + x1) / 2 - total / 2
    bornes, x = [], gauche
    for w in larg:
        bornes.append((x - esp / 2, x + w + esp / 2))
        x += w + esp
    images = []
    for im in g["images"]:
        if im["x0"] is None or im["a"] < 0.12:
            images.append([im["f"], -1, 0])
            continue
        c = (im["x0"] + im["x1"]) / 2
        k = int(np.argmin([abs(c - (a + b) / 2) for a, b in bornes]))
        images.append([im["f"], k, round(min(1.0, im["a"] / 0.9), 2)])
    texte = g["texte"]
    rep = cfg.get("remplace", {}).get(texte)
    if rep:
        texte = rep["texte"]
        images = [[f, rep["mots"][k] if k >= 0 else -1, a] for f, k, a in images]
    accent = any(c in "ÉÈÊÀÂÔÛÎÇ" for c in texte)
    sortie.append({"texte": texte, "de": g["de"], "a": g["a"], "cx": (x0 + x1) / 2,
                   "haut": 522 if accent else 530, "bas": 584, "images": images})

out = {"fps": 30, "largeur_ref": 576, "totalFrames": 625, "plaque": cfg["plaque"], "audio": cfg["audio"],
       "police": {"taille": round(TAILLE, 2), "interlettrage": round(float(track), 2), "ligne_base": 571,
                  "graisse": 700, "contour": 3.5, "ombre": 5, "rayon": 7},  # réglés par regler_soustitres.mjs
       "rose": "#F02854", "groupes": sortie, "cta": cfg["cta"]}
(D / "recopie.json").write_text(json.dumps(out, ensure_ascii=False, indent=1))
print(D / "recopie.json", len(sortie), "groupes")
