package api

import (
	"errors"
	"net/http"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* L'accueil de l'application connectée.

   Un seul appel sert tout l'écran. Trois appels séparés (mesure, série,
   piliers) auraient donné trois écrans d'attente décalés sur l'écran
   qu'on ouvre le plus souvent, et trois occasions d'en rater un. */

// Segment est une part de l'anneau. `Suivi` dit si le pilier est
// réellement mesuré aujourd'hui.
//
// C'est la distinction qui compte, et c'est celle que le concurrent ne
// fait pas : afficher 0 % pour la nutrition alors qu'aucun écran ne
// permet encore de noter un repas, c'est annoncer un échec à quelqu'un
// qui n'avait aucun moyen de réussir. Un pilier non suivi se dessine en
// creux, pas à zéro.
type Segment struct {
	Cle     string `json:"cle"`
	Libelle string `json:"libelle"`
	Pct     int    `json:"pct"`
	Suivi   bool   `json:"suivi"`
}

type Intervalle struct {
	MinCm float64 `json:"min_cm"`
	MaxCm float64 `json:"max_cm"`
}

type ReponseDashboard struct {
	DerniereMesure *db.Mesure `json:"derniere_mesure"`

	// Verrouille vaut true tant que les sept jours ne sont pas écoulés.
	// C'est un verrou de TEMPS, pas d'abonnement : cette route est déjà
	// derrière PremiumMiddleware.
	Verrouille bool `json:"verrouille"`

	// Secondes restantes avant la prochaine mesure. Le serveur envoie une
	// DURÉE, pas une date butoir : l'horloge d'un téléphone peut être
	// décalée de plusieurs minutes, et un compte à rebours calculé sur une
	// date absolue afficherait alors un temps faux, parfois négatif.
	SecondesAvantMesure int64 `json:"secondes_avant_mesure"`

	Serie       db.Serie  `json:"serie"`
	Segments    []Segment `json:"segments"`
	Progression int       `json:"progression_pct"`
}

/* Les six piliers de l'anneau, dans l'ordre d'affichage.

   Trois sont alimentés aujourd'hui. Les trois autres sont déclarés ici
   pour que l'anneau ait sa forme définitive dès maintenant : un anneau
   qui passe de trois à six parts entre deux versions se lit comme un
   changement de score, pas comme un ajout de fonctionnalité. */
var piliers = []struct {
	Cle     string
	Libelle string
	Suivi   bool
}{
	{"regularite", "Régularité", true},   // connexions
	{"exercice", "Exercices", true},      // task_completions
	{"mesures", "Suivi de taille", true}, // height_logs
	{"sommeil", "Sommeil", false},        // étape 5
	{"nutrition", "Nutrition", false},    // étape 4
	{"posture", "Posture", false},        // étape 3
}

// GetDashboard sert l'onglet Accueil.
func GetDashboard(c *gin.Context) {
	userID := c.GetString("userID")

	/* Le jour est celui du CLIENT, pas du serveur.
	   Un serveur en UTC change de date à 2 h du matin l'été en France :
	   quelqu'un qui ouvre l'application à 0 h 30 verrait sa série
	   comptée sur la veille, et la perdrait le lendemain. Le client
	   envoie son jour local ; on retombe sur l'heure serveur s'il ne
	   l'envoie pas. */
	aujourdhui := c.Query("jour")
	if aujourdhui == "" {
		aujourdhui = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", aujourdhui); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jour invalide"})
		return
	}

	/* Ouvrir l'accueil EST la connexion du jour. Pas de bouton à
	   presser : une série qui demande une action pour être maintenue
	   mesure l'action, pas la régularité. Une panne d'écriture ici ne
	   doit pas empêcher l'écran de s'afficher. */
	_ = db.EnregistrerConnexion(userID, aujourdhui)

	serie, err := db.CalculerSerie(userID, aujourdhui)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture de la serie impossible"})
		return
	}

	derniere, err := db.DerniereMesure(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture des mesures impossible"})
		return
	}

	verrouille, restant := etatDuVerrou(derniere, aujourdhui)

	historique, err := db.GetHistory(userID, 7)
	if err != nil {
		// L'historique ne sert qu'à noter un pilier : son absence ne doit
		// pas emporter tout l'écran d'accueil.
		historique = nil
	}

	segments := construireSegments(serie, historique, derniere)

	c.JSON(http.StatusOK, ReponseDashboard{
		DerniereMesure:      derniere,
		Verrouille:          verrouille,
		SecondesAvantMesure: restant,
		Serie:               serie,
		Segments:            segments,
		Progression:         progression(segments),
	})
}

