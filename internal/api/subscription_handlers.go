package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"grandimi/internal/billing"
	"grandimi/internal/db"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// GetPlans - tarifs publics. Le frontend les lit ici plutôt que de les
// recopier en dur, pour qu'une seule modification (ce fichier +
// billing/plans.go) mette à jour toutes les pages à la fois.
func GetPlans(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"plans": billing.All()})
}

// SubscriptionResponse - état de l'abonnement pour "Mon compte -> Abonnement".
type SubscriptionResponse struct {
	HasSubscription   bool    `json:"has_subscription"`
	PlanKey           string  `json:"plan_key"`
	PlanLabel         string  `json:"plan_label"`
	PriceEUR          float64 `json:"price_eur"`
	Status            string  `json:"status"`
	NextPaymentDate   string  `json:"next_payment_date"`
	CancelAtPeriodEnd bool    `json:"cancel_at_period_end"`
	CanceledAt        string  `json:"canceled_at"`
	ManageURL         string  `json:"manage_url"`
}

// GetSubscription renvoie l'abonnement de l'utilisateur connecté.
func GetSubscription(c *gin.Context) {
	userID := c.GetString("userID")

	sub, err := db.GetLatestSubscription(userID)
	if err != nil {
		fmt.Printf("[subscription] GetLatestSubscription(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load subscription"})
		return
	}
	if sub == nil {
		c.JSON(http.StatusOK, SubscriptionResponse{HasSubscription: false})
		return
	}

	plan, _ := billing.Get(sub.PlanType)

	c.JSON(http.StatusOK, SubscriptionResponse{
		HasSubscription:   true,
		PlanKey:           sub.PlanType,
		PlanLabel:         plan.Label,
		PriceEUR:          plan.PriceEUR,
		Status:            sub.Status,
		NextPaymentDate:   sub.CurrentPeriodEnd,
		CancelAtPeriodEnd: sub.CancelAtPeriodEnd,
		CanceledAt:        sub.CanceledAt,
		ManageURL:         sub.ManageURL,
	})
}

// CancelSubscription résilie l'abonnement de l'utilisateur connecté en
// appelant l'API Whop réelle :
//
//	POST https://api.whop.com/api/v1/memberships/{id}/cancel
//	Authorization: Bearer <WHOP_API_KEY>
//	{"cancellation_mode": "at_period_end"}
//
// (endpoint et permissions vérifiés sur docs.whop.com/api-reference/
// memberships/cancel-membership — scope requis : membership:cancel).
// L'accès reste actif jusqu'à la fin de la période déjà payée ;
// cancellation_mode="immediate" existe côté Whop mais couperait l'accès
// tout de suite, ce que la demande ne prévoit pas.
//
// Ne confirme JAMAIS le succès avant la réponse positive de Whop : sans
// ça, un client verrait "résilié" pendant que Whop continuerait à le
// prélever indéfiniment.
//
// ⚠️ NON BRANCHÉ EN L'ÉTAT : exige WHOP_API_KEY (clé de compte Whop,
// scope membership:cancel), absente de toute configuration accessible
// depuis ce dépôt. Reste à faire pour activer réellement ce bouton :
//  1. Dashboard Whop -> Developer -> API Keys -> créer une clé de compte
//     avec le scope membership:cancel (+ member:email:read,
//     member:basic:read, exigés par le même endpoint).
//  2. Poser cette clé sur Render, variable d'environnement WHOP_API_KEY.
// Tant que ce n'est pas fait, cette route répond 503 avec un message
// explicite plutôt que de simuler une résiliation qui n'aurait aucun
// effet réel sur la facturation.
func CancelSubscription(c *gin.Context) {
	userID := c.GetString("userID")

	sub, err := db.GetLatestSubscription(userID)
	if err != nil {
		fmt.Printf("[subscription] GetLatestSubscription(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load subscription"})
		return
	}
	if sub == nil || sub.WhopSubscriptionID == "" {
		c.JSON(http.StatusNotFound, gin.H{"error": "no active subscription"})
		return
	}
	if sub.CancelAtPeriodEnd {
		c.JSON(http.StatusOK, gin.H{"status": "already_canceled", "access_until": sub.CurrentPeriodEnd})
		return
	}

	apiKey := os.Getenv("WHOP_API_KEY")
	if apiKey == "" {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "cancellation is not connected yet: WHOP_API_KEY is not configured",
		})
		return
	}

	corps, _ := json.Marshal(map[string]string{"cancellation_mode": "at_period_end"})
	requete, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("https://api.whop.com/api/v1/memberships/%s/cancel", sub.WhopSubscriptionID),
		bytes.NewReader(corps),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to build cancellation request"})
		return
	}
	requete.Header.Set("Authorization", "Bearer "+apiKey)
	requete.Header.Set("Content-Type", "application/json")

	reponse, err := http.DefaultClient.Do(requete)
	if err != nil {
		fmt.Printf("[subscription] appel annulation Whop: %v\n", err)
		c.JSON(http.StatusBadGateway, gin.H{"error": "failed to reach payment provider"})
		return
	}
	defer reponse.Body.Close()
	corpsReponse, _ := io.ReadAll(reponse.Body)

	if reponse.StatusCode != http.StatusOK {
		fmt.Printf("[subscription] Whop a refusé l'annulation (%d): %s\n", reponse.StatusCode, corpsReponse)
		c.JSON(http.StatusBadGateway, gin.H{"error": "payment provider refused cancellation"})
		return
	}

	// Whop a confirmé : on marque la résiliation tout de suite pour que
	// l'écran de compte reflète le résultat sans attendre le webhook
	// membership.cancel_at_period_end_changed, qui la confirmera en
	// parallèle de façon asynchrone.
	if err := db.SetCancelAtPeriodEnd(sub.WhopSubscriptionID, true, nil); err != nil {
		fmt.Printf("[subscription] SetCancelAtPeriodEnd(%s): %v\n", sub.WhopSubscriptionID, err)
		// Whop a bien annulé côté facturation : on le dit quand même à
		// l'utilisateur plutôt que de lui laisser croire que rien ne
		// s'est passé alors que c'est déjà fait chez le payeur.
	}

	// ⚠️ NON BRANCHÉ : aucun envoi d'e-mail ici. Ce backend n'a aucune
	// intégration d'envoi de mail nulle part (vérifié : pas de SendGrid,
	// Postmark, SMTP, ni variable d'env de ce type dans tout le dépôt).
	// La consigne demande une confirmation par e-mail après résiliation ;
	// tant que ce n'est pas ajouté, le frontend n'affirme PAS qu'un e-mail
	// a été envoyé — seule la date de fin d'accès est confirmée à l'écran.
	// Pour brancher : choisir un fournisseur (Resend/SendGrid/Postmark),
	// poser sa clé API en variable d'environnement, et appeler son API ici
	// avec l'email de l'utilisateur + sub.CurrentPeriodEnd.

	c.JSON(http.StatusOK, gin.H{
		"status":       "canceled",
		"access_until": sub.CurrentPeriodEnd,
	})
}
