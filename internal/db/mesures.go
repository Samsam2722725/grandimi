package db

import (
	"context"
	"database/sql"
	"errors"
	"sort"
	"time"

	"github.com/lib/pq"
)

/* Mesures de taille et série de connexions.

   Tout ce fichier travaille sur des DATES, jamais sur des instants. Une
   mesure appartient à un jour, une connexion aussi ; comparer des
   horodatages ferait dépendre la série de l'heure à laquelle on ouvre
   l'application. */

// ErrMesureTropTot est renvoyée quand la dernière mesure date de moins de
// sept jours. Ce n'est pas une erreur technique : c'est la règle du
// produit, et l'appelant doit l'afficher comme telle, pas comme une panne.
var ErrMesureTropTot = errors.New("mesure trop rapprochee")

// ErrMesuresDispersees est renvoyée quand les trois mesures d'une même
// séance s'écartent trop. Voir EcartMaxToleCm.
var ErrMesuresDispersees = errors.New("mesures trop dispersees")

/* Sept jours entre deux mesures.

   Ce n'est pas une contrainte marketing recopiée du concurrent, même si
   elle produit le même compte à rebours. Un adolescent en pleine poussée
   grandit d'environ 8 à 10 cm par an, soit 0,15 à 0,20 mm par jour. Sur
   une semaine cela fait un peu plus d'un millimètre — déjà sous le bruit
   d'une mesure à domicile. Mesurer tous les jours n'enregistre donc que
   de l'erreur, et pire : cela produit des « pertes de taille » apparentes
   qui inquiètent pour rien. */
const JoursEntreMesures = 7

/* Écart maximum toléré entre la plus petite et la plus grande des mesures
   d'une même séance.

   Une technique correcte (talons au mur, regard horizontal, inspiration
   retenue) donne trois valeurs à moins de 5 mm. Au-delà d'un centimètre,
   au moins une des trois est fausse et on ne sait pas laquelle — la
   médiane ne sauve rien. Mieux vaut redemander la séance que d'inscrire
   dans la courbe un point dont on sait déjà qu'il est faux. */
const EcartMaxToleCm = 1.0

type Mesure struct {
	Date     string  `json:"date"`
	TailleCm float64 `json:"taille_cm"`
	Moment   string  `json:"moment"`
	Source   string  `json:"source"`
}

// MedianeCm renvoie la médiane d'une série de mesures.
//
// Médiane et non moyenne : une mesure ratée (talons décollés, menton levé)
// tire une moyenne de plusieurs millimètres, alors qu'elle ne déplace pas
// la valeur centrale de trois relevés.
func MedianeCm(valeurs []float64) float64 {
	if len(valeurs) == 0 {
		return 0
	}
	triees := append([]float64(nil), valeurs...)
	sort.Float64s(triees)
	milieu := len(triees) / 2
	if len(triees)%2 == 1 {
		return triees[milieu]
	}
	return (triees[milieu-1] + triees[milieu]) / 2
}

// EcartCm renvoie l'étendue d'une série (max − min).
func EcartCm(valeurs []float64) float64 {
	if len(valeurs) == 0 {
		return 0
	}
	min, max := valeurs[0], valeurs[0]
	for _, v := range valeurs {
		if v < min {
			min = v
		}
		if v > max {
			max = v
		}
	}
	return max - min
}

// DerniereMesure renvoie la mesure la plus récente, ou nil s'il n'y en a
// aucune. Le nil est un état normal — c'est celui de tout nouveau compte —
// et non une erreur.
func DerniereMesure(userID string) (*Mesure, error) {
	var m Mesure
	err := DB.QueryRowContext(context.Background(),
		`SELECT mesure_le::text, taille_cm, moment, source
		 FROM   height_logs
		 WHERE  user_id = $1
		 ORDER BY mesure_le DESC
		 LIMIT  1`, userID).Scan(&m.Date, &m.TailleCm, &m.Moment, &m.Source)

	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &m, nil
}

