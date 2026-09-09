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
//
// ChildUserID sert au paiement par un parent : l'email est alors celui
// du parent (c'est lui le client Whop), mais l'accès doit atterrir sur
// le compte de l'enfant, dont l'ID voyage jusqu'au webhook.
type CheckoutRequest struct {
	Email       string `json:"email"`
	UserID      string `json:"user_id"`
	ChildUserID string `json:"child_user_id"`
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
		// Renseigné quand le checkout a été ouvert depuis le lien de
		// partage parent : porte child_user_id. Typé en interface{} car
		// Whop peut renvoyer autre chose que des chaînes ; un
		// map[string]string ferait échouer tout le webhook sur une
		// valeur numérique.
		Metadata map[string]interface{} `json:"metadata"`
	} `json:"data"`
}

// metadataTexte lit une clé de metadata en tolérant les types non-chaîne.
func metadataTexte(metadata map[string]interface{}, cle string) string {
	valeur, ok := metadata[cle]
	if !ok || valeur == nil {
		return ""
	}
	if texte, ok := valeur.(string); ok {
		return strings.TrimSpace(texte)
	}
	return strings.TrimSpace(fmt.Sprintf("%v", valeur))
}

// resoudreBeneficiaire dit à quel compte appliquer l'abonnement.
//
// Le payeur n'est pas toujours le bénéficiaire : quand un parent règle
// depuis le lien de partage, data.user.email est celui du parent alors
// que l'accès doit aller au compte de l'enfant. child_user_id tranche.
//
// En l'absence de metadata — Whop ne le transmet pas, ou paiement
// classique par l'utilisateur lui-même — on retombe sur l'email du
// payeur, c'est-à-dire le comportement d'avant.
func resoudreBeneficiaire(payload WhopWebhookPayload) (*db.User, error) {
	if id := metadataTexte(payload.Data.Metadata, "child_user_id"); id != "" {
		enfant, err := db.GetUserByID(id)
		if err == nil && enfant != nil {
			return enfant, nil
		}
		// ID inconnu : on préfère rattacher le paiement au payeur
		// plutôt que de le perdre. La trace permet de rattraper à la main.
		fmt.Printf("[whop] child_user_id %q introuvable, repli sur l'email du payeur: %v\n", id, err)
	}
	return db.GetOrCreateUser(payload.Data.User.Email)
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

	// Get or create user.
	// L'erreur réelle part dans les logs du serveur, jamais au client :
	// diagnostiquer un 500 sans trace exige sinon un déploiement dédié
	// juste pour voir le message.
	user, err := db.GetOrCreateUser(req.Email)
	if err != nil {
		fmt.Printf("[checkout] GetOrCreateUser(%q): %v\n", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	// ID du PLAN Whop (pas du produit) : /checkout attend un
	// "plan_XXXX", qui est ce que l'API Whop renvoie dans purchase_url.
	// Y mettre un slug de produit rend une page d'erreur Whop, pas un
	// paiement — c'est ce qui se passait avec "text-aa".
	planID := os.Getenv("WHOP_PLAN_ID")
	if planID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "WHOP_PLAN_ID is not configured",
		})
		return
	}

	checkoutURL := fmt.Sprintf(
		"https://whop.com/checkout/%s?customer_email=%s",
		planID,
		url.QueryEscape(req.Email),
	)

	// Paiement par un parent : on vérifie que le compte enfant existe
	// avant de lancer le paiement. Sans ce contrôle, un ID erroné ne se
	// verrait qu'au webhook, une fois le parent débité.
	if req.ChildUserID != "" {
		enfant, err := db.GetUserByID(req.ChildUserID)
		if err != nil || enfant == nil {
			fmt.Printf("[checkout] compte enfant introuvable (%q): %v\n", req.ChildUserID, err)
			c.JSON(http.StatusBadRequest, gin.H{"error": "unknown child account"})
			return
		}
		checkoutURL += "&metadata[child_user_id]=" + url.QueryEscape(req.ChildUserID)
	}

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

	// Log webhook for audit trail
	payloadMap := map[string]interface{}{
		"type": payload.Type,
		"data": payload.Data,
	}
	db.LogWebhook(payload.Type, payload.Data.User.Email, payloadMap, "received")

	// Handle membership.activated (paiement confirmé)
	if payload.Type == "membership.activated" {
		user, err := resoudreBeneficiaire(payload)
		if err != nil {
			fmt.Printf("[whop] membership.activated resoudreBeneficiaire(%q): %v\n", payload.Data.User.Email, err)
			db.LogWebhook(payload.Type, payload.Data.User.Email, payloadMap, "failed")
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}

		// Update user as premium
		err = db.UpdateUserPremium(user.ID, payload.Data.User.ID, payload.Data.ID)
		if err != nil {
			fmt.Printf("[whop] UpdateUserPremium(%s): %v\n", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update user"})
			return
		}

		// Create subscription record
		err = db.CreateSubscription(user.ID, payload.Data.ID)
		if err != nil {
			fmt.Printf("[whop] CreateSubscription(%s): %v\n", user.ID, err)
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
		user, err := resoudreBeneficiaire(payload)
		if err != nil {
			fmt.Printf("[whop] membership.deactivated resoudreBeneficiaire(%q): %v\n", payload.Data.User.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
			return
		}

		// Sans ceci, un abonné résilié conservait l'accès premium à vie.
		if err := db.SetUserPremium(user.ID, false); err != nil {
			fmt.Printf("[whop] SetUserPremium(%s, false): %v\n", user.ID, err)
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
	// Statut de l'appelant uniquement : le ?user_id= d'avant permettait
	// d'interroger l'abonnement de n'importe quel compte.
	userID := c.GetString("userID")

	user, err := db.GetUserByID(userID)
	if err != nil {
		fmt.Printf("[check-premium] GetUserByID(%q): %v\n", userID, err)
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
