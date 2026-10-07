package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"grandimi/internal/billing"
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
//
// Plan choisit l'offre ("monthly"/"annual"), jamais un montant : le prix
// réellement facturé est décidé par le plan Whop associé côté serveur.
// Vide = "monthly", pour ne pas casser un appel qui ne le fournirait pas.
type CheckoutRequest struct {
	Email       string `json:"email"`
	UserID      string `json:"user_id"`
	ChildUserID string `json:"child_user_id"`
	Plan        string `json:"plan"`
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
		// Le plan (pas le produit) dit quelle offre a été achetée :
		// c'est comparé à WHOP_PLAN_ID_MONTHLY/WHOP_PLAN_ID_ANNUAL pour
		// savoir si l'abonnement enregistré est mensuel ou annuel.
		Plan struct {
			ID string `json:"id"`
		} `json:"plan"`
		Status string `json:"status"`
		// Date du prochain prélèvement, fournie par Whop (ISO 8601).
		RenewalPeriodEnd string `json:"renewal_period_end"`
		// Lien hébergé par Whop pour gérer/résilier l'abonnement,
		// affiché tel quel dans "Mon compte".
		ManageURL string `json:"manage_url"`
		// Portés par membership.cancel_at_period_end_changed : synchronise
		// "Mon compte" que la résiliation vienne de notre bouton ou du
		// portail Whop lui-même.
		CancelAtPeriodEnd bool   `json:"cancel_at_period_end"`
		CanceledAt        string `json:"canceled_at"`
		// Renseigné quand le checkout a été ouvert depuis le lien de
		// partage parent : porte child_user_id. Typé en interface{} car
		// Whop peut renvoyer autre chose que des chaînes ; un
		// map[string]string ferait échouer tout le webhook sur une
		// valeur numérique.
		Metadata map[string]interface{} `json:"metadata"`
	} `json:"data"`
}

// resoudreTypePlan compare l'id de plan reçu du webhook aux deux plans
// Whop configurés. Un id inconnu (config pas encore posée, ou nouveau
// plan créé côté Whop sans mise à jour ici) retombe sur "monthly" plutôt
// que d'échouer le webhook : mieux vaut créditer un mauvais libellé de
// plan qu'un client qui a payé et reste sans accès.
func resoudreTypePlan(whopPlanID string) string {
	if whopPlanID != "" && whopPlanID == os.Getenv("WHOP_PLAN_ID_ANNUAL") {
		return string(billing.Annual)
	}
	return string(billing.Monthly)
}

