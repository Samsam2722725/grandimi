"""Note des variantes rendues par regler_soustitres.mjs : SSIM de la bande des sous-titres face à l'original.
Usage : python scripts/regler_note.py IMAGES_ORIGINAL DOSSIER_VARIANTES"""
import collections
import sys
from pathlib import Path

import cv2
import numpy as np
from skimage.metrics import structural_similarity as ssim

orig, dos = sys.argv[1], Path(sys.argv[2])
notes = collections.defaultdict(list)
for p in sorted(dos.glob("*.png")):
    nom, f = p.stem.rsplit("_", 1)
    a = cv2.cvtColor(cv2.imread(f"{orig}/{int(f) + 1:04d}.png"), cv2.COLOR_BGR2GRAY)[500:610]
    b = cv2.cvtColor(cv2.resize(cv2.imread(str(p)), (576, 1024), interpolation=cv2.INTER_AREA), cv2.COLOR_BGR2GRAY)[500:610]
    notes[nom].append(ssim(a, b, data_range=255))
for nom, v in sorted(notes.items(), key=lambda kv: -np.mean(kv[1])):
    print(f"{np.mean(v):.4f}  {nom}  " + " ".join(f"{x:.3f}" for x in v))
