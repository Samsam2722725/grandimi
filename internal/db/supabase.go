package db

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"strings"

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

// selectUserSQL adapte chaque colonne au type Go correspondant, car
// les champs de User sont tous non-nullables (string / bool) :
//
//   - created_at::text : la colonne est timestamptz, lib/pq la rend en
//     time.Time et refuse de la scanner dans un *string.
//   - COALESCE sur le reste : l'INSERT de GetOrCreateUser ne renseigne
//     que email et is_premium, donc whop_customer_id et
//     whop_subscription_id valent NULL sur toute ligne fraîchement
//     créée — et scanner NULL dans un *string échoue.
//
// Sans ces conversions, le SELECT échouait sur CHAQUE lecture, y
// compris juste après un INSERT réussi. GetOrCreateUser prenait cette
// erreur pour un "la ligne n'existe pas" et retentait l'INSERT, qui
// violait alors la contrainte unique sur email.
const selectUserSQL = `SELECT
	id,
	email,
	COALESCE(is_premium, false),
	COALESCE(whop_customer_id, ''),
	COALESCE(whop_subscription_id, ''),
	COALESCE(consent_parental, false),
	COALESCE(created_at::text, '')
FROM users WHERE `

// GetOrCreateUser - get user by email, create if not exists
// normaliserEmail rend une adresse comparable à elle-même.
//
// Sans ça, "Samuel.Garbil@gmail.com" et "samuel.garbil@gmail.com"
// créent deux comptes distincts pour la même personne : c'est arrivé en
// production, et seul l'un des deux portait l'abonnement — se connecter
// avec la mauvaise casse revenait à perdre son accès payant.
func normaliserEmail(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func GetOrCreateUser(email string) (*User, error) {
	email = normaliserEmail(email)

	var user User
	err := DB.QueryRowContext(context.Background(),
		selectUserSQL+"email = $1", email,
	).Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt)

	if err == nil {
		return &user, nil
	}
	if err != sql.ErrNoRows {
		return nil, err
	}

	_, err = DB.ExecContext(context.Background(),
		"INSERT INTO users (email, is_premium) VALUES ($1, $2)",
		email, false)
	if err != nil {
		return nil, err
	}

	return GetOrCreateUser(email)
}

// GetUserByEmail cherche un utilisateur sans jamais le créer.
//
// Renvoie (nil, nil) si l'adresse est inconnue. Login et Signup doivent
// passer par ici : avec GetOrCreateUser, chaque tentative de connexion
// sur une adresse inexistante créait un compte, ce qui polluait la base
// et permettait d'énumérer les adresses connues.
func GetUserByEmail(email string) (*User, error) {
	var user User
	err := DB.QueryRowContext(context.Background(),
		selectUserSQL+"email = $1", normaliserEmail(email),
	).Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt)

	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

// GetUserByID - récupère un utilisateur par son id
func GetUserByID(userID string) (*User, error) {
	var user User
	err := DB.QueryRowContext(context.Background(),
		selectUserSQL+"id = $1", userID,
	).Scan(&user.ID, &user.Email, &user.IsPremium, &user.WhopCustomerID, &user.WhopSubscriptionID, &user.ConsentParental, &user.CreatedAt)

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
func SavePrediction(userID string, prediction *Prediction) (*Prediction, error) {
	prediction.UserID = userID
	err := DB.QueryRowContext(context.Background(),
		"INSERT INTO predictions (user_id, age, sex, height_cm, weight_kg, father_height_cm, mother_height_cm, predicted_height, confidence_level, confidence_min, confidence_max) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING id",
		prediction.UserID, prediction.Age, prediction.Sex, prediction.HeightCm, prediction.WeightKg,
		prediction.FatherHeightCm, prediction.MotherHeightCm, prediction.PredictedHeight,
		prediction.ConfidenceLevel, prediction.ConfidenceMin, prediction.ConfidenceMax).
		Scan(&prediction.ID)
	if err != nil {
		return nil, err
	}
	return prediction, nil
}

// CreateSubscription - create subscription record
// CreateSubscription enregistre (ou réactive) l'abonnement Whop.
//
// ON CONFLICT plutôt qu'un INSERT sec : Whop rejoue membership.activated
// à CHAQUE renouvellement avec le même membership id. Sans ça, un abonné
// mensuel accumulait une ligne par mois pour le même abonnement — la
// lecture restait juste (on prend la plus récente) mais la table et le
// panneau admin se remplissaient de doublons indéfiniment.
func CreateSubscription(userID string, whopSubscriptionID string) error {
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO subscriptions (user_id, whop_subscription_id, status)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (whop_subscription_id) DO UPDATE
		   SET status = EXCLUDED.status,
		       cancel_at_period_end = false,
		       canceled_at = NULL`,
		userID, whopSubscriptionID, "active")
	return err
}
