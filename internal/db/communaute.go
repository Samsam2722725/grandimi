package db

import (
	"context"

	"github.com/lib/pq"
)

/* Le fil de la communauté, en lecture seule.

   Un fil ouvert entre mineurs imposerait une modération, un dispositif
   de signalement et une politique de rétention, et le DSA ajoute des
   obligations propres dès qu'un service est accessible aux mineurs.
   Rien d'autre dans ce produit n'impose cela.

   Ce qui est écrit ici est écrit par l'équipe. Les utilisateurs lisent,
   et leurs non-lus font une pastille. Toute la valeur d'information d'un
   forum, aucun de ses coûts. */

type Publication struct {
	ID        string `json:"id"`
	Slug      string `json:"slug"`
	Titre     string `json:"titre"`
	Corps     string `json:"corps"`
	Categorie string `json:"categorie"`
	// Preuve vaut 'etabli', 'probable' ou 'incertain', et s'affiche.
	//
	// Une application de santé qui ne distingue pas ce qui est démontré
	// de ce qui est plausible demande qu'on la croie sur parole — c'est
	// exactement ce qu'on reproche au reste du marché.
	Preuve   string `json:"preuve"`
	PublieLe string `json:"publie_le"`
	Epingle  bool   `json:"epingle"`
	Lu       bool   `json:"lu"`
}

// Publications renvoie le fil, épinglés d'abord puis du plus récent au
// plus ancien, avec l'état lu / non lu de CE lecteur.
func Publications(userID string) ([]Publication, error) {
	rows, err := DB.QueryContext(context.Background(),
		`SELECT p.id::text, p.slug, p.titre, p.corps, p.categorie, p.preuve,
		        p.publie_le::text, p.epingle,
		        (l.publication_id IS NOT NULL) AS lu
		 FROM   publications p
		 LEFT JOIN lectures l
		        ON l.publication_id = p.id AND l.user_id = $1
		 WHERE  p.actif
		 ORDER BY p.epingle DESC, p.publie_le DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := make([]Publication, 0, 16)
	for rows.Next() {
		var p Publication
		if err := rows.Scan(&p.ID, &p.Slug, &p.Titre, &p.Corps, &p.Categorie,
			&p.Preuve, &p.PublieLe, &p.Epingle, &p.Lu); err != nil {
			return nil, err
		}
		out = append(out, p)
	}
	return out, rows.Err()
}

// NonLus compte les publications que ce lecteur n'a pas ouvertes.
//
// Requête séparée plutôt que dérivée de Publications : la pastille de
// la barre d'onglets est demandée depuis TOUS les écrans, et charger le
// corps de huit articles pour afficher un chiffre serait absurde.
func NonLus(userID string) (int, error) {
	var n int
	err := DB.QueryRowContext(context.Background(),
		`SELECT count(*) FROM publications p
		 WHERE  p.actif
		   AND  NOT EXISTS (
		          SELECT 1 FROM lectures l
		          WHERE l.publication_id = p.id AND l.user_id = $1)`,
		userID).Scan(&n)
	return n, err
}

// MarquerLues note une ou plusieurs publications comme lues.
//
// Plusieurs d'un coup : on marque tout le fil à la fermeture de
// l'onglet, pas une par une au défilement. Marquer au défilement
// compterait comme « lu » ce qui a traversé l'écran.
func MarquerLues(userID string, ids []string) error {
	if len(ids) == 0 {
		return nil
	}
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO lectures (user_id, publication_id)
		 SELECT $1, unnest($2::uuid[])
		 ON CONFLICT (user_id, publication_id) DO NOTHING`,
		userID, pq.Array(ids))
	return err
}
