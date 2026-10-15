"""Prépare les captures d'écran de l'éditeur pour la vidéo « partie 5 ».

Les captures (1170×2532) contiennent la barre d'état du téléphone en haut et
l'interface de l'éditeur vidéo en bas : on recadre, puis on isole les
éléments ajoutés par-dessus l'interface (ballon « 15 », flèche rouge) en
comparant chaque capture à la capture de l'interface seule.

Usage : python scripts/prep_partie5.py DOSSIER_DES_CAPTURES [DOSSIER_DE_SORTIE]
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageFilter

SRC = Path(sys.argv[1])
OUT = Path(sys.argv[2]) if len(sys.argv) > 2 else Path(__file__).resolve().parent.parent / "public" / "episodes" / "partie-5" / "images"
OUT.mkdir(parents=True, exist_ok=True)

FILES = {
    "hook": "70627787",
    "ui": "59f5c125",
    "ui_15": "8a96e96c",
    "routine": "4cac7f3a",
    "anatomie": "3a0b8f9f",
    "anatomie_1m88": "293ee8fc",
    "ui_fleche": "d1b2de13",
    "sourire": "805a176d",
    "topo": "d34ddf24",
}
BOTTOM = 2072  # début de l'interface de l'éditeur (bouton lecture, « Modifier »)
STATUS = 118   # hauteur de la barre d'état du téléphone

img = {k: np.asarray(Image.open(SRC / f"{v}-image.png").convert("RGB")).astype(np.int16) for k, v in FILES.items()}


def save(name, arr):
    Image.fromarray(arr.astype(np.uint8)).save(OUT / f"{name}.png", optimize=True)


# Écrans de l'interface : fond noir, on masque la barre d'état au lieu de rogner
# (le haut des cartes commence juste en dessous).
for k in ["ui", "routine"]:
    a = img[k][:BOTTOM].copy()
    a[:STATUS - 18] = 6
    save(k, a)

# Photos et fonds : on rogne la barre d'état.
for k in ["hook", "anatomie", "sourire", "topo"]:
    save(k, img[k][STATUS:BOTTOM])


def overlay(name, base, layered, thresh=38, keep=None):
    diff = np.abs(img[layered][:BOTTOM] - img[base][:BOTTOM]).sum(axis=2)
    mask = diff > thresh
    if keep is not None:
        mask &= keep(img[layered][:BOTTOM])
    m = Image.fromarray((mask * 255).astype(np.uint8))
    m = m.filter(ImageFilter.MaxFilter(5)).filter(ImageFilter.MinFilter(5))  # bouche les trous
    m = m.filter(ImageFilter.MinFilter(3)).filter(ImageFilter.MaxFilter(3))  # retire le bruit
    m = m.filter(ImageFilter.GaussianBlur(1.2))
    alpha = np.array(m)
    alpha[:STATUS] = 0
    rgba = np.dstack([img[layered][:BOTTOM].astype(np.uint8), alpha])
    ys, xs = np.where(alpha > 40)
    box = (xs.min(), ys.min(), xs.max() + 1, ys.max() + 1)
    Image.fromarray(rgba, "RGBA").crop(box).save(OUT / f"{name}.png", optimize=True)
    print(name, "boîte", box, "pixels", int((alpha > 40).sum()))


overlay("ballon_15", "ui", "ui_15")
overlay("fleche_rouge", "ui", "ui_fleche", keep=lambda a: (a[..., 0] > 150) & (a[..., 1] < 110) & (a[..., 2] < 110))

