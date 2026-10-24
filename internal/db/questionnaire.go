package db

import (
	"context"
	"database/sql"
	"encoding/json"
)

/* Reponses du questionnaire d un compte, telles que le site les a
   construites (voir migrations/011_reponses_questionnaire.sql).

   Le serveur ne les interprete pas : il les garde pour les rendre au meme
   compte quand il se reconnecte ailleurs. */

// LireReponsesQuestionnaire renvoie nil si le compte n'a rien enregistre.
func LireReponsesQuestionnaire(userID string) (json.RawMessage, error) {
	if DB == nil {
		return nil, nil
	}
	var donnees []byte
	err := DB.QueryRowContext(context.Background(),
		`SELECT donnees FROM reponses_questionnaire WHERE user_id = $1`, userID,
	).Scan(&donnees)
	if err == sql.ErrNoRows {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return json.RawMessage(donnees), nil
}

// EnregistrerReponsesQuestionnaire pose ou remplace les reponses du compte.
func EnregistrerReponsesQuestionnaire(userID string, donnees json.RawMessage) error {
	if DB == nil {
		return nil
	}
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO reponses_questionnaire (user_id, donnees, updated_at)
		 VALUES ($1, $2, now())
		 ON CONFLICT (user_id) DO UPDATE
		   SET donnees = EXCLUDED.donnees, updated_at = now()`,
		userID, []byte(donnees))
	return err
}
