# Où on en est — 24/10/2026

## Ce qui vient d'être fait (branche `claude/ou-on-en-est-review-ecu37d`, pas encore sur main)

Samuel a testé le paiement : après la création du compte, « ça ne marche
pas » ; et après une résiliation, l'accès a sauté alors que Whop annonçait
encore un mois.

Test en local (base Postgres jetable + webhooks Whop signés,
`bash outils/test-paiement-local/lancer.sh`) : 6 échecs sur l'ancien code,
0 sur le nouveau.

Bugs trouvés et corrigés (serveur seulement) :

1. **2ᵉ achat avec le même compte Whop** (testeur, rachat, parent qui paie
   pour un 2ᵉ enfant) : le webhook `membership.activated` plantait en 500
   (`users_whop_customer_id_key`). L'abonnement n'était jamais enregistré,
   et la réclamation retirait l'accès au 1ᵉʳ compte, pourtant payé.
2. **Montée en gamme 1 mois → 3 mois** quand l'e-mail Whop diffère de
   celui du compte : le 3 mois n'était pas enregistré et le 1 mois jamais
   arrêté. Le client aurait payé les deux.
3. **Fin d'abonnement** quand l'e-mail Whop diffère : l'accès n'était pas
   retiré, le compte restait premium à vie.
4. **Retour sur le site avant le webhook** : l'abonnement arrivait sur le
   compte de l'e-mail Whop au lieu du compte du client.

Vérifié aussi, et correct : une résiliation normale garde l'accès jusqu'à
la fin de la période payée, comme le promettent les CGV.

## Pas encore expliqué

La coupure immédiate vue par Samuel après sa résiliation. Avec
`at_period_end` (notre bouton), Whop n'envoie `membership.deactivated`
qu'à la fin de la période. Il faut regarder l'abonnement de test dans
Whop : « Canceled » tout de suite = annulation immédiate ou remboursement
faits depuis Whop ; « Canceling / active jusqu'au … » = bug chez nous, à
creuser avec `webhook_logs` (Supabase).

## Pour mettre en ligne

1. Fusionner la branche dans main : Render redéploie le serveur seul.
2. Aucune migration à coller dans Supabase.
3. Vérifier sur Render que `WHOP_API_KEY` est posée. Sans elle, le bouton
   « Résilier » renvoie vers Whop au lieu de résilier, et la montée en
   gamme n'arrête pas le 1 mois.

## Ensuite (PLAN.md, phase 2)

Test A, test B, annulation des abonnements de test : à refaire après la
mise en ligne.
