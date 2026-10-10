package api

import (
	"crypto/hmac"
	"net/http"
	"os"
	"strconv"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* Lire les chiffres sans pouvoir rien changer.

   ADMIN_TOKEN ouvre aussi des actions (donner ou retirer le premium,
   supprimer un compte). Pour l analyse, il faut seulement lire : ce
   groupe /api/stats est garde par un second secret, STATS_TOKEN, qui
   n ouvre que des GET. S il fuit, on ne peut que regarder des
   compteurs, et on le remplace sur Render sans toucher a l admin.

   Sans STATS_TOKEN pose sur Render, tout le groupe repond 401 : il
   n est jamais ouvert par defaut. */
func StatsAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		attendu := os.Getenv("STATS_TOKEN")
		recu := c.GetHeader("Authorization")
		if attendu == "" || !hmac.Equal([]byte(recu), []byte("Bearer "+attendu)) {
			c.JSON(http.StatusUnauthorized, gin.H{"erreur": "code de lecture absent ou faux"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func lireJours(c *gin.Context, defaut int) int {
	jours, err := strconv.Atoi(c.DefaultQuery("jours", strconv.Itoa(defaut)))
	if err != nil || jours < 1 {
		return defaut
	}
	if jours > 365 {
		return 365
	}
	return jours
}

// StatsParJour : le tunnel jour par jour, pour comparer avant / apres.
func StatsParJour(c *gin.Context) {
	lignes, err := db.LireTunnelParJour(lireJours(c, 14))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erreur": "lecture impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"jours": lignes})
}

// StatsVentes : les paiements recus par Whop.
func StatsVentes(c *gin.Context) {
	ventes, err := db.LireVentes(lireJours(c, 30))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"erreur": "lecture impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"ventes": ventes})
}
