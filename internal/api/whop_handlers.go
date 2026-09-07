package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"grandimi/internal/db"
	"io"
	"net/http"
	"net/url"
	"os"

	"github.com/gin-gonic/gin"
)

// CheckoutRequest - user requests checkout link
type CheckoutRequest struct {
	Email string `json:"email"`
	UserID string `json:"user_id"`
}

// CheckoutResponse - returns Whop checkout URL
type CheckoutResponse struct {
	CheckoutURL string `json:"checkout_url"`
	Message     string `json:"message"`
}

// WhopWebhookPayload - webhook from Whop for subscription events
type WhopWebhookPayload struct {
	Event string `json:"event"`
	Data  struct {
		SubscriptionID string `json:"subscription_id"`
		CustomerID     string `json:"customer_id"`
		ProductID      string `json:"product_id"`
		Status         string `json:"status"`
		Email          string `json:"email"`
	} `json:"data"`
}

// GetCheckout - generates Whop checkout URL
func GetCheckout(c *gin.Context) {
	var req CheckoutRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.Email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email required"})
		return
	}

	// Get or create user
	user, err := db.GetOrCreateUser(req.Email)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	// Slug du produit Whop, via l'environnement.
	// Il était codé en dur à "text-aa" — un placeholder qui aurait
	// envoyé chaque client vers un produit inexistant. On échoue
	// bruyamment plutôt que de rediriger vers une page morte.
	productSlug := os.Getenv("WHOP_PRODUCT_SLUG")
	if productSlug == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "WHOP_PRODUCT_SLUG is not configured",
		})
		return
	}

	checkoutURL := fmt.Sprintf(
		"https://whop.com/checkout/%s?customer_email=%s",
		productSlug,
		url.QueryEscape(req.Email),
	)

	c.JSON(http.StatusOK, CheckoutResponse{
		CheckoutURL: checkoutURL,
		Message:     fmt.Sprintf("Checkout for user %s", user.ID),
	})
}

// WhopWebhook - receives subscription events from Whop
func WhopWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	// La signature est vérifiée AVANT tout traitement.
	// Sans ce contrôle, l'endpoint était ouvert : n'importe qui pouvait
	// POSTer {"event":"subscription.created","data":{"email":"..."}}
	// et s'octroyer le premium sans payer.
	if !VerifyWhopSignature(c.GetHeader("X-Whop-Signature"), body) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	var payload WhopWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Handle subscription.created event
	if payload.Event == "subscription.created" || payload.Event == "subscription.active" {
		// Get user by email
		user, err := db.GetOrCreateUser(payload.Data.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}

		// Update user as premium
		err = db.UpdateUserPremium(user.ID, payload.Data.CustomerID, payload.Data.SubscriptionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}

		// Create subscription record
		err = db.CreateSubscription(user.ID, payload.Data.SubscriptionID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create subscription"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"user_id": user.ID,
			"message": "subscription activated",
		})
		return
	}

	// Handle subscription.cancelled / expired
	if payload.Event == "subscription.cancelled" || payload.Event == "subscription.expired" {
		user, err := db.GetOrCreateUser(payload.Data.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}

		// Sans ceci, un abonné résilié conservait l'accès premium à vie.
		if err := db.SetUserPremium(user.ID, false); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke premium"})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"status":  "success",
			"user_id": user.ID,
			"message": "subscription cancelled",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "received"})
}

// VerifyWhopSignature - vérifie la signature HMAC du webhook.
//
// FAIL-CLOSED : si WHOP_WEBHOOK_SECRET n'est pas configuré, on REFUSE.
// La version précédente retournait true dans ce cas, ce qui revenait à
// désactiver toute la sécurité en oubliant une variable d'environnement.
// Un secret manquant est une erreur de configuration, pas une
// permission de tout laisser passer.
func VerifyWhopSignature(signature string, body []byte) bool {
	secret := os.Getenv("WHOP_WEBHOOK_SECRET")
	if secret == "" {
		fmt.Println("[whop] REFUS : WHOP_WEBHOOK_SECRET n'est pas configuré")
		return false
	}

	if signature == "" {
		return false
	}

	h := hmac.New(sha256.New, []byte(secret))
	h.Write(body)
	expected := hex.EncodeToString(h.Sum(nil))

	// hmac.Equal : comparaison à temps constant, pas de == sur des secrets.
	return hmac.Equal([]byte(signature), []byte(expected))
}

// CheckPremium - interroge réellement la base.
// Retournait `is_premium: false` en dur : un client qui venait de payer
// était donc traité comme non-abonné, et le plan restait inaccessible.
func CheckPremium(c *gin.Context) {
	userID := c.Query("user_id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id required"})
		return
	}

	user, err := db.GetUserByID(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":    user.ID,
		"is_premium": user.IsPremium,
	})
}
