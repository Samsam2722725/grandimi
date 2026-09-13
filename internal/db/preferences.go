package db

import (
	"context"
	"database/sql"

	"github.com/lib/pq"
)

/* PreferencesPlan : les cinq reponses posees APRES le paiement.

   Elles ne servent qu a poser des heures reelles dans le plan. Le
   questionnaire gratuit, lui, sert a estimer une taille : ce sont deux
   jeux de questions distincts, et on ne melange pas les deux — demander
   l heure du coucher avant d avoir rien vendu allonge un tunnel qui
   convertit deja mal. */
type PreferencesPlan struct {
	CoucherMin  int    `json:"coucher_min"`
	LeverMin    int    `json:"lever_min"`
	PetitDej    string `json:"petit_dej"`
	JoursSport  []int  `json:"jours_sport"`
	Difficulte  string `json:"difficulte"`
	Renseignees bool   `json:"renseignees"`
}

/* LirePreferences rend les reponses du compte, et dit si elles ont ete
   posees. Renseignees=false signifie « on n a jamais demande » : c est
   ce qui declenche l ecran d installation apres le paiement.

   Un compte sans ligne n est PAS une erreur : c est le cas de tous les
   comptes crees avant cette table. */
func LirePreferences(userID string) (PreferencesPlan, error) {
	prefs := PreferencesPlan{
		CoucherMin: 1350, // 22 h 30
		LeverMin:   420,  // 7 h 00
		PetitDej:   "toujours",
		JoursSport: []int{},
		Difficulte: "regularite",
	}

	if DB == nil {
		return prefs, nil
	}

	var jours pq.Int64Array
	err := DB.QueryRowContext(context.Background(),
		`SELECT coucher_min, lever_min, petit_dej, jours_sport, difficulte
		   FROM preferences_plan
		  WHERE user_id = $1`, userID,
	).Scan(&prefs.CoucherMin, &prefs.LeverMin, &prefs.PetitDej, &jours, &prefs.Difficulte)

	if err == sql.ErrNoRows {
		return prefs, nil
	}
	if err != nil {
		return prefs, err
	}

	prefs.JoursSport = make([]int, 0, len(jours))
	for _, j := range jours {
		prefs.JoursSport = append(prefs.JoursSport, int(j))
	}
	prefs.Renseignees = true
	return prefs, nil
}

/* EnregistrerPreferences pose ou remplace les reponses d un compte.

   ON CONFLICT DO UPDATE : l ecran est rejouable depuis « Mon compte »
   quand les horaires changent — rentree scolaire, changement de club.
   Un plan cale sur un emploi du temps de l an dernier ne vaut pas mieux
   qu un plan generique. */
func EnregistrerPreferences(userID string, p PreferencesPlan) error {
	if DB == nil {
		return nil
	}

	jours := make(pq.Int64Array, 0, len(p.JoursSport))
	for _, j := range p.JoursSport {
		jours = append(jours, int64(j))
	}

	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO preferences_plan
		        (user_id, coucher_min, lever_min, petit_dej, jours_sport, difficulte)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (user_id) DO UPDATE
		    SET coucher_min = EXCLUDED.coucher_min,
		        lever_min   = EXCLUDED.lever_min,
		        petit_dej   = EXCLUDED.petit_dej,
		        jours_sport = EXCLUDED.jours_sport,
		        difficulte  = EXCLUDED.difficulte,
		        updated_at  = now()`,
		userID, p.CoucherMin, p.LeverMin, p.PetitDej, jours, p.Difficulte)
	return err
}
