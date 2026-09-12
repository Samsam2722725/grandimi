package email

import (
	"strings"
	"testing"
)

// Un secret de test d'au moins 32 caractères, comme l'exige la
// production. Il n'ouvre rien : il n'est utilisé que par ces tests.
const secretDeTest = "secret-de-test-suffisamment-long-0123456789"

func TestJetonAllerRetour(t *testing.T) {
	t.Setenv("AUTH_SECRET", secretDeTest)

	const userID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"

	jeton, err := JetonDesinscription(userID)
	if err != nil {
		t.Fatalf("émission du jeton : %v", err)
	}

	obtenu, err := UserIDDepuisJeton(jeton)
	if err != nil {
		t.Fatalf("relecture du jeton : %v", err)
	}
	if obtenu != userID {
		t.Fatalf("identifiant relu = %q, attendu %q", obtenu, userID)
	}
}

// Une signature retouchée doit être refusée. Sans ça, n'importe qui
// pourrait désinscrire n'importe quel compte en modifiant l'identifiant
// dans l'URL reçue par e-mail.
func TestJetonSignatureFalsifiee(t *testing.T) {
	t.Setenv("AUTH_SECRET", secretDeTest)

	jeton, err := JetonDesinscription("3f2504e0-4f89-11d3-9a0c-0305e82c3301")
	if err != nil {
		t.Fatalf("émission du jeton : %v", err)
	}

	cas := map[string]string{
		"dernier caractère modifié": jeton[:len(jeton)-1] + "A",
		"identifiant remplacé":      "00000000-0000-0000-0000-000000000000" + jeton[strings.LastIndex(jeton, "."):],
		"signature vide":            jeton[:strings.LastIndex(jeton, ".")+1],
		"sans séparateur":           strings.ReplaceAll(jeton, ".", ""),
	}

	for nom, falsifie := range cas {
		if _, err := UserIDDepuisJeton(falsifie); err == nil {
			t.Errorf("%s : accepté alors qu'il devait être refusé", nom)
		}
	}
}

/* Séparation des familles de signatures.

   Le jeton de désinscription voyage en clair dans une URL d'e-mail : il
   se retrouve dans l'historique du destinataire, dans les journaux de sa
   messagerie et chez son antivirus. Il est signé avec le même secret que
   les jetons de session, mais sur un message préfixé — sans quoi il
   aurait la même forme qu'un jeton de session et pourrait être présenté
   comme tel. Ce test vérifie que le préfixe fait son travail : une
   signature calculée SANS lui n'ouvre pas la désinscription. */
func TestJetonSansPrefixeDeDomaine(t *testing.T) {
	t.Setenv("AUTH_SECRET", secretDeTest)

	const userID = "3f2504e0-4f89-11d3-9a0c-0305e82c3301"
	sansPrefixe := userID + "." + signer([]byte(secretDeTest), userID)

	if _, err := UserIDDepuisJeton(sansPrefixe); err == nil {
		t.Fatal("une signature sans préfixe de domaine a été acceptée")
	}
}

// Sans secret configuré, on n'émet ni ne valide : un déploiement
// incomplet ne doit pas produire des liens que personne ne pourra
// honorer, ni accepter n'importe quoi.
func TestJetonSansSecret(t *testing.T) {
	t.Setenv("AUTH_SECRET", "")

	if _, err := JetonDesinscription("peu-importe"); err == nil {
		t.Error("un jeton a été émis sans AUTH_SECRET")
	}
	if _, err := UserIDDepuisJeton("peu-importe.signature"); err == nil {
		t.Error("un jeton a été accepté sans AUTH_SECRET")
	}
}

// Un secret trop court est traité comme absent : 32 caractères est le
// seuil déjà imposé aux jetons de session, on ne le contourne pas ici.
func TestJetonSecretTropCourt(t *testing.T) {
	t.Setenv("AUTH_SECRET", "trop-court")

	if _, err := JetonDesinscription("peu-importe"); err == nil {
		t.Error("un jeton a été émis avec un secret trop court")
	}
}

// Le lien complet doit porter le jeton et viser l'API, pas le site : le
// site est une page statique sur GitHub Pages, incapable d'écrire en base.
func TestLienDesinscription(t *testing.T) {
	t.Setenv("AUTH_SECRET", secretDeTest)
	t.Setenv("API_URL", "https://api.exemple.test/")

	lien, err := LienDesinscription("3f2504e0-4f89-11d3-9a0c-0305e82c3301")
	if err != nil {
		t.Fatalf("construction du lien : %v", err)
	}

	const prefixeAttendu = "https://api.exemple.test/api/v1/emails/desinscription?j="
	if !strings.HasPrefix(lien, prefixeAttendu) {
		t.Fatalf("lien = %q, devait commencer par %q", lien, prefixeAttendu)
	}

	// La barre finale d'API_URL ne doit pas produire un double slash.
	if strings.Contains(strings.TrimPrefix(lien, "https://"), "//") {
		t.Errorf("lien mal formé (double barre) : %q", lien)
	}
}
