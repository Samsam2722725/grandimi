package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"grandimi/internal/db"
	"io"
	"net/http"
	"net/url"
	"os"
	"strconv"
	"strings"
	"time"

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

// WhopWebhookPayload - webhook from Whop for membership events.
//
// Le champ racine s'appelle "type" (pas "event"), et "data" porte
// l'objet membership complet — pas un sous-ensemble aplati. Vérifié
// contre de vraies réponses de l'API Whop (GET /api/v1/memberships) :
// l'email vit sous data.user.email, pas data.email.
type WhopWebhookPayload struct {
	Type string `json:"type"`
	Data struct {
		ID   string `json:"id"` // membership id, ex. "mem_xxx"
		User struct {
			ID    string `json:"id"`
			Email string `json:"email"`
		} `json:"user"`
		Product struct {
			ID string `json:"id"`
		} `json:"product"`
		Status string `json:"status"`
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
	// POSTer {"type":"membership.activated","data":{"user":{"email":"..."}}}
	// et s'octroyer le premium sans payer.
	if !VerifyWhopSignature(c.GetHeader("webhook-id"), c.GetHeader("webhook-timestamp"), c.GetHeader("webhook-signature"), body) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid signature"})
		return
	}

	var payload WhopWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid payload"})
		return
	}

	// Handle membership.activated (paiement confirmé)
	if payload.Type == "membership.activated" {
		user, err := db.GetOrCreateUser(payload.Data.User.Email)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}

		// Update user as premium
		err = db.UpdateUserPremium(user.ID, payload.Data.User.ID, payload.Data.ID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}

		// Create subscription record
		err = db.CreateSubscription(user.ID, payload.Data.ID)
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

	// Handle membership.deactivated (annulation, expiration, échec de paiement)
	if payload.Type == "membership.deactivated" {
		user, err := db.GetOrCreateUser(payload.Data.User.Email)
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

// VerifyWhopSignature - vérifie la signature du webhook selon le
// format "Standard Webhooks" utilisé par Whop :
//   - message signé = "{webhook-id}.{webhook-timestamp}.{raw body}"
//   - HMAC-SHA256 avec le secret ws_... utilisé tel quel (pas de
//     préfixe à retirer, pas de décodage base64)
//   - résultat encodé en base64, comparé à la partie après "v1," de
//     l'en-tête webhook-signature
//
// L'implémentation précédente lisait un en-tête "X-Whop-Signature"
// inexistant et comparait un HMAC hex sur le seul body : elle aurait
// rejeté 100% des webhooks réels de Whop.
//
// FAIL-CLOSED : si WHOP_WEBHOOK_SECRET n'est pas configuré, on REFUSE.
// Un secret manquant est une erreur de configuration, pas une
// permission de tout laisser passer.
func VerifyWhopSignature(webhookID, webhookTimestamp, webhookSignature string, body []byte) bool {
	secret := os.Getenv("WHOP_WEBHOOK_SECRET")
	if secret == "" {
		fmt.Println("[whop] REFUS : WHOP_WEBHOOK_SECRET n'est pas configuré")
		return false
	}

	if webhookID == "" || webhookTimestamp == "" || webhookSignature == "" {
		return false
	}

	// Rejette les webhooks trop anciens (protection anti-rejeu).
	ts, err := strconv.ParseInt(webhookTimestamp, 10, 64)
	if err != nil {
		return false
	}
	if age := time.Since(time.Unix(ts, 0)); age > 5*time.Minute || age < -5*time.Minute {
		return false
	}

	signedMessage := webhookID + "." + webhookTimestamp + "." + string(body)
	h := hmac.New(sha256.New, []byte(secret))
	h.Write([]byte(signedMessage))
	expected := base64.StdEncoding.EncodeToString(h.Sum(nil))

	// L'en-tête peut porter plusieurs signatures espacées ("v1,xxx v1,yyy") ;
	// une correspondance sur l'une d'elles suffit.
	for _, part := range strings.Fields(webhookSignature) {
		version, sig, found := strings.Cut(part, ",")
		if !found || version != "v1" {
			continue
		}
		// hmac.Equal : comparaison à temps constant, pas de == sur des secrets.
		if hmac.Equal([]byte(sig), []byte(expected)) {
			return true
		}
	}
	return false
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
