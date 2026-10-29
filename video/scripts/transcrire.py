"""Transcrit un wav 16 kHz par morceaux de ~9 s (coupés dans les silences) → JSON [{w,t}]."""
import json, sys
import numpy as np, soundfile as sf, sherpa_onnx
wav, model, out = sys.argv[1], sys.argv[2], sys.argv[3]
a, sr = sf.read(wav, dtype="float32")
if a.ndim > 1: a = a.mean(axis=1)
rec = sherpa_onnx.OfflineRecognizer.from_transducer(encoder=f"{model}/encoder.int8.onnx", decoder=f"{model}/decoder.int8.onnx",
    joiner=f"{model}/joiner.int8.onnx", tokens=f"{model}/tokens.txt", model_type="nemo_transducer")
hop = int(0.02 * sr)
en = np.array([np.sqrt(np.mean(a[i:i+hop]**2)) for i in range(0, len(a), hop)])
cuts, start = [0], 0
while start + 9 * sr < len(a):
    lo, hi = (start + 7 * sr) // hop, min(len(en), (start + 10 * sr) // hop)
    k = lo + int(np.argmin(en[lo:hi]))
    cuts.append(k * hop); start = k * hop
cuts.append(len(a))
words = []
for s, e in zip(cuts, cuts[1:]):
    st = rec.create_stream(); st.accept_waveform(sr, a[s:e]); rec.decode_stream(st); r = st.result
    cur, t0 = "", None
    for tok, ts in zip(r.tokens, r.timestamps):
        if tok.startswith(" ") and cur:
            words.append({"w": cur, "t": round(s / sr + t0, 2)}); cur, t0 = "", None
        if t0 is None: t0 = ts
        cur += tok.strip() if not cur else tok
    if cur: words.append({"w": cur, "t": round(s / sr + t0, 2)})
json.dump(words, open(out, "w"))
print(" ".join(f"{w['w']}@{w['t']}" for w in words))
