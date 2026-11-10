"""Inventaire image par image des sous-titres « CapCut » d'une référence (ligne + mot surligné rose).

Usage : python scripts/inventaire_soustitres.py IMAGES_DIR OCR.json GROUPES.json SORTIE.json
- IMAGES_DIR : toutes les images de l'original (0001.png = image 0) ;
- OCR.json : sortie OCR image par image (bande des sous-titres) ;
- GROUPES.json : [[texte, première_image, dernière_image], …] relevés sur l'OCR.
Sortie : pour chaque groupe, boîte de la ligne (médiane des boîtes OCR), position de chaque mot,
et pour chaque image le mot surligné et l'opacité mesurée du rose.
"""
import json
import sys

import cv2
import numpy as np

imgs, ocr_p, grp_p, out_p = sys.argv[1:5]
ocr = {o["f"]: o for o in json.load(open(ocr_p))}
groups = json.load(open(grp_p))
ROSE = np.array([240, 40, 84])  # RGB mesuré
Y0, Y1 = 575, 580  # marge basse du rectangle rose : toujours sous le texte

out = []
for text, a, b in groups:
    boxes = []
    for f in range(a, b + 1):
        for it in ocr[f]["ocr"]:
            x0, y0, x1, y1 = it["bb"]
            if y0 < 545 and y1 > 565 and (x1 - x0) > 0.6 * len(text) * 12:
                boxes.append(it["bb"])
    bb = np.median(np.array(boxes), axis=0).round().astype(int).tolist() if boxes else None
    frames = []
    for f in range(a, b + 1):
        im = cv2.imread(f"{imgs}/{f + 1:04d}.png")[:, :, ::-1].astype(float)
        band = im[Y0:Y1, :]
        # rose : rouge fort, vert faible ; opacité par colonne = écart au blanc projeté sur l'axe rose
        r, g = band[..., 0], band[..., 1]
        pink = np.clip(((r - g) - 20) / (ROSE[0] - ROSE[1] - 20), 0, 1).mean(0)
        cols = np.nonzero(pink > 0.15)[0]
        cols = cols[(cols > bb[0] - 25) & (cols < bb[2] + 25)] if bb and len(cols) else cols
        if len(cols) > 8:
            # plus long segment continu
            seg = np.split(cols, np.nonzero(np.diff(cols) > 3)[0] + 1)
            s = max(seg, key=len)
            frames.append({"f": f, "x0": int(s[0]), "x1": int(s[-1]), "a": round(float(pink[s].mean()), 2)})
        else:
            frames.append({"f": f, "x0": None, "x1": None, "a": 0})
    out.append({"texte": text, "de": a, "a": b, "boite": bb, "images": frames})
    hl = " ".join(f"{x['f']}:{x['x0']}-{x['x1']}@{x['a']}" for x in frames if x["x0"] is not None)
    print(text, a, b, bb, "\n   ", hl[:600])
json.dump(out, open(out_p, "w"), ensure_ascii=False, indent=1)
