"""Monte un clip à partir d'enregistrements d'écran du site (iPhone, Safari) : extraits accélérés bout à bout, chacun
calé sur une durée exacte en images (pour tomber sur les mots de la voix). Recadre l'écran du téléphone (sans la barre
Safari du bas : l'écran de téléphone de la vidéo a la sienne en haut).

Usage : python scripts/montage_ecran.py SORTIE.mp4 FICHIER:DEBUT:FIN:IMAGES [...]
  DEBUT = FIN : image figée pendant IMAGES images. Recadrage : --crop x:y:l:h (défaut 142:81:795:1579), ou par
  fichier quand les morceaux sont cadrés différemment : --crop-de FICHIER=x:y:l:h (répétable). Chaque extrait est
  réduit pour tenir dans --taille l:h (défaut 864:1716), calé en haut, complété du fond sombre du site. 30 i/s.
"""
import subprocess
import sys

args = sys.argv[1:]
crop, taille = '142:81:795:1579', '864:1716'
crops = {}
while '--crop-de' in args:
    i = args.index('--crop-de'); f, c = args[i + 1].split('='); crops[f] = c; del args[i:i + 2]
if '--crop' in args:
    i = args.index('--crop'); crop = args[i + 1]; del args[i:i + 2]
if '--taille' in args:
    i = args.index('--taille'); taille = args[i + 1]; del args[i:i + 2]
sortie, segments = args[0], args[1:]
tw, th = taille.split(':')
fichiers, filtres = [], []
for k, seg in enumerate(segments):
    f, a, b, n = seg.rsplit(':', 3)
    a, b, n = float(a), float(b), int(n)
    if f not in fichiers:
        fichiers.append(f)
    src = fichiers.index(f)
    x, y, w, h = crops.get(f, crop).split(':')
    base = (f'[{src}:v]crop={w}:{h}:{x}:{y},scale={tw}:{th}:force_original_aspect_ratio=decrease,'
            f'pad={tw}:{th}:(ow-iw)/2:0:color=0x0d0a0d,setsar=1,fps=30')
    if a == b:  # image figée
        filtres.append(f'{base},trim=start={a}:duration=0.034,setpts=PTS-STARTPTS,tpad=stop_mode=clone:stop_duration={n / 30},trim=end_frame={n}[s{k}]')
    else:
        v = (b - a) / (n / 30)
        filtres.append(f'{base},trim=start={a}:end={b},setpts=(PTS-STARTPTS)/{v},fps=30,tpad=stop_mode=clone:stop_duration=1,trim=end_frame={n}[s{k}]')
graphe = ';'.join(filtres) + ';' + ''.join(f'[s{k}]' for k in range(len(segments))) + f'concat=n={len(segments)}:v=1:a=0[out]'
cmd = ['ffmpeg', '-v', 'error', '-y'] + sum([['-i', f] for f in fichiers], []) + ['-filter_complex', graphe, '-map', '[out]', '-an', '-c:v', 'libx264', '-crf', '20', '-pix_fmt', 'yuv420p', sortie]
subprocess.run(cmd, check=True)
print(sortie, sum(int(s.rsplit(':', 1)[1]) for s in segments), 'images')
