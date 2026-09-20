package api

import (
	"net/http"
	"strconv"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* L'écran nutrition : quatre compteurs, un journal, un catalogue.

   Les quatre nutriments suivis sont ceux sur lesquels un adolescent
   occidental peut réellement avoir un écart qui compte : l'énergie (un
   déficit chronique arrête la croissance avant tout le reste), les
   protéines, le calcium et la vitamine D. Le zinc, le fer et l'iode
   comptent aussi — mais seulement en population carencée, et ils ne se
   suivent pas avec un journal déclaratif. Les ajouter donnerait une
   précision fictive. */

// GetNutritionJour renvoie le journal du jour, les totaux et les cibles.
func GetNutritionJour(c *gin.Context) {
	jour, ok := jourDemande(c, "jour")
	if !ok {
		return
	}
	userID := c.GetString("userID")

	repas, err := db.RepasDuJour(userID, jour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture du journal impossible"})
		return
	}

	objectifs, err := db.ObjectifsDuCompte(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture des objectifs impossible"})
		return
	}

	/* Les totaux sont calculés ICI, pas côté écran.

	   Additionner quatre colonnes sur huit lignes est trivial des deux
	   côtés ; ce qui ne l'est pas, c'est d'avoir deux additions qui
	   doivent donner le même résultat. Le jour où l'on ajoutera un
	   nutriment, il n'y aura qu'un endroit à changer. */
	var kcal, prot, ca, vd float64
	for _, r := range repas {
		kcal += r.Kcal
		prot += r.Proteines
		ca += r.Calcium
		vd += r.VitD
	}

	c.JSON(http.StatusOK, gin.H{
		"jour":  jour,
		"repas": repas,
		"totaux": gin.H{
			"kcal": kcal, "proteines_g": prot, "calcium_mg": ca, "vit_d_ui": vd,
		},
		"objectifs": objectifs,
	})
}

// GetAliments cherche dans le catalogue.
func GetAliments(c *gin.Context) {
	q := c.Query("q")
	limite, _ := strconv.Atoi(c.Query("limite"))

	liste, err := db.ChercherAliments(q, limite)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "recherche impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"aliments": liste})
}

type RequeteRepas struct {
	Slug      string  `json:"slug" binding:"required"`
	QuantiteG float64 `json:"quantite_g" binding:"required,gt=0,lte=3000"`
	Moment    string  `json:"moment"`
	Jour      string  `json:"jour"`
}

var momentsValides = map[string]bool{
	"petit-dej": true, "dejeuner": true, "gouter": true, "diner": true, "autre": true,
}

// PostRepas ajoute une portion au journal.
func PostRepas(c *gin.Context) {
	var req RequeteRepas
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	jour := req.Jour
	if jour == "" {
		jour = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", jour); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jour invalide"})
		return
	}

	/* Un moment inconnu retombe sur « autre » plutôt que de faire échouer
	   la saisie. La contrainte CHECK en base refuserait la ligne, et
	   l'utilisateur perdrait ce qu'il vient de taper pour une étiquette
	   qui n'a aucune importance dans le calcul. */
	moment := req.Moment
	if !momentsValides[moment] {
		moment = "autre"
	}

	r, err := db.AjouterRepas(c.GetString("userID"), jour, moment, req.Slug, req.QuantiteG)
	if err != nil {
		if err.Error() == "aliment inconnu" {
			c.JSON(http.StatusNotFound, gin.H{"error": "aliment inconnu"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, r)
}

// DeleteRepas retire une ligne du journal.
func DeleteRepas(c *gin.Context) {
	if err := db.SupprimerRepas(c.GetString("userID"), c.Param("id")); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "suppression impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"supprime": true})
}

// PutObjectifs remplace les cibles par celles choisies à la main.
//
// Les bornes sont celles des contraintes CHECK de la table : les refuser
// ici donne un message utile, plutôt qu'une erreur Postgres remontée
// telle quelle.
func PutObjectifs(c *gin.Context) {
	var o db.Objectifs
	if err := c.ShouldBindJSON(&o); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	switch {
	case o.Kcal < 800 || o.Kcal > 6000:
		c.JSON(http.StatusBadRequest, gin.H{"error": "objectif calorique hors plage (800-6000)"})
		return
	case o.Proteines < 10 || o.Proteines > 300:
		c.JSON(http.StatusBadRequest, gin.H{"error": "objectif protéines hors plage (10-300 g)"})
		return
	case o.Calcium < 200 || o.Calcium > 3000:
		c.JSON(http.StatusBadRequest, gin.H{"error": "objectif calcium hors plage (200-3000 mg)"})
		return
	case o.VitD < 0 || o.VitD > 4000:
		/* 4000 UI est le plafond de sécurité, pas une borne arbitraire :
		   au-delà, la supplémentation devient un risque et non un
		   bénéfice. Laisser quelqu'un se fixer 10 000 UI comme objectif
		   quotidien, c'est l'inviter à le dépasser. */
		c.JSON(http.StatusBadRequest, gin.H{"error": "objectif vitamine D hors plage (0-4000 UI)"})
		return
	}

	if err := db.EnregistrerObjectifs(c.GetString("userID"), o); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, o)
}
