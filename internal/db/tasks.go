package db

import "context"

// ToggleTask coche ou décoche une tâche pour un jour donné. Un seul bouton
// sert à cocher et décocher côté front : si la ligne existe déjà, on la
// retire plutôt que d'échouer sur la contrainte unique.
func ToggleTask(userID, taskDate, taskKey string) (bool, error) {
	var existe bool
	err := DB.QueryRowContext(context.Background(),
		"SELECT EXISTS(SELECT 1 FROM task_completions WHERE user_id=$1 AND task_date=$2 AND task_key=$3)",
		userID, taskDate, taskKey,
	).Scan(&existe)
	if err != nil {
		return false, err
	}

	if existe {
		_, err = DB.ExecContext(context.Background(),
			"DELETE FROM task_completions WHERE user_id=$1 AND task_date=$2 AND task_key=$3",
			userID, taskDate, taskKey)
		return false, err
	}

	_, err = DB.ExecContext(context.Background(),
		"INSERT INTO task_completions (user_id, task_date, task_key) VALUES ($1, $2, $3)",
		userID, taskDate, taskKey)
	return true, err
}

// GetCompletionsForDate renvoie les clés des tâches déjà cochées ce jour-là.
func GetCompletionsForDate(userID, taskDate string) (map[string]bool, error) {
	rows, err := DB.QueryContext(context.Background(),
		"SELECT task_key FROM task_completions WHERE user_id=$1 AND task_date=$2",
		userID, taskDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	fait := make(map[string]bool)
	for rows.Next() {
		var cle string
		if err := rows.Scan(&cle); err != nil {
			return nil, err
		}
		fait[cle] = true
	}
	return fait, rows.Err()
}

type JourHistorique struct {
	Date     string `json:"date"`
	NbFaites int    `json:"nb_faites"`
}

// GetHistory renvoie, pour les `jours` derniers jours, le nombre de tâches
// cochées chaque jour. Sert à dessiner le calendrier de série du dashboard
// sans exposer le détail de chaque tâche.
func GetHistory(userID string, jours int) ([]JourHistorique, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT task_date::text, count(*)
		 FROM   task_completions
		 WHERE  user_id = $1
		   AND  task_date >= (current_date - make_interval(days => $2))
		 GROUP BY task_date
		 ORDER BY task_date`,
		userID, jours)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var historique []JourHistorique
	for rows.Next() {
		var j JourHistorique
		if err := rows.Scan(&j.Date, &j.NbFaites); err != nil {
			return nil, err
		}
		historique = append(historique, j)
	}
	return historique, rows.Err()
}
