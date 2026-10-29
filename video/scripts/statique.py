"""Repère les passages où l'image ne bouge presque pas (différence moyenne entre images < seuil)."""
import sys, cv2, numpy as np
cap = cv2.VideoCapture(sys.argv[1]); prev = None; d = []
while True:
    ok, fr = cap.read()
    if not ok: break
    g = cv2.cvtColor(cv2.resize(fr, (135, 240)), cv2.COLOR_BGR2GRAY).astype(float)
    d.append(0 if prev is None else np.abs(g - prev).mean()); prev = g
d = np.array(d); fps = cap.get(cv2.CAP_PROP_FPS); seuil = float(sys.argv[2]) if len(sys.argv) > 2 else 0.6
i = 0
while i < len(d):
    if d[i] < seuil:
        j = i
        while j < len(d) and d[j] < seuil: j += 1
        if (j - i) / fps >= 0.5: print(f"statique {i/fps:.2f}-{j/fps:.2f} s ({(j-i)/fps:.2f} s)")
        i = j
    else: i += 1
