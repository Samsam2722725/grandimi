"""Génère la voix off ligne par ligne (Kokoro, voix française ff_siwis) et la timeline.

Usage : KOKORO_DIR=/chemin/vers/modeles python scripts/voice.py [SCRIPT] [DOSSIER_VOIX] [TIMELINE]
Par défaut : script.json, public/voice, src/timeline.json.
Le dossier des modèles doit contenir kokoro.onnx et voices-v1.0.bin
(https://github.com/thewh1teagle/kokoro-onnx/releases/tag/model-files-v1.0).

Dans le texte, {affiché|prononcé} sépare ce qui s'affiche à l'écran de ce que
dit la voix : « {1m73|un mètre soixante-treize} ».
"""
import json
import sys
import os
from pathlib import Path

import re

import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD_IN = 0.3  # secondes de silence avant la première phrase

args = sys.argv[1:] + [None] * 3
script_path = ROOT / (args[0] or "script.json")
out_dir = ROOT / (args[1] or "public/voice")
timeline_path = ROOT / (args[2] or "src/timeline.json")
cfg = json.loads(script_path.read_text())
models = Path(os.environ.get("KOKORO_DIR", "."))
kokoro = Kokoro(str(models / "kokoro.onnx"), str(models / "voices-v1.0.bin"))

out_dir.mkdir(parents=True, exist_ok=True)

def silences(audio, sr, min_len=0.09, thresh=0.02):
    """Milieux des silences internes (en secondes), triés par durée décroissante."""
    win = int(0.01 * sr)
    env = np.array([np.max(np.abs(audio[i:i + win])) for i in range(0, len(audio) - win, win)])
    quiet = env < thresh
    gaps, start = [], None
    for i, q in enumerate(quiet):
        if q and start is None:
            start = i
        elif not q and start is not None:
            if (i - start) * 0.01 >= min_len and start > 0:
                gaps.append(((start + i) / 2 * 0.01, (i - start) * 0.01))
            start = None
    return gaps


BRACE = re.compile(r"\{([^|}]*)\|([^}]*)\}")


def spoken(text):
    return BRACE.sub(r"\2", text)


def displayed(text):
    return BRACE.sub(r"\1", text)


def tokens(text):
    """Mots affichés et leur poids (longueur de ce qui est prononcé)."""
    # Les ponctuations isolées (« partie 5 ? ») sont rattachées au mot précédent.
    text = re.sub(r"\s+([:;!?])", r"\1", text.strip())
    out = []
    for part in re.split(r"(\{[^}]*\})", text):
        if not part:
            continue
        m = BRACE.fullmatch(part)
        if m:
            out.append([m.group(1), len(m.group(2)) + 1])
            continue
        words = part.split()
        if out and words and not part[0].isspace():
            out[-1][0] += words[0]
            words = words[1:]
        out += [[w, len(re.sub(r"\W", "", w)) + 1] for w in words]
    return out


def word_times(text, audio, sr):
    """Estime le début de chaque mot : on cale les ponctuations sur les silences
    détectés, puis on répartit les mots d'un segment au prorata de leur longueur."""
    segments, cur = [], []
    for tok in tokens(text):
        cur.append(tok)
        if re.search(r"[,:;.?!]$", tok[0]):
            segments.append(cur)
            cur = []
    if cur:
        segments.append(cur)
    dur = len(audio) / sr
    gaps = sorted(silences(audio, sr), key=lambda g: -g[1])[: len(segments) - 1]
    cuts = sorted(g[0] for g in gaps)
    if len(cuts) != len(segments) - 1:  # pas assez de silences : répartition globale
        segments, cuts = [[w for seg in segments for w in seg]], []
    bounds = [0.0] + cuts + [dur]
    words = []
    for seg, a, b in zip(segments, bounds, bounds[1:]):
        total = sum(wt for _, wt in seg)
        acc = a
        for w, wt in seg:
            words.append({"w": w, "t": acc})
            acc += (b - a) * wt / total
    return words


t = LEAD_IN
timeline = []
for line in cfg["lines"]:
    audio, sr = kokoro.create(spoken(line["text"]), voice=cfg["voice"], speed=cfg["speed"], lang="fr-fr")
    # Coupe les silences de début/fin produits par le modèle.
    idx = np.where(np.abs(audio) > 0.01)[0]
    audio = audio[max(idx[0] - int(0.03 * sr), 0): idx[-1] + int(0.06 * sr)]
    peak = np.max(np.abs(audio))
    audio = audio / peak * 0.89
    sf.write(out_dir / f"{line['id']}.wav", audio, sr)
    dur = len(audio) / sr
    words = word_times(line["text"], audio, sr)
    timeline.append({
        "id": line["id"],
        "text": displayed(line["text"]),
        "from": round(t * FPS),
        "duration": round(dur * FPS),
        "words": [{"w": w["w"], "f": round((t + w["t"]) * FPS)} for w in words],
    })
    t += dur + line["pause"]

result = {"fps": FPS, "totalFrames": round(t * FPS), "lines": timeline}
timeline_path.parent.mkdir(parents=True, exist_ok=True)
timeline_path.write_text(json.dumps(result, ensure_ascii=False, indent=2))
print(f"{len(timeline)} lignes, {t:.2f} s")
