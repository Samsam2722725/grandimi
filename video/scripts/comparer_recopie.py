"""Contrôle chiffré d'une recopie : original et recopie comparés image par image.

Usage : python scripts/comparer_recopie.py ORIGINAL.mp4 RECOPIE.mp4 SORTIE.json [DEBUT FIN]
Pour chaque image (ramenée à 576×1024) : ressemblance SSIM de l'image entière, de la bande des
sous-titres (y 500-610) et du reste, écart moyen dans la bande. Liste les images les plus éloignées.
"""
import json
import subprocess
import sys

import numpy as np
from skimage.metrics import structural_similarity as ssim

W, H = 576, 1024
orig, rec, out = sys.argv[1:4]
deb, fin = (int(sys.argv[4]), int(sys.argv[5])) if len(sys.argv) > 5 else (0, 10 ** 6)


def images(p):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", p, "-vf", f"scale={W}:{H}:flags=area", "-f", "rawvideo",
                          "-pix_fmt", "gray", "-"], capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.uint8).reshape(-1, H, W)


A, B = images(orig), images(rec)
n = min(len(A), len(B))
res = []
for f in range(max(0, deb), min(n, fin + 1)):
    a, b = A[f], B[f]
    s_all = ssim(a, b, data_range=255)
    s_band = ssim(a[500:610], b[500:610], data_range=255)
    rest = np.r_[0:500, 610:H]
    s_rest = ssim(a[rest], b[rest], data_range=255)
    e_band = float(np.abs(a[500:610].astype(int) - b[500:610]).mean())
    res.append({"f": f, "ssim": round(s_all, 4), "bande": round(s_band, 4), "reste": round(s_rest, 4), "ecart_bande": round(e_band, 2)})
json.dump(res, open(out, "w"), indent=0)
arr = np.array([[r["ssim"], r["bande"], r["reste"], r["ecart_bande"]] for r in res])
print(f"{len(res)} images ; SSIM moyen {arr[:, 0].mean():.4f} ; bande {arr[:, 1].mean():.4f} ; reste {arr[:, 2].mean():.4f} ; écart bande {arr[:, 3].mean():.2f}")
pires = sorted(res, key=lambda r: r["bande"])[:12]
print("bande la moins ressemblante :", ", ".join(f"{r['f']}({r['bande']})" for r in pires))
pires = sorted(res, key=lambda r: r["reste"])[:12]
print("reste le moins ressemblant :", ", ".join(f"{r['f']}({r['reste']})" for r in pires))
