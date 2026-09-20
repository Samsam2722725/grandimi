package api

import (
	"net/http"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* L'onglet Grandir : la séance du jour et le bandeau de sept jours.

   Le jour est TOUJOURS celui du client, jamais celui du serveur. Un
   serveur en UTC change de date à 2 h du matin l'été en France : la
   séance du soir basculerait sur le lendemain, et la journée
   s'afficherait vide alors qu'elle vient d'être faite. */
func jourDemande(c *gin.Context, cle string) (string, bool) {
	j := c.Query(cle)
	if j == "" {
		return time.Now().Format("2006-01-02"), true
	}
	if _, err := time.Parse("2006-01-02", j); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jour invalide"})
		return "", false
	}
	return j, true
}

// GetSeanceDuJour renvoie les six exercices du jour et leur état.
func GetSeanceDuJour(c *gin.Context) {
	jour, ok := jourDemande(c, "jour")
	if !ok {
		return
	}

	seance, err := db.SeanceDuJour(c.GetString("userID"), jour)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture de la seance impossible"})
		return
	}

	faits, duree := 0, 0
	for _, e := range seance {
		duree += e.DureeSec
		if e.Fait {
			faits++
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"jour":            jour,
		"exercices":       seance,
		"total":           len(seance),
		"faits":           faits,
		"duree_total_sec": duree,
	})
}

type RequeteValidation struct {
	// Plusieurs slugs d'un coup : une séance se termine d'un bloc. Six
	// appels séparés, c'est six occasions qu'un seul échoue et laisse la
	// journée à 5 sur 6 sans que personne ne sache lequel manque.
	Slugs []string `json:"slugs" binding:"required,min=1,max=20"`
	Jour  string   `json:"jour"`
}

// ValiderSeance coche les exercices terminés.
func ValiderSeance(c *gin.Context) {
	var req RequeteValidation
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

	userID := c.GetString("userID")
	if err := db.ValiderExercices(userID, jour, req.Slugs); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}

	/* On renvoie la séance relue, pas un simple « ok ».
	   L'écran de fin affiche le compte du jour ; le lui faire recalculer
	   à partir de ce qu'il croit avoir envoyé, c'est lui faire afficher
	   son intention plutôt que ce qui est enregistré. */
	seance, err := db.SeanceDuJour(userID, jour)
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"jour": jour, "enregistre": len(req.Slugs)})
		return
	}

	faits := 0
	for _, e := range seance {
		if e.Fait {
			faits++
		}
	}
	c.JSON(http.StatusOK, gin.H{"jour": jour, "faits": faits, "total": len(seance)})
}

// BasculerExercice coche ou décoche un exercice isolé.
func BasculerExercice(c *gin.Context) {
	var req struct {
		Slug string `json:"slug" binding:"required"`
		Jour string `json:"jour"`
	}
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

	fait, err := db.BasculerExercice(c.GetString("userID"), jour, req.Slug)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"slug": req.Slug, "jour": jour, "fait": fait})
}

// GetSemaineSeances renvoie les sept jours du bandeau.
//
// `debut` est le premier jour affiché, envoyé par le client : c'est lui
// qui décide si sa semaine commence aujourd'hui ou six jours plus tôt.
func GetSemaineSeances(c *gin.Context) {
	debut, ok := jourDemande(c, "debut")
	if !ok {
		return
	}

	semaine, err := db.SemaineSeances(c.GetString("userID"), debut)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture de la semaine impossible"})
		return
	}
	c.JSON(http.StatusOK, gin.H{"debut": debut, "jours": semaine})
}
