package db

import (
	"context"
	"math"
	"time"
)

type Mesure struct {
	MesureeLe string  `json:"mesuree_le"`
	TailleCM  float64 `json:"taille_cm"`
}

/* EnregistrerMesure ajoute une mesure, ou remplace celle du meme jour.

   Deux saisies le meme jour ne sont pas deux mesures : c est une
   correction. Un ON CONFLICT plutot qu une erreur, parce que se tromper
   d un centimetre et ressaisir est le cas normal, pas le cas limite. */
func EnregistrerMesure(userID, mesureeLe string, tailleCM float64) error {
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO mesures (user_id, mesuree_le, taille_cm)
		 VALUES ($1, $2, $3)
		 ON CONFLICT (user_id, mesuree_le)
		 DO UPDATE SET taille_cm = EXCLUDED.taille_cm, created_at = now()`,
		userID, mesureeLe, tailleCM)
	return err
}

// ListerMesures rend les mesures d un utilisateur, de la plus ancienne a
// la plus recente — l ordre dans lequel on lit une courbe de croissance.
func ListerMesures(userID string) ([]Mesure, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT mesuree_le::text, taille_cm
		 FROM   mesures
		 WHERE  user_id = $1
		 ORDER BY mesuree_le`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var mesures []Mesure
	for rows.Next() {
		var m Mesure
		if err := rows.Scan(&m.MesureeLe, &m.TailleCM); err != nil {
			return nil, err
		}
		mesures = append(mesures, m)
	}
	return mesures, rows.Err()
}

/* dureeMinimaleObservationJours — en dessous, on ne calcule rien.

   Sur trois mois un adolescent en pleine poussee prend un a deux
   centimetres, et l erreur de mesure d un ado qui se mesure seul contre
   un mur est d environ un demi-centimetre a chaque bout. Sur un
   intervalle plus court, le rapport bruit sur signal depasse un : la
   vitesse calculee dirait plus de choses sur la facon de tenir le
   metre que sur la croissance. */
const dureeMinimaleObservationJours = 90

/* VitesseDepuisMesures rend la vitesse de croissance REELLE, en cm par
   an, et la duree observee en mois.

   FONCTION PURE, volontairement separee de la lecture en base : c est la
   seule partie qui contient un raisonnement, et elle doit etre testable
   sans base de donnees.

   On prend la PREMIERE et la DERNIERE mesure plutot qu une regression
   sur toutes : la regression pondererait a egalite des points serres au
   debut et un point isole a la fin, alors que c est l ecart total sur la
   plus longue duree qui porte l information. Et elle serait plus difficile
   a expliquer a l utilisateur, ce qui compte sur ce produit.

   Le troisieme retour vaut faux quand il n y a pas de quoi conclure :
   moins de deux mesures, ou moins de trois mois entre la premiere et la
   derniere. Dans ce cas les deux autres valeurs ne veulent rien dire et
   ne doivent pas etre lues. */
func VitesseDepuisMesures(mesures []Mesure) (vitesseCMParAn float64, moisObserves float64, ok bool) {
	if len(mesures) < 2 {
		return 0, 0, false
	}

	premiere, derniere := mesures[0], mesures[len(mesures)-1]

	debut, err := time.Parse("2006-01-02", premiere.MesureeLe)
	if err != nil {
		return 0, 0, false
	}
	fin, err := time.Parse("2006-01-02", derniere.MesureeLe)
	if err != nil {
		return 0, 0, false
	}

	jours := fin.Sub(debut).Hours() / 24
	if jours < dureeMinimaleObservationJours {
		return 0, 0, false
	}

	/* Une taille qui recule est une erreur de mesure, pas un adolescent
	   qui retrecit. On ne la transforme pas en vitesse negative : on
	   refuse de conclure, exactement comme pour une pointure qui recule
	   (internal/estimator/maturite.go). */
	ecart := derniere.TailleCM - premiere.TailleCM
	if ecart < 0 {
		return 0, 0, false
	}

	return ecart * 365.25 / jours, math.Round(jours/30.44*10) / 10, true
}