// etatDuVerrou dit si une nouvelle mesure est permise, et dans combien de
// temps sinon. Sans aucune mesure, rien n'est verrouillé : le premier
// geste ne doit jamais attendre.
func etatDuVerrou(derniere *db.Mesure, aujourdhui string) (bool, int64) {
	if derniere == nil {
		return false, 0
	}
	precedente, err := time.Parse("2006-01-02", derniere.Date)
	if err != nil {
		return false, 0
	}
	ref, err := time.Parse("2006-01-02", aujourdhui)
	if err != nil {
		return false, 0
	}

	ouverture := precedente.AddDate(0, 0, db.JoursEntreMesures)
	if !ref.Before(ouverture) {
		return false, 0
	}
	return true, int64(ouverture.Sub(ref).Seconds())
}

// construireSegments note les trois piliers alimentés et laisse les trois
// autres en creux.
func construireSegments(serie db.Serie, historique []db.JourHistorique, derniere *db.Mesure) []Segment {
	// Régularité : jours d'ouverture sur les sept derniers.
	regularite := len(serie.Jours) * 100 / 7

	// Exercices : jours des sept derniers où au moins une tâche a été
	// cochée. Volontairement grossier — le nombre de tâches d'une journée
	// dépend du plan du mois, donc un pourcentage de tâches ferait bouger
	// le score quand c'est le plan qui change, pas l'effort.
	joursActifs := 0
	for _, j := range historique {
		if j.NbFaites > 0 {
			joursActifs++
		}
	}
	exercice := joursActifs * 100 / 7

	/* Suivi de taille : binaire, et c'est voulu. Soit la mesure de la
	   semaine est faite, soit elle ne l'est pas ; il n'y a pas de
	   « à moitié mesuré ». Au-delà de sept jours, le pilier retombe. */
	mesures := 0
	if derniere != nil {
		mesures = 100
	}

	valeurs := map[string]int{
		"regularite": regularite,
		"exercice":   exercice,
		"mesures":    mesures,
	}

	out := make([]Segment, 0, len(piliers))
	for _, p := range piliers {
		out = append(out, Segment{
			Cle:     p.Cle,
			Libelle: p.Libelle,
			Pct:     valeurs[p.Cle], // 0 pour les piliers non suivis
			Suivi:   p.Suivi,
		})
	}
	return out
}

// progression est la moyenne des SEULS piliers suivis.
//
// Diviser par six alors que trois piliers ne sont pas mesurables
// plafonnerait tout le monde à 50 %, quoi qu'il fasse. Le chiffre
// remonterait tout seul aux étapes 3 à 5, sans que personne n'ait rien
// fait — un score qui bouge sans effort n'est plus un score.
func progression(segments []Segment) int {
	total, n := 0, 0
	for _, s := range segments {
		if s.Suivi {
			total += s.Pct
			n++
		}
	}
	if n == 0 {
		return 0
	}
	return total / n
}

// ============================================================
//  ENREGISTRER UNE MESURE
// ============================================================

type RequeteMesure struct {
	// Les trois relevés de la séance. On transmet les TROIS, pas leur
	// médiane : c'est le serveur qui décide, et leur dispersion est la
	// seule façon de savoir si la séance vaut quelque chose.
	Mesures []float64 `json:"mesures" binding:"required,min=1,max=5"`
	Moment  string    `json:"moment"`
	Jour    string    `json:"jour"`
}

// AjouterMesure enregistre la séance de mesure de la semaine.
func AjouterMesure(c *gin.Context) {
	userID := c.GetString("userID")

	var req RequeteMesure
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	jour := req.Jour
	if jour == "" {
		jour = time.Now().Format("2006-01-02")
	}
	moment := req.Moment
	if moment != "matin" && moment != "soir" {
		moment = "inconnu"
	}

	for _, v := range req.Mesures {
		if v <= 50 || v >= 260 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "taille hors plage plausible"})
			return
		}
	}

	mediane, err := db.AjouterMesure(userID, req.Mesures, moment, jour)
	switch {
	case errors.Is(err, db.ErrMesureTropTot):
		/* 409 et non 400 : la requête est bien formée, c'est l'état du
		   compte qui la refuse. Le front doit pouvoir distinguer « tu as
		   mal saisi » de « reviens dans trois jours ». */
		c.JSON(http.StatusConflict, gin.H{
			"error":  "mesure_trop_tot",
			"detail": "La prochaine mesure s'ouvre sept jours après la précédente.",
		})
		return
	case errors.Is(err, db.ErrMesuresDispersees):
		c.JSON(http.StatusUnprocessableEntity, gin.H{
			"error":  "mesures_dispersees",
			"detail": "Tes trois mesures s'écartent de plus d'un centimètre. Recommence : talons contre le mur, regard droit devant.",
		})
		return
	case err != nil:
		c.JSON(http.StatusInternalServerError, gin.H{"error": "enregistrement impossible"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"taille_cm": mediane, "jour": jour, "moment": moment})
}
