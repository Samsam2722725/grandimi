package api

import (
	"fmt"
	"net/http"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

type ReclamationRequest struct {
	// L'identifiant que Whop met dans l'URL de retour :
	// grandimi.com/?payment_id=pay_XXXX
	PaymentID string `json:"payment_id"`
	// Le compte Grandimi qui doit recevoir l'accès — celui qui a fait le
	// questionnaire, connu du navigateur depuis la prédiction.
	UserID string `json:"user_id"`
}

/* ReclamerPaiement ouvre l'accès sur le compte qui a réellement acheté.

   LE PROBLÈME QU'ELLE RÈGLE. Le lien entre un paiement et un compte
   Grandimi reposait sur l'adresse e-mail : celle tapée sur la page Whop
   devait être identique à celle tapée dans le questionnaire. Whop laisse
   ce champ modifiable, et personne ne retape deux fois la même chose.

   Constaté en production le 12/09/2026 : deux comptes créés à la même
   minute — luc@gmail.com (tapé sur Whop, devenu premium) et oo@gmail.com
   (tapé sur Grandimi, resté gratuit). Le client avait payé et lisait
   « abonnement requis ». Trois fois de suite.

   Les métadonnées de l'URL de paiement ne pouvaient pas servir : le
   webhook les reçoit vides ("metadata":{}). C'est aussi pourquoi le
   parcours parent, qui repose dessus, n'a jamais pu fonctionner.

   Reste l'identifiant de paiement, présent des deux côtés : Whop le
   donne au client dans son URL de retour et nous l'envoie dans un
   webhook signé. Plus rien à retaper, donc plus rien à se tromper.

   PUBLIQUE ET SANS SESSION, par construction : à ce moment-là le client
   n'a pas encore de mot de passe — il vient de payer et n'a jamais eu de
   compte ouvert. C'est l'identifiant de paiement, connu du seul payeur
   et utilisable une seule fois, qui fait autorité. */
func ReclamerPaiement(c *gin.Context) {
	var req ReclamationRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}
	if req.PaymentID == "" || req.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "payment_id and user_id required"})
		return
	}
	if db.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}

	resultat, err := db.ReclamerPaiement(req.PaymentID, req.UserID)
	if err != nil {
		fmt.Printf("[paiement] ReclamerPaiement(%s, %s): %v\n", req.PaymentID, req.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to claim payment"})
		return
	}

	if resultat.Accorde {
		fmt.Printf("[paiement] %s rattaché au compte %s\n", req.PaymentID, req.UserID)
		c.JSON(http.StatusOK, gin.H{"status": "granted"})
		return
	}
	if resultat.DejaAuMemeCompte {
		// Le client a rechargé sa page : rien à refaire, tout va bien.
		c.JSON(http.StatusOK, gin.H{"status": "already_granted"})
		return
	}

	/* Rien accordé. Le cas le plus fréquent, et de loin, est que le
	   webhook Whop n'est pas encore arrivé : le client revient parfois
	   avant lui. Le frontend réessaie, donc on répond 202 et non une
	   erreur — ce n'est pas un échec, c'est un « pas encore ». */
	fmt.Printf("[paiement] %s non rattaché au compte %s : %s\n", req.PaymentID, req.UserID, resultat.Motif)
	c.JSON(http.StatusAccepted, gin.H{"status": "pending", "reason": resultat.Motif})
}
