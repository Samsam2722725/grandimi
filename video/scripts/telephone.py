"""Passe un épisode du format prédiction en « écran de téléphone » cadré comme Taller (31/10) : écran ×0,86 sur fond
noir, barre Safari « grandimi.com » et onglets du site en haut de l'écran (zone que TikTok / Instagram ne couvre
pas), page sans sa barre d'état ni ses onglets du bas. Retire aussi la pastille « lien en bio » du haut.

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
        pl['telephone'] = {'onglets': ONGLETS, 'actif': 'Rapport', 'coupeHaut': 60}
        if d.pop('url', None):  # sans barre du haut, la page n'est plus décalée de 150 px
            for c in d.get('cams', []):
                if c.get('z', 1) > 1:
                    c['cy'] = round(c['cy'] - 150 / (c['z'] * H), 4)
            for e in pl.get('elements', []):
                if e.get('fichier') == 'curseur.png':
                    e['y'] -= 150
        d['onglets'] = []  # pas d'onglets dans la page : ils sont en haut de l'écran
    for e in pl.get('elements', []):
        if e.get('type') == 'routine':
            pl['telephone'] = {'onglets': ['Programme', 'Exercices', 'Routine'], 'actif': 'Routine'}
            e.pop('url', None)
            e.pop('chut', None)
            e.pop('onglets', None)
            e['flou'] = 0
    if pl['nom'] == 'routine':
        pl['sons'] = [s for s in pl.get('sons', []) if s.get('son') != 'pop']
    if pl['nom'] == 'site':  # captures du vrai site : on coupe leur barre d'état, leur barre Safari est déjà hors cadre
        pl['telephone'] = {'coupeHaut': 130, 'basCache': 0}
ep.pop('lien', None)
p.write_text(json.dumps(ep, ensure_ascii=False, indent=2) + '\n')
print('téléphone :', [pl['nom'] for pl in ep['plans'] if pl.get('telephone')])