// resoudrePeriodeFin lit renewal_period_end ; à défaut (champ absent
// selon la version d'API, ou format inattendu), calcule une date
// raisonnable à partir du plan résolu plutôt que de laisser la colonne
// vide — "Mon compte" doit toujours pouvoir afficher une date.
func resoudrePeriodeFin(renewalPeriodEnd, planType string) time.Time {
	if renewalPeriodEnd != "" {
		if t, err := time.Parse(time.RFC3339, renewalPeriodEnd); err == nil {
			return t
		}
	}
	if planType == string(billing.Annual) {
		return time.Now().AddDate(1, 0, 0)
	}
	return time.Now().AddDate(0, 1, 0)
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
/* resoudreBeneficiaire décide QUEL compte reçoit l'accès.

   Trois sources, dans cet ordre :

   1. child_user_id — un parent paie pour son enfant. C'est le
      compte de l'enfant qui doit être crédité, jamais celui du
      payeur. Prioritaire sur tout le reste.
   2. grandimi_user_id — le compte qui a lancé le paiement depuis
      le site. Posé par GetCheckout sur TOUS les paiements.
   3. l'e-mail du compte Whop — dernier recours seulement.

   Le point 2 manquait, et le point 3 servait donc de règle
   générale : l'accès partait vers l'adresse du compte Whop du
   payeur, qui n'est pas celle saisie sur Grandimi. Le client payait
   et se connectait sur un compte resté gratuit. */
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

	if id := metadataTexte(payload.Data.Metadata, "grandimi_user_id"); id != "" {
		acheteur, err := db.GetUserByID(id)
		if err == nil && acheteur != nil {
			return acheteur, nil
		}
		fmt.Printf("[whop] grandimi_user_id %q introuvable, repli sur l'email du compte Whop: %v\n", id, err)
	}

	/* Dernier recours. Cette adresse est celle du COMPTE WHOP, pas
	   celle saisie sur Grandimi : elle ne coïncide que par chance. On
	   la trace, parce qu'y arriver signifie qu'un paiement est passé
	   sans métadonnée — un achat fait hors de notre checkout, ou une
	   métadonnée perdue en route. */
	fmt.Printf("[whop] aucune métadonnée de compte sur %s : rattachement par l'e-mail du compte Whop\n", payload.Data.ID)
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

	// L'offre est choisie par clé ("monthly"/"annual"), jamais par
	// montant : un client ne peut obtenir qu'un des deux plans Whop
	// préconfigurés ici, jamais un prix arbitraire.
	cleOffre := req.Plan
	if cleOffre == "" {
		cleOffre = string(billing.Monthly)
	}
	offre, ok := billing.Get(cleOffre)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unknown plan"})
		return
	}

	// ID du PLAN Whop (pas du produit) : /checkout attend un
	// "plan_XXXX", qui est ce que l'API Whop renvoie dans purchase_url.
	// Y mettre un slug de produit rend une page d'erreur Whop, pas un
	// paiement — c'est ce qui se passait avec "text-aa".
	planID := os.Getenv(offre.WhopPlanIDEnv)
	if planID == "" {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": fmt.Sprintf("%s is not configured", offre.WhopPlanIDEnv),
		})
		return
	}

	/* L identifiant du compte Grandimi voyage avec le paiement.

	   Sans lui, le webhook ne disposait que de payload.Data.User.Email
	   — l adresse du COMPTE WHOP du payeur, qui n a aucune raison
	   d etre celle saisie dans le questionnaire. Un adolescent tape
	   son adresse perso sur Grandimi et paie depuis un compte Whop
	   ouvert avec une autre : le premium etait accorde au compte de
	   l adresse Whop, pendant qu il creait son mot de passe sur
	   l autre. Il payait, et voyait « abonnement requis ».

	   Le pire etant que rien ne ratait : le webhook repondait 200, la
	   base etait coherente, aucune erreur nulle part. Seul le client
	   voyait le probleme.

	   Constate deux fois en production le 12/09/2026 (13:39 et 13:53). */
	checkoutURL := fmt.Sprintf(
		"https://whop.com/checkout/%s?customer_email=%s&metadata[grandimi_user_id]=%s",
		planID,
		url.QueryEscape(req.Email),
		url.QueryEscape(user.ID),
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

	/* payment.succeeded : on note le paiement pour que le client puisse
	   le réclamer au retour.

	   C'est le seul identifiant partagé entre ce que Whop nous envoie
	   et ce que Whop donne au client : le même pay_XXXX se trouve dans
	   ce webhook et dans l'URL de retour. L'e-mail, lui, ne relie rien —
	   celui tapé sur la page Whop n'a aucune raison d'être celui tapé
	   sur Grandimi, et les métadonnées de l'URL de paiement arrivent
	   vides (vérifié sur trois paiements réels le 12/09/2026). */
	if payload.Type == "payment.succeeded" {
		if err := db.EnregistrerPaiement(payload.Data.ID, payload.Data.User.ID,
			payload.Data.Plan.ID, payload.Data.Status); err != nil {
			fmt.Printf("[whop] EnregistrerPaiement(%s): %v\n", payload.Data.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to record payment"})
			return
		}
		c.JSON(http.StatusOK, gin.H{"status": "received"})
		return
	}

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

		// Quel plan, jusqu'à quand, et où le gérer : sans ça "Mon compte"
		// n'aurait ni le libellé de l'offre ni la date du prochain
		// paiement à afficher. Une erreur ici ne doit pas faire échouer
		// le webhook — l'accès est déjà accordé au-dessus, le pire cas
		// est un "Mon compte" incomplet, pas un client débité sans accès.
		typePlan := resoudreTypePlan(payload.Data.Plan.ID)
		finPeriode := resoudrePeriodeFin(payload.Data.RenewalPeriodEnd, typePlan)
		if err := db.UpdateSubscriptionFromWebhook(payload.Data.ID, typePlan, finPeriode, payload.Data.ManageURL); err != nil {
			fmt.Printf("[whop] UpdateSubscriptionFromWebhook(%s): %v\n", payload.Data.ID, err)
		}

		c.JSON(http.StatusOK, gin.H{
			"status": "success",
			"user_id": user.ID,
			"message": "subscription activated",
		})
		return
	}

	// Synchronise la résiliation quel que soit son origine : notre bouton
	// "Résilier" (après confirmation de l'API Whop) ou le portail Whop
	// lui-même, que le client peut atteindre directement via manage_url.
	// Sans ce cas, un client résiliant depuis Whop verrait "Mon compte"
	// continuer à afficher un abonnement actif jusqu'à expiration réelle.
	if payload.Type == "membership.cancel_at_period_end_changed" {
		var canceledAt *time.Time
		if payload.Data.CanceledAt != "" {
			if t, err := time.Parse(time.RFC3339, payload.Data.CanceledAt); err == nil {
				canceledAt = &t
			}
		}
		if err := db.SetCancelAtPeriodEnd(payload.Data.ID, payload.Data.CancelAtPeriodEnd, canceledAt); err != nil {
			fmt.Printf("[whop] SetCancelAtPeriodEnd(%s): %v\n", payload.Data.ID, err)
		}
		c.JSON(http.StatusOK, gin.H{"status": "received"})
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

		/* On ne retire l'accès que si plus AUCUN abonnement n'est actif.

		   Ce cas retirait auparavant le premium sans regarder quel
		   abonnement venait d'être désactivé. Un client qui résilie puis
		   se réabonne déclenche les deux événements à quelques secondes
		   d'écart, dans un ordre que Whop ne garantit pas : la
		   désactivation de l'ancien arrivait après l'activation du
		   nouveau et annulait l'accès qu'il venait de payer.

		   Constaté en production le 12/09/2026 : résiliation 13:37:34,
		   nouvel achat 13:38:57, deux webhooks à 13:39:47 et 13:39:48,
		   puis 402 sur /api/v1/growth-plan pour quelqu'un qui venait de
		   payer. Le même piège attend tout paiement rejoué après un
		   échec de carte. */
		revoque, err := db.RevoquerSiPlusAucunAbonnement(user.ID, payload.Data.ID)
		if err != nil {
			fmt.Printf("[whop] RevoquerSiPlusAucunAbonnement(%s, %s): %v\n", user.ID, payload.Data.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke premium"})
			return
		}

		if !revoque {
			// Un autre abonnement reste actif : l'accès est conservé,
			// et on le dit dans les journaux pour que ce cas soit lisible
			// le jour où quelqu'un se demande pourquoi rien n'a bougé.
			fmt.Printf("[whop] %s désactivé pour le compte %s, mais un autre abonnement reste actif : accès conservé\n",
				payload.Data.ID, user.ID)
			c.JSON(http.StatusOK, gin.H{
				"status":  "success",
				"user_id": user.ID,
				"message": "membership deactivated, access kept (another subscription is active)",
			})
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

// GetCheckoutStatus dit si le dernier paiement de cette adresse était un
// paiement cadeau (pour le compte d'un enfant) plutôt qu'un paiement pour
// son propre compte. Le frontend l'appelle juste après le retour de Whop,
// avant de pousser qui que ce soit vers "Créez votre mot de passe" — un
// parent qui vient de payer pour son enfant ne doit surtout pas se
// retrouver avec un compte fantôme, non premium, ouvert à sa propre
// adresse pendant que l'accès a été appliqué ailleurs.
func GetCheckoutStatus(c *gin.Context) {
	email := c.Query("email")
	if email == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "email required"})
		return
	}

	childID, err := db.GetGiftChildID(email)
	if err != nil {
		fmt.Printf("[checkout-status] GetGiftChildID(%q): %v\n", email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"gift": childID != ""})
}

// GetChildStatus renvoie l'état premium/mot de passe d'un compte à partir
// de son seul id, sans authentification requise — volontairement, car
// c'est précisément ce qui permet à l'appareil de l'enfant de découvrir,
// une fois qu'un parent a payé depuis un autre appareil, qu'il peut
// maintenant créer son mot de passe et accéder à son plan.
func GetChildStatus(c *gin.Context) {
	id := c.Query("id")
	if id == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id required"})
		return
	}

	isPremium, hasPassword, err := db.GetPublicStatus(id)
	if err != nil {
		fmt.Printf("[child-status] GetPublicStatus(%q): %v\n", id, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to check status"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"is_premium": isPremium, "has_password": hasPassword})
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
		"user_id":            user.ID,
		"is_premium":         user.IsPremium,
		"subscription_month": moisAbonnement(user.CreatedAt),
	})
}

// Le plan livré dépend du mois d'abonnement en cours. Faute de date de
// souscription en base, on part de la création du compte : les deux
// coïncident pour un client qui paie dans la foulée de son estimation.
func moisAbonnement(creeLe string) int {
	debut, err := time.Parse(time.RFC3339, creeLe)
	if err != nil {
		return 1
	}

	mois := int(time.Since(debut).Hours()/(24*30)) + 1
	if mois < 1 {
		return 1
	}
	return mois
}
