"""Mesure les mouvements de caméra et les annotations d'une vidéo de référence.

Pour chaque dixième de seconde : quelle zone de l'écran de référence est visible (centre, zoom),
et où apparaissent les annotations jaunes et rouges. Sert à recopier le montage de l'original
(zones et ancres de episode.json).

Usage : python scripts/analyse_reference.py VIDEO.mp4 T_ECRAN T_ROUTINE [SORTIE.json]
  T_ECRAN, T_ROUTINE : instants (s) où l'écran principal et l'écran routine sont affichés en entier.
Dépendances : opencv-python-headless, numpy. ffmpeg dans le PATH.
"""
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import cv2
import numpy as np

video, t_ecran, t_routine = sys.argv[1], float(sys.argv[2]), float(sys.argv[3])
out_path = sys.argv[4] if len(sys.argv) > 4 else None
tmp = Path(tempfile.mkdtemp())
subprocess.run(["ffmpeg", "-v", "error", "-i", video, "-vf", "fps=10", str(tmp / "f_%04d.png")], check=True)
frames = sorted(tmp.glob("f_*.png"))


def idx(t):
    return min(len(frames) - 1, int(round(t * 10)))


orb = cv2.ORB_create(4000)
bf = cv2.BFMatcher(cv2.NORM_HAMMING)
refs = {}
for name, t in [("ecran", t_ecran), ("routine", t_routine)]:
    g = cv2.imread(str(frames[idx(t)]), cv2.IMREAD_GRAYSCALE)
    refs[name] = orb.detectAndCompute(g, None)

rows, prev = [], None
for i, path in enumerate(frames):
    t = round(i / 10, 1)
    img = cv2.imread(str(path))
    g = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    kp, des = orb.detectAndCompute(g, None)
    best = None
    for name, (rk, rd) in refs.items():
        if des is None:
            continue
        pairs = [p for p in bf.knnMatch(des, rd, k=2) if len(p) == 2]
        good = [a for a, b in pairs if a.distance < 0.75 * b.distance]
        if len(good) < 25:
            continue
        src = np.float32([kp[m.queryIdx].pt for m in good])
        dst = np.float32([rk[m.trainIdx].pt for m in good])
        M, inl = cv2.estimateAffinePartial2D(src, dst, ransacReprojThreshold=4)
        if M is not None and (best is None or inl.sum() > best[0]):
            best = (int(inl.sum()), name, M)
    row = {"t": t}
    if best and best[0] >= 30:
        h, w = g.shape
        c = cv2.transform(np.float32([[0, 0], [w, 0], [w, h], [0, h]]).reshape(-1, 1, 2), best[2]).reshape(-1, 2)
        (x0, y0), (x1, y1) = c.min(0), c.max(0)
        row.update(ref=best[1], cx=round(float(x0 + x1) / 2, 1), cy=round(float(y0 + y1) / 2, 1), z=round(float(w / (x1 - x0)), 3))
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    for name, mask in [("jaune", cv2.inRange(hsv, (20, 120, 150), (35, 255, 255))),
                       ("rouge", cv2.inRange(hsv, (0, 150, 120), (8, 255, 255)) | cv2.inRange(hsv, (172, 150, 120), (180, 255, 255)))]:
        if (mask > 0).sum() > 150:
            ys, xs = np.where(mask > 0)
            row[name] = [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())]
    rows.append(row)
    desc = f"{row.get('ref', '—')} " + (f"centre=({row['cx']},{row['cy']}) zoom={row['z']}" if "ref" in row else "")
    desc += "".join(f" {k}={row[k]}" for k in ("jaune", "rouge") if k in row)
    if desc != prev:
        print(f"{t:5.1f} {desc}")
    prev = desc
if out_path:
    Path(out_path).write_text(json.dumps(rows))
