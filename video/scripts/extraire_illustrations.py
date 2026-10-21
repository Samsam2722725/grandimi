"""Extrait les illustrations d'une vidéo de référence au format « 2 raisons » (fond blanc).

Chaque entrée : instant, zone (x, y, l, h en pixels de la vidéo 576×1024) et méthode :
  fond   : le blanc relié aux bords de la zone devient transparent
  carte  : la carte colorée (coins arrondis) est découpée telle quelle
  photo  : la zone est découpée telle quelle, coins arrondis
  couleur: seuls les pixels beiges (et leur contour) sont gardés — illustration posée sur du texte
Les images sont agrandies ×1,875 (576 → 1080 px de large).

La liste (nom, instant, zone, méthode) est dans un fichier JSON, ex. public/textes/<id>/illustrations.json.

Usage : python scripts/extraire_illustrations.py VIDEO.mp4 ILLUSTRATIONS.json DOSSIER_SORTIE
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageFilter

video, out = sys.argv[1], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
SCALE = 1080 / 576
cfg = json.loads(Path(sys.argv[2]).read_text())
ITEMS = [(i["nom"], i["t"], tuple(i["zone"]), i["methode"]) for i in cfg["illustrations"]]
tmp = Path(tempfile.mkdtemp())
for name, t, (x, y, w, h), mode in ITEMS:
    f = tmp / f"{name}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", video, "-frames:v", "1", str(f)], check=True)
    im = cv2.cvtColor(cv2.imread(str(f)), cv2.COLOR_BGR2RGB)[y:y + h, x:x + w]
    if mode == "carte":
        hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
        coloured = (hsv[..., 1] > 60).astype(np.uint8)
        n, lab, st, _ = cv2.connectedComponentsWithStats(coloured)
        i = 1 + int(np.argmax(st[1:, 4]))
        cx, cy, cw, ch = st[i][:4]
        im = im[cy:cy + ch, cx:cx + cw]
        alpha = np.zeros(im.shape[:2], np.uint8)
        r = int(min(cw, ch) * 0.06)
        cv2.rectangle(alpha, (r, 0), (cw - r, ch), 255, -1)
        cv2.rectangle(alpha, (0, r), (cw, ch - r), 255, -1)
        for px, py in [(r, r), (cw - r - 1, r), (r, ch - r - 1), (cw - r - 1, ch - r - 1)]:
            cv2.circle(alpha, (px, py), r, 255, -1)
    elif mode == "photo":
        # photo carrée à coins arrondis : découpée telle quelle, coins transparents
        ph, pw = im.shape[:2]
        alpha = np.zeros((ph, pw), np.uint8)
        r = int(min(pw, ph) * 0.1)
        cv2.rectangle(alpha, (r, 0), (pw - r, ph), 255, -1)
        cv2.rectangle(alpha, (0, r), (pw, ph - r), 255, -1)
        for px, py in [(r, r), (pw - r - 1, r), (r, ph - r - 1), (pw - r - 1, ph - r - 1)]:
            cv2.circle(alpha, (px, py), r, 255, -1)
    elif mode == "couleur":
        hsv = cv2.cvtColor(im, cv2.COLOR_RGB2HSV)
        beige = ((hsv[..., 1] > 25) & (hsv[..., 2] > 150) & (hsv[..., 0] < 35)).astype(np.uint8)
        beige = cv2.morphologyEx(beige, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8))
        alpha = cv2.dilate(beige, np.ones((5, 5), np.uint8)) * 255
    else:
        white = (im.min(axis=2) > 232).astype(np.uint8)
        ff = np.zeros((h + 2, w + 2), np.uint8)
        bg = np.zeros((h, w), np.uint8)
        for (px, py) in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)] + [(i, 0) for i in range(0, w, 8)] + [(i, h - 1) for i in range(0, w, 8)] + [(0, j) for j in range(0, h, 8)] + [(w - 1, j) for j in range(0, h, 8)]:
            if white[py, px] and not bg[py, px]:
                m = white.copy() * 255
                cv2.floodFill(m, ff, (px, py), 128)
                bg |= (m == 128).astype(np.uint8)
        alpha = (1 - bg) * 255
    rgba = Image.fromarray(np.dstack([im, alpha.astype(np.uint8)]), "RGBA")
    a = rgba.getchannel("A").filter(ImageFilter.GaussianBlur(0.8))
    rgba.putalpha(a)
    rgba = rgba.crop(rgba.getbbox())
    big = rgba.resize((round(rgba.width * SCALE), round(rgba.height * SCALE)), Image.LANCZOS)
    big = Image.fromarray(np.dstack([np.asarray(big.convert("RGB").filter(ImageFilter.UnsharpMask(2, 60, 2))), np.asarray(big.getchannel("A"))]), "RGBA")
    big.save(out / f"{name}.png", optimize=True)
    print(name, big.size)
