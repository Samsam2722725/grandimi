package api

import (
	"fmt"
	"net/http"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

/* Mesure du tunnel : ou les visiteurs s arretent.

   Constate le 13/09/2026 : le site est une application d une seule
   page, l adresse ne change jamais, et le tableau de bord Whop compte
   donc les 131 vues de grandimi.com sur une seule page "/". Whop dit
   QUI arrive, jamais OU il s arrete. PostHog le sait, mais il faut s y
   connecter pour le lire. Cette route ecrit la meme mesure chez nous,
   lisible en SQL (voir migrations/lire_le_tunnel.sql).

   PUBLIQUE ET SANS SESSION par construction : celui qu on mesure est
   precisement celui qui n a pas encore de compte.

   TROIS GARDE-FOUS, parce qu une route publique qui ecrit en base est
   un espace de stockage gratuit pour qui la trouve :
     - la liste des noms d evenements est FERMEE ci-dessous ;
     - le corps est plafonne, et chaque champ tronque ;
     - le debit est plafonne par IP (voir cmd/server/main.go).

   REPOND TOUJOURS 204, meme quand elle refuse ou echoue. Une mesure
   qui rate ne doit pas faire apparaitre une erreur rouge dans la
   console d un visiteur, ni retenir sa navigation. Ce qui ne passe pas
   part dans les journaux du serveur, pas chez le client. */

// evenementsTunnel est la liste FERMEE des noms acceptes. Elle reprend
// exactement ceux ecrits dans frontend/src/lib/analytics.js : un nom
// present d un cote et absent de l autre donne une mesure muette, donc
// les deux listes se relisent ensemble.
var evenementsTunnel = map[string]bool{
	"page_vue":                true,
	"tunnel_demarre":          true,
	"tunnel_etape_vue":        true,
	"tunnel_abandonne":        true,
	"tunnel_email_saisi":      true,
	"estimation_demandee":     true,
	"estimation_obtenue":      true,
	"estimation_echouee":      true,
	"resultat_vu":             true,
	"resultat_partage":        true,
	"paywall_vue":             true,
	"paywall_plan_choisi":     true,
	"paywall_checkout_ouvert": true,
	"paywall_checkout_echoue": true,
	"lien_parent_ouvert":      true,
	"lien_parent_copie":       true,
	"parent_page_vue":         true,
	"resiliation_demandee":    true,
}

const (
	tailleMaxCorpsTunnel = 2048
	tailleMaxChampTunnel = 64
	rangMaxTunnel        = 99
)

type etapeTunnelEntrante struct {
	Session   string `json:"session"`
	Evenement string `json:"evenement"`
	Etape     string `json:"etape"`
	Rang      int    `json:"rang"`
}

/* couperTunnel borne un champ, en caracteres et non en octets.

   Trancher une chaine UTF-8 au milieu d un caractere produit une
   sequence invalide que Postgres refuse : la mesure echouerait au lieu
   d etre simplement raccourcie. Le passage par []rune tronque
   proprement et remplace au passage les octets invalides. */
func couperTunnel(valeur string) string {
	lettres := []rune(valeur)
	if len(lettres) > tailleMaxChampTunnel {
		return string(lettres[:tailleMaxChampTunnel])
	}
	return string(lettres)
}

func EnregistrerEtapeTunnel(c *gin.Context) {
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, tailleMaxCorpsTunnel)

	var entree etapeTunnelEntrante
	if err := c.ShouldBindJSON(&entree); err != nil {
		c.Status(http.StatusNoContent)
		return
	}

	if entree.Session == "" || !evenementsTunnel[entree.Evenement] {
		c.Status(http.StatusNoContent)
		return
	}

	// Un rang hors bornes ne vaut pas un refus : l evenement compte
	// quand meme, c est seulement sa position qu on ne retient pas.
	if entree.Rang < 0 || entree.Rang > rangMaxTunnel {
		entree.Rang = 0
	}

	if err := db.EnregistrerEtapeTunnel(
		couperTunnel(entree.Session),
		entree.Evenement,
		couperTunnel(entree.Etape),
		entree.Rang,
	); err != nil {
		fmt.Printf("[tunnel] insertion %s: %v\n", entree.Evenement, err)
	}

	c.Status(http.StatusNoContent)
}
