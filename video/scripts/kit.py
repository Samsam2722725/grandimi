"""Kit de montage d'un épisode : clips par plan, pistes audio séparées, sous-titres .srt.

Usage : BROWSER_EXECUTABLE=… python scripts/kit.py partie-5
Sortie : out/kit-partie-5/ et deux .zip de moins de 30 Mo dans out/.
"""
import json
import re
import shutil
import subprocess
import sys
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
EP = sys.argv[1]
SRC = ROOT / "public" / "episodes" / EP
OUT = ROOT / "out" / f"kit-{EP}"
ep = json.loads((SRC / "episode.json").read_text())
tl = json.loads((SRC / "timeline.json").read_text())
FPS, END = tl["fps"], tl["totalFrames"]
L = {l["id"]: l for l in tl["lines"]}


def clean(s):
    s = unicodedata.normalize("NFD", s.lower()).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9']", "", s)


def resolve(a):
    """Même grammaire d'ancres que src/episode/Episode.tsx (frames absolues)."""
    if isinstance(a, (int, float)):
        return int(a)
    if a == "fin":
        return END
    m = re.match(r"^([A-Za-z0-9_]+)(?::(.+?)(?:#(\d+))?)?([+-]\d+)?$", a)
    lid, word, nth, off = m.groups()
    line = L[lid]
    if not word:
        base = line["from"]
    elif word == "fin":
        base = line["from"] + line["duration"]
    else:
        hits = [w["f"] for w in line["words"] if clean(w["w"]).startswith(clean(word))]
        base = hits[int(nth) - 1 if nth else 0]
    return base + int(off or 0)


def remotion(out, *extra):
    props = json.dumps({"episode": EP, **dict(extra)})
    cmd = ["npx", "remotion", "render", "Episode", str(out), f"--props={props}", "--log=error"]
    if str(out).endswith(".wav"):
        cmd.append("--codec=wav")
    else:
        cmd.append("--muted")
    subprocess.run(cmd, cwd=ROOT, check=True)


if OUT.exists():
    shutil.rmtree(OUT)
for d in ["clips", "audio", "sous-titres", "images"]:
    (OUT / d).mkdir(parents=True)

full = OUT / "video-complete-sans-sous-titres-ni-son.mp4"
remotion(full, ("sousTitres", False))
remotion(OUT / "audio" / "voix.wav", ("musique", False), ("bruitages", False))
remotion(OUT / "audio" / "bruitages.wav", ("voix", False), ("musique", False))
remotion(OUT / "audio" / "mix.wav")
dur = END / FPS
musique = ROOT / "public" / ep["musique"]["fichier"]
subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(musique), "-t", f"{dur:.2f}", "-af",
                f"afade=t=in:d=0.3,afade=t=out:st={dur - 0.9:.2f}:d=0.9,loudnorm=I=-20:TP=-2",
                "-ar", "48000", str(OUT / "audio" / "musique.wav")], check=True)
for name, af in [("voix", None), ("bruitages", None), ("musique", None), ("mix", "loudnorm=I=-14:TP=-1.5:LRA=7")]:
    wav = OUT / "audio" / f"{name}.wav"
    target = OUT / "audio" / ("mix-complet.m4a" if name == "mix" else f"{name}.m4a")
    cmd = ["ffmpeg", "-v", "error", "-y", "-i", str(wav)] + (["-af", af] if af else []) + ["-c:a", "aac", "-b:a", "256k", str(target)]
    subprocess.run(cmd, check=True)
    wav.unlink()

starts = [resolve(p["debut"]) for p in ep["plans"]]
rows = []
for i, p in enumerate(ep["plans"]):
    a, b = starts[i], starts[i + 1] if i + 1 < len(starts) else END
    name = f"{i + 1:02d}-{p['nom']}"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(full), "-vf",
                    f"trim=start_frame={a}:end_frame={b},setpts=PTS-STARTPTS", "-an",
                    "-c:v", "libx264", "-crf", "16", "-pix_fmt", "yuv420p", str(OUT / "clips" / f"{name}.mp4")], check=True)
    rows.append(f"  {name + '.mp4':28s} {a / FPS:6.2f} → {b / FPS:6.2f} s")


