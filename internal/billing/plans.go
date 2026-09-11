// Package billing centralise les tarifs de Grandimi. Toute page (paywall,
// lien parent, compte) et toute route serveur qui a besoin d'un prix ou
// d'un identifiant Whop les lit ici plutôt que de les recopier. Avant ce
// fichier, les deux existaient dans chaque page frontend séparément
// ("9,99" écrit en dur dans PaywallPage.jsx ET ParentPage.jsx) : rien
// n'empêchait techniquement les deux de diverger.
package billing

// PlanKey identifie une offre. C'est la seule chose qu'un client peut
// choisir ; jamais un montant. Le prix réel appliqué est décidé par le
// plan Whop correspondant, configuré côté serveur — un client qui
// falsifierait la requête ne peut obtenir qu'une des deux offres ici
// listées, jamais un montant arbitraire.
type PlanKey string

const (
	Monthly PlanKey = "monthly"
	Annual  PlanKey = "annual"
)

type Plan struct {
	Key      PlanKey `json:"key"`
	Label    string  `json:"label"`
	PriceEUR float64 `json:"price_eur"`
	// "month" ou "year" : sert au calcul de la prochaine date de
	// facturation quand le webhook ne fournit pas renewal_period_end.
	Interval string `json:"interval"`
	// Nom de la variable d'environnement portant l'id du plan Whop
	// (plan_xxx) correspondant. Jamais exposé au frontend : ce n'est
	// qu'un détail de config serveur, pas une donnée tarifaire.
	WhopPlanIDEnv string `json:"-"`
}

var plans = map[PlanKey]Plan{
	Monthly: {
		Key:           Monthly,
		Label:         "Mensuel",
		PriceEUR:      4.99,
		Interval:      "month",
		WhopPlanIDEnv: "WHOP_PLAN_ID_MONTHLY",
	},
	Annual: {
		Key:           Annual,
		Label:         "Annuel",
		PriceEUR:      29.99,
		Interval:      "year",
		WhopPlanIDEnv: "WHOP_PLAN_ID_ANNUAL",
	},
}

// Get renvoie le plan pour une clé donnée ("monthly"/"annual"). ok est
// false pour toute autre valeur, y compris une chaîne vide — appeler
// site doit alors refuser la requête plutôt que de retomber sur un plan
// par défaut choisi côté serveur.
func Get(key string) (Plan, bool) {
	p, ok := plans[PlanKey(key)]
	return p, ok
}

// All renvoie les deux offres, pour l'endpoint qui sert les tarifs au
// frontend (évite de dupliquer les montants dans le JS).
func All() []Plan {
	return []Plan{plans[Monthly], plans[Annual]}
}
