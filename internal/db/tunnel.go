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
