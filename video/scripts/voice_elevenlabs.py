"""Voix off via l'API ElevenLabs, même sortie que voice.py (un .wav par ligne + timeline).

ElevenLabs renvoie l'instant exact de chaque caractère : le début de chaque mot
est donc mesuré, et non plus estimé comme avec voice.py.

Usage :
  ELEVENLABS_API_KEY=… python scripts/voice_elevenlabs.py VOICE_ID [SCRIPT] [DOSSIER_VOIX] [TIMELINE]
  ELEVENLABS_API_KEY=… python scripts/voice_elevenlabs.py --voix   # liste les voix du compte

Exemple : python scripts/voice_elevenlabs.py <voice_id> script-partie5.json public/p5/voice src/p5/timeline.json
Pré-requis réseau : api.elevenlabs.io autorisé.
"""
import base64
import json
import os
import re
import subprocess
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
FPS = 30
LEAD_IN = 0.3
API = "https://api.elevenlabs.io/v1"
MODEL = os.environ.get("ELEVENLABS_MODEL", "eleven_multilingual_v2")
BRACE = re.compile(r"\{([^|}]*)\|([^}]*)\}")


def call(path, body=None):
    req = urllib.request.Request(
        API + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={"xi-api-key": os.environ["ELEVENLABS_API_KEY"], "Content-Type": "application/json"},
        method="POST" if body is not None else "GET",
    )
    with urllib.request.urlopen(req, timeout=120) as r:
        return json.loads(r.read())


def tokens(text):
    """Mots affichés, avec la position du début de leur équivalent prononcé."""
    text = re.sub(r"\s+([:;!?])", r"\1", text.strip())
    spoken, out = "", []
    for part in re.split(r"(\{[^}]*\})", text):
        if not part:
            continue
        m = BRACE.fullmatch(part)
        if m:
            out.append([m.group(1), len(spoken)])
            spoken += m.group(2)
            continue
        for w in re.finditer(r"\S+", part):
            if out and w.start() == 0 and not part[0].isspace():
                out[-1][0] += w.group()  # ponctuation collée au mot précédent
            else:
                out.append([w.group(), len(spoken) + w.start()])
        spoken += part
    return out, spoken


if sys.argv[1:2] == ["--voix"]:
    for v in call("/voices")["voices"]:
        labels = ", ".join(f"{k}={x}" for k, x in (v.get("labels") or {}).items())
        print(f"{v['voice_id']}  {v['name']:28s} {labels}")
    sys.exit()

voice_id = sys.argv[1]
args = sys.argv[2:] + [None] * 3
cfg = json.loads((ROOT / (args[0] or "script.json")).read_text())
out_dir = ROOT / (args[1] or "public/voice")
timeline_path = ROOT / (args[2] or "src/timeline.json")
out_dir.mkdir(parents=True, exist_ok=True)

t = LEAD_IN
timeline = []
for line in cfg["lines"]:
    toks, spoken = tokens(line["text"])
    res = call(
        f"/text-to-speech/{voice_id}/with-timestamps?output_format=mp3_44100_128",
        {
            "text": spoken,
            "model_id": MODEL,
            "language_code": "fr",
            "voice_settings": {"stability": 0.45, "similarity_boost": 0.8, "style": 0.35, "speed": cfg.get("elevenlabs_speed", 1.05)},
        },
    )
    mp3 = out_dir / f"{line['id']}.mp3"
    mp3.write_bytes(base64.b64decode(res["audio_base64"]))
    wav = out_dir / f"{line['id']}.wav"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(mp3), "-ar", "44100", "-ac", "1", str(wav)], check=True)
    mp3.unlink()
    dur = float(subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(wav)],
        capture_output=True, text=True, check=True).stdout)
    al = res.get("alignment") or res["normalized_alignment"]
    starts = al["character_start_times_seconds"]
    words = [{"w": w, "f": round((t + starts[min(pos, len(starts) - 1)]) * FPS)} for w, pos in toks]
    timeline.append({
        "id": line["id"],
        "text": BRACE.sub(r"\1", line["text"]),
        "from": round(t * FPS),
        "duration": round(dur * FPS),
        "words": words,
    })
    t += dur + line["pause"]
    print(f"{line['id']:10s} {dur:5.2f} s")

timeline_path.parent.mkdir(parents=True, exist_ok=True)
timeline_path.write_text(json.dumps({"fps": FPS, "totalFrames": round(t * FPS), "lines": timeline}, ensure_ascii=False, indent=2))
print(f"{len(timeline)} lignes, {t:.2f} s")
