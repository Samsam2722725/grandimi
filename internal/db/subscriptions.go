package db

import (
	"context"
	"database/sql"
	"time"
)

// SubscriptionDetails est l'abonnement tel qu'exposé à "Mon compte".
type SubscriptionDetails struct {
	ID                 string `json:"id"`
	UserID             string `json:"user_id"`
	WhopSubscriptionID string `json:"whop_subscription_id"`
	Status             string `json:"status"`
	PlanType           string `json:"plan_type"`
	CurrentPeriodEnd   string `json:"current_period_end"`
	CancelAtPeriodEnd  bool   `json:"cancel_at_period_end"`
	CanceledAt         string `json:"canceled_at"`
	ManageURL          string `json:"manage_url"`
	CreatedAt          string `json:"created_at"`
}

// GetLatestSubscription renvoie l'abonnement le plus récent d'un
// utilisateur. "Le plus récent" plutôt qu'un id fixe : un même compte
// peut accumuler plusieurs lignes (résiliation puis réabonnement), et
// c'est toujours la dernière qui doit faire foi pour "Mon compte".
func GetLatestSubscription(userID string) (*SubscriptionDetails, error) {
	var s SubscriptionDetails
	err := DB.QueryRowContext(context.Background(),
		/* to_char plutôt que ::text : le cast Postgres rend
		   « 2027-09-11 14:20:50.85+00 », avec une ESPACE au lieu du T. Ce
		   n'est pas de l'ISO 8601, et new Date() renvoie Invalid Date
		   dessus sur Safari/iOS — la date du prochain paiement serait
		   restée vide sur iPhone, soit une bonne partie des utilisateurs. */
		`SELECT id, user_id, whop_subscription_id, status, plan_type,
		        COALESCE(to_char(current_period_end AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		        cancel_at_period_end,
		        COALESCE(to_char(canceled_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), ''),
		        COALESCE(manage_url, ''),
		        COALESCE(created_at::text, '')
		 FROM   subscriptions
		 WHERE  user_id = $1
		 ORDER BY created_at DESC
		 LIMIT 1`,
		userID,
	).Scan(&s.ID, &s.UserID, &s.WhopSubscriptionID, &s.Status, &s.PlanType,
		&s.CurrentPeriodEnd, &s.CancelAtPeriodEnd, &s.CanceledAt, &s.ManageURL, &s.CreatedAt)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// UpdateSubscriptionFromWebhook applique au plan, à la date de
// renouvellement et au lien de gestion Whop la ligne créée par
// CreateSubscription pour ce même membership.activated.
func UpdateSubscriptionFromWebhook(whopSubscriptionID, planType string, currentPeriodEnd time.Time, manageURL string) error {
	_, err := DB.ExecContext(context.Background(),
		`UPDATE subscriptions
		 SET    plan_type = $1, current_period_end = $2, manage_url = $3
		 WHERE  whop_subscription_id = $4`,
		planType, currentPeriodEnd, manageURL, whopSubscriptionID)
	return err
}

// SetCancelAtPeriodEnd synchronise l'état de résiliation — que la
// demande vienne de notre bouton (après confirmation de l'API Whop) ou
// directement du portail Whop (webhook
// membership.cancel_at_period_end_changed) : dans les deux cas, c'est
// le même champ qui doit changer, pour que "Mon compte" reste exact
// quel que soit le chemin emprunté par le client.
func SetCancelAtPeriodEnd(whopSubscriptionID string, cancel bool, canceledAt *time.Time) error {
	_, err := DB.ExecContext(context.Background(),
		`UPDATE subscriptions
		 SET    cancel_at_period_end = $1, canceled_at = $2
		 WHERE  whop_subscription_id = $3`,
		cancel, canceledAt, whopSubscriptionID)
	return err
}

/* RevoquerSiPlusAucunAbonnement traite une desactivation Whop.

   LE BUG QU ELLE CORRIGE. Le webhook membership.deactivated retirait le
   premium sans regarder QUEL abonnement venait d etre desactive. Un
   client qui resilie puis se reabonne recoit les deux evenements a
   quelques secondes d intervalle, et rien ne garantit leur ordre : si la
   desactivation de l ancien abonnement arrive apres l activation du
   nouveau, elle annule l acces que le client vient de payer.

   Observe en production le 12/09/2026 : resiliation a 13:37:34, nouvel
   achat a 13:38:57, deux webhooks a 13:39:47 et 13:39:48, puis
   /api/v1/growth-plan qui repond 402 a quelqu un qui venait de payer.

   La ligne desactivee est donc d abord marquee, PUIS le premium n est
   retire que s il ne reste aucun abonnement actif. L ordre compte : en
   marquant avant de compter, un evenement en retard ne peut plus
   emporter un abonnement plus recent.

   Renvoie true si l acces a effectivement ete retire. */
func RevoquerSiPlusAucunAbonnement(userID, whopSubscriptionID string) (bool, error) {
	if _, err := DB.ExecContext(context.Background(),
		`UPDATE subscriptions
		    SET status = 'canceled'
		  WHERE whop_subscription_id = $1`,
		whopSubscriptionID); err != nil {
		return false, err
	}

	/* Le NOT EXISTS est evalue par la base, dans la meme requete que la
	   mise a jour : deux webhooks traites en parallele ne peuvent pas
	   lire un etat intermediaire et se contredire. */
	var revoque bool
	err := DB.QueryRowContext(context.Background(),
		`UPDATE users
		    SET is_premium = false
		  WHERE id = $1
		    AND NOT EXISTS (
		          SELECT 1 FROM subscriptions
		           WHERE user_id = $1 AND status = 'active'
		        )
		  RETURNING true`, userID).Scan(&revoque)

	if err == sql.ErrNoRows {
		// Aucune ligne mise a jour : il reste un abonnement actif, donc
		// l acces est conserve. Ce n est pas une erreur, c est le cas
		// que cette fonction existe pour proteger.
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return revoque, nil
}
