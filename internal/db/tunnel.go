package db

import "context"

/* EnregistrerEtapeTunnel note qu un visiteur a vu un ecran.

   Une ligne par ecran vu, rien de plus. Voir migrations/008_tunnel.sql
   pour ce que cette table ne contient volontairement pas : aucune
   mesure d enfant n arrive jusqu ici.

   DB peut etre nil : le serveur demarre sans base quand DATABASE_URL
   est absente (developpement local). Une mesure ne doit jamais etre la
   raison pour laquelle le service tombe, donc on ne fait rien plutot
   que de dereferencer nil. */
func EnregistrerEtapeTunnel(session, evenement, etape string, rang int) error {
	if DB == nil {
		return nil
	}

	_, err := DB.ExecContext(context.Background(),
		`INSERT INTO evenements_tunnel (session, evenement, etape, rang)
		 VALUES ($1, $2, $3, $4)`,
		session, evenement, etape, rang)
	return err
}

/* LigneTunnel est une ligne du rapport : un ecran, et combien de
   visiteurs distincts l ont vu.

   Visiteurs et non vues : quelqu un qui revient en arriere puis
   repart en avant reverra le meme ecran deux fois. Compter les vues
   ferait remonter le milieu du questionnaire au-dessus du debut, et
   la courbe de decrochage deviendrait illisible. Les deux chiffres
   sont renvoyes, le rapport affiche le premier. */
type LigneTunnel struct {
	Evenement string `json:"evenement"`
	Etape     string `json:"etape"`
	Rang      int    `json:"rang"`
	Visiteurs int    `json:"visiteurs"`
	Vues      int    `json:"vues"`
}

/* LireRapportTunnel agrege la table pour les N derniers jours.

   L agregation se fait en base et non en Go : la table grossit d une
   vingtaine de lignes par visiteur, et rapatrier tout pour compter
   cote serveur deviendrait le jour ou ca marche la raison pour
   laquelle ca ne marche plus. */
func LireRapportTunnel(jours int) ([]LigneTunnel, error) {
	if DB == nil {
		return []LigneTunnel{}, nil
	}

	lignes, err := DB.QueryContext(context.Background(),
		`SELECT evenement,
		        etape,
		        rang,
		        count(DISTINCT session) AS visiteurs,
		        count(*)                AS vues
		   FROM evenements_tunnel
		  WHERE created_at >= now() - make_interval(days => $1)
		  GROUP BY evenement, etape, rang
		  ORDER BY rang, evenement, etape`, jours)
	if err != nil {
		return nil, err
	}
	defer lignes.Close()

	rapport := []LigneTunnel{}
	for lignes.Next() {
		var l LigneTunnel
		if err := lignes.Scan(&l.Evenement, &l.Etape, &l.Rang, &l.Visiteurs, &l.Vues); err != nil {
			return nil, err
		}
		rapport = append(rapport, l)
	}

	return rapport, lignes.Err()
}

/* TotalTunnel : combien de visiteurs distincts ont declenche un
   evenement, toutes etapes confondues. */
type TotalTunnel struct {
	Evenement string `json:"evenement"`
	Visiteurs int    `json:"visiteurs"`
}

/* LireTotauxTunnel compte par evenement, sans passer par l etape.

   Pourquoi une seconde requete plutot qu une somme des lignes
   ci-dessus : additionner des count(DISTINCT session) groupe par
   etape compte deux fois le visiteur qui a vu deux etapes du meme
   evenement. Le total "combien ont vu la paywall" serait alors plus
   grand que le nombre de visiteurs, ce qui est exactement le genre de
   chiffre faux qu on ne remarque pas. */
func LireTotauxTunnel(jours int) ([]TotalTunnel, error) {
	if DB == nil {
		return []TotalTunnel{}, nil
	}

	lignes, err := DB.QueryContext(context.Background(),
		`SELECT evenement, count(DISTINCT session) AS visiteurs
		   FROM evenements_tunnel
		  WHERE created_at >= now() - make_interval(days => $1)
		  GROUP BY evenement
		  ORDER BY visiteurs DESC`, jours)
	if err != nil {
		return nil, err
	}
	defer lignes.Close()

	totaux := []TotalTunnel{}
	for lignes.Next() {
		var t TotalTunnel
		if err := lignes.Scan(&t.Evenement, &t.Visiteurs); err != nil {
			return nil, err
		}
		totaux = append(totaux, t)
	}

	return totaux, lignes.Err()
}

/* PointEntreeTunnel : par quel bouton de la landing les visiteurs arrivent. */
type PointEntreeTunnel struct {
	Bouton    string `json:"bouton"`
	Visiteurs int    `json:"visiteurs"`
}

/* LirePointsEntreeTunnel compte combien de visiteurs par point d entree.
   Sert a identifier les boutons qui ne marchent pas. */
func LirePointsEntreeTunnel(jours int) ([]PointEntreeTunnel, error) {
	if DB == nil {
		return []PointEntreeTunnel{}, nil
	}

	lignes, err := DB.QueryContext(context.Background(),
		`SELECT etape, count(DISTINCT session) AS visiteurs
		   FROM evenements_tunnel
		  WHERE evenement = 'tunnel_demarre'
		    AND created_at >= now() - make_interval(days => $1)
		  GROUP BY etape
		  ORDER BY visiteurs DESC`, jours)
	if err != nil {
		return nil, err
	}
	defer lignes.Close()

	points := []PointEntreeTunnel{}
	for lignes.Next() {
		var p PointEntreeTunnel
		if err := lignes.Scan(&p.Bouton, &p.Visiteurs); err != nil {
			return nil, err
		}
		points = append(points, p)
	}

	return points, lignes.Err()
}
