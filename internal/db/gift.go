package db

import (
	"context"
	"database/sql"
)

// GetGiftChildID cherche si le dernier paiement reçu pour cette adresse
// e-mail était un paiement "cadeau" — un parent réglant depuis le lien
// partagé pour le compte d'un enfant — plutôt qu'un paiement pour son
// propre compte. Renvoie l'id du compte enfant bénéficiaire, ou une
// chaîne vide si ce n'en était pas un.
//
// Sans cette distinction, la redirection de succès Whop pousse
// n'importe quel payeur — parent compris — vers l'écran "Créez votre
// mot de passe" avec SA PROPRE adresse : ça lui crée un compte fantôme,
// jamais premium, pendant que le compte réellement crédité (celui de
// l'enfant) ne reçoit jamais la moindre invite à se connecter.
func GetGiftChildID(payerEmail string) (string, error) {
	var childID sql.NullString
	err := DB.QueryRowContext(context.Background(),
		`SELECT payload::jsonb -> 'data' -> 'metadata' ->> 'child_user_id'
		 FROM   webhook_logs
		 WHERE  user_email = $1
		   AND  event_type = 'membership.activated'
		 ORDER BY created_at DESC
		 LIMIT 1`,
		normaliserEmail(payerEmail),
	).Scan(&childID)
	if err == sql.ErrNoRows {
		return "", nil
	}
	if err != nil {
		return "", err
	}
	return childID.String, nil
}

// GetPublicStatus renvoie l'état premium et mot de passe d'un compte à
// partir de son seul id, sans authentification. Ce n'est pas une fuite
// nouvelle : cet id circule déjà en clair dans le lien "?parent=<id>"
// que l'enfant partage lui-même, qui sert déjà de jeton autorisant un
// paiement — le réutiliser pour une simple lecture d'état reste dans le
// même modèle de confiance. Aucune donnée personnelle (email compris)
// n'est renvoyée par cette fonction.
func GetPublicStatus(userID string) (isPremium bool, hasPassword bool, err error) {
	var hash string
	err = DB.QueryRowContext(context.Background(),
		"SELECT COALESCE(is_premium, false), COALESCE(password_hash, '') FROM users WHERE id = $1",
		userID,
	).Scan(&isPremium, &hash)
	if err == sql.ErrNoRows {
		return false, false, nil
	}
	if err != nil {
		return false, false, err
	}
	return isPremium, hash != "", nil
}
