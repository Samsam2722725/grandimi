"""Plaque : l'original sans ses sous-titres (lettres, ombre et surlignage effacés puis reconstruits par inpainting).

Usage : python scripts/plaque.py IMAGES_DIR SOUSTITRES.json SORTIE_DIR
Les nouveaux sous-titres sont posés par-dessus au même endroit, ce qui cache l'essentiel des retouches.
"""
import json
import sys
from pathlib import Path

import cv2
import numpy as np

imgs, st_p, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
groups = json.load(open(st_p))


def remplir_vertical(im, m):
    """Chaque colonne masquée est interpolée entre le pixel au-dessus et le pixel en dessous du trou
    quand ils se ressemblent (jambes, toise, téléphone restent continus) ; ailleurs, inpainting Navier-Stokes."""
    out = im.astype(np.float32)
    ns = cv2.inpaint(im, m, 5, cv2.INPAINT_NS).astype(np.float32)
    for x in np.nonzero(m.any(0))[0]:
        col = m[:, x] > 0
        ys = np.nonzero(col)[0]
        runs = np.split(ys, np.nonzero(np.diff(ys) > 1)[0] + 1)
        for r in runs:
            a, b = max(r[0] - 1, 0), min(r[-1] + 1, im.shape[0] - 1)
            t = ((r - a) / (b - a))[:, None]
            vert = out[a, x] * (1 - t) + out[b, x] * t
            # même couleur au-dessus et en dessous : trait vertical, on interpole ; sinon inpainting classique
            w = float(np.exp(-np.abs(out[a, x] - out[b, x]).mean() / 18))
            out[r, x] = w * vert + (1 - w) * ns[r, x]
    return out.astype(np.uint8)


masks = {}
for g in groups:
    x0, y0, x1, y1 = g["boite"]
    xs = [x0] + [i["x0"] for i in g["images"] if i["x0"] is not None]
    xe = [x1] + [i["x1"] for i in g["images"] if i["x1"] is not None]
    for f in range(g["de"], g["a"] + 1):
        masks[f] = (max(0, min(xs) - 20), 506, min(575, max(xe) + 20), 604)
n = len(list(Path(imgs).glob("*.png")))
for f in range(n):
    im = cv2.imread(f"{imgs}/{f + 1:04d}.png")
    if f in masks:
        x0, y0, x1, y1 = masks[f]
        # masque serré : lettres blanches + rose du surlignage, élargis pour couvrir l'ombre noire
        roi = im[y0:y1, x0:x1].astype(int)
        b, g, r = roi[..., 0], roi[..., 1], roi[..., 2]
        txt = ((roi.min(2) > 232) | ((r - g) > 90)).astype(np.uint8) * 255
        txt = cv2.dilate(txt, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (27, 27)))
        m = np.zeros(im.shape[:2], np.uint8)
        m[y0:y1, x0:x1] = txt
        m[y0 + 6:y1 - 6, x0 + 6:x1 - 6] = np.maximum(m[y0 + 6:y1 - 6, x0 + 6:x1 - 6], 0)
        im = remplir_vertical(im, m)
    cv2.imwrite(str(out / f"{f + 1:04d}.png"), im)
print(n, "images", len(masks), "retouchées")
