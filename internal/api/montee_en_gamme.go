package api

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"os"

	"grandimi/internal/db"
)

/* Montee en gamme : un client de l offre 1 mois achete l offre 3 mois ou
   A vie (bouton « Passer a 3 mois » dans « Ma taille »).

   Regle choisie le 12/10/2026 : il paie la nouvelle offre tout de suite,
   et son abonnement 1 mois est arrete IMMEDIATEMENT chez Whop, pour
   qu il ne soit plus jamais preleve des 14,99 €. Les jours restants du
   mois en cours ne sont pas rembourses ; l app le lui dit avant qu il
   paie.

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

func arreterAnciensMensuels(userID, nouvelAbonnement string) {
	ids, err := db.AbonnementsMensuelsActifs(userID, nouvelAbonnement)
	if err != nil {
		fmt.Printf("[montee] AbonnementsMensuelsActifs(%s): %v\n", userID, err)
		return
	}
	for _, id := range ids {
		if err := annulerChezWhop(id, "immediate"); err != nil {
			fmt.Printf("[montee] arret du 1 mois %s pour %s impossible : %v\n", id, userID, err)
			continue
		}
		fmt.Printf("[montee] 1 mois %s arrete pour %s (passage a %s)\n", id, userID, nouvelAbonnement)
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

	reponse, err := http.DefaultClient.Do(requete)
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
