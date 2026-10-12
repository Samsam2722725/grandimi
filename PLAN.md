# Plan complet Grandimi — à jour du 12/10/2026

L'ordre compte : finir une phase avant de passer à la suivante.
Détail technique de l'après-paiement : BACKLOG.md et AUDIT-APRES-PAIEMENT.md.

## Phase 1 — Rendre l'app honnête et prête (avant de publier)
1. [ ] Le plan démarre par SON point faible (mois 1 sur la posture s'il est voûté, sur l'alimentation s'il mange peu de protéines…). Aujourd'hui tout le monde commence par « Le sommeil ».
2. [ ] Posture mise en avant : carte « Paraître plus grand en 3 semaines » sur l'accueil + test du mur.
3. [ ] Remplacer le badge « Même à 21 ans, tu peux encore grandir » par une phrase vraie (choix parmi 2-3 propositions).
4. [ ] Écran « Paiement confirmé » au style de l'app (bouton coupé) + les 5 questions de réglage juste après.
5. [ ] Mesurer l'usage de l'app (séances faites, jours actifs, qui décroche), visible dans `node scripts/stats.mjs`.

## Phase 2 — Publier et tester
6. [ ] Publier l'app + le serveur (branche `app-telephone` → main ; vérifier que « Vérifier le backend » passe).
7. [ ] Test A : offre 1 mois avec le code DEVTEST_G7K2M9 (après grandimi.com/?test=1).
8. [ ] Test B : depuis ce compte, « Passer à 3 mois » → vérifier dans Whop que le 1 mois est arrêté.
9. [ ] Un vrai paiement 14,99 € avec ta carte (prix TTC affiché, validation bancaire), puis remboursement.
10. [ ] Annuler tous les abonnements de test dans Whop.

## Phase 3 — Faire revenir les abonnés (moins de résiliations)
11. [ ] App installable sur l'écran d'accueil + notifications (« ta séance t'attend », « couche-toi à 22h30 »).
12. [ ] Parcours visuel : Niveau 1 → Jour 1 à 7 → 🏆, « X jours restants » (Taller, GlowUp).
13. [ ] Retour sur sa taille : percentile + « ton estimation s'affine » à chaque mesure (HeightMax, GoTall).
14. [ ] Comparaison avec la semaine d'avant (sommeil, séances) + prénom et phrase de motivation en haut (Talify).
15. [ ] Illustrations d'exercices dans le style Grandimi à la place des émojis.
16. [ ] Badges de régularité (7 jours, 30 jours…).

## Phase 4 — Ce qui vend les grosses offres
17. [ ] Coach IA (les 5 concurrents l'ont) — il faut une clé API Claude. Puis le remettre dans l'offre À vie.
18. [ ] Plus tard : scanner de posture, communauté.

## En parallèle — Le vrai frein : les ventes
19. [ ] Comprendre pourquoi ~95 personnes ouvrent le paiement sans payer (mesure « paiement fermé sans payer » en ligne ; relancer l'analyse).
20. [ ] Le trafic : ~100 visites/jour venues des vidéos ; mieux le mesurer et le faire monter.

## En pause
- Paiement par un parent (version prête dans le commit 9fb9289, voir BACKLOG.md).

## Déjà fait (octobre 2026)
- Nouveau site (accueil, questionnaire, paywall 3 offres) publié, pensé téléphone.
- TVA incluse dans Whop : le client paie le prix affiché.
- Message en français quand la carte est refusée ; mode test (?test=1).
- Chiffres lisibles sans connexion : `node scripts/stats.mjs`.
- App après paiement refaite (barre en bas, Ce qui te freine, séance guidée, nutrition, sommeil, taille réservée 3 mois/À vie, montée en gamme, Mon compte, visite guidée) — sur la branche `app-telephone`, non publiée.
