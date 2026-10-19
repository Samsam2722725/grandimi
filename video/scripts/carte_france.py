"""Contour de la France métropolitaine (Natural Earth, domaine public, via world-atlas) en chemin SVG.

Usage : python scripts/carte_france.py countries-50m.json SORTIE.json [LARGEUR=800]
Sortie : {"w", "h", "d"} ; projection équirectangulaire corrigée à 46,5° de latitude, Corse comprise.
"""
import json
import math
import sys

src, out = sys.argv[1], sys.argv[2]
W = float(sys.argv[3]) if len(sys.argv) > 3 else 800
topo = json.load(open(src))
sx, sy = topo["transform"]["scale"]
tx, ty = topo["transform"]["translate"]
arcs = []
for arc in topo["arcs"]:
    x = y = 0
    pts = []
    for dx, dy in arc:
        x += dx; y += dy
        pts.append((x * sx + tx, y * sy + ty))
    arcs.append(pts)


def ring(idx):
    pts = []
    for i in idx:
        a = arcs[i] if i >= 0 else arcs[~i][::-1]
        pts.extend(a if not pts else a[1:])
    return pts


fr = next(g for g in topo["objects"]["countries"]["geometries"] if g.get("properties", {}).get("name") == "France")
polys = fr["arcs"] if fr["type"] == "MultiPolygon" else [fr["arcs"]]
rings = [ring(p[0]) for p in polys]
rings = [r for r in rings if all(-6 < lon < 10.5 and 41 < lat < 52 for lon, lat in r)]  # métropole + Corse
k = math.cos(math.radians(46.5))
xs = [lon * k for r in rings for lon, _ in r]
ys = [-lat for r in rings for _, lat in r]
x0, y0 = min(xs), min(ys)
s = W / (max(xs) - x0)
H = (max(ys) - y0) * s
d = " ".join("M" + " L".join(f"{(lon * k - x0) * s:.1f},{(-lat - y0) * s:.1f}" for lon, lat in r) + " Z" for r in rings)
json.dump({"w": round(W), "h": round(H), "d": d}, open(out, "w"))
print(len(rings), "contours", round(W), "×", round(H))
