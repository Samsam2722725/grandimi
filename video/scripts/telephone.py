"""Passe un épisode du format prédiction en « écran de téléphone » (demande du 31/10, capture Instagram à l'appui) :
les écrans de l'appli (dashboard, routine, site) sont réduits et finissent à y 1520, avec la barre Safari
« grandimi.com » en bas et les onglets de l'appli juste au-dessus, au lieu d'une barre d'adresse en haut cachée par
l'heure et d'onglets cachés par la légende TikTok / Instagram. Retire aussi la pastille « lien en bio » du haut.

Usage : python scripts/telephone.py EPISODE_ID
"""
import json
import sys
from pathlib import Path

p = Path(__file__).resolve().parent.parent / 'public' / 'episodes' / sys.argv[1] / 'episode.json'
ep = json.loads(p.read_text())
H = 1920
ONGLETS = ['Rapport', 'Programme', 'Exercices', 'Routine']
for pl in ep['plans']:
    d = pl.get('dashboard')
    if d:
        pl['telephone'] = True
        if d.pop('url', None):  # sans barre du haut, la page n'est plus décalée de 150 px
            for c in d.get('cams', []):
                if c.get('z', 1) > 1:
                    c['cy'] = round(c['cy'] - 150 / (c['z'] * H), 4)
            for e in pl.get('elements', []):
                if e.get('fichier') == 'curseur.png':
                    e['y'] -= 150
        d['onglets'] = ONGLETS
    for e in pl.get('elements', []):
        if e.get('type') == 'routine':
            pl['telephone'] = True
            e.pop('url', None)
            e.pop('chut', None)
            e['flou'] = 0
            e['onglets'] = ['Programme', 'Exercices', 'Routine']
    if pl['nom'] == 'routine':
        pl['sons'] = [s for s in pl.get('sons', []) if s.get('son') != 'pop']
ep.pop('lien', None)
p.write_text(json.dumps(ep, ensure_ascii=False, indent=2) + '\n')
print('téléphone :', [pl['nom'] for pl in ep['plans'] if pl.get('telephone')])
