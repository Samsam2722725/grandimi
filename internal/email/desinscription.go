package email

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"net/url"
	"os"
	"strings"
)

var ErrJetonInvalide = errors.New("jeton de désinscription invalide")

/* Séparateur de domaine.

   Le jeton de désinscription est signé avec le MÊME secret que les
   jetons de session (AUTH_SECRET), mais sur un message préfixé. Sans ce
   préfixe, un jeton de désinscription — qui voyage en clair dans une URL
   d'e-mail, se retrouve dans les journaux du destinataire, dans son
   historique et chez son antivirus — aurait exactement la forme d'un
   jeton de session et pourrait être présenté comme tel. Le préfixe rend
   les deux familles de signatures mutuellement invalides. */
const domaineDesinscription = "desinscription."

func secretSignature() ([]byte, error) {
	s := os.Getenv("AUTH_SECRET")
	if len(s) < 32 {
		return nil, errors.New("AUTH_SECRET absent ou trop court")
	}
	return []byte(s), nil
}

func signer(secret []byte, message string) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

/* JetonDesinscription signe un identifiant de compte.

   VOLONTAIREMENT SANS EXPIRATION. Un e-mail se relit des mois plus tard,
   et un lien de désinscription périmé est un lien de désinscription
   absent : la personne n'a alors plus que le bouton « spam », qui abîme
   la réputation du domaine pour tous les envois suivants. Le jeton ne
   donne accès à rien d'autre qu'au retrait de son propre consentement —
   le pire qu'il permette est de désinscrire quelqu'un qui ne le voulait
   pas, ce qui ne coûte qu'à nous. */
func JetonDesinscription(userID string) (string, error) {
	secret, err := secretSignature()
	if err != nil {
		return "", err
	}
	return userID + "." + signer(secret, domaineDesinscription+userID), nil
}

// UserIDDepuisJeton valide un jeton et renvoie le compte visé.
func UserIDDepuisJeton(jeton string) (string, error) {
	secret, err := secretSignature()
	if err != nil {
		return "", err
	}

	separateur := strings.LastIndex(jeton, ".")
	if separateur <= 0 || separateur == len(jeton)-1 {
		return "", ErrJetonInvalide
	}
	userID, recue := jeton[:separateur], jeton[separateur+1:]

	// Comparaison à temps constant, comme pour les jetons de session :
	// un == classique s'arrête au premier octet différent et laisse
	// fuir la signature attendue octet par octet.
	attendue := signer(secret, domaineDesinscription+userID)
	if !hmac.Equal([]byte(recue), []byte(attendue)) {
		return "", ErrJetonInvalide
	}
	if userID == "" {
		return "", ErrJetonInvalide
	}
	return userID, nil
}

/* BaseAPI est l'adresse publique de ce serveur.

   Le lien de désinscription doit pointer vers l'API (elle seule peut
   écrire en base), pas vers le site : les deux sont sur des domaines
   différents — grandimi.com pour GitHub Pages, grandimi-api.onrender.com
   pour Render. */
func BaseAPI() string {
	if u := strings.TrimRight(os.Getenv("API_URL"), "/"); u != "" {
		return u
	}
	return "https://grandimi-api.onrender.com"
}

// BaseSite est l'adresse du site public, pour les liens de contenu.
func BaseSite() string {
	if u := strings.TrimRight(os.Getenv("SITE_URL"), "/"); u != "" {
		return u
	}
	return "https://grandimi.com"
}

// LienDesinscription construit l'URL complète à glisser dans un e-mail.
func LienDesinscription(userID string) (string, error) {
	jeton, err := JetonDesinscription(userID)
	if err != nil {
		return "", err
	}
	return BaseAPI() + "/api/v1/emails/desinscription?j=" + url.QueryEscape(jeton), nil
}
