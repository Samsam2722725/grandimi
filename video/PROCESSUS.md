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

## Recopier une vidéo à l'identique (méthode obligatoire, validée le 17/10)

Les vidéos originales sont dans `references/<id>/original.mp4` (à ajouter à chaque nouvel épisode).

1. **Inventaire image par image** de l'original (30 i/s, toutes les images, pas d'échantillonnage) :
   pour chaque élément (mot, illustration, carte, icône) : image d'apparition et de disparition,
   position, taille, rotation, flou, image par image. Outils : `scripts/analyse_reference.py`
   (suivi des écrans), suivi d'objets OpenCV, OCR pour les mots.
2. **Courbes recopiées, pas des règles générales** : chaque élément français reprend la courbe
   mesurée de l'élément anglais correspondant.
3. **Calage segment par segment** : chaque écran français est associé à sa phrase anglaise ; les
   mouvements sont étirés ou resserrés dans le segment pour suivre la voix.
4. **Contrôle chiffré avant livraison** : comparaison automatique original / épisode, liste des écarts
   au-delà d'un seuil (moment ±2 images, position ±3 % de l'écran, taille ±5 %). On corrige jusqu'à ce
   que la liste soit vide, puis seulement on livre (vidéo + comparaison côte à côte).
5. **Sons** : l'utilisateur fournit la liste des sons entendus avec leur timecode (impossible à mesurer
   sous la voix et la musique).

Limites connues : pas de copie au pixel près (les mots français n'ont pas la même longueur) ;
bruitages exacts impossibles sans la liste de l'utilisateur.
