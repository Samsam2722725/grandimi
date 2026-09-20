package api

import (
	"net/http"
	"sort"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* L'onglet Aperçus : d'où l'on vient.

   L'accueil montre où l'on en est, Grandir sert à agir, ici on regarde
   la trajectoire. Deux choses seulement, parce que deux choses suffisent
   et que le reste serait du remplissage : la courbe des mesures, et le
   pilier sur lequel il reste le plus à gagner. */

// PilierClasse est un pilier avec l'action qui le fait monter.
type PilierClasse struct {
	Cle     string `json:"cle"`
	Libelle string `json:"libelle"`
	Pct     int    `json:"pct"`
	Suivi   bool   `json:"suivi"`
	Action  string `json:"action"`
}

/*
L'action attachée à chaque pilier.

	Une phrase, à l'impératif, exécutable aujourd'hui. « Améliore ton
	sommeil » n'est pas une action : c'est le nom du problème répété.

	Ce que ces phrases n'affirment PAS, et c'est délibéré : aucune ne
	promet de centimètres. La seule qui parle de taille est celle de la
	posture, parce que c'est le seul levier de la liste dont l'effet sur
	la taille MESURÉE est réel et vérifiable par l'utilisateur.
*/
var actions = map[string]string{
	"regularite": "Ouvre l’application chaque jour, même sans rien cocher : c’est la régularité qui fait le reste.",
	"exercice":   "Fais la séance du jour — cinq minutes trente, et elle compte pour la journée entière.",
	"mesures":    "Prends ta mesure de la semaine : sans elle, ni courbe ni vitesse de croissance.",
	"sommeil":    "Vise la plage des 8 à 10 heures. C’est la privation durable qui freine, pas l’heure manquante d’un soir.",
	"nutrition":  "Note tes repas : l’écart le plus fréquent à cet âge est un apport de protéines trop bas, et il ne se voit pas sans journal.",
	"posture":    "Les anges au mur sont l’exercice le plus utile de la liste : ils récupèrent des centimètres de taille mesurée si tu es voûté.",
}

type ReponseApercus struct {
	Mesures []db.PointTaille `json:"mesures"`
	Vitesse db.Vitesse       `json:"vitesse"`
	Piliers []PilierClasse   `json:"piliers"`
}

// GetApercus sert l'onglet Aperçus.
func GetApercus(c *gin.Context) {
	userID := c.GetString("userID")

	aujourdhui := c.Query("jour")
	if aujourdhui == "" {
		aujourdhui = time.Now().Format("2006-01-02")
	} else if _, err := time.Parse("2006-01-02", aujourdhui); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "jour invalide"})
		return
	}

	mesures, err := db.HistoriqueTaille(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture des mesures impossible"})
		return
	}

	/* Les piliers sont recalculés par le MÊME code que l'accueil.

	   Deux calculs séparés qui doivent donner le même pourcentage
	   finissent par diverger, et l'utilisateur verrait 71 % sur un écran
	   et 68 % sur l'autre sans savoir lequel croire. */
	piliers, err := piliersDuCompte(userID, aujourdhui)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "lecture des piliers impossible"})
		return
	}

	c.JSON(http.StatusOK, ReponseApercus{
		Mesures: mesures,
		Vitesse: db.CalculerVitesse(mesures),
		Piliers: piliers,
	})
}

// piliersDuCompte reconstruit les segments de l'accueil et les classe du
// plus faible au plus fort.
//
// Du plus faible d'abord, et c'est le sens de l'écran : ce qui est déjà
// à 100 % n'apprend rien, ce qui traîne à 14 % dit où passer la semaine.
// Les piliers non suivis sont rejetés en fin de liste — ils ne sont pas
// « les plus faibles », ils sont inconnus.
func piliersDuCompte(userID, aujourdhui string) ([]PilierClasse, error) {
	serie, err := db.CalculerSerie(userID, aujourdhui)
	if err != nil {
		return nil, err
	}
	derniere, err := db.DerniereMesure(userID)
	if err != nil {
		return nil, err
	}

	historique, err := db.GetHistory(userID, 7)
	if err != nil {
		historique = nil
	}

	debut := aujourdhui
	if d, err := time.Parse("2006-01-02", aujourdhui); err == nil {
		debut = d.AddDate(0, 0, -6).Format("2006-01-02")
	}
	nuits, err := db.SemaineSommeil(userID, debut)
	if err != nil {
		nuits = nil
	}

	nutriPct, nutriNote := db.ScoreNutrition7j(userID, debut, aujourdhui)
	postPct, postNote := db.ScorePosture7j(userID, debut, aujourdhui)

	segments := construireSegments(serie, historique, derniere, nuits,
		nutriPct, nutriNote, postPct, postNote)

	out := make([]PilierClasse, 0, len(segments))
	for _, s := range segments {
		out = append(out, PilierClasse{
			Cle: s.Cle, Libelle: s.Libelle, Pct: s.Pct, Suivi: s.Suivi,
			Action: actions[s.Cle],
		})
	}

	sort.SliceStable(out, func(i, j int) bool {
		if out[i].Suivi != out[j].Suivi {
			return out[i].Suivi // les suivis d'abord
		}
		return out[i].Pct < out[j].Pct
	})
	return out, nil
}
