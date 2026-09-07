package db

import (
	"context"
	"fmt"
	"os"

	"github.com/supabase-community/supabase-go"
)

var Client *supabase.Client

func Init() error {
	url := os.Getenv("SUPABASE_URL")
	key := os.Getenv("SUPABASE_KEY")

	if url == "" || key == "" {
		return fmt.Errorf("SUPABASE_URL and SUPABASE_KEY must be set")
	}

	client, err := supabase.NewClient(url, key, nil)
	if err != nil {
		return err
	}

	Client = client
	return nil
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
	var users []User
	err := Client.DB.From("users").Select("*").Eq("email", email).ExecuteTo(context.Background(), &users)

	if err == nil && len(users) > 0 {
		return &users[0], nil
	}

	// Create new user
	newUser := User{
		Email:     email,
		IsPremium: false,
	}

	var created []User
	err = Client.DB.From("users").Insert([]User{newUser}, false, "", "", "").ExecuteTo(context.Background(), &created)
	if err != nil {
		return nil, err
	}

	if len(created) > 0 {
		return &created[0], nil
	}

	return nil, fmt.Errorf("failed to create user")
}

// UpdateUserPremium - set user as premium
// GetUserByID - récupère un utilisateur par son id.
// Retourne (nil, nil) si l'utilisateur n'existe pas : l'appelant doit
// distinguer « inconnu » d'une véritable erreur de base.
func GetUserByID(userID string) (*User, error) {
	var users []User
	err := Client.DB.From("users").Select("*").Eq("id", userID).ExecuteTo(context.Background(), &users)
	if err != nil {
		return nil, err
	}

	if len(users) == 0 {
		return nil, nil
	}

	return &users[0], nil
}

// SetUserPremium - active ou désactive le premium.
// Nécessaire pour traiter subscription.cancelled : sans ça, un abonné
// résilié gardait l'accès indéfiniment.
func SetUserPremium(userID string, isPremium bool) error {
	_, err := Client.DB.From("users").
		Update(map[string]interface{}{
			"is_premium": isPremium,
		}, "", "").
		Eq("id", userID).
		Execute(context.Background())

	return err
}

func UpdateUserPremium(userID string, whopCustomerID string, whopSubscriptionID string) error {
	_, err := Client.DB.From("users").
		Update(map[string]interface{}{
			"is_premium":            true,
			"whop_customer_id":      whopCustomerID,
			"whop_subscription_id":  whopSubscriptionID,
		}, "", "").
		Eq("id", userID).
		Execute(context.Background())

	return err
}

// SavePrediction - save prediction to database
func SavePrediction(prediction Prediction) error {
	_, err := Client.DB.From("predictions").
		Insert([]Prediction{prediction}, false, "", "", "").
		Execute(context.Background())
	return err
}

// CreateSubscription - create subscription record
func CreateSubscription(userID string, whopSubscriptionID string) error {
	sub := Subscription{
		UserID:             userID,
		WhopSubscriptionID: whopSubscriptionID,
		Status:             "active",
	}

	_, err := Client.DB.From("subscriptions").
		Insert([]Subscription{sub}, false, "", "", "").
		Execute(context.Background())
	return err
}
