"""Transcription datée (temps par mot) de la voix d'une vidéo de référence.

Usage : python scripts/transcrire_ref.py REFERENCE.mp4 MODELE_PARAKEET_DIR SORTIE.json
Découpe en morceaux de ~9 s coupés dans les silences (un bloc unique saute des phrases).
"""
import json
import subprocess
import sys
from pathlib import Path

import numpy as np
import sherpa_onnx

ref, model, out = sys.argv[1], Path(sys.argv[2]), Path(sys.argv[3])
SR = 16000
raw = subprocess.run(["ffmpeg", "-v", "error", "-i", ref, "-vn", "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
                     capture_output=True, check=True).stdout
audio = np.frombuffer(raw, dtype=np.float32)

rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=str(model / "encoder.int8.onnx"), decoder=str(model / "decoder.int8.onnx"),
    joiner=str(model / "joiner.int8.onnx"), tokens=str(model / "tokens.txt"), model_type="nemo_transducer")

# coupe près de 9 s, au point le plus calme dans ±1,5 s
win = int(0.05 * SR)
energy = np.convolve(audio ** 2, np.ones(win) / win, mode="same")
cuts, pos = [0], 0
while len(audio) - pos > 10.5 * SR:
    a, b = pos + int(7.5 * SR), pos + int(10.5 * SR)
    pos = a + int(np.argmin(energy[a:b]))
    cuts.append(pos)
cuts.append(len(audio))

words = []
for s, e in zip(cuts, cuts[1:]):
    st = rec.create_stream()
    st.accept_waveform(SR, audio[s:e])
    rec.decode_stream(st)
    r = st.result
    cur, t0 = "", None
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith(" ") and cur:
            words.append({"w": cur, "t": round(s / SR + t0, 3)})
            cur, t0 = "", None
        if t0 is None:
            t0 = ts
        cur += tok.strip() if not cur else tok
    if cur:
        words.append({"w": cur, "t": round(s / SR + t0, 3)})

out.write_text(json.dumps({"duree": round(len(audio) / SR, 3), "mots": words}, ensure_ascii=False, indent=1))
print(" ".join(f"{w['w']}@{w['t']:.2f}" for w in words))
