"""Change les chiffres d'une capture Grandimi « résultat » (même disposition que la partie 5).

Chaque ancien texte est repéré dans sa zone, effacé (le fond est reconstitué par inpainting),
puis réécrit dans la même couleur et à la même taille (Inter Bold, taille ajustée sur l'ancien texte).
La courbe est redessinée entièrement à partir des valeurs données.

Usage : python scripts/modifier_capture.py SOURCE.png SORTIE.png CONFIG.json
CONFIG : {"actuelle": 175, "predite": 186, "optimiser": 1, "rang": "94%", "croissance": "94%",
          "chances": "40%", "age": 14, "courbe": [175, 179, 181.8, 183.6, 184.8, 185.6, 186]}
"""
import json
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

src, dst, cfg_path = sys.argv[1:4]
cfg = json.load(open(cfg_path))
img = np.asarray(Image.open(src).convert("RGB")).copy()
BOLD = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
SEMI = "/usr/share/fonts/opentype/inter/Inter-SemiBold.otf"
REG = "/usr/share/fonts/opentype/inter/Inter-Regular.otf"


def text_mask(region, thresh=60):
    x0, y0, x1, y1 = region
    r = img[y0:y1, x0:x1].astype(int)
    border = np.concatenate([r[0], r[-1], r[:, 0], r[:, -1]])
    bg = np.median(border, axis=0)
    m = np.abs(r - bg).sum(axis=2) > thresh
    full = np.zeros(img.shape[:2], bool)
    full[y0:y1, x0:x1] = m
    return full


def fit_font(path, text, width):
    size = 10
    while ImageFont.truetype(path, size + 1).getbbox(text)[2] - ImageFont.truetype(path, size + 1).getbbox(text)[0] <= width:
        size += 1
    return ImageFont.truetype(path, size)


def replace(region, old, new, font=BOLD, thresh=60, colour=None, flat=False):
    """flat=True : fond uni (cartes sombres), on repeint ; sinon reconstitution du dégradé."""
    global img
    m = text_mask(region, thresh)
    ys, xs = np.where(m)
    bx0, by0, bx1, by1 = xs.min(), ys.min(), xs.max() + 1, ys.max() + 1
    col = colour or tuple(int(c) for c in np.median(img[m], axis=0))
    f = fit_font(font, old, bx1 - bx0)
    mask = cv2.dilate(m.astype(np.uint8) * 255, np.ones((9, 9), np.uint8))
    if flat:
        x0, y0, x1, y1 = region
        r = img[y0:y1, x0:x1]
        bg = np.median(np.concatenate([r[0], r[-1], r[:, 0], r[:, -1]]), axis=0).astype(np.uint8)
        img[mask > 0] = bg
    else:
        img = cv2.inpaint(img, mask, 6, cv2.INPAINT_TELEA)
    pil = Image.fromarray(img)
    d = ImageDraw.Draw(pil)
    ob = f.getbbox(old)
    d.text((bx0 - ob[0], by0 - ob[1]), new, font=f, fill=col)
    img = np.asarray(pil).copy()
    print(f"{old!r} → {new!r}  boîte=({bx0},{by0},{bx1},{by1}) taille={f.size} couleur={col}")


# Cartes du haut, ligne « Optimiser », rang, cartes du bas (zones de la capture de la partie 5).
replace((228, 200, 520, 292), "173 cm", f"{cfg['actuelle']} cm", flat=True)
replace((780, 200, 1070, 282), "181 cm", f"{cfg['predite']} cm")
replace((780, 286, 930, 326), "(+8 cm)", f"(+{cfg['predite'] - cfg['actuelle']} cm)", font=REG, thresh=40)
replace((462, 420, 640, 482), "4 cm", f"{cfg['optimiser']} cm", thresh=80, flat=True)
replace((540, 1258, 720, 1318), "67,1%", cfg["rang"], thresh=80)
replace((640, 1555, 960, 1650), "95,4%", cfg["croissance"], flat=True)
if cfg.get("chances") and cfg["chances"] != "40%":
    replace((105, 1555, 400, 1650), "40%", cfg["chances"], flat=True)

