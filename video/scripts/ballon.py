"""Fabrique un chiffre « ballon » gonflé (style du ballon 15), PNG transparent.

Usage : python scripts/ballon.py 14 SORTIE.png [HAUTEUR=569] [dore]
Le relief vient de la distance au bord du glyphe ; l'éclairage ajoute ombrage et reflets.
"""
import sys

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

text, out = sys.argv[1], sys.argv[2]
H = int(sys.argv[3]) if len(sys.argv) > 3 and sys.argv[3].isdigit() else 569
DORE = "dore" in sys.argv  # ballon doré (référence 7442915100442332458) au lieu d'orange → rose
S = 2  # suréchantillonnage
font = ImageFont.truetype("/usr/share/fonts/opentype/inter/Inter-SemiBold.otf", int(H * 1.02 * S))
bb = font.getbbox(text)
w, h = bb[2] - bb[0] + 160 * S, bb[3] - bb[1] + 160 * S
m = Image.new("L", (w, h), 0)
ImageDraw.Draw(m).text((80 * S - bb[0], 80 * S - bb[1]), text, font=font, fill=255)
mask = np.asarray(m).astype(np.float32) / 255
# Coins arrondis et chiffres un peu « gonflés ».
mask = cv2.GaussianBlur(mask, (0, 0), 12 * S)
mask = np.clip((mask - 0.40) * 12, 0, 1)
binary = (mask > 0.5).astype(np.uint8)
dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
dist /= dist.max()
height = np.sqrt(np.clip(dist, 0, 1))
height = cv2.GaussianBlur(height, (0, 0), 6 * S)
gy, gx = np.gradient(height * 60 * S)
n = np.dstack([-gx, -gy, np.ones_like(gx) * 1.0])
n /= np.linalg.norm(n, axis=2, keepdims=True)
light = np.array([-0.5, -0.65, 0.6]); light /= np.linalg.norm(light)
diffuse = np.clip((n * light).sum(axis=2), 0, 1)
view = np.array([0, 0, 1.0])
r = 2 * (n * light).sum(axis=2, keepdims=True) * n - light
spec = np.clip((r * view).sum(axis=2), 0, 1) ** 28
# Dégradé orange (bas gauche) → rose → violet (haut droite), comme le ballon 15.
xs = np.linspace(0, 1, w)[None, :] * np.ones((h, 1))
ys = np.linspace(0, 1, h)[:, None] * np.ones((1, w))
t = np.clip(1.15 * xs - 0.1 + 0.15 * (1 - ys), 0, 1)[..., None]
c1, c2, c3 = np.array([245, 140, 45]), np.array([238, 112, 160]), np.array([185, 140, 225])
if DORE:
    c1, c2, c3 = np.array([150, 95, 20]), np.array([225, 165, 45]), np.array([250, 215, 120])
base = np.where(t < 0.55, c1 + (c2 - c1) * (t / 0.55), c2 + (c3 - c2) * ((t - 0.55) / 0.45))
# Aspect métallisé : bandes de reflet de l'environnement selon l'orientation de la surface.
k = n[..., 0] * 0.7 + n[..., 1] * 0.7
bands = np.exp(-((k - 0.45) / 0.10) ** 2) + 0.6 * np.exp(-((k + 0.35) / 0.08) ** 2)
ridge = np.exp(-((dist - 0.93) / 0.05) ** 2)  # arête claire au milieu du « tube »
seam = np.exp(-((dist - 0.10) / 0.05) ** 2) * (binary > 0)  # couture du bord
col = base * (0.55 + 0.55 * diffuse[..., None])
col = col + 255 * (0.9 * spec[..., None] + 0.55 * bands[..., None] + 0.25 * ridge[..., None] + 0.18 * seam[..., None])
col = np.clip(col, 0, 255).astype(np.uint8)
rgba = np.dstack([col, (mask * 255).astype(np.uint8)])
img = Image.fromarray(rgba, "RGBA")
img = img.crop(img.getbbox())
img = img.resize((int(img.width * H / img.height), H), Image.LANCZOS)
img.save(out, optimize=True)
print(out, img.size)
