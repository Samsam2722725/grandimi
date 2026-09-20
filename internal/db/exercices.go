package db

import (
	"context"
	"fmt"
	"time"

	"github.com/lib/pq"
)

/* La séance du jour.

   Les exercices FAITS ne vivent pas dans une table à eux : un exercice
   fait EST une tâche faite, et task_completions porte déjà
   (user_id, task_date, task_key). La clé vaut « exercice-<slug> ».

   Une seconde table de complétion aurait imposé de tenir deux compteurs
   de progression cohérents entre eux, pour n'enregistrer qu'un booléen
   de plus. */

// PrefixeTacheExercice préfixe les clés de task_completions qui
// désignent un exercice. Déclaré ici plutôt que recopié dans les deux
// endroits qui l'utilisent : deux littéraux qui doivent rester égaux
// finissent par diverger.
const PrefixeTacheExercice = "exercice-"

type Exercice struct {
	Slug      string `json:"slug"`
	Nom       string `json:"nom"`
	Consigne  string `json:"consigne"`
	Categorie string `json:"categorie"`
	Benefice  string `json:"benefice"`
	DureeSec  int    `json:"duree_sec"`
	Fait      bool   `json:"fait"`
}

// jourISO rend le numéro de jour de la semaine au sens ISO
// (1 = lundi … 7 = dimanche).
//
// `time.Weekday()` compte de 0 pour dimanche à 6 pour samedi : utilisé
// tel quel, il décale tout le cycle d'un jour et place le dimanche à la
// place du lundi.
func jourISO(d time.Time) int {
	j := int(d.Weekday())
	if j == 0 {
		return 7
	}
	return j
}

// SeanceDuJour renvoie les exercices programmés ce jour-là, avec leur
// état fait / pas fait.
func SeanceDuJour(userID, jour string) ([]Exercice, error) {
	d, err := time.Parse("2006-01-02", jour)
	if err != nil {
		return nil, fmt.Errorf("jour invalide: %w", err)
	}

	/* Une seule requête, avec la jointure sur les tâches cochées.

	   Lire les exercices puis relire les complétions ferait deux allers
	   au serveur pour six lignes, et surtout laisserait une fenêtre où
	   l'un des deux a changé : la séance afficherait un exercice coché
	   qui n'est plus au programme, ou l'inverse. */
	rows, err := DB.QueryContext(context.Background(),
		`SELECT e.slug, e.nom_fr, e.consigne_fr, e.categorie, e.benefice, e.duree_sec,
		        (tc.task_key IS NOT NULL) AS fait
		 FROM   exercices e
		 LEFT JOIN task_completions tc
		        ON tc.user_id = $1
		       AND tc.task_date = $2
		       AND tc.task_key = $3 || e.slug
		 WHERE  e.actif
		   AND  e.jours && ARRAY[$4]::smallint[]
		 ORDER BY e.ordre`,
		userID, jour, PrefixeTacheExercice, jourISO(d))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	seance := make([]Exercice, 0, 6)
	for rows.Next() {
		var e Exercice
		if err := rows.Scan(&e.Slug, &e.Nom, &e.Consigne, &e.Categorie,
			&e.Benefice, &e.DureeSec, &e.Fait); err != nil {
			return nil, err
		}
		seance = append(seance, e)
	}
	return seance, rows.Err()
}

// ValiderExercices coche plusieurs exercices d'un coup.
//
// Une séance se termine d'un bloc : six appels séparés depuis l'écran de
// fin, c'est six occasions qu'un seul échoue et laisse la journée à
// 5 sur 6 sans que personne ne sache lequel manque.
func ValiderExercices(userID, jour string, slugs []string) error {
	if len(slugs) == 0 {
		return nil
	}

	cles := make([]string, len(slugs))
	for i, s := range slugs {
		cles[i] = PrefixeTacheExercice + s
	}

	/* ON CONFLICT DO NOTHING : refaire une séance déjà validée ne doit
	   pas échouer. C'est un geste que l'utilisateur fait, pas une erreur
	   à lui signaler. */
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO task_completions (user_id, task_date, task_key)
		 SELECT $1, $2, unnest($3::text[])
		 ON CONFLICT (user_id, task_date, task_key) DO NOTHING`,
		userID, jour, pq.Array(cles))
	return err
}

// BasculerExercice coche ou décoche un exercice isolé, pour qui valide
// au fil de l'eau plutôt qu'à la fin de la séance.
func BasculerExercice(userID, jour, slug string) (bool, error) {
	return ToggleTask(userID, jour, PrefixeTacheExercice+slug)
}

type JourSeance struct {
	Jour  string `json:"jour"`
	Total int    `json:"total"`
	Faits int    `json:"faits"`
}

// SemaineSeances renvoie, pour les sept jours qui commencent à `debut`,
// le nombre d'exercices programmés et le nombre déjà faits.
//
// Sert le bandeau de sept jours. Les jours À VENIR y figurent aussi,
// avec leur total et zéro fait : c'est ce qui permet d'afficher ce qui
// arrive, pas seulement ce qui est passé.
func SemaineSeances(userID, debut string) ([]JourSeance, error) {
	d, err := time.Parse("2006-01-02", debut)
	if err != nil {
		return nil, fmt.Errorf("jour invalide: %w", err)
	}

	out := make([]JourSeance, 0, 7)
	for i := 0; i < 7; i++ {
		jour := d.AddDate(0, 0, i)
		iso := jour.Format("2006-01-02")

		var total, faits int
		err := DB.QueryRowContext(context.Background(),
			`SELECT count(*),
			        count(*) FILTER (WHERE tc.task_key IS NOT NULL)
			 FROM   exercices e
			 LEFT JOIN task_completions tc
			        ON tc.user_id = $1
			       AND tc.task_date = $2
			       AND tc.task_key = $3 || e.slug
			 WHERE  e.actif AND e.jours && ARRAY[$4]::smallint[]`,
			userID, iso, PrefixeTacheExercice, jourISO(jour)).Scan(&total, &faits)
		if err != nil {
			return nil, err
		}

		out = append(out, JourSeance{Jour: iso, Total: total, Faits: faits})
	}
	return out, nil
}
