package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func Init() error {
	// DATABASE_URL est la connection string Postgres complète fournie
	// par Supabase (Project Settings > Database > Connection string).
	// On l'utilise telle quelle plutôt que de la reconstruire depuis
	// SUPABASE_URL/SUPABASE_KEY : ces deux-là sont prévus pour le SDK
	// JS Supabase (REST + anon key), pas pour une connexion psql
	// directe, et la reconstruction précédente tronquait l'hôte au
	// mauvais endroit (url[8:len(url)-8]) au lieu d'en retirer juste
	// le préfixe "https://".
	connStr := os.Getenv("DATABASE_URL")
	if connStr == "" {
		return fmt.Errorf("DATABASE_URL must be set")
	}

	var err error
	DB, err = sql.Open("postgres", connStr)
	if err != nil {
		return err
	}

	return DB.PingContext(context.Background())
}

// User types
type User struct {
	ID                 string `json:"id"`
	Email              string `json:"email"`
	IsPremium          bool   `json:"is_premium"`
	WhopCustomerID     string `json:"whop_customer_id"`
	WhopSubscriptionID string `json:"whop_subscription_id"`
	ConsentParental    bool   `json:"consent_parental"`
	CreatedAt          string `json:"created_at"`
}

type Prediction struct {
	ID                 string  `json:"id"`
	UserID             string  `json:"user_id"`
	Age                float64 `json:"age"`
	Sex                string  `json:"sex"`
	HeightCm           float64 `json:"height_cm"`
	WeightKg           float64 `json:"weight_kg"`
	FatherHeightCm     float64 `json:"father_height_cm"`
	MotherHeightCm     float64 `json:"mother_height_cm"`
	PredictedHeight    float64 `json:"predicted_height"`
	ConfidenceLevel    string  `json:"confidence_level"`
	ConfidenceMin      float64 `json:"confidence_min"`
	ConfidenceMax      float64 `json:"confidence_max"`
	CreatedAt          string  `json:"created_at"`
}

type Subscription struct {
	ID                 string `json:"id"`
	UserID             string `json:"user_id"`
	WhopSubscriptionID string `json:"whop_subscription_id"`
	Status             string `json:"status"`
	CreatedAt          string `json:"created_at"`
	ExpiresAt          string `json:"expires_at"`
	UpdatedAt          string `json:"updated_at"`
}

// GetOrCreateUser - get user by email, create if not exists
func GetOrCreateUser(email string) (*User, error) {
	var user User
	err := DB.QueryRowContext(context.Background(),
		"SELECT id, email, is_premium, whop_customer_id, whop_subscription_id, consent_parental, created_at FROM users WHERE email = $1",
		email).Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt)

	if err == nil {
		return &user, nil
	}

	_, err = DB.ExecContext(context.Background(),
		"INSERT INTO users (email, is_premium) VALUES ($1, $2)",
		email, false)
	if err != nil {
		return nil, err
	}

	return GetOrCreateUser(email)
}

// GetUserByID - récupère un utilisateur par son id
func GetUserByID(userID string) (*User, error) {
	var user User
	err := DB.QueryRowContext(context.Background(),
		"SELECT id, email, is_premium, whop_customer_id, whop_subscription_id, consent_parental, created_at FROM users WHERE id = $1",
		userID).Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return &user, nil
}

// SetUserPremium - active ou désactive le premium
func SetUserPremium(userID string, isPremium bool) error {
	_, err := DB.ExecContext(context.Background(),
		"UPDATE users SET is_premium = $1 WHERE id = $2",
		isPremium, userID)
	return err
}

// UpdateUserPremium - update user premium info
func UpdateUserPremium(userID string, whopCustomerID string, whopSubscriptionID string) error {
	_, err := DB.ExecContext(context.Background(),
		"UPDATE users SET is_premium = $1, whop_customer_id = $2, whop_subscription_id = $3 WHERE id = $4",
		true, whopCustomerID, whopSubscriptionID, userID)
	return err
}

// SavePrediction - save prediction to database
func SavePrediction(prediction Prediction) error {
	_, err := DB.ExecContext(context.Background(),
		"INSERT INTO predictions (user_id, age, sex, height_cm, weight_kg, father_height_cm, mother_height_cm, predicted_height, confidence_level, confidence_min, confidence_max) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)",
		prediction.UserID, prediction.Age, prediction.Sex, prediction.HeightCm, prediction.WeightKg,
		prediction.FatherHeightCm, prediction.MotherHeightCm, prediction.PredictedHeight,
		prediction.ConfidenceLevel, prediction.ConfidenceMin, prediction.ConfidenceMax)
	return err
}

// CreateSubscription - create subscription record
func CreateSubscription(userID string, whopSubscriptionID string) error {
	_, err := DB.ExecContext(context.Background(),
		"INSERT INTO subscriptions (user_id, whop_subscription_id, status) VALUES ($1, $2, $3)",
		userID, whopSubscriptionID, "active")
	return err
}
