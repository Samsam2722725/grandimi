package api

import (
	"errors"
	"net/http"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

// GetSemaineSommeil renvoie les sept jours du graphe, ceux sans saisie
// compris — c'est l'écran qui décide comment les dessiner, et il ne peut
// le faire que s'il sait lesquels manquent.
func GetSemaineSommeil(c *gin.Context) {
	debut, ok := jourDemande(c, "debut")
	if !ok {
		return
	}

	nuits, err := db.SemaineSommeil(c.GetString("userID"), debut)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture du sommeil impossible"})
		return
	}

	score, note := db.ScoreSommeil(nuits)
	c.JSON(http.StatusOK, gin.H{
		"debut":      debut,
		"nuits":      nuits,
		"objectif":   db.ObjectifSommeilH,
		"score":      score,
		"score_note": note,
	})
}

type RequeteSommeil struct {
	/* Pas de contraintes `binding` sur les bornes, volontairement.

	   Le validateur de gin rend son propre message quand elles
	   échouent : « Key: 'RequeteSommeil.Heures' Error:Field validation
	   for 'Heures' failed on the 'lt' tag ». C'est de l'anglais, c'est
	   illisible, et cela remonte tel quel jusqu'à l'écran d'un
	   adolescent français. Les bornes sont vérifiées plus bas, avec un
	   message écrit pour être lu. */
	Heures float64 `json:"heures"`
	Jour   string  `json:"jour"`
}

// PostSommeil note ou corrige les heures d'une nuit.
func PostSommeil(c *gin.Context) {
	var req RequeteSommeil
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "requête illisible"})
		return
	}

	if req.Heures <= 0 || req.Heures >= 24 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":  "heures_invalides",
			"detail": "Une nuit se situe entre 0 et 24 heures.",
		})
		return
	}

	jour := req.Jour
	if jour == "" {
		jour = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", jour); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jour invalide"})
		return
	}

	err := db.EnregistrerNuit(c.GetString("userID"), jour, req.Heures)
	if errors.Is(err, db.ErrHeuresInvalides) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "durée de nuit invalide"})
		return
	}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"jour": jour, "heures": req.Heures})
}

// DeleteSommeil efface la saisie d'une nuit.
func DeleteSommeil(c *gin.Context) {
	jour, ok := jourDemande(c, "jour")
	if !ok {
		return
	}
	if err := db.SupprimerNuit(c.GetString("userID"), jour); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "suppression impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"supprime": true, "jour": jour})
}
