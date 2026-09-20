package api

import (
	"encoding/json"
	"errors"
	"strings"
	"testing"

	"github.com/gin-gonic/gin/binding"
)

/* Ce que ces tests protègent vraiment : qu'aucune réponse d'API ne
   recopie le nom d'une structure ou d'un champ Go. Le message français
   peut être réécrit, la règle ci-dessous ne doit pas céder. */

// termesInternes : tout ce qui trahit la forme du code plutôt que la
// faute de l'utilisateur.
var termesInternes = []string{
	"Key:", "Error:Field validation", "failed on the", "tag",
	"TailleCM", "MesureeLe", "Password", "Email",
	"enregistrerMesureRequest", "SignupRequest",
}

func exigerAucunTermeInterne(t *testing.T, message string) {
	t.Helper()
	for _, terme := range termesInternes {
		if strings.Contains(message, terme) {
			t.Errorf("le message rendu au client contient le terme interne %q : %s", terme, message)
		}
	}
}

func messagePourStruct(t *testing.T, s any) string {
	t.Helper()
	err := binding.Validator.ValidateStruct(s)
	if err == nil {
		t.Fatalf("la validation devait echouer pour %#v", s)
	}
	return messageDeValidation(err)
}

func TestTailleHorsBornesEstDiteEnFrancais(t *testing.T) {
	message := messagePourStruct(t, &enregistrerMesureRequest{TailleCM: 12})

	exigerAucunTermeInterne(t, message)
	if !strings.Contains(message, "la taille") {
		t.Errorf("le champ fautif doit etre nomme, obtenu : %s", message)
	}
	if !strings.Contains(message, "80") {
		t.Errorf("la borne franchie doit apparaitre, obtenu : %s", message)
	}
}

func TestChampManquantEstDitObligatoire(t *testing.T) {
	// TailleCM a zero : le tag `required` se declenche avant `gt`.
	message := messagePourStruct(t, &enregistrerMesureRequest{})

	exigerAucunTermeInterne(t, message)
	if !strings.Contains(message, "obligatoire") {
		t.Errorf("un champ absent doit etre dit obligatoire, obtenu : %s", message)
	}
}

func TestDeuxFautesDonnentDeuxPhrases(t *testing.T) {
	/* A l'inscription, une adresse mal ecrite et un mot de passe trop
	   court sont deux corrections differentes. Les fondre en un seul
	   message generique ferait essayer au hasard : c'est la raison pour
	   laquelle on nomme les champs au lieu de rendre « corps invalide ». */
	message := messagePourStruct(t, &SignupRequest{Email: "pas-une-adresse", Password: "court"})

	exigerAucunTermeInterne(t, message)
	if !strings.Contains(message, "adresse e-mail") {
		t.Errorf("l'adresse doit etre nommee, obtenu : %s", message)
	}
	if !strings.Contains(message, "mot de passe") {
		t.Errorf("le mot de passe doit etre nomme, obtenu : %s", message)
	}
}

func TestJSONMalformeRetombeSurUnMessageGenerique(t *testing.T) {
	message := messageDeValidation(errors.New("unexpected EOF"))

	exigerAucunTermeInterne(t, message)
	if !strings.Contains(message, "JSON") {
		t.Errorf("attendu un message generique sur le corps, obtenu : %s", message)
	}
}

func TestMauvaisTypeNommeLeChampSansCiterLeTypeGo(t *testing.T) {
	var req enregistrerMesureRequest
	err := json.Unmarshal([]byte(`{"taille_cm":"grand"}`), &req)
	if err == nil {
		t.Fatal("le decodage devait echouer")
	}

	message := messageDeValidation(err)
	exigerAucunTermeInterne(t, message)
	if !strings.Contains(message, "la taille") {
		t.Errorf("le champ fautif doit etre nomme, obtenu : %s", message)
	}
	/* Les libelles portent deja leur article. Un prefixe « le champ »
	   produisait « le champ la taille n a pas le bon type », qui est
	   passe les tests une premiere fois parce qu on ne verifiait que la
	   presence du nom. */
	if strings.Contains(message, "le champ la") || strings.Contains(message, "le champ l'") {
		t.Errorf("double article dans le message : %s", message)
	}
}
