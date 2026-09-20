package api

import (
	"grandimi/internal/db"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
)

type enregistrerMesureRequest struct {
	TailleCM float64 `json:"taille_cm" binding:"required,gt=80,lt=230"`
	// Facultatif : par defaut aujourd hui. Permet de rattraper une mesure
	// notee sur un carnet il y a quelques jours.
	MesureeLe string `json:"mesuree_le"`
}

/* EnregistrerMesure enregistre une mesure de taille.

   Derriere authentification et non derriere abonnement : la relance a
   J+30 promet une mise a jour gratuite de l estimation, et c est la
   collecte elle-meme qui a de la valeur. Un non-abonne qui revient se
   mesurer chaque mois construit la donnee que ce produit est le seul a
   pouvoir accumuler. */
func EnregistrerMesure(c *gin.Context) {
	var req enregistrerMesureRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messageDeValidation(err)})
		return
	}

	date := req.MesureeLe
	if date == "" {
		date = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", date); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "la date de mesure doit être au format AAAA-MM-JJ"})
		return
	}

	/* Une date dans le futur est une faute de saisie. On refuse plutot
	   que d enregistrer : elle deviendrait la « derniere » mesure et
	   fausserait la vitesse pour tous les calculs suivants. */
	if date > time.Now().Format("2006-01-02") {
		c.JSON(http.StatusBadRequest, gin.H{"error": "la date de mesure ne peut pas être dans le futur"})
		return
	}

	userID := c.GetString("userID")
	if err := db.EnregistrerMesure(userID, date, req.TailleCM); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "echec de l enregistrement"})
		return
	}

	repondreAvecLeSuivi(c, userID)
}

// ListerMesures rend l historique et la vitesse observee.
func ListerMesures(c *gin.Context) {
	repondreAvecLeSuivi(c, c.GetString("userID"))
}

/* repondreAvecLeSuivi sert les deux routes avec la meme forme.

   Apres un enregistrement, le front a besoin de la serie mise a jour
   pour redessiner la courbe : la lui renvoyer evite un aller-retour, et
   surtout evite que les deux ecrans divergent le jour ou l un des deux
   oublie de recharger. */
func repondreAvecLeSuivi(c *gin.Context, userID string) {
	mesures, err := db.ListerMesures(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "echec de la lecture"})
		return
	}

	reponse := gin.H{"mesures": mesures, "nombre": len(mesures)}

	/* La vitesse n est publiee que lorsqu elle veut dire quelque chose :
	   deux mesures au moins, et trois mois au moins entre elles. Sinon
	   on n envoie pas un champ a zero, qui se lirait comme « croissance
	   nulle » — on ne l envoie pas du tout. */
	if vitesse, mois, ok := db.VitesseDepuisMesures(mesures); ok {
		reponse["vitesse_mesuree_cm_par_an"] = vitesse
		reponse["mois_observes"] = mois
	}

	c.JSON(http.StatusOK, reponse)
}