// AjouterMesure enregistre une séance de mesure.
//
// Les règles sont appliquées ICI et pas dans le handler : c'est la couche
// qui connaît l'historique, et une règle écrite à côté de l'écran qui
// l'affiche finit par exister en deux versions qui divergent.
func AjouterMesure(userID string, brutes []float64, moment, jour string) (float64, error) {
	if len(brutes) == 0 {
		return 0, errors.New("aucune mesure fournie")
	}

	if EcartCm(brutes) > EcartMaxToleCm {
		return 0, ErrMesuresDispersees
	}

	derniere, err := DerniereMesure(userID)
	if err != nil {
		return 0, err
	}
	if derniere != nil {
		precedente, err := time.Parse("2006-01-02", derniere.Date)
		if err != nil {
			return 0, err
		}
		courante, err := time.Parse("2006-01-02", jour)
		if err != nil {
			return 0, err
		}
		/* Strictement inférieur : une mesure pile au septième jour est
		   autorisée. Écrit `<=`, le compte à rebours affichait zéro et le
		   bouton refusait quand même — le genre de décalage d'un jour que
		   personne ne reproduit et que tout le monde signale. */
		if courante.Sub(precedente).Hours()/24 < float64(JoursEntreMesures) {
			return 0, ErrMesureTropTot
		}
	}

	mediane := MedianeCm(brutes)

	/* ON CONFLICT : corriger la saisie du jour même remplace la ligne au
	   lieu d'échouer. La règle des sept jours porte sur deux mesures
	   DIFFÉRENTES, pas sur le droit de se corriger. */
	_, err = DB.ExecContext(context.Background(),
		`INSERT INTO height_logs (user_id, mesure_le, taille_cm, mesures_brutes, moment, source)
		 VALUES ($1, $2, $3, $4, $5, 'guide')
		 ON CONFLICT (user_id, mesure_le)
		 DO UPDATE SET taille_cm = EXCLUDED.taille_cm,
		               mesures_brutes = EXCLUDED.mesures_brutes,
		               moment = EXCLUDED.moment`,
		/* pq.Float64Array et non un littéral construit à la main : le
		   pilote ne convertit pas []float64 tout seul, et lib/pq est
		   déjà la dépendance du dépôt (cf. preferences.go, qui passe des
		   pq.Int64Array). Un sérialiseur maison aurait été trois lignes
		   à maintenir pour refaire moins bien ce qui est déjà là. */
		userID, jour, mediane, pq.Float64Array(brutes), moment)
	if err != nil {
		return 0, err
	}
	return mediane, nil
}

// ============================================================
//  SÉRIE DE CONNEXIONS
// ============================================================

type Serie struct {
	Courant int      `json:"courant"`
	Record  int      `json:"record"`
	Jours   []string `json:"jours"` // jours actifs sur les 7 derniers, ISO
}

// EnregistrerConnexion note que l'utilisateur a ouvert l'application ce
// jour-là. Idempotent : plusieurs ouvertures le même jour ne comptent
// qu'une fois, ce qui est exactement ce que « série de jours » veut dire.
func EnregistrerConnexion(userID, jour string) error {
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO connexions (user_id, jour) VALUES ($1, $2)
		 ON CONFLICT (user_id, jour) DO NOTHING`, userID, jour)
	return err
}

// CalculerSerie lit les jours de connexion et en déduit la série courante
// et le record.
//
// Calculé, jamais stocké. Un compteur dénormalisé se désynchronise au
// premier fuseau horaire mal géré ou au premier rejeu, et une série qui
// retombe à zéro toute seule est ce qui fait désinstaller une application
// de suivi. Le coût réel : une ligne par jour, soit un millier après trois
// ans d'usage quotidien.
func CalculerSerie(userID, aujourdhui string) (Serie, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT jour::text FROM connexions WHERE user_id = $1 ORDER BY jour`, userID)
	if err != nil {
		return Serie{}, err
	}
	defer rows.Close()

	var jours []time.Time
	for rows.Next() {
		var brut string
		if err := rows.Scan(&brut); err != nil {
			return Serie{}, err
		}
		j, err := time.Parse("2006-01-02", brut)
		if err != nil {
			return Serie{}, err
		}
		jours = append(jours, j)
	}
	if err := rows.Err(); err != nil {
		return Serie{}, err
	}

	ref, err := time.Parse("2006-01-02", aujourdhui)
	if err != nil {
		return Serie{}, err
	}

	return serieDepuisJours(jours, ref), nil
}

// serieDepuisJours est séparée de la lecture en base pour être testable
// sans base : c'est la partie où se cachent les erreurs (rupture de série,
// veille contre avant-veille, record d'une série passée).
func serieDepuisJours(jours []time.Time, aujourdhui time.Time) Serie {
	s := Serie{Jours: []string{}}
	if len(jours) == 0 {
		return s
	}

	// Record : la plus longue suite de jours consécutifs, où qu'elle soit
	// dans l'historique.
	courante := 1
	s.Record = 1
	for i := 1; i < len(jours); i++ {
		if jours[i].Sub(jours[i-1]).Hours() == 24 {
			courante++
		} else {
			courante = 1
		}
		if courante > s.Record {
			s.Record = courante
		}
	}

	/* Série en cours : elle doit finir aujourd'hui OU hier.
	   Hier compte, parce que quelqu'un qui a ouvert l'application hier
	   soir et pas encore aujourd'hui n'a rien perdu — sa journée n'est
	   pas finie. La remettre à zéro dès minuit punit un geste que
	   l'utilisateur peut encore faire. */
	dernier := jours[len(jours)-1]
	ecart := aujourdhui.Sub(dernier).Hours() / 24
	if ecart <= 1 {
		s.Courant = 1
		for i := len(jours) - 1; i > 0; i-- {
			if jours[i].Sub(jours[i-1]).Hours() == 24 {
				s.Courant++
			} else {
				break
			}
		}
	}

	// Les sept derniers jours, pour les pastilles de l'accueil.
	debut := aujourdhui.AddDate(0, 0, -6)
	for _, j := range jours {
		if !j.Before(debut) && !j.After(aujourdhui) {
			s.Jours = append(s.Jours, j.Format("2006-01-02"))
		}
	}
	return s
}
