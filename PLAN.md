# Plan de l'app après paiement — à jour du 12/10/2026

Seulement ce que le client voit APRÈS avoir payé. On ne touche pas à
l'accueil, au questionnaire, au paywall ni au paiement.
Travail en cours sur la branche `app-telephone`, non publiée.
Détail technique : BACKLOG.md et AUDIT-APRES-PAIEMENT.md.

## Déjà fait (sur la branche, non publié)
- Barre en bas : Aujourd'hui · Grandir · Ma taille · Guide.
- Aujourd'hui : Ce qui te freine, bande de 7 jours, 3 scores (sommeil, nutrition, exercices), liste du jour.
- Grandir : séance guidée avec minuteur, jauges protéines/calcium/vitamine D, sommeil « j'ai dormi … h » + 7 nuits.
- Ma taille : taille estimée réservée aux offres 3 mois et À vie ; passage à 3 mois / À vie expliqué.
- Mon compte en noir, bonnes infos par offre.
- L'abonné qui revient arrive directement sur son app.
- Visite guidée à la première ouverture.

## Phase 1 — Finir avant de publier
1. [x] Le plan démarre par SON point faible (mois 1 sur la posture s'il est voûté, sur l'alimentation s'il mange peu de protéines…). Aujourd'hui tout le monde commence par « Le sommeil ».
2. [ ] Posture mise en avant dans l'app : carte « Paraître plus grand en 3 semaines » + test du mur.
3. [ ] Écran « Paiement confirmé » au style de l'app (bouton coupé) + les 5 questions de réglage juste après.
4. [ ] Mesurer l'usage de l'app (séances faites, jours actifs, qui décroche).

## Phase 2 — Publier l'app et la tester
5. [ ] Publier l'app + le serveur (vérifier que « Vérifier le backend » passe).
6. [ ] Test A : un compte en offre 1 mois → l'app s'ouvre, la séance et les cases marchent, Ma taille est verrouillée.
7. [ ] Test B : depuis ce compte, « Passer à 3 mois » → vérifier dans Whop que le 1 mois est arrêté.
8. [ ] Annuler les abonnements de test.

## Phase 3 — Faire revenir les abonnés
9. [ ] App installable sur l'écran d'accueil + notifications (« ta séance t'attend », « couche-toi à 22h30 »).
10. [ ] Parcours visuel : Niveau 1 → Jour 1 à 7 → 🏆, « X jours restants ».
11. [ ] Retour sur sa taille : percentile + « ton estimation s'affine » à chaque mesure.
12. [ ] Comparaison avec la semaine d'avant + prénom et phrase de motivation en haut.
13. [ ] Illustrations d'exercices dans le style Grandimi à la place des émojis.
14. [ ] Badges de régularité (7 jours, 30 jours…).

## Phase 4 — Coach IA
15. [ ] Coach IA dans l'app (il faut une clé API Claude), réservé à l'offre À vie.
16. [ ] Plus tard : scanner de posture, communauté.
