"""Timeline d'un épisode à partir d'une voix enregistrée (un seul fichier audio).

Transcrit la voix (Parakeet, temps par mot), aligne la transcription sur le texte de
episode.json (lines), et écrit timeline.json : début de chaque phrase et de chaque mot affiché.

Usage : python scripts/voix_fichier.py EPISODE_ID MODELE_PARAKEET_DIR
La voix doit être dans public/episodes/<id>/voice/voix.wav (déjà nettoyée : blancs, vitesse).
"""
import difflib
import json
import re
import sys
import unicodedata
from pathlib import Path

import numpy as np
import sherpa_onnx
import soundfile as sf

ROOT = Path(__file__).resolve().parent.parent
EP = ROOT / "public" / "episodes" / sys.argv[1]
MODEL = Path(sys.argv[2])
FPS = 30

ep = json.loads((EP / "episode.json").read_text())
audio, sr = sf.read(EP / "voice" / "voix.wav", dtype="float32")
if audio.ndim > 1:
    audio = audio.mean(axis=1)
duration = len(audio) / sr

rec = sherpa_onnx.OfflineRecognizer.from_transducer(
    encoder=str(MODEL / "encoder.int8.onnx"), decoder=str(MODEL / "decoder.int8.onnx"),
    joiner=str(MODEL / "joiner.int8.onnx"), tokens=str(MODEL / "tokens.txt"), model_type="nemo_transducer")
# Transcription par morceaux de ~9 s coupés dans les silences : en un seul bloc, Parakeet saute des phrases.
hop = int(0.02 * sr)
energy = np.array([np.sqrt(np.mean(audio[i:i + hop] ** 2)) for i in range(0, len(audio), hop)])
cuts, start = [0], 0
while start + 9 * sr < len(audio):
    lo, hi = (start + 7 * sr) // hop, min(len(energy), (start + 10 * sr) // hop)
    start = (lo + int(np.argmin(energy[lo:hi]))) * hop
    cuts.append(start)
cuts.append(len(audio))

heard, texts = [], []
for s, e in zip(cuts, cuts[1:]):
    stream = rec.create_stream()
    stream.accept_waveform(sr, audio[s:e])
    rec.decode_stream(stream)
    res = stream.result
    texts.append(res.text)
    cur, t0 = "", None
    for tok, ts in zip(res.tokens, res.timestamps):
        if tok.startswith(" ") and cur:
            heard.append((cur, s / sr + t0))
            cur, t0 = "", None
        if t0 is None:
            t0 = ts
        cur += tok.strip() if not cur else tok
    if cur:
        heard.append((cur, s / sr + t0))


def norm(w):
    w = unicodedata.normalize("NFD", w.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]", "", w)


def tokens(text):
    text = re.sub(r"\{([^|}]*)\|[^}]*\}", r"\1", text.strip())
    text = re.sub(r"\s+([:;!?%])", r"\1", text)  # ponctuation et % collés au mot précédent
    return text.split()


script = [(i, w) for i, l in enumerate(ep["lines"]) for w in tokens(l["text"])]
a = [norm(w) for _, w in script]
b = [norm(w) for w, _ in heard]
times = [None] * len(script)
for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
    if tag in ("equal", "replace"):
        for k in range(i2 - i1):
            j = j1 + min(k * max(1, j2 - j1) // max(1, i2 - i1), j2 - j1 - 1)
            times[i1 + k] = heard[j][1]
# Mots non entendus : interpolés entre les voisins.
known = [k for k, t in enumerate(times) if t is not None]
for k in range(len(times)):
    if times[k] is None:
        prev = max([p for p in known if p < k], default=None)
        nxt = min([p for p in known if p > k], default=None)
        tp = times[prev] if prev is not None else 0.0
        tn = times[nxt] if nxt is not None else duration
        times[k] = tp + (tn - tp) * 0.5
missing = sum(1 for k in range(len(script)) if k not in known)

lines = []
for i, l in enumerate(ep["lines"]):
    ws = [(w, times[k]) for k, (li, w) in enumerate(script) if li == i]
    start = ws[0][1]
    nxt_start = next((times[k] for k, (li, _) in enumerate(script) if li > i), duration)
    lines.append({"id": l["id"], "text": " ".join(w for w, _ in ws), "from": round(start * FPS),
                  "duration": max(1, round((nxt_start - start) * FPS) - 1),
                  "words": [{"w": w, "f": round(t * FPS)} for w, t in ws]})
tl = {"fps": FPS, "totalFrames": round(duration * FPS) + 2, "audio": "voice/voix.wav", "lines": lines}
(EP / "timeline.json").write_text(json.dumps(tl, ensure_ascii=False, indent=2))
print(f"{len(script)} mots, {missing} non entendus (interpolés), {duration:.2f} s")
print("Entendu :", " ".join(texts))
