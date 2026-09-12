/*
Package email envoie les e-mails transactionnels de Grandimi.

CE QUI EXISTAIT AVANT CE PACKAGE : rien. `grep -rn "smtp\|resend\|sendgrid\|mailer"`
sur le dépôt ne renvoyait aucune ligne, alors que le questionnaire
demande son adresse à l'utilisateur au 13e écran et la stocke depuis le
premier jour. L'adresse était donc collectée auprès de mineurs sans
finalité effective — ce que le principe de minimisation du RGPD
(art. 5.1.c) interdit — et l'actif le moins cher du produit dormait.

FOURNISSEUR : Resend, appelé par son API HTTP. Aucune dépendance ajoutée
au go.mod : c'est un POST JSON, net/http suffit. En changer demande de
réécrire la seule fonction appelerResend ci-dessous.

FAIL-CLOSED, mais dans l'autre sens que l'authentification. Sans clé
configurée, ce package n'envoie RIEN et le dit dans les journaux, sans
faire échouer l'appelant : un e-mail manquant ne doit jamais casser un
paiement ni une résiliation. C'est l'inverse d'AUTH_SECRET, où l'absence
de secret doit tout bloquer — là, refuser protège ; ici, refuser
n'apporte rien et casserait le reste.
*/
package email

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"
)

// ErrNonConfigure : aucune clé fournisseur. L'appelant décide s'il
// journalise ou s'il ignore — il ne doit jamais le remonter au client.
var ErrNonConfigure = errors.New("envoi d'e-mail non configuré (RESEND_API_KEY absente)")

// ErrExpediteurAbsent : une clé sans adresse d'expédition ne permet pas
// d'envoyer. On refuse plutôt que de deviner un domaine, ce qui ferait
// atterrir tous les envois en spam sous une adresse non authentifiée.
var ErrExpediteurAbsent = errors.New("envoi d'e-mail non configuré (EMAIL_EXPEDITEUR absente)")

/* Un client dédié, avec délai maximum. http.DefaultClient n'en a AUCUN :
   une requête restée en suspens bloquerait la tâche d'envoi
   indéfiniment, et sur Render l'instance serait tuée au milieu d'une
   série d'envois — sans qu'on sache lesquels sont partis. */
var clientHTTP = &http.Client{Timeout: 15 * time.Second}

// Message est un e-mail prêt à partir. Texte ET HTML sont fournis
// ensemble : un e-mail HTML seul est un signal de spam classique, et
// certains clients (montres, terminaux, lecteurs d'écran mal réglés)
// n'affichent que la version texte.
type Message struct {
	A     string
	Sujet string
	Texte string
	HTML  string

	// URL de désinscription, placée en en-tête List-Unsubscribe en plus
	// du lien dans le pied de page. Gmail et Outlook affichent alors leur
	// propre bouton « Se désabonner » : la personne qui ne veut plus rien
	// recevoir n'a pas à chercher, et nous ne récoltons pas un signalement
	// pour spam à la place — lequel abîmerait la réputation du domaine
	// pour tous les envois suivants, y compris ceux qui comptent.
	Desinscription string
}

// Configure dit si un envoi est possible. Sert à ne pas promettre à
// l'utilisateur un e-mail qui ne partira pas.
func Configure() bool {
	return os.Getenv("RESEND_API_KEY") != "" && os.Getenv("EMAIL_EXPEDITEUR") != ""
}

// Envoyer transmet le message au fournisseur.
func Envoyer(m Message) error {
	cle := os.Getenv("RESEND_API_KEY")
	if cle == "" {
		return ErrNonConfigure
	}
	expediteur := os.Getenv("EMAIL_EXPEDITEUR")
	if expediteur == "" {
		return ErrExpediteurAbsent
	}
	if strings.TrimSpace(m.A) == "" {
		return errors.New("destinataire vide")
	}

	charge := map[string]any{
		"from":    expediteur,
		"to":      []string{m.A},
		"subject": m.Sujet,
		"text":    m.Texte,
		"html":    m.HTML,
	}
	if m.Desinscription != "" {
		charge["headers"] = map[string]string{
			"List-Unsubscribe": "<" + m.Desinscription + ">",
		}
	}

	return appelerResend(cle, charge)
}

func appelerResend(cle string, charge map[string]any) error {
	corps, err := json.Marshal(charge)
	if err != nil {
		return err
	}

	requete, err := http.NewRequest(http.MethodPost, "https://api.resend.com/emails", bytes.NewReader(corps))
	if err != nil {
		return err
	}
	requete.Header.Set("Authorization", "Bearer "+cle)
	requete.Header.Set("Content-Type", "application/json")

	reponse, err := clientHTTP.Do(requete)
	if err != nil {
		return err
	}
	defer reponse.Body.Close()

	if reponse.StatusCode >= 200 && reponse.StatusCode < 300 {
		return nil
	}

	/* Le corps de la réponse est lu et renvoyé : Resend y explique la
	   cause réelle (domaine non vérifié, adresse d'expédition refusée,
	   quota). Sans lui, un échec se résume à « 422 » et se débogue à
	   l'aveugle. Il est plafonné pour ne pas déverser une page d'erreur
	   entière dans les journaux. */
	detail, _ := io.ReadAll(io.LimitReader(reponse.Body, 2048))
	return fmt.Errorf("resend a refusé l'envoi (%d) : %s", reponse.StatusCode, strings.TrimSpace(string(detail)))
}
