"""Vidéos de comparaison original | épisode, en entier et synchronisées (livrable demandé le 21/10).

Usage : python scripts/cote_a_cote.py ORIGINAL.mp4 EPISODE.mp4 DOSSIER_DE_SORTIE
Produit cote-a-cote-son-original.mp4 et cote-a-cote-son-grandimi.mp4 (1080×960, temps affiché en bas).
"""
import subprocess
import sys
from pathlib import Path

ref, ep, out = sys.argv[1], sys.argv[2], Path(sys.argv[3])
out.mkdir(parents=True, exist_ok=True)
font = "/usr/share/fonts/opentype/inter/Inter-Bold.otf"
lab = "drawtext=fontfile={f}:text='{t}':x=(w-tw)/2:y=12:fontsize=30:fontcolor=white:box=1:boxcolor={c}:boxborderw=8"
graphe = (
    f"[0:v]scale=540:960,setsar=1,{lab.format(f=font, t='ORIGINAL', c='black@0.6')}[a];"
    f"[1:v]scale=540:960,setsar=1,{lab.format(f=font, t='GRANDIMI', c='0xff5a1f@0.9')}[b];"
    f"[a][b]hstack=inputs=2,drawtext=fontfile={font}:text='%{{pts\\:hms}}':x=(w-tw)/2:y=h-50:fontsize=28:"
    "fontcolor=white:box=1:boxcolor=black@0.6:boxborderw=6[v]"
)
for nom, piste in (("original", "0:a"), ("grandimi", "1:a")):
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", ref, "-i", ep, "-filter_complex", graphe, "-map", "[v]", "-map", piste,
                    "-c:v", "libx264", "-crf", "20", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "160k",
                    str(out / f"cote-a-cote-son-{nom}.mp4")], check=True)
    print(out / f"cote-a-cote-son-{nom}.mp4")
