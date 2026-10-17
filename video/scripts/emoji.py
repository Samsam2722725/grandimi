"""Exporte des émojis en PNG transparents (police Noto Color Emoji), et une flèche 3D dorée.

Usage : python scripts/emoji.py DOSSIER nom=😀 [nom=…] [fleche=dore]
"""
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont

out = Path(sys.argv[1])
FONT = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"


def emoji(name, char, size=400):
    f = ImageFont.truetype(FONT, 109)  # seule taille bitmap disponible
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((80, 80), char, font=f, embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox()).resize((size, int(size * im.height / im.width)), Image.LANCZOS)
    im.save(out / f"{name}.png")
    print(name, im.size)


def fleche_doree(name, w=150, h=330):
    """Flèche vers le bas, volume doré (même éclairage que scripts/ballon.py)."""
    S = 3
    m = Image.new("L", (w * S, h * S), 0)
    shaft = w * S * 0.22
    head = h * S * 0.38
    cx = w * S / 2
    ImageDraw.Draw(m).polygon([(cx - shaft, 10 * S), (cx + shaft, 10 * S), (cx + shaft, h * S - head),
                               (w * S - 6 * S, h * S - head), (cx, h * S - 6 * S), (6 * S, h * S - head),
                               (cx - shaft, h * S - head)], fill=255)
    mask = cv2.GaussianBlur(np.asarray(m).astype(np.float32) / 255, (0, 0), 3 * S)
    binary = (mask > 0.5).astype(np.uint8)
    dist = cv2.distanceTransform(binary, cv2.DIST_L2, 5)
    dist /= dist.max()
    height = cv2.GaussianBlur(np.sqrt(dist), (0, 0), 4 * S)
    gy, gx = np.gradient(height * 40 * S)
    n = np.dstack([-gx, -gy, np.ones_like(gx)])
    n /= np.linalg.norm(n, axis=2, keepdims=True)
    light = np.array([-0.5, -0.65, 0.6]); light /= np.linalg.norm(light)
    diffuse = np.clip((n * light).sum(axis=2), 0, 1)
    r = 2 * (n * light).sum(axis=2, keepdims=True) * n - light
    spec = np.clip(r[..., 2], 0, 1) ** 24
    base = np.array([225, 160, 40])
    col = np.clip(base * (0.45 + 0.7 * diffuse[..., None]) + 255 * 0.8 * spec[..., None], 0, 255).astype(np.uint8)
    im = Image.fromarray(np.dstack([col, (np.clip(mask, 0, 1) * 255).astype(np.uint8)]), "RGBA")
    im.resize((w, h), Image.LANCZOS).save(out / f"{name}.png")
    print(name, (w, h))


for arg in sys.argv[2:]:
    name, val = arg.split("=", 1)
    if val == "dore":
        fleche_doree(name)
    else:
        emoji(name, val)
