"""Images à poser dans un montage CapCut (format « étirements » de test.maxx, version Grandimi).

Usage : python scripts/images_edit.py DOSSIER_DE_SORTIE
Produit :
  carte_stats.png          écran de résultats (178 → 185 cm), fond noir 1080×1110
  carte_stats_168.png      même écran, 168 → 172 cm (deuxième carte du bandeau du bas)
  texte_avant.png          « Ta taille avant les étirements 🙆 » (encadré blanc, fond transparent)
  bandeau_haut.png         « Plus d'étirements dans Grandimi » + icône, 1080×400
  bandeau_bas.png          « grandimi.com (lien en bio) » + deux cartes inclinées, 1080×420
Les chiffres sont en tête de fichier : à remplacer par ceux de grandimi.com avant publication.
"""
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

OUT = Path(sys.argv[1])
OUT.mkdir(parents=True, exist_ok=True)
ROOT = Path(__file__).resolve().parent.parent.parent
F = "/usr/share/fonts/opentype/inter/Inter-{}.otf"
EMOJI = "/usr/share/fonts/truetype/noto/NotoColorEmoji.ttf"
ORANGE, ORANGE2, CARTE, GRIS = (255, 90, 31), (255, 140, 60), (24, 24, 24), (150, 150, 150)

# Chiffres de l'original (Taller App) convertis ; à vérifier sur grandimi.com.
STATS = {"actuelle": 178, "potentielle": 185, "optimiser": 6, "chances": "67%", "chances_cm": 188, "croissance": "97%", "rang": "99,6 %"}
STATS_2 = {**STATS, "actuelle": 168, "potentielle": 172}


def font(w, s):
    return ImageFont.truetype(F.format(w), s)


def emoji(char, size):
    im = Image.new("RGBA", (160, 160), (0, 0, 0, 0))
    ImageDraw.Draw(im).text((80, 80), char, font=ImageFont.truetype(EMOJI, 109), embedded_color=True, anchor="mm")
    im = im.crop(im.getbbox())
    return im.resize((size, int(size * im.height / im.width)), Image.LANCZOS)


def degrade(w, h, c1, c2):
    t = np.linspace(0, 1, w)[None, :, None] * np.ones((h, 1, 1))
    g = (np.array(c1) + (np.array(c2) - np.array(c1)) * t).astype(np.uint8)
    return Image.fromarray(np.dstack([g, np.full((h, w), 255, np.uint8)]), "RGBA")


def carte(img, box, r=34, fill=CARTE):
    ImageDraw.Draw(img).rounded_rectangle(box, radius=r, fill=fill)


def jauge(img, x, y, w, pct):
    d = ImageDraw.Draw(img)
    d.rounded_rectangle([x, y, x + w, y + 22], radius=11, fill=(55, 55, 55))
    g = degrade(int(w * pct), 22, ORANGE, ORANGE2)
    m = Image.new("L", g.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, g.width - 1, 21], radius=11, fill=255)
    img.paste(g, (x, y), m)


def ecran(s):
    W, H = 1080, 1110
    im = Image.new("RGBA", (W, H), (0, 0, 0, 255))
    d = ImageDraw.Draw(im)
    # Taille actuelle / potentielle
    carte(im, [70, 90, 525, 350])
    d.text((297, 165), "Taille actuelle", font=font("Medium", 38), fill=(220, 220, 220), anchor="mm")
    d.text((297, 255), f"{s['actuelle']} cm", font=font("Bold", 84), fill="white", anchor="mm")
    g = degrade(455, 260, ORANGE, ORANGE2)
    m = Image.new("L", g.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, 454, 259], radius=34, fill=255)
    im.paste(g, (555, 90), m)
    d.text((782, 165), "Taille potentielle", font=font("Medium", 38), fill=(255, 235, 220), anchor="mm")
    d.text((782, 255), f"{s['potentielle']} cm", font=font("Bold", 84), fill="white", anchor="mm")
    # Optimiser
    carte(im, [70, 385, 1010, 515])
    t = f"Optimiser jusqu'à {s['optimiser']} cm"
    tw = d.textlength(t, font=font("SemiBold", 48))
    d.text((540 - 45, 450), t, font=font("SemiBold", 48), fill="white", anchor="mm")
    im.alpha_composite(emoji("🧬", 54), (int(540 - 45 + tw / 2 + 18), 423))
    im.alpha_composite(emoji("📈", 54), (int(540 - 45 + tw / 2 + 80), 423))
    # Chances / croissance
    carte(im, [70, 550, 525, 870])
    d.text((110, 615), "Chances d'atteindre", font=font("Medium", 34), fill=(210, 210, 210))
    d.text((110, 655), f"{s['chances_cm']} cm", font=font("Medium", 34), fill=(210, 210, 210))
    d.text((110, 715), s["chances"], font=font("Bold", 84), fill="white")
    jauge(im, 110, 820, 375, float(s["chances"].rstrip("%")) / 100)
    carte(im, [555, 550, 1010, 870])
    d.text((595, 615), "Croissance terminée", font=font("Medium", 34), fill=(210, 210, 210))
    d.text((595, 715), s["croissance"], font=font("Bold", 84), fill="white")
    jauge(im, 595, 820, 375, float(s["croissance"].rstrip("%")) / 100)
    # Rang
    carte(im, [70, 905, 1010, 1035])
    t = f"Plus grand que {s['rang']} de ton âge"
    tw = d.textlength(t, font=font("SemiBold", 44))
    d.text((540 - 30, 970), t, font=font("SemiBold", 44), fill="white", anchor="mm")
    im.alpha_composite(emoji("🌍", 50), (int(540 - 30 + tw / 2 + 14), 945))
    return im


