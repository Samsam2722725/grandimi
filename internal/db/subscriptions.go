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
		`SELECT id, user_id, whop_subscription_id, status, plan_type,
		        COALESCE(current_period_end::text, ''),
		        cancel_at_period_end,
		        COALESCE(canceled_at::text, ''),
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
