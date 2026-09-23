package api

import (
	"net/http"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

// GetCommunaute renvoie le fil et le nombre de non-lus.
func GetCommunaute(c *gin.Context) {
	userID := c.GetString("userID")

	pubs, err := db.Publications(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture du fil impossible"})
		return
	}

	nonLus := 0
	for _, p := range pubs {
		if !p.Lu {
			nonLus++
		}
	}
	c.JSON(http.StatusOK, gin.H{"publications": pubs, "non_lus": nonLus})
}

// GetNonLus ne renvoie qu'un compteur.
//
// Route séparée parce que la pastille de la barre d'onglets est demandée
// depuis TOUS les écrans : charger le corps de huit articles pour
// afficher un chiffre serait absurde.
func GetNonLus(c *gin.Context) {
	n, err := db.NonLus(c.GetString("userID"))
	if err != nil {
		// Une pastille illisible n'est pas une panne d'écran : on rend
		// zéro plutôt qu'une erreur qui ferait échouer la barre entière.
		c.JSON(http.StatusOK, gin.H{"non_lus": 0})
		return
	}
	c.JSON(http.StatusOK, gin.H{"non_lus": n})
}

// PostLues marque des publications comme lues.
func PostLues(c *gin.Context) {
	var req struct {
		IDs []string `json:"ids" binding:"required,min=1,max=100"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "requête illisible"})
		return
	}

	if err := db.MarquerLues(c.GetString("userID"), req.IDs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"marquees": len(req.IDs)})
}
