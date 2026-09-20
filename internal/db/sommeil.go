package db

import (
	"context"
	"errors"
	"fmt"
	"time"
)

/* Le sommeil.

   CE QUE LE SCHÉMA NE DIT PAS, ET QUI COMPTE POUR LES ÉCRANS QUI LE
   LISENT : la majorité de la sécrétion d'hormone de croissance est
   pulsatile et survient en sommeil lent. Ce qui est établi, c'est qu'une
   privation sévère et chronique altère la croissance. Ce qui ne l'est
   PAS, c'est qu'ajouter une heure à un adolescent qui dort déjà huit
   heures le fasse grandir.

   On enregistre donc une durée, pas une promesse, et les libellés
   affichés doivent rester à ce niveau de prudence. */

// ErrHeuresInvalides refuse les durées qui ne peuvent pas être une nuit.
var ErrHeuresInvalides = errors.New("heures invalides")

/*
L'objectif, en heures.

	9 h est le milieu de la fourchette recommandée pour les 13-18 ans
	(8 à 10 h). Ce n'est pas un seuil au-delà duquel on grandit : c'est la
	plage où la privation chronique cesse d'être un facteur.
*/
const ObjectifSommeilH = 9.0

type NuitSommeil struct {
	Jour   string  `json:"jour"`
	Heures float64 `json:"heures"`
	// Saisi distingue « pas encore noté » de « zéro heure ».
	//
	// Sans ce booléen, une journée vide et une nuit blanche sont le même
	// chiffre, et le graphe affiche sept barres à zéro pour quelqu'un qui
	// n'a simplement rien saisi — ce qui se lit « tu as dormi zéro heure
	// toute la semaine ». C'est ce que montre le concurrent.
	Saisi bool `json:"saisi"`
}

// EnregistrerNuit note (ou corrige) les heures d'une nuit.
func EnregistrerNuit(userID, jour string, heures float64) error {
	if heures <= 0 || heures >= 24 {
		return ErrHeuresInvalides
	}
	if _, err := time.Parse("2006-01-02", jour); err != nil {
		return fmt.Errorf("jour invalide: %w", err)
	}

	/* ON CONFLICT DO UPDATE : corriger une saisie est un geste normal,
	   pas une erreur. Quelqu'un qui note 7 h au réveil et se souvient
	   ensuite s'être rendormi doit pouvoir rectifier. */
	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO sleep_logs (user_id, jour, heures) VALUES ($1, $2, $3)
		 ON CONFLICT (user_id, jour) DO UPDATE SET heures = EXCLUDED.heures`,
		userID, jour, heures)
	return err
}

// SupprimerNuit efface une saisie.
//
// Nécessaire : sans elle, une faute de frappe à 14 h resterait pour
// toujours, et la seule façon de s'en débarrasser serait de saisir une
// valeur également fausse.
func SupprimerNuit(userID, jour string) error {
	_, err := DB.ExecContext(context.Background(),
		`DELETE FROM sleep_logs WHERE user_id = $1 AND jour = $2`, userID, jour)
	return err
}

// SemaineSommeil renvoie les sept jours à partir de `debut`, y compris
// ceux sans saisie — c'est le graphe qui décide comment les dessiner, et
// il ne peut le faire que s'il sait lesquels manquent.
func SemaineSommeil(userID, debut string) ([]NuitSommeil, error) {
	d, err := time.Parse("2006-01-02", debut)
	if err != nil {
		return nil, fmt.Errorf("jour invalide: %w", err)
	}
	fin := d.AddDate(0, 0, 6)

	rows, err := DB.QueryContext(context.Background(),
		`SELECT jour::text, heures FROM sleep_logs
		 WHERE user_id = $1 AND jour BETWEEN $2 AND $3`,
		userID, debut, fin.Format("2006-01-02"))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	saisies := make(map[string]float64, 7)
	for rows.Next() {
		var j string
		var h float64
		if err := rows.Scan(&j, &h); err != nil {
			return nil, err
		}
		saisies[j] = h
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}

	/* On construit les sept jours EN GO plutôt qu'avec un
	   `generate_series` en SQL. La requête serait plus courte ; elle
	   rendrait aussi le fuseau du serveur responsable du découpage des
	   journées, alors que c'est le client qui fournit son jour local
	   partout ailleurs dans cette application. */
	out := make([]NuitSommeil, 0, 7)
	for i := 0; i < 7; i++ {
		iso := d.AddDate(0, 0, i).Format("2006-01-02")
		h, ok := saisies[iso]
		out = append(out, NuitSommeil{Jour: iso, Heures: h, Saisi: ok})
	}
	return out, nil
}

// ScoreSommeil note la semaine sur 100, sur les SEULES nuits saisies.
//
// Diviser par sept quand trois nuits sont notées ferait chuter le score
// parce que l'utilisateur n'a rien saisi, pas parce qu'il a mal dormi —
// et le pilier de l'accueil afficherait un échec qui n'en est pas un.
// Aucune nuit saisie : le pilier n'est pas noté du tout.
func ScoreSommeil(nuits []NuitSommeil) (int, bool) {
	total, n := 0.0, 0
	for _, nuit := range nuits {
		if !nuit.Saisi {
			continue
		}
		/* Plafonné à 1 : dormir douze heures ne vaut pas 133 % d'un
		   objectif de neuf. Au-delà de la plage recommandée, le bénéfice
		   ne continue pas d'augmenter. */
		r := nuit.Heures / ObjectifSommeilH
		if r > 1 {
			r = 1
		}
		total += r
		n++
	}
	if n == 0 {
		return 0, false
	}
	return int(total / float64(n) * 100), true
}
