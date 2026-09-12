package db

import (
	"context"
	"database/sql"
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

	err := DB.QueryRowContext(context.Background(),
		`SELECT statut, whop_user_id, user_id::text
		   FROM paiements_whop
		  WHERE payment_id = $1`, paymentID,
	).Scan(&statut, &whopUserID, &dejaReclamePar)

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

	// L'abonnement suit le paiement : sinon « Mon compte » et la
	// resiliation continueraient de viser l'ancien compte.
	if whopUserID != "" {
		if _, err := tx.ExecContext(context.Background(),
			`UPDATE subscriptions
			    SET user_id = $2
			  WHERE user_id IN (SELECT id FROM users WHERE whop_customer_id = $1)`,
			whopUserID, userID); err != nil {
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
			    SET is_premium = false,
			        whop_customer_id = NULL
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
	return ResultatReclamation{Accorde: true}, nil
}
