"""Mixage final « comme Taller » (référence references/son-taller, mesurée le 02/11) :
musique grave toujours présente sous la voix, en stéréo large, et master fort et limité.

Mesures de la référence (hors outro TikTok) : −12,6 LUFS intégrés, crêtes à ~0 dBFS, canal « side » (= la musique,
la voix étant au centre) à −9,7 dB sous le niveau intégré, niveau des pauses (percentile 10 par fenêtres de 50 ms)
à −7,6 dB sous la médiane.

Usage : python scripts/mix_son.py VIDEO_SANS_MUSIQUE.mp4 public/sfx/music.wav SORTIE.mp4
Réglages par défaut (02/11, compromis mesuré sur donald-24) : musique −16 dB, graves de la musique +10 dB,
aigus de la voix −8 dB. Résultat : −12,6 LUFS, side −5,9 dB, pauses −6,1 dB, écart spectral moyen 3,6 dB.
Version sans musique (pour ajouter le son TikTok « 7AM – Slowed + Reverb » dans l'appli) : --musique-db -100.
VIDEO_SANS_MUSIQUE : rendu Remotion avec --props='{"episode":"…","musique":false}' (voix + bruitages).
"""
import argparse
import json
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
import soundfile as sf

p = argparse.ArgumentParser()
p.add_argument('video')
p.add_argument('musique')
p.add_argument('sortie')
p.add_argument('--musique-db', type=float, default=-16.0, help='gain de la musique (dB) avant le master')
p.add_argument('--lufs', type=float, default=-12.6)
p.add_argument('--musique-graves', type=float, default=10.0, help='renfort des graves de la musique (dB, étagère à 80 Hz)')
p.add_argument('--voix-aigus', type=float, default=-8.0, help='correction des aigus de la voix (dB, étagère à 4,5 kHz)')
p.add_argument('--voix-medium', type=float, default=0.0, help='correction du bas-médium de la voix (dB, cloche à 350 Hz)')
p.add_argument('--crete', type=float, default=-0.3, help='plafond du limiteur (dBFS)')
a = p.parse_args()

tmp = Path(tempfile.mkdtemp())
SR = 44100


def ff(*args):
    subprocess.run(['ffmpeg', '-loglevel', 'error', '-y', *args], check=True)


def lufs(path):
    out = subprocess.run(['ffmpeg', '-hide_banner', '-i', str(path), '-af', 'ebur128=framelog=quiet', '-f', 'null', '-'],
                         capture_output=True, text=True).stderr
    for line in out.splitlines()[::-1]:
        if line.strip().startswith('I:'):
            return float(line.split()[1])
    raise RuntimeError('mesure LUFS impossible')


dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a.video],
                           capture_output=True, text=True).stdout)

# 1. voix + bruitages (stéréo), musique bouclée à la durée, élargie en pseudo-stéréo (Haas 14 ms + léger écart de
#    timbre entre les côtés), fondu de fin d'une seconde.
ff('-i', a.video, '-vn', '-ac', '2', '-ar', str(SR), '-af', f'treble=g={a.voix_aigus}:f=4500:t=s:w=0.7,equalizer=f=350:t=o:w=1.5:g={a.voix_medium}', str(tmp / 'voix.wav'))
ff('-stream_loop', '-1', '-i', a.musique, '-t', f'{dur:.3f}', '-ar', str(SR), '-filter_complex',
   # la musique de la référence est large jusque dans le grave (réverbération « slowed + reverb ») : on élargit tout
   f"[0:a]aformat=channel_layouts=mono,bass=g={a.musique_graves}:f=80:t=s:w=0.7,asplit[g][d];"
   f"[d]adelay=14,equalizer=f=900:t=q:w=1:g=-2[d2];"
   f"[g]equalizer=f=2500:t=q:w=1:g=-1.5[g2];[g2][d2]amerge=inputs=2,"
   f"volume={a.musique_db}dB,afade=t=out:st={max(0, dur - 1):.3f}:d=1",
   str(tmp / 'musique.wav'))

v, _ = sf.read(tmp / 'voix.wav')
m, _ = sf.read(tmp / 'musique.wav')
n = min(len(v), len(m))
mix = v[:n] + m[:n]
sf.write(tmp / 'mix.wav', mix, SR, subtype='FLOAT')

# 2. master : gain vers la cible, limiteur, puis correction fine (le limiteur retire un peu de volume).
gain_total = a.lufs - lufs(tmp / 'mix.wav')
for _ in range(4):
    ff('-i', str(tmp / 'mix.wav'), '-af',
       f'volume={gain_total:.2f}dB,alimiter=limit={10 ** (a.crete / 20):.4f}:attack=3:release=60:level=disabled',
       '-c:a', 'pcm_f32le', str(tmp / 'master.wav'))
    ecart = a.lufs - lufs(tmp / 'master.wav')
    if abs(ecart) < 0.15:
        break
    gain_total += ecart

ff('-i', a.video, '-i', str(tmp / 'master.wav'), '-map', '0:v', '-map', '1:a', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '256k',
   '-shortest', a.sortie)


# 3. rapport : mêmes mesures que la référence
def mesures(path, fin):
    x, sr = sf.read(path)
    x = x[: int(fin * sr)]
    mid = x.mean(1)
    side = (x[:, 0] - x[:, 1]) / 2
    db = lambda s: 20 * np.log10(np.sqrt(np.mean(s ** 2)) + 1e-12)
    h = int(0.05 * sr)
    e = np.array([db(mid[i * h:(i + 1) * h]) for i in range(len(mid) // h)])
    return {'side_moins_mid': round(db(side) - db(mid), 1), 'pauses_sous_mediane': round(float(np.percentile(e, 10) - np.median(e)), 1),
            'crete_dbfs': round(float(20 * np.log10(np.abs(x).max())), 2)}


print(json.dumps({'lufs': round(lufs(tmp / 'master.wav'), 1), **mesures(tmp / 'master.wav', dur - 1)}, ensure_ascii=False))
