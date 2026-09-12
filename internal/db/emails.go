package db

import (
	"context"
	"database/sql"
)

// CandidatRelance : le strict nécessaire pour composer un envoi. Ni
// mesures, ni prédiction, ni date de naissance — rien de tout cela n'a
// sa place dans un e-mail (cf. internal/email/relance_j30.go).
type CandidatRelance struct {
	UserID string
	Email  string
}

/* CandidatsRelanceJ30 liste qui doit recevoir la relance à un mois.

   LE POINT DE DÉPART EST LA DERNIÈRE ESTIMATION, pas la date de création
   du compte. « Ça fait un mois » se rapporte au moment où la personne a
   obtenu son chiffre ; quelqu'un qui a refait le questionnaire la
   semaine dernière n'a rien à re-mesurer, même si son compte est vieux.

   LA BORNE HAUTE (90 jours) N'EST PAS UN DÉTAIL. Sans elle, le premier
   passage de cette tâche viserait d'un coup TOUS les comptes jamais
   créés : une salve froide depuis un domaine d'expédition neuf, ce qui
   est la façon classique de se faire bloquer par Gmail pour de bon. Et
   au-delà de trois mois, « ça fait un mois » serait simplement faux.

   La limite par passage complète cette protection : les plus anciens
   d'abord, quelques dizaines par jour, ce qui chauffe le domaine au lieu
   de le brûler.

   LES COMPTES DE TEST SONT EXCLUS. Les parcours de vérification ont
   laissé des adresses inexistantes en base (granny-test-*, verif-*,
   migration-check-*, *@grandimi.test — cf. migrations/nettoyer_les_
   comptes_de_test.sql, qui n'a pas encore été exécuté). Leur écrire ne
   produirait que des rebonds, et un taux de rebond élevé sur les
   premiers envois d'un domaine neuf coûte la délivrabilité de tous les
   suivants. */
func CandidatsRelanceJ30(typeEmail string, limite int) ([]CandidatRelance, error) {
	lignes, err := DB.QueryContext(context.Background(), `
		SELECT u.id, u.email
		FROM   users u
		JOIN   predictions p   ON p.user_id = u.id
		LEFT JOIN email_envois e ON e.user_id = u.id AND e.type = $1
		WHERE  COALESCE(u.is_premium, false) = false
		  AND  u.email_optout_at IS NULL
		  AND  e.id IS NULL
		  AND  u.email <> ''
		  AND  u.email LIKE '%@%'
		  AND  u.email NOT LIKE 'granny-test-%'
		  AND  u.email NOT LIKE 'verif-%'
		  AND  u.email NOT LIKE 'migration-check-%'
		  AND  u.email NOT LIKE '%@grandimi.test'
		GROUP BY u.id, u.email
		HAVING max(p.created_at) <= now() - interval '30 days'
		   AND max(p.created_at) >  now() - interval '90 days'
		ORDER BY max(p.created_at)
		LIMIT $2`, typeEmail, limite)
	if err != nil {
		return nil, err
	}
	defer lignes.Close()

	var candidats []CandidatRelance
	for lignes.Next() {
		var c CandidatRelance
		if err := lignes.Scan(&c.UserID, &c.Email); err != nil {
			return nil, err
		}
		candidats = append(candidats, c)
	}
	return candidats, lignes.Err()
}

/* ReserverEnvoi pose la ligne d'envoi AVANT d'appeler le fournisseur et
   dit si elle a bien été posée.

   L'ordre est volontaire. Écrire après l'envoi laisserait une fenêtre —
   fournisseur qui répond lentement, instance Render tuée au milieu de la
   boucle — pendant laquelle un second passage renverrait le même e-mail
   à la même personne. Écrire avant échange ce risque contre l'inverse :
   un e-mail perdu si l'envoi échoue juste après. Entre « deux fois » et
   « zéro fois », zéro est le bon défaut pour un message non sollicité.

   ON CONFLICT DO NOTHING plutôt qu'un SELECT préalable : deux passages
   simultanés passeraient tous les deux le SELECT. C'est l'index UNIQUE
   (user_id, type) qui arbitre, et lui seul ne peut pas se tromper. */
func ReserverEnvoi(userID, typeEmail string) (bool, error) {
	resultat, err := DB.ExecContext(context.Background(),
		`INSERT INTO email_envois (user_id, type)
		 VALUES ($1, $2)
		 ON CONFLICT (user_id, type) DO NOTHING`,
		userID, typeEmail)
	if err != nil {
		return false, err
	}
	lignes, err := resultat.RowsAffected()
	if err != nil {
		return false, err
	}
	return lignes == 1, nil
}

/* MarquerEnvoiEnEchec garde la trace d'un refus du fournisseur.

   La ligne N'EST PAS supprimée : la réessayer en boucle à chaque passage
   quotidien sur une adresse qui rebondit abîme la réputation du domaine
   d'expédition. Le motif reste lisible en base pour qu'on sache quoi
   corriger, et une relance manuelle reste possible en effaçant la ligne. */
func MarquerEnvoiEnEchec(userID, typeEmail, motif string) error {
	if len(motif) > 500 {
		motif = motif[:500]
	}
	_, err := DB.ExecContext(context.Background(),
		`UPDATE email_envois SET erreur = $3 WHERE user_id = $1 AND type = $2`,
		userID, typeEmail, motif)
	return err
}

/* Desinscrire retire le consentement d'un compte.

   Idempotent : un second clic sur le même lien ne change pas la date
   déjà posée, et répond la même chose. Aucune donnée n'est supprimée —
   effacer le compte ferait repartir la personne de zéro au prochain
   questionnaire, et elle recevrait de nouveau l'e-mail dont elle vient
   justement de se désinscrire.

   Renvoie false si l'identifiant ne correspond à aucun compte : un jeton
   signé mais pointant vers un compte supprimé ne doit pas répondre
   « c'est fait » alors que rien n'a été écrit. */
func Desinscrire(userID string) (bool, error) {
	var existe bool
	err := DB.QueryRowContext(context.Background(),
		`UPDATE users
		    SET email_optout_at = COALESCE(email_optout_at, now())
		  WHERE id = $1
		  RETURNING true`, userID).Scan(&existe)
	if err == sql.ErrNoRows {
		return false, nil
	}
	if err != nil {
		return false, err
	}
	return existe, nil
}
