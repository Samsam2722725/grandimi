package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"html"
	"io"
	"net/http"
	"os"
	"sync"
	"time"

	"grandimi/internal/billing"
	"grandimi/internal/db"
	"grandimi/internal/email"
)

/* Changement d offre : un client achete une offre superieure depuis l app
   (1 mois vers 3 mois ou A vie, 3 mois vers A vie). Le classement des
   offres est dans billing.Rang.

   Regle choisie le 12/10/2026 : il paie la nouvelle offre tout de suite,
   et l ancienne est arretee IMMEDIATEMENT chez Whop, pour qu il ne soit
   plus jamais preleve. Les jours restants de la periode en cours ne sont
   pas rembourses ; l app le lui dit avant qu il paie.

   L acces n est pas coupe : membership.deactivated ne retire le premium
   que s il ne reste aucun abonnement actif (RevoquerSiPlusAucunAbonnement),
   et le nouveau l est. */
func estOffreSuperieure(typePlan string) bool {
	switch typePlan {
	case "m3", "m3_normal", "vie", "vie_normal":
		return true
	}
	return false
}

// Attentes avant chaque nouvel essai d arret, si Whop refuse le premier.
var attentesReprise = []time.Duration{3 * time.Second, 15 * time.Second}

// http.DefaultClient n a aucun delai : un appel bloque n arriverait jamais
// jusqu a la reprise ni a l alerte.
var clientWhop = &http.Client{Timeout: 20 * time.Second}

// Le webhook et la reclamation du paiement peuvent demander le meme arret
// en meme temps. Un seul l execute : le second recevrait un refus de Whop
// (deja arrete) et declencherait une fausse alerte.
var arretsEnCours sync.Map

/* arreterOffresRemplacees arrete les offres actives de rang inferieur a la
   nouvelle. L oublier fait payer le client deux fois : si Whop refuse encore
   apres les reprises, on previent par e-mail pour l arreter a la main. */
func arreterOffresRemplacees(userID, nouvelAbonnement, typeNouveau string) {
	actifs, err := db.AbonnementsActifs(userID)
	if err != nil {
		fmt.Printf("[montee] AbonnementsActifs(%s): %v\n", userID, err)
		alerterArretImpossible(userID, nouvelAbonnement, "lecture des abonnements", err)
		return
	}
	rangNouveau := billing.Rang(typeNouveau)
	for _, a := range actifs {
		if a.WhopID == "" || a.WhopID == nouvelAbonnement || billing.Rang(a.PlanType) >= rangNouveau {
			continue
		}
		if _, dejaLance := arretsEnCours.LoadOrStore(a.WhopID, true); dejaLance {
			continue
		}
		err := arreterAvecReprises(a.WhopID)
		arretsEnCours.Delete(a.WhopID)
		if err != nil {
			fmt.Printf("[montee] arret de %s (%s) pour %s impossible : %v\n", a.WhopID, a.PlanType, userID, err)
			alerterArretImpossible(userID, nouvelAbonnement, a.WhopID, err)
			continue
		}
		fmt.Printf("[montee] %s (%s) arrete pour %s (passage a %s)\n", a.WhopID, a.PlanType, userID, typeNouveau)
	}
}

func arreterAvecReprises(membershipID string) error {
	err := annulerChezWhop(membershipID, "immediate")
	for _, attente := range attentesReprise {
		if err == nil || dejaArreteChezWhop(membershipID) {
			return nil
		}
		time.Sleep(attente)
		err = annulerChezWhop(membershipID, "immediate")
	}
	if err == nil || dejaArreteChezWhop(membershipID) {
		return nil
	}
	return err
}

// dejaArreteChezWhop : Whop refuse d arreter ce qui l est deja, et ce n est
// pas un echec. En cas de doute (lecture impossible), on repond non : mieux
// vaut une alerte de trop qu un client preleve deux fois.
func dejaArreteChezWhop(membershipID string) bool {
	apiKey := os.Getenv("WHOP_API_KEY")
	if apiKey == "" {
		return false
	}
	requete, err := http.NewRequest(
		http.MethodGet,
		fmt.Sprintf("https://api.whop.com/api/v1/memberships/%s", membershipID),
		nil,
	)
	if err != nil {
		return false
	}
	requete.Header.Set("Authorization", "Bearer "+apiKey)

	reponse, err := clientWhop.Do(requete)
	if err != nil {
		return false
	}
	defer reponse.Body.Close()
	if reponse.StatusCode != http.StatusOK {
		return false
	}
	var abonnement struct {
		Status string `json:"status"`
	}
	if err := json.NewDecoder(reponse.Body).Decode(&abonnement); err != nil {
		return false
	}
	switch abonnement.Status {
	case "canceled", "expired", "completed":
		return true
	}
	return false
}

func alerterArretImpossible(userID, nouvelAbonnement, aArreter string, cause error) {
	if !email.Configure() {
		return
	}
	texte := fmt.Sprintf(
		"Un client a changé d'offre, mais son ancien abonnement n'a pas pu être arrêté : il risque d'être prélevé deux fois.\n\nCompte : %s\nNouvel abonnement : %s\nÀ arrêter dans Whop : %s\nErreur : %v\n",
		userID, nouvelAbonnement, aArreter, cause,
	)
	erreur := email.Envoyer(email.Message{
		A:     "bonjour@grandimi.com",
		Sujet: "À faire : abonnement à arrêter dans Whop",
		Texte: texte,
		HTML:  "<pre>" + html.EscapeString(texte) + "</pre>",
	})
	if erreur != nil {
		fmt.Printf("[montee] alerte non envoyée : %v\n", erreur)
	}
}

// annulerChezWhop resilie un abonnement Whop. mode : "immediate" ou
// "at_period_end".
func annulerChezWhop(membershipID, mode string) error {
	apiKey := os.Getenv("WHOP_API_KEY")
	if apiKey == "" {
		return fmt.Errorf("WHOP_API_KEY absente")
	}
	corps, _ := json.Marshal(map[string]string{"cancellation_mode": mode})
	requete, err := http.NewRequest(
		http.MethodPost,
		fmt.Sprintf("https://api.whop.com/api/v1/memberships/%s/cancel", membershipID),
		bytes.NewReader(corps),
	)
	if err != nil {
		return err
	}
	requete.Header.Set("Authorization", "Bearer "+apiKey)
	requete.Header.Set("Content-Type", "application/json")

	reponse, err := clientWhop.Do(requete)
	if err != nil {
		return err
	}
	defer reponse.Body.Close()
	if reponse.StatusCode != http.StatusOK {
		texte, _ := io.ReadAll(reponse.Body)
		return fmt.Errorf("Whop %d : %s", reponse.StatusCode, texte)
	}
	return nil
}