def texte_contour(d, xy, t, f, fill="white", stroke=8, anchor="mm"):
    d.text(xy, t, font=f, fill=fill, stroke_width=stroke, stroke_fill="black", anchor=anchor)


def fond_carbone(w, h):
    rng = np.random.default_rng(3)
    n = rng.normal(0, 1, (h, w))
    n = np.asarray(Image.fromarray(((n - n.min()) / (n.max() - n.min()) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2))).astype(float)
    xs, ys = np.meshgrid(np.arange(w), np.arange(h))
    trame = ((xs + ys) // 6 % 2) * 10
    v = np.clip(78 + (n - 128) * 0.25 + trame, 0, 255).astype(np.uint8)
    return Image.fromarray(np.dstack([v, v, v, np.full((h, w), 255, np.uint8)]), "RGBA")


def incline(img, angle, largeur):
    img = img.resize((largeur, int(largeur * img.height / img.width)), Image.LANCZOS)
    return img.rotate(angle, expand=True, resample=Image.BICUBIC)


# 1. Écrans de résultats
e1, e2 = ecran(STATS), ecran(STATS_2)
e1.save(OUT / "carte_stats.png")
e2.save(OUT / "carte_stats_168.png")

# 2. Texte « avant les étirements »
f = font("ExtraBold", 72)
lignes = ["Ta taille avant", "les étirements"]
bw = int(max(ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(l, font=f) for l in lignes)) + 150
im = Image.new("RGBA", (bw + 40, 260), (0, 0, 0, 0))
d = ImageDraw.Draw(im)
d.rounded_rectangle([20, 20, bw + 20, 240], radius=18, fill="white")
for i, l in enumerate(lignes):
    texte_contour(d, (60, 82 + i * 98), l, f, stroke=6, anchor="lm")
lw = d.textlength(lignes[1], font=f)
im.alpha_composite(emoji("🙆", 78), (int(60 + lw + 16), 140))
im.crop(im.getbbox()).save(OUT / "texte_avant.png")

# 3. Bandeau du haut
W, H = 1080, 400
b = fond_carbone(W, H)
d = ImageDraw.Draw(b)
for i, l in enumerate(["Plus d'étirements", "dans Grandimi"]):
    texte_contour(d, (390, 140 + i * 110), l, font("ExtraBold", 78), stroke=7)
ic = Image.open(ROOT / "frontend/public/icon-512.png").convert("RGBA").resize((300, 300), Image.LANCZOS)
m = Image.new("L", ic.size, 0)
ImageDraw.Draw(m).rounded_rectangle([0, 0, 299, 299], radius=64, fill=255)
ombre = Image.new("RGBA", (340, 340), (0, 0, 0, 0))
ImageDraw.Draw(ombre).rounded_rectangle([20, 26, 320, 326], radius=64, fill=(0, 0, 0, 140))
b.alpha_composite(ombre.filter(ImageFilter.GaussianBlur(10)), (735, 32))
b.paste(ic, (755, 50), m)
b.save(OUT / "bandeau_haut.png")

# 4. Bandeau du bas
H = 420
b = fond_carbone(W, H)
for img, ang, x, y in ((e1, 10, 0, 50), (e2, -10, 700, 50)):
    c = incline(img.crop((40, 60, 1040, 1060)), ang, 340)
    b.alpha_composite(c, (x, y))
d = ImageDraw.Draw(b)
texte_contour(d, (540, 165), "grandimi.com", font("ExtraBold", 84), stroke=8)
texte_contour(d, (540, 265), "(lien en bio)", font("ExtraBold", 76), stroke=8)
b.save(OUT / "bandeau_bas.png")
print("ok", sorted(p.name for p in OUT.glob("*.png")))
