package api

import (
	"fmt"
	"html/template"
	"net/http"
	"os"
	"strconv"
	"time"

	"grandimi/internal/db"
	"grandimi/internal/email"

	"github.com/gin-gonic/gin"
)

// Plafond d'envois par passage. Réglable par EMAIL_RELANCE_MAX_PAR_JOUR.
const relanceMaxParDefaut = 50

/* Pause entre deux envois.

   Resend limite les appels à quelques requêtes par seconde ; au-delà il
   répond 429, et un envoi refusé est compté en échec donc jamais
   réessayé (la ligne de réservation, elle, reste posée). Une pause coûte
   une demi-minute à une tâche qui tourne la nuit : c'est le bon côté de
   l'échange. */
const pauseEntreEnvois = 550 * time.Millisecond

func limiteRelance() int {
	if v := os.Getenv("EMAIL_RELANCE_MAX_PAR_JOUR"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return relanceMaxParDefaut
}

/* LancerRelancesJ30 envoie la relance à un mois aux comptes éligibles.

   DÉCLENCHÉE DE L'EXTÉRIEUR, pas par une minuterie interne. Le backend
   tourne sur l'offre gratuite Render, qui endort l'instance après un
   quart d'heure sans trafic : un time.Ticker dans main.go ne tournerait
   pas la nuit, c'est-à-dire jamais. Un appel quotidien depuis GitHub
   Actions (.github/workflows/relance-e-mail.yml) réveille l'instance et
   laisse en prime une trace consultable de chaque passage.

   Protégée par ADMIN_TOKEN comme le reste du groupe /api/admin : cette
   route déclenche de vrais envois vers de vraies personnes.

   Rejouable sans danger. La réservation en base est posée AVANT l'appel
   au fournisseur et l'index UNIQUE (user_id, type) refuse la seconde :
   relancer la tâche deux fois le même jour n'envoie rien de plus. */
func LancerRelancesJ30(c *gin.Context) {
	if db.DB == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "database not configured"})
		return
	}
	if !email.Configure() {
		/* Route d'administration : nommer la variable manquante est ici
		   utile et sans risque, contrairement aux messages destinés aux
		   clients. */
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "envoi d'e-mail non configuré : RESEND_API_KEY et EMAIL_EXPEDITEUR doivent être posées sur Render",
		})
		return
	}

	limite := limiteRelance()
	candidats, err := db.CandidatsRelanceJ30(email.TypeRelanceJ30, limite)
	if err != nil {
		fmt.Printf("[email] CandidatsRelanceJ30: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list candidates"})
		return
	}

	var envoyes, echecs, deja int
	for i, candidat := range candidats {
		reserve, err := db.ReserverEnvoi(candidat.UserID, email.TypeRelanceJ30)
		if err != nil {
			fmt.Printf("[email] ReserverEnvoi(%s): %v\n", candidat.UserID, err)
			echecs++
			continue
		}
		if !reserve {
			// Un autre passage a réservé entre-temps. Ce n'est pas une
			// erreur : c'est exactement ce que la réservation doit produire.
			deja++
			continue
		}

		message, err := email.RelanceJ30(candidat.Email, candidat.UserID)
		if err != nil {
			fmt.Printf("[email] RelanceJ30 pour le compte %s: %v\n", candidat.UserID, err)
			_ = db.MarquerEnvoiEnEchec(candidat.UserID, email.TypeRelanceJ30, err.Error())
			echecs++
			continue
		}

		if err := email.Envoyer(message); err != nil {
			/* L'adresse du destinataire n'est PAS journalisée : les
			   journaux Render sont lisibles par quiconque a accès au
			   tableau de bord, et il s'agit de l'adresse d'un mineur.
			   L'identifiant de compte suffit à retrouver la ligne. */
			fmt.Printf("[email] envoi relance_j30 refusé pour le compte %s: %v\n", candidat.UserID, err)
			_ = db.MarquerEnvoiEnEchec(candidat.UserID, email.TypeRelanceJ30, err.Error())
			echecs++
			continue
		}
		envoyes++

		if i < len(candidats)-1 {
			time.Sleep(pauseEntreEnvois)
		}
	}

	fmt.Printf("[email] relance_j30 : %d envoyés, %d échecs, %d déjà réservés (plafond %d)\n",
		envoyes, echecs, deja, limite)

	c.JSON(http.StatusOK, gin.H{
		"type":      email.TypeRelanceJ30,
		"candidats": len(candidats),
		"envoyes":   envoyes,
		"echecs":    echecs,
		"deja":      deja,
		"plafond":   limite,
	})
}

