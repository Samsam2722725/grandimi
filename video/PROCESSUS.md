# Processus d'un nouvel épisode

| # | Qui | Quoi | Livrable / validation |
|---|---|---|---|
| 1 | Utilisateur | Envoie le **mp4** de la vidéo à copier | — |
| 2 | Claude | Transcription mot à mot (Parakeet), mesure des zooms et annotations (`scripts/analyse_reference.py`), **fiche de l'original** : plan par plan, fond, textes, stickers, éléments qui restent à l'écran, transitions, sons | Envoie transcription + fiche + chiffres de la personne + liste d'images. **Rien n'est construit avant validation de la fiche** |
| 3 | Utilisateur | Corrige la fiche (ce qui est faux ou oublié) et traduit le texte en français | — |
| 4 | Claude | Vérifie le script phrase par phrase contre l'original | Script validé |
| 5 | Utilisateur | Enregistre la voix du script validé (~30 s, sans pause, coupure nette) et envoie les images (accroche et verdict sans texte, captures Grandimi résultat + routine à la même disposition que la partie 5, ballon de l'âge si ≠ 15) | — |
| 6 | Claude | `nouvel_episode.py`, nettoyage des images, transcription de la voix (temps par mot), ancres, rendu, kit CapCut | Vidéo + kit |
| 7 | Claude | Audit : planche côte à côte original / épisode sur chaque moment clé, durée, chiffres affichés, voix complète et bien prononcée | Planche + liste d'écarts |
| 8 | Utilisateur | Regarde vidéo + planche, envoie ses remarques avec timecode ou numéro d'image | — |
| 9 | Claude | Corrige ; toute correction de style est reportée dans `STYLE.md` | Version finale |