def ts(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


phrases, mots = [], []
for l in tl["lines"]:
    end = (l["from"] + l["duration"] + 4) / FPS
    phrases.append(f"{len(phrases) + 1}\n{ts(l['from'] / FPS)} --> {ts(end)}\n{l['text']}\n")
    chunks, cur = [], []
    for w in l["words"]:
        if cur and (len(cur) >= 2 or len(" ".join(c["w"] for c in cur)) + len(w["w"]) > 14):
            chunks.append(cur)
            cur = []
        cur.append(w)
        if re.search(r"[,.:;?!]$", w["w"]):
            chunks.append(cur)
            cur = []
    if cur:
        chunks.append(cur)
    for j, c in enumerate(chunks):
        b = chunks[j + 1][0]["f"] / FPS if j + 1 < len(chunks) else end
        txt = " ".join(w["w"] for w in c).rstrip(",.:;")
        mots.append(f"{len(mots) + 1}\n{ts(c[0]['f'] / FPS)} --> {ts(b)}\n{txt}\n")
(OUT / "sous-titres" / "sous-titres-phrases.srt").write_text("\n".join(phrases), encoding="utf-8")
(OUT / "sous-titres" / "sous-titres-mot-a-mot.srt").write_text("\n".join(mots), encoding="utf-8")
(OUT / "sous-titres" / "texte-voix-off.txt").write_text("\n".join(l["text"] for l in tl["lines"]) + "\n", encoding="utf-8")
for f in (SRC / "images").iterdir():
    if f.is_dir():  # suite d'images (ex. alien/) : copiée telle quelle
        shutil.copytree(f, OUT / "images" / f.name, dirs_exist_ok=True)
    else:
        shutil.copy(f, OUT / "images" / f.name)

(OUT / "LISEZ-MOI.txt").write_text(f"""KIT DE MONTAGE — partie {ep['partie']}
Format 1080×1920 (9:16), {FPS} images/s, durée {dur:.1f} s.

CONTENU
  video-complete-sans-sous-titres-ni-son.mp4   toute la vidéo, sans sous-titres ni son
  clips/                  la même vidéo coupée plan par plan
  audio/voix.m4a          voix off seule
  audio/musique.m4a       musique seule (niveau plein, à baisser)
  audio/bruitages.m4a     bruitages seuls
  audio/mix-complet.m4a   voix + musique + bruitages, comme la vidéo finale
  sous-titres/            .srt mot à mot et par phrase, texte brut
  images/                 images nettoyées et éléments détourés

ORDRE DES CLIPS (bout à bout, sans espace)
{chr(10).join(rows)}

REMONTER DANS CAPCUT
  1. Projet 9:16, clips dans l'ordre (ou la vidéo complète).
  2. voix, musique et bruitages À 0:00, chacun sur sa piste : tout est déjà synchronisé.
     Volumes : voix 100 %, bruitages 100 %, musique 10-15 %.
  3. Sous-titres : sur ordinateur, importer un .srt ; sur téléphone, sous-titres automatiques
     sur la voix puis corriger avec texte-voix-off.txt.
""", encoding="utf-8")

# Deux archives de moins de 30 Mo (limite d'envoi).
for zname, parts in [(f"kit-{EP}-1-clips-et-sous-titres", ["LISEZ-MOI.txt", "clips", "sous-titres"]),
                     (f"kit-{EP}-2-audio-et-images", ["LISEZ-MOI.txt", "audio", "images"])]:
    z = ROOT / "out" / f"{zname}.zip"
    z.unlink(missing_ok=True)
    subprocess.run(["zip", "-qr", str(z)] + parts, cwd=OUT, check=True)
    print(f"{z.name}: {z.stat().st_size / 1e6:.1f} Mo")
print("\n".join(rows))