# Courbe : on efface la zone du graphique et on la redessine.
X = [203, 340, 475, 612, 748, 885, 1022]           # abscisses des 7 âges (repère de la capture)
Y0, PX = 540 + 532, 17.45                         # pixel de la graduation basse, pixels par cm
lo = 5 * int(np.floor((min(cfg["courbe"]) - 3) / 5))
ticks = [lo + 5 * i for i in range(5)]
pil = Image.fromarray(img)
d = ImageDraw.Draw(pil, "RGBA")
card = tuple(int(c) for c in img[540 + 300, 140])
d.rectangle([90, 540 + 165, 1100, 540 + 600], fill=card)                       # graduations, grille, courbe
d.rectangle([860, 540 + 95, 1100, 540 + 170], fill=card)                        # ancienne étiquette
for i, t in enumerate(ticks):
    y = Y0 - i * 5 * PX
    d.line([(203, y), (1022, y)], fill=(255, 255, 255, 18), width=2)
    f = ImageFont.truetype(REG, 30)
    d.text((168, y), str(t), font=f, fill=(170, 170, 170), anchor="rm")
for x in X:
    d.line([(x, Y0 - 4 * 5 * PX), (x, Y0)], fill=(255, 255, 255, 14), width=2)
ages = [cfg["age"] + i for i in range(7)]
for x, a in zip(X, ages):
    d.text((x, 540 + 578), str(a), font=ImageFont.truetype(REG, 30), fill=(190, 190, 190), anchor="mm")
pts = [(x, Y0 - (v - lo) * PX) for x, v in zip(X, cfg["courbe"])]
# remplissage dégradé sous la courbe
fill = Image.new("RGBA", pil.size, (0, 0, 0, 0))
fm = Image.new("L", pil.size, 0)
ImageDraw.Draw(fm).polygon(pts + [(X[-1], Y0), (X[0], Y0)], fill=255)
grad = np.zeros((pil.size[1], pil.size[0], 4), np.uint8)
top, bot = int(min(p[1] for p in pts)), int(Y0)
for y in range(top, bot + 1):
    a = int(150 * (1 - (y - top) / max(1, bot - top)) + 15)
    grad[y, :, :] = (255, 106, 43, a)
grad[..., 3] = (grad[..., 3].astype(int) * (np.asarray(fm) > 0)).astype(np.uint8)
pil = Image.alpha_composite(pil.convert("RGBA"), Image.fromarray(grad, "RGBA"))
d = ImageDraw.Draw(pil, "RGBA")
d.line(pts, fill=(255, 106, 43), width=8, joint="curve")
d.line([(X[-1], pts[-1][1]), (X[-1], Y0 - 0.9 * 5 * PX)], fill=(255, 106, 43, 200), width=3)
for p in pts[:-1]:
    d.ellipse([p[0] - 13, p[1] - 13, p[0] + 13, p[1] + 13], fill=(255, 106, 43))
px, py = pts[-1]
d.ellipse([px - 17, py - 17, px + 17, py + 17], fill=(255, 106, 43))
d.ellipse([px - 8, py - 8, px + 8, py + 8], fill=(255, 255, 255))
tag = f"{cfg['predite']} cm"
tf = ImageFont.truetype(BOLD, 34)
tw = tf.getbbox(tag)[2]
d.rounded_rectangle([px - tw / 2 - 22, py - 128, px + tw / 2 + 22, py - 64], radius=14, fill=(255, 106, 43))
d.polygon([(px - 12, py - 65), (px + 12, py - 65), (px, py - 50)], fill=(255, 106, 43))
d.text((px, py - 96), tag, font=tf, fill=(20, 12, 8), anchor="mm")
img = np.asarray(pil.convert("RGB")).copy()
replace((215, 540 + 105, 640, 540 + 148), "Projection jusqu'à 21 ans", f"Projection jusqu'à {ages[-1]} ans", font=REG, thresh=50)
Image.fromarray(img).save(dst, optimize=True)
