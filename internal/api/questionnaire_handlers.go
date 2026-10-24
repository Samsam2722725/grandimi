package api

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* Les reponses du questionnaire suivent le compte d'un telephone a
   l'autre. Sans elles, un abonne qui se reconnectait ailleurs retrouvait
   un plan generique (« Tu as de bonnes bases ») au lieu du sien.

   Une table absente (migration 011 pas encore collee dans Supabase) ne
   casse rien : la lecture rend « rien », l'ecriture echoue en silence
   cote site, et le plan reste ce qu'il etait avant. */

// Un questionnaire complet pese environ 2 ko : 32 ko laisse de la marge
// sans accepter n'importe quoi.
const tailleMaxQuestionnaire = 32 << 10

func LireQuestionnaire(c *gin.Context) {
	userID := c.GetString("userID")
	donnees, err := db.LireReponsesQuestionnaire(userID)
	if err != nil {
		fmt.Printf("[questionnaire] lecture %s : %v\n", userID, err)
		donnees = nil
	}
	if donnees == nil {
		c.JSON(http.StatusOK, gin.H{"donnees": nil})
		return
	}
	c.JSON(http.StatusOK, gin.H{"donnees": donnees})
}

func EnregistrerQuestionnaire(c *gin.Context) {
	userID := c.GetString("userID")

	corps, err := io.ReadAll(http.MaxBytesReader(c.Writer, c.Request.Body, tailleMaxQuestionnaire))
	if err != nil {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": "réponses trop volumineuses"})
		return
	}
	var entree struct {
		Donnees json.RawMessage `json:"donnees"`
	}
	if err := json.Unmarshal(corps, &entree); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "corps invalide"})
		return
	}
	// Un objet, rien d'autre : c'est ce que le site relira.
	var objet map[string]interface{}
	if err := json.Unmarshal(entree.Donnees, &objet); err != nil || objet == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "réponses invalides"})
		return
	}

	if err := db.EnregistrerReponsesQuestionnaire(userID, entree.Donnees); err != nil {
		fmt.Printf("[questionnaire] ecriture %s : %v\n", userID, err)
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok"})
}
