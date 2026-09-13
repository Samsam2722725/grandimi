package api

import (
	"fmt"
	"net/http"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* Les cinq reponses posees APRES le paiement, qui donnent au plan des
   heures reelles au lieu des « 10:00 PM » ecrits en dur pour tout le
   monde.

   Derriere session ET abonnement : l ecran n existe que pour quelqu un
   qui a paye, et ces reponses decrivent l emploi du temps d un mineur —
   elles ne sont ni publiques ni lisibles par un autre compte. Le
   `userID` vient du jeton de session, jamais du corps de la requete. */

var petitDejValides = map[string]bool{
	"toujours": true,
	"parfois":  true,
	"jamais":   true,
}

var difficultesValides = map[string]bool{
	"coucher":    true,
	"manger":     true,
	"bouger":     true,
	"regularite": true,
}

const minutesParJour = 24 * 60

type preferencesEntrantes struct {
	CoucherMin *int   `json:"coucher_min"`
	LeverMin   *int   `json:"lever_min"`
	PetitDej   string `json:"petit_dej"`
	JoursSport []int  `json:"jours_sport"`
	Difficulte string `json:"difficulte"`
}

// GetPreferencesPlan : lues au chargement du plan. `renseignees` a faux
// declenche l ecran d installation.
func GetPreferencesPlan(c *gin.Context) {
	userID := c.GetString("userID")

	prefs, err := db.LirePreferences(userID)
	if err != nil {
		fmt.Printf("[preferences] LirePreferences(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to read preferences"})
		return
	}

	c.JSON(http.StatusOK, prefs)
}

func EnregistrerPreferencesPlan(c *gin.Context) {
	userID := c.GetString("userID")

	var entree preferencesEntrantes
	if err := c.ShouldBindJSON(&entree); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "corps invalide"})
		return
	}

	/* Pointeurs plutot que valeurs : sans eux, un « 0 » envoye par le
	   client (minuit) serait indistinguable d un champ absent, et on
	   remplacerait une heure choisie par un defaut. */
	if entree.CoucherMin == nil || entree.LeverMin == nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "heures manquantes"})
		return
	}
	if *entree.CoucherMin < 0 || *entree.CoucherMin >= minutesParJour ||
		*entree.LeverMin < 0 || *entree.LeverMin >= minutesParJour {
		c.JSON(http.StatusBadRequest, gin.H{"error": "heures hors bornes"})
		return
	}
	if !petitDejValides[entree.PetitDej] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "reponse petit-dejeuner inconnue"})
		return
	}
	if !difficultesValides[entree.Difficulte] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "difficulte inconnue"})
		return
	}

	/* Les jours arrivent d un client : on les deduplique et on refuse ce
	   qui n est pas un jour de semaine, plutot que d ecrire n importe
	   quel entier dans un tableau qui sert ensuite a choisir des dates. */
	vus := map[int]bool{}
	jours := make([]int, 0, 7)
	for _, j := range entree.JoursSport {
		if j < 1 || j > 7 || vus[j] {
			continue
		}
		vus[j] = true
		jours = append(jours, j)
	}

	prefs := db.PreferencesPlan{
		CoucherMin: *entree.CoucherMin,
		LeverMin:   *entree.LeverMin,
		PetitDej:   entree.PetitDej,
		JoursSport: jours,
		Difficulte: entree.Difficulte,
	}

	if err := db.EnregistrerPreferences(userID, prefs); err != nil {
		fmt.Printf("[preferences] EnregistrerPreferences(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save preferences"})
		return
	}

	prefs.Renseignees = true
	c.JSON(http.StatusOK, prefs)
}
