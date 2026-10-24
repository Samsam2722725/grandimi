package db

import (
	"context"
	"database/sql"
	"time"
)

/* EnregistrerPaiement note un paiement confirme par Whop.

   Appele depuis le webhook payment.succeeded, donc apres verification
   de signature : ce qui entre ici est authentique. L'identifiant sert
   ensuite de preuve d'achat quand le client revient sur le site — Whop
   le lui donne dans l'URL de retour.

   ON CONFLICT DO NOTHING : Whop rejoue ses webhooks, et un paiement deja
   connu ne doit surtout pas voir sa reclamation effacee. */
func EnregistrerPaiement(paymentID, whopUserID, planID, statut string) error {
	if paymentID == "" {
		return nil
	}
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO paiements_whop (payment_id, whop_user_id, plan_id, statut)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (payment_id) DO NOTHING`,
		paymentID, whopUserID, planID, statut)
	return err
}

// ResultatReclamation dit ce qui s'est passe, pour que l'appelant
// reponde au client sans avoir a redemander quoi que ce soit.
type ResultatReclamation struct {
	// Accorde : l'acces vient d'etre ouvert sur ce compte.
	Accorde bool
	// DejaAuMemeCompte : ce paiement avait deja ouvert CE compte. Le
	// client recharge sa page, ce n'est pas une erreur.
	DejaAuMemeCompte bool
	// Motif, quand rien n'a ete accorde.
	Motif string
	// L'abonnement Whop rattache a ce compte par la reclamation, et son
	// offre : sert a arreter le 1 mois lors d'une montee en gamme.
	AbonnementDeplace string
	PlanAbonnement    string
}

/* CompteAyantReclame : le compte qui vient de reclamer un paiement de ce
   client Whop. Le client revient parfois avant le webhook
   membership.activated : sans ce lien, l abonnement arrivait apres coup
   sur le compte de l e-mail Whop, et « Mon compte » comme la fin
   d abonnement visaient le mauvais compte. Renvoie "" si aucun. */
func CompteAyantReclame(whopUserID string) (string, error) {
	if whopUserID == "" {
		return "", nil
	}
	var id string
	err := DB.QueryRowContext(context.Background(),
		`SELECT user_id::text
		   FROM paiements_whop
		  WHERE whop_user_id = $1
		    AND user_id IS NOT NULL
		    AND reclame_at >= now() - interval '10 minutes'
		  ORDER BY reclame_at DESC
		  LIMIT 1`, whopUserID).Scan(&id)
	if err == sql.ErrNoRows {
		return "", nil
	}
	return id, err
}

/* ReclamerPaiement rattache un paiement a un compte Grandimi.

   C'EST LE LIEN QUI MANQUAIT. Avant, un paiement trouvait son compte
   par l'adresse e-mail : celle tapee sur la page Whop devait coincider
   avec celle tapee sur Grandimi. Whop laisse ce champ modifiable, donc
   deux comptes se creaient et l'acces partait sur le mauvais.

   Ici le lien est l'identifiant de paiement, que Whop donne au payeur
   dans son URL de retour et nous envoie dans un webhook signe. Il n'y a
   plus rien a retaper, donc plus rien a se tromper.

   CE QUI PROTEGE :
     - le paiement doit exister chez nous, donc etre venu d'un webhook
       dont la signature a ete verifiee ;
     - son statut doit etre "paid" ;
     - il ne peut etre reclame qu'UNE fois (reclame_at), sinon un
       identifiant partage ouvrirait autant d'acces qu'on le recopie.

   L'abonnement cree par membership.activated est deplace vers le compte
   reclamant, et l'ancien compte perd le premium s'il ne lui reste rien —
   sans quoi une resiliation ultérieure viserait le mauvais compte. */
func ReclamerPaiement(paymentID, userID string) (ResultatReclamation, error) {
	var statut, whopUserID string
	var dejaReclamePar sql.NullString
	var paiementCreeLe time.Time

	err := DB.QueryRowContext(context.Background(),
		`SELECT statut, whop_user_id, user_id::text, created_at
		   FROM paiements_whop
		  WHERE payment_id = $1`, paymentID,
	).Scan(&statut, &whopUserID, &dejaReclamePar, &paiementCreeLe)

	if err == sql.ErrNoRows {
		/* Le webhook n'est pas encore arrive, ou l'identifiant est
		   inventé. L'appelant reessaiera : Whop met parfois quelques
		   secondes, et le client, lui, est deja revenu. */
		return ResultatReclamation{Motif: "paiement inconnu"}, nil
	}
	if err != nil {
		return ResultatReclamation{}, err
	}

	if statut != "paid" {
		return ResultatReclamation{Motif: "paiement non confirmé"}, nil
	}

	if dejaReclamePar.Valid && dejaReclamePar.String != "" {
		if dejaReclamePar.String == userID {
			return ResultatReclamation{DejaAuMemeCompte: true}, nil
		}
		return ResultatReclamation{Motif: "paiement déjà utilisé"}, nil
	}

	tx, err := DB.BeginTx(context.Background(), nil)
	if err != nil {
		return ResultatReclamation{}, err
	}
	defer tx.Rollback()

	/* La reservation se fait EN PREMIER, et conditionnee sur
	   « reclame_at IS NULL ». Deux onglets qui reclament le meme
	   paiement en meme temps : la base en refuse un, sans qu'on ait a
	   verrouiller quoi que ce soit. */
	resultat, err := tx.ExecContext(context.Background(),
		`UPDATE paiements_whop
		    SET user_id = $2, reclame_at = now()
		  WHERE payment_id = $1 AND reclame_at IS NULL`,
		paymentID, userID)
	if err != nil {
		return ResultatReclamation{}, err
	}
	lignes, err := resultat.RowsAffected()
	if err != nil {
		return ResultatReclamation{}, err
	}
	if lignes == 0 {
		return ResultatReclamation{Motif: "paiement déjà utilisé"}, nil
	}

	/* L'abonnement suit le paiement : sinon « Mon compte » et la
	   resiliation continueraient de viser l'ancien compte.

	   UN SEUL abonnement bouge : celui que ce paiement vient de creer.

	   La version precedente deplacait TOUS les abonnements du client
	   Whop (`WHERE user_id IN (SELECT id FROM users WHERE
	   whop_customer_id = $1)`). Mesure en production le 13/09/2026 : un
	   compte cree le jour meme s'est retrouve avec neuf abonnements,
	   dont huit dataient du 9 au 12 septembre. Sur un vrai client qui
	   achete deux fois — un parent qui paie pour un second enfant — le
	   premier enfant perdait son abonnement au profit du second.

	   Whop ne donne aucun moyen de relier un paiement a son abonnement :
	   payment.succeeded ne porte pas d'identifiant de membership (verifie
	   dans webhook_logs le 13/09/2026). On prend donc le plus recent, et
	   seulement s'il est ne au moment du paiement : un abonnement bien
	   anterieur appartient forcement a un achat precedent, et ne doit
	   pas bouger.

	   DEUX PRECAUTIONS DANS CETTE COMPARAISON.

	   subscriptions.created_at est un timestamp SANS fuseau, alors que
	   paiements_whop.created_at en porte un. Les comparer directement
	   marche tant que la base tourne en UTC, et se decale de plusieurs
	   heures le jour ou ce n'est plus vrai. AT TIME ZONE 'UTC' rend la
	   comparaison independante du reglage du serveur.

	   Et la fenetre demarre cinq minutes AVANT le paiement, parce que
	   rien ne garantit que Whop envoie payment.succeeded avant
	   membership.activated. Mesure sur le paiement du 13/09/2026 :
	   l'abonnement est ne 0,45 s apres le paiement — l'ordre etait le
	   bon, mais la marge est trop mince pour en faire une regle. Si
	   l'ordre s'inverse, une borne stricte ne deplacerait rien du tout
	   et le parcours parent casserait en silence. */
	/* OU CHERCHER L ABONNEMENT. Le webhook membership.activated le pose
	   sur le compte de l e-mail Whop, qui ne porte pas toujours
	   whop_customer_id : au deuxieme achat avec le meme compte Whop, un
	   autre compte le detient deja (index unique). On le retrouve donc
	   aussi par le journal des webhooks, qui garde l identifiant Whop du
	   payeur avec celui de l abonnement.

	   Mesure en local le 24/10/2026 : sans ce second chemin, le 3 mois
	   d une montee en gamme n etait jamais rattache, et le 1 mois jamais
	   arrete. */
	var abonnementDeplace, ancienProprietaire, planDeplace sql.NullString
	if whopUserID != "" {
		err := tx.QueryRowContext(context.Background(),
			`WITH cible AS (
			      SELECT s.id, s.user_id
			        FROM subscriptions s
			       WHERE s.created_at >= ($3 AT TIME ZONE 'UTC') - interval '5 minutes'
			         AND (s.user_id IN (SELECT id FROM users WHERE whop_customer_id = $1)
			              OR s.whop_subscription_id IN (
			                   SELECT payload::jsonb -> 'data' ->> 'id'
			                     FROM webhook_logs
			                    WHERE event_type = 'membership.activated'
			                      AND created_at >= $3::timestamptz - interval '1 day'
			                      AND payload::jsonb -> 'data' -> 'user' ->> 'id' = $1))
			       ORDER BY s.created_at DESC
			       LIMIT 1)
			 UPDATE subscriptions s
			    SET user_id = $2
			   FROM cible
			  WHERE s.id = cible.id
			  RETURNING s.whop_subscription_id, cible.user_id::text, s.plan_type`,
			whopUserID, userID, paiementCreeLe,
		).Scan(&abonnementDeplace, &ancienProprietaire, &planDeplace)
		if err != nil && err != sql.ErrNoRows {
			return ResultatReclamation{}, err
		}

		/* L ancien compte ne perd l acces que s il ne lui reste aucun
		   abonnement actif.

		   La version precedente le retirait a tout compte portant cet
		   identifiant Whop. Un parent qui paie pour un second enfant, ou
		   un client qui rachete depuis le meme compte Whop, coupait ainsi
		   l acces deja paye du premier compte. Reproduit en local le
		   24/10/2026 (scenario « 2e achat, meme compte Whop »). */
		if _, err := tx.ExecContext(context.Background(),
			`UPDATE users u
			    SET is_premium = false
			  WHERE u.id <> $2
			    AND (u.whop_customer_id = $1 OR u.id::text = $3)
			    AND NOT EXISTS (
			          SELECT 1 FROM subscriptions s
			           WHERE s.user_id = u.id AND s.status = 'active')`,
			whopUserID, userID, ancienProprietaire.String); err != nil {
			return ResultatReclamation{}, err
		}

		/* L ancien compte lache l identifiant client Whop AVANT que le
		   nouveau ne le prenne.

		   users.whop_customer_id porte un index UNIQUE. Poser la valeur
		   sur le compte reclamant pendant que l ancien la detient encore
		   viole la contrainte, et toute la transaction est annulee : la
		   reclamation echouait en 500 pour le seul cas qu elle existe
		   pour traiter. Mesure en production : reclamer un paiement pour
		   un compte autre que celui deja credite rendait 500, alors que
		   le reclamer pour le compte deja credite passait.

		   NULL et non chaine vide : deux comptes a "" se heurteraient au
		   meme index unique, alors que Postgres accepte autant de NULL
		   qu on veut. Les lectures font deja COALESCE (selectUserSQL). */
		if _, err := tx.ExecContext(context.Background(),
			`UPDATE users
			    SET whop_customer_id = NULL
			  WHERE whop_customer_id = $1
			    AND id <> $2`,
			whopUserID, userID); err != nil {
			return ResultatReclamation{}, err
		}
	}

	if _, err := tx.ExecContext(context.Background(),
		`UPDATE users
		    SET is_premium = true,
		        whop_customer_id = COALESCE(NULLIF($2, ''), whop_customer_id)
		  WHERE id = $1`,
		userID, whopUserID); err != nil {
		return ResultatReclamation{}, err
	}

	if err := tx.Commit(); err != nil {
		return ResultatReclamation{}, err
	}
	return ResultatReclamation{
		Accorde:           true,
		AbonnementDeplace: abonnementDeplace.String,
		PlanAbonnement:    planDeplace.String,
	}, nil
}