/* pageDesinscription : gabarit de la page affichée après un clic sur le
   lien de désinscription.

   Servie par l'API et non par le site, parce que seule l'API peut écrire
   en base et que les deux vivent sur des domaines différents. Elle est
   donc autonome — styles en ligne, aucune ressource distante — plutôt
   que de faire dépendre le retrait d'un consentement du bon chargement
   du site. */
var pageDesinscription = template.Must(template.New("desinscription").Parse(
	"<!doctype html>\n" +
		"<html lang=\"fr\"><head><meta charset=\"utf-8\" />\n" +
		"<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />\n" +
		"<meta name=\"robots\" content=\"noindex\" />\n" +
		"<title>{{.Titre}} — Grandimi</title></head>\n" +
		"<body style=\"margin:0;padding:48px 24px;background:#fbf7f2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#17120e;\">\n" +
		"  <div style=\"max-width:480px;margin:0 auto;\">\n" +
		"    <p style=\"margin:0 0 32px;font-size:14px;letter-spacing:3px;font-weight:700;color:#ff5a1f;\">GRANDIMI</p>\n" +
		"    <h1 style=\"margin:0 0 16px;font-size:26px;line-height:1.25;font-weight:600;\">{{.Titre}}</h1>\n" +
		"    <p style=\"margin:0 0 28px;font-size:17px;line-height:1.55;color:#4a443e;\">{{.Message}}</p>\n" +
		"    <p style=\"margin:0;\"><a href=\"{{.LienSite}}\" style=\"color:#ff5a1f;font-size:16px;\">Revenir sur grandimi.com</a></p>\n" +
		"  </div>\n" +
		"</body></html>"))

func repondreDesinscription(c *gin.Context, statut int, titre, message string) {
	c.Header("Content-Type", "text/html; charset=utf-8")
	c.Status(statut)
	_ = pageDesinscription.Execute(c.Writer, map[string]string{
		"Titre":    titre,
		"Message":  message,
		"LienSite": email.BaseSite() + "/",
	})
}

/* Desinscription retire le consentement d'envoi, depuis le lien présent
   dans le pied de chaque e-mail.

   PUBLIQUE ET SANS SESSION, par construction : la personne qui ne veut
   plus rien recevoir n'a pas de session ouverte, souvent pas de mot de
   passe du tout, et exiger une connexion pour se désinscrire reviendrait
   à ne pas offrir de désinscription. C'est le jeton signé qui fait
   autorité.

   Traitée en GET, donc exécutée par un simple clic. Un antivirus ou un
   aperçu de lien peut désinscrire quelqu'un qui n'a rien demandé : c'est
   assumé. Le seul dommage possible tombe sur nous, jamais sur la
   personne — alors qu'une page de confirmation intermédiaire ajouterait
   une étape à la seule action qu'on doive rendre immédiate. */
func Desinscription(c *gin.Context) {
	jeton := c.Query("j")
	if jeton == "" {
		repondreDesinscription(c, http.StatusBadRequest, "Lien incomplet",
			"Ce lien de désinscription est incomplet. Copie-le en entier depuis l'e-mail, ou réponds simplement à ce message.")
		return
	}

	userID, err := email.UserIDDepuisJeton(jeton)
	if err != nil {
		/* Aucun accès à la base tant que la signature n'est pas vérifiée :
		   un lien falsifié ne coûte donc qu'un calcul de HMAC, et la route
		   n'a pas besoin d'être plafonnée. */
		repondreDesinscription(c, http.StatusBadRequest, "Lien invalide",
			"Ce lien de désinscription n'est pas valide. Ta messagerie l'a peut-être coupé en deux : réessaie en le copiant en entier.")
		return
	}

	if db.DB == nil {
		repondreDesinscription(c, http.StatusServiceUnavailable, "Réessaie dans un instant",
			"On n'arrive pas à enregistrer ta demande pour le moment. Réessaie dans quelques minutes : le lien reste valable.")
		return
	}

	trouve, err := db.Desinscrire(userID)
	if err != nil {
		fmt.Printf("[email] Desinscrire(%s): %v\n", userID, err)
		repondreDesinscription(c, http.StatusInternalServerError, "Réessaie dans un instant",
			"On n'arrive pas à enregistrer ta demande pour le moment. Réessaie dans quelques minutes : le lien reste valable.")
		return
	}
	if !trouve {
		// Jeton signé mais compte disparu : plus rien ne partira de toute
		// façon, autant le dire franchement plutôt que d'afficher une
		// erreur qui laisserait craindre le contraire.
		repondreDesinscription(c, http.StatusOK, "C'est déjà réglé",
			"Ce compte n'existe plus. Tu ne recevras plus rien de notre part.")
		return
	}

	repondreDesinscription(c, http.StatusOK, "C'est fait",
		"Tu ne recevras plus d'e-mail de Grandimi. Ton estimation et ton compte, eux, ne sont pas supprimés — tu peux revenir quand tu veux.")
}
