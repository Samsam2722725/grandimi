package db

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"
)

// WebhookLog stores received Whop webhooks for audit/debug
type WebhookLog struct {
	ID        string    `json:"id"`
	EventType string    `json:"event_type"`
	UserEmail string    `json:"user_email"`
	Payload   string    `json:"payload"`
	Status    string    `json:"status"` // success, failed, pending_retry
	CreatedAt string    `json:"created_at"`
}

type AdminStats struct {
	TotalUsers    int     `json:"total_users"`
	PremiumUsers  int     `json:"premium_users"`
	EstimatedMRR  float64 `json:"estimated_mrr"`
	WebhooksRecv  int     `json:"webhooks_received"`
	CreatedToday  int     `json:"created_today"`
}

// ListAllUsers returns all users for admin dashboard
func ListAllUsers() ([]User, error) {
	rows, err := DB.QueryContext(context.Background(),
		selectUserSQL+"1=1 ORDER BY created_at DESC")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var users []User
	for rows.Next() {
		var user User
		if err := rows.Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, rows.Err()
}

// ListAllSubscriptions returns all subscription records
func ListAllSubscriptions() ([]Subscription, error) {
	rows, err := DB.QueryContext(context.Background(),
		/* CreateSubscription n'insère que user_id, whop_subscription_id et
		   status : expires_at et updated_at restent donc NULL, et lib/pq
		   refuse de scanner un NULL dans une string Go. Toute lecture de
		   la table échouait, ce qui rendait la page Abonnements du panneau
		   admin inutilisable. Même correctif que pour selectUserSQL. */
		`SELECT id, user_id, whop_subscription_id, status,
		        COALESCE(created_at::text, ''),
		        COALESCE(expires_at::text, ''),
		        COALESCE(updated_at::text, '')
		 FROM subscriptions ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []Subscription
	for rows.Next() {
		var sub Subscription
		if err := rows.Scan(&sub.ID, &sub.UserID, &sub.WhopSubscriptionID, &sub.Status, &sub.CreatedAt, &sub.ExpiresAt, &sub.UpdatedAt); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}

	return subs, rows.Err()
}

// LogWebhook stores a received webhook for audit trail
func LogWebhook(eventType, userEmail string, payload map[string]interface{}, status string) error {
	payloadJSON, _ := json.Marshal(payload)
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO webhook_logs (event_type, user_email, payload, status, created_at)
		 VALUES ($1, $2, $3, $4, $5)`,
		eventType, userEmail, string(payloadJSON), status, time.Now().UTC().Format(time.RFC3339))
	return err
}

// GetWebhookLogs returns recent webhook logs (limit 100)
func GetWebhookLogs() ([]WebhookLog, error) {
	rows, err := DB.QueryContext(context.Background(),
		// created_at est un timestamptz : lib/pq le rend en time.Time et
		// refuse de le scanner dans une string Go, d'où le cast explicite.
		`SELECT id, event_type, user_email, payload, status,
		        COALESCE(created_at::text, '')
		 FROM webhook_logs
		 ORDER BY created_at DESC
		 LIMIT 100`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var logs []WebhookLog
	for rows.Next() {
		var log WebhookLog
		if err := rows.Scan(&log.ID, &log.EventType, &log.UserEmail, &log.Payload, &log.Status, &log.CreatedAt); err != nil {
			return nil, err
		}
		logs = append(logs, log)
	}

	return logs, rows.Err()
}

// GetAdminStats returns dashboard stats
func GetAdminStats() (*AdminStats, error) {
	stats := &AdminStats{}

	// Total users
	err := DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM users`).Scan(&stats.TotalUsers)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// Premium users
	err = DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM users WHERE is_premium = true`).Scan(&stats.PremiumUsers)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// Estimated MRR (9.99 EUR per premium user)
	err = DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM users WHERE is_premium = true`).Scan(&stats.PremiumUsers)
	if err == nil {
		stats.EstimatedMRR = float64(stats.PremiumUsers) * 9.99
	}

	// Webhooks received
	err = DB.QueryRowContext(context.Background(), `SELECT COUNT(*) FROM webhook_logs`).Scan(&stats.WebhooksRecv)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	// Users created today
	err = DB.QueryRowContext(context.Background(),
		`SELECT COUNT(*) FROM users WHERE DATE(created_at AT TIME ZONE 'UTC') = CURRENT_DATE`).Scan(&stats.CreatedToday)
	if err != nil && err != sql.ErrNoRows {
		return nil, err
	}

	return stats, nil
}

// DeleteUser removes a user and related records (for testing/cleanup)
func DeleteUser(userID string) error {
	tx, err := DB.BeginTx(context.Background(), nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Delete subscriptions
	_, err = tx.ExecContext(context.Background(), `DELETE FROM subscriptions WHERE user_id = $1`, userID)
	if err != nil {
		return err
	}

	// Delete predictions
	_, err = tx.ExecContext(context.Background(), `DELETE FROM predictions WHERE user_id = $1`, userID)
	if err != nil {
		return err
	}

	// Delete user
	_, err = tx.ExecContext(context.Background(), `DELETE FROM users WHERE id = $1`, userID)
	if err != nil {
		return err
	}

	return tx.Commit()
}

// GrantPremium marks a user as premium
func GrantPremium(userID string) error {
	_, err := DB.ExecContext(context.Background(),
		`UPDATE users SET is_premium = true WHERE id = $1`, userID)
	return err
}

// RevokePremium removes premium status
func RevokePremium(userID string) error {
	_, err := DB.ExecContext(context.Background(),
		`UPDATE users SET is_premium = false WHERE id = $1`, userID)
	return err
}

// UpdateUserPassword stores password hash for user
func UpdateUserPassword(userID string, passwordHash string) error {
	_, err := DB.ExecContext(context.Background(),
		`UPDATE users SET password_hash = $1 WHERE id = $2`, passwordHash, userID)
	return err
}

// GetUserPassword retrieves password hash for user
func GetUserPassword(userID string) (string, error) {
	var passwordHash string
	err := DB.QueryRowContext(context.Background(),
		`SELECT COALESCE(password_hash, '') FROM users WHERE id = $1`, userID).Scan(&passwordHash)
	return passwordHash, err
}

// GetUserPredictions returns all predictions for a user
func GetUserPredictions(userID string) ([]Prediction, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT id, user_id, age, sex, height_cm, weight_kg, father_height_cm, mother_height_cm,
		        predicted_height, confidence_level, confidence_min, confidence_max, created_at
		 FROM predictions
		 WHERE user_id = $1
		 ORDER BY created_at DESC`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var preds []Prediction
	for rows.Next() {
		var p Prediction
		if err := rows.Scan(&p.ID, &p.UserID, &p.Age, &p.Sex, &p.HeightCm, &p.WeightKg,
			&p.FatherHeightCm, &p.MotherHeightCm, &p.PredictedHeight,
			&p.ConfidenceLevel, &p.ConfidenceMin, &p.ConfidenceMax, &p.CreatedAt); err != nil {
			return nil, err
		}
		preds = append(preds, p)
	}

	return preds, rows.Err()
}
