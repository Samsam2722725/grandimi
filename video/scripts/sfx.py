"""Synthétise les bruitages et la musique de fond (aucun fichier externe, donc aucun souci de licence).

Usage : python scripts/sfx.py
"""
from pathlib import Path

import numpy as np
import soundfile as sf

SR = 44100
OUT = Path(__file__).resolve().parent.parent / "public" / "sfx"
OUT.mkdir(parents=True, exist_ok=True)
rng = np.random.default_rng(7)


def t(d):
    return np.arange(int(d * SR)) / SR


def lowpass(x, cutoff):
    """Passe-bas à un pôle ; cutoff peut être un tableau (balayage)."""
    cutoff = np.broadcast_to(cutoff, x.shape)
    a = np.exp(-2 * np.pi * cutoff / SR)
    y = np.zeros_like(x)
    acc = 0.0
    for i in range(len(x)):
        acc = (1 - a[i]) * x[i] + a[i] * acc
        y[i] = acc
    return y


def norm(x, peak=0.9):
    return x / (np.max(np.abs(x)) + 1e-9) * peak


def save(name, x):
    fade = min(len(x), int(0.005 * SR))
    x[-fade:] *= np.linspace(1, 0, fade)
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR)


# Pop : petit glissando montant, très court.
tt = t(0.11)
f = 500 + 900 * (tt / tt[-1])
save("pop", norm(np.sin(2 * np.pi * np.cumsum(f) / SR) * np.exp(-tt * 38)))

# Whoosh : bruit filtré dont la fréquence de coupure monte puis redescend.
tt = t(0.42)
env = np.sin(np.pi * tt / tt[-1]) ** 2
cut = 400 + 5000 * np.sin(np.pi * tt / tt[-1])
save("whoosh", norm(lowpass(rng.standard_normal(len(tt)), cut) * env, 0.7))

# Slam : coup sourd grave + claquement.
tt = t(0.4)
thump = np.sin(2 * np.pi * (55 + 90 * np.exp(-tt * 30)) * tt) * np.exp(-tt * 9)
click = lowpass(rng.standard_normal(len(tt)), 3000) * np.exp(-tt * 60)
save("slam", norm(thump + 0.5 * click))

# Ding : cloche claire (validation).
tt = t(0.9)
save("ding", norm((np.sin(2 * np.pi * 1318 * tt) + 0.4 * np.sin(2 * np.pi * 2636 * tt)) * np.exp(-tt * 5), 0.6))

# Erreur : buzzer descendant.
tt = t(0.38)
f = 220 - 80 * tt / tt[-1]
buzz = np.sign(np.sin(2 * np.pi * np.cumsum(f) / SR))
save("wrong", norm(lowpass(buzz, 1800) * np.minimum(1, (tt[-1] - tt) * 20), 0.55))

# Crac : bruit sec et aigu.
tt = t(0.16)
n = rng.standard_normal(len(tt))
save("crack", norm((n - lowpass(n, 1500)) * np.exp(-tt * 35)))

# Tic : clic d'horloge.
tt = t(0.05)
save("tick", norm(np.sin(2 * np.pi * 2400 * tt) * np.exp(-tt * 120), 0.5))

# Sparkle : arpège montant (cœur, appli).
parts = []
for k, freq in enumerate([1046, 1318, 1568, 2093]):
    tt = t(0.09 if k < 3 else 0.5)
    parts.append(np.sin(2 * np.pi * freq * tt) * np.exp(-tt * (25 if k < 3 else 6)))
save("sparkle", norm(np.concatenate(parts), 0.5))

# Papier froissé : rafale de craquements filtrés (générateur séparé : la musique ne change pas).
rp = np.random.default_rng(11)
tt = t(0.45)
paper = np.zeros(len(tt))
for k in range(38):
    at = int(rp.uniform(0, 0.38) * SR)
    ln = int(rp.uniform(0.004, 0.03) * SR)
    burst = rp.standard_normal(ln) * np.exp(-np.linspace(0, 6, ln))
    paper[at:at + ln] += burst[: len(paper) - at] * rp.uniform(0.3, 1)
paper = paper - lowpass(paper, 900)
save("papier", norm(paper * np.minimum(1, (tt[-1] - tt) * 8), 0.7))

# Roulement : coups de caisse claire qui accélèrent (0,6 s), pour la révélation.
rr = np.random.default_rng(5)
tt = t(0.62)
roll = np.zeros(len(tt))
pos, gap = 0.0, 0.07
while pos < 0.6:
    i = int(pos * SR)
    ln = int(0.05 * SR)
    hit = rr.standard_normal(ln) * np.exp(-np.linspace(0, 7, ln))
    roll[i:i + ln] += hit[: len(roll) - i] * (0.5 + pos)
    pos += gap
    gap = max(0.022, gap * 0.9)
roll = roll - lowpass(roll, 700)
save("roulement", norm(roll * np.minimum(1, (tt[-1] - tt) * 30), 0.6))

# Musique : boucle légère à 100 BPM (kick, charleston, accords en pizzicato, basse).
BPM, BARS = 100, 18
beat = 60 / BPM
total = int(BARS * 4 * beat * SR)
mix = np.zeros(total)


def add(sig, at):
    i = int(at * SR)
    j = min(total, i + len(sig))
    mix[i:j] += sig[: j - i]


kick_t = t(0.3)
kick = np.sin(2 * np.pi * (45 + 110 * np.exp(-kick_t * 35)) * kick_t) * np.exp(-kick_t * 12)
hat_t = t(0.05)
hn = rng.standard_normal(len(hat_t))
hat = (hn - lowpass(hn, 6000)) * np.exp(-hat_t * 90)
chords = [[60, 64, 67], [55, 59, 62], [57, 60, 64], [53, 57, 60]]  # Do, Sol, Lam, Fa


def midi(n):
    return 440 * 2 ** ((n - 69) / 12)


def pluck(freq, d=0.35):
    tt = t(d)
    tri = 2 * np.abs(2 * ((freq * tt) % 1) - 1) - 1
    return tri * np.exp(-tt * 9)


for bar in range(BARS):
    chord = chords[bar % 4]
    for b in range(4):
        at = (bar * 4 + b) * beat
        add(kick * 0.9, at)
        add(hat * 0.25, at + beat / 2)
        add(hat * 0.12, at)
    for s in range(8):
        add(pluck(midi(chord[s % 3] + 12)) * 0.18, bar * 4 * beat + s * beat / 2)
    bt = t(4 * beat)
    add(np.sin(2 * np.pi * midi(chord[0] - 24) * bt) * np.minimum(1, (4 * beat - bt) * 4) * 0.35, bar * 4 * beat)

save("music", norm(mix, 0.8))
print("ok")
