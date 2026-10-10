package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"net/http"
	"strings"
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

   Deux facons d ouvrir le groupe :
   - STATS_TOKEN pose sur Render (comparaison directe) ;
   - ou un code dont l empreinte SHA-256 est ecrite ci-dessous. Le code
     lui-meme n est que dans le .env local (scripts/stats.mjs) ; son
     empreinte ne permet pas de le retrouver (256 bits aleatoires), elle
     peut donc vivre dans le depot. Pour changer de code : generer un
     nouveau STATS_TOKEN dans le .env et remplacer l empreinte. */
const empreinteCodeLecture = "3d6d7dfdc67f756c60ba590f97aa58f29a51fbb043d7d9eb6c23438eb6f514a6"

func codeLectureValide(entete string) bool {
	if attendu := os.Getenv("STATS_TOKEN"); attendu != "" &&
		hmac.Equal([]byte(entete), []byte("Bearer "+attendu)) {
		return true
	}
	code, ok := strings.CutPrefix(entete, "Bearer ")
	if !ok || code == "" {
		return false
	}
	somme := sha256.Sum256([]byte(code))
	return hmac.Equal([]byte(hex.EncodeToString(somme[:])), []byte(empreinteCodeLecture))
}

func StatsAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if !codeLectureValide(c.GetHeader("Authorization")) {
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
