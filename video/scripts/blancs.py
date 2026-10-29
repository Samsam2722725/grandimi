"""Réduit les silences d'une voix : chaque blanc > MAX s est ramené à MAX s (fondus 5 ms)."""
import sys, numpy as np, soundfile as sf
src, dst, mx = sys.argv[1], sys.argv[2], float(sys.argv[3])
a, sr = sf.read(src)
hop = int(0.005 * sr); n = len(a) // hop
db = 20 * np.log10(np.array([np.sqrt(np.mean(a[i*hop:(i+1)*hop]**2)) for i in range(n)]) + 1e-9)
act = db > -42
first, last = np.argmax(act), n - np.argmax(act[::-1])
keep = np.zeros(n, bool); keep[first:last] = True
j = first; keep_frames = int(mx / 0.005)
while j < last:
    if not act[j]:
        k = j
        while k < last and not act[k]: k += 1
        if k - j > keep_frames:
            half = keep_frames // 2
            keep[j + half:k - (keep_frames - half)] = False
        j = k
    else: j += 1
pieces, j = [], 0
fade = hop
while j < n:
    if keep[j]:
        k = j
        while k < n and keep[k]: k += 1
        s = a[j*hop:k*hop].copy(); s[:fade] *= np.linspace(0, 1, fade); s[-fade:] *= np.linspace(1, 0, fade)
        pieces.append(s); j = k
    else: j += 1
y = np.concatenate(pieces); sf.write(dst, y, sr); print(round(len(y) / sr, 2))
