package db

import (
	"fmt"
	"testing"
	"time"
)

// serie fabrique des mesures espacées de `pasJours`, à partir de
// `taille0`, en grandissant de `cmParAn`.
func serie(n, pasJours int, taille0, cmParAn float64) []PointTaille {
	debut := time.Date(2026, 1, 1, 0, 0, 0, 0, time.UTC)
	out := make([]PointTaille, 0, n)
	for i := 0; i < n; i++ {
		d := debut.AddDate(0, 0, i*pasJours)
		ans := float64(i*pasJours) / 365.25
		out = append(out, PointTaille{
			Date:     d.Format("2006-01-02"),
			TailleCm: taille0 + cmParAn*ans,
		})
	}
	return out
}

func TestCalculerVitesse(t *testing.T) {
	cas := []struct {
		nom      string
		points   []PointTaille
		fiable   bool
		pourquoi string
	}{
		{
			nom:    "aucune mesure",
			points: nil,
			fiable: false, pourquoi: "pas_assez_de_mesures",
		},
		{
			nom:    "une seule mesure",
			points: serie(1, 0, 170, 8),
			fiable: false, pourquoi: "pas_assez_de_mesures",
		},
		{
			/* Le cas qui compte le plus. Deux mesures à une semaine
			   d'intervalle donnent une pente mathématiquement définie —
			   et totalement fausse : 0,4 cm d'erreur sur sept jours se
			   traduit par une vingtaine de cm/an. C'est ce chiffre-là
			   qu'il ne faut jamais afficher. */
			nom:    "deux mesures a une semaine : refuse",
			points: serie(2, 7, 170, 8),
			fiable: false, pourquoi: "periode_trop_courte",
		},
		{
			nom:    "deux mesures a deux mois : encore trop court",
			points: serie(2, 60, 170, 8),
			fiable: false, pourquoi: "periode_trop_courte",
		},
		{
			// Six mois de suivi hebdomadaire : la marge se resserre
			// assez pour que le chiffre porte une information.
			nom:    "six mois de mesures hebdomadaires : accepte",
			points: serie(26, 7, 170, 8),
			fiable: true,
		},
		{
			nom:    "un an de mesures hebdomadaires : accepte",
			points: serie(52, 7, 168, 6.5),
			fiable: true,
		},
	}

	for _, c := range cas {
		t.Run(c.nom, func(t *testing.T) {
			v := CalculerVitesse(c.points)
			if v.Fiable != c.fiable {
				t.Errorf("fiable = %v, attendu %v (pourquoi=%q, marge=%v)",
					v.Fiable, c.fiable, v.Pourquoi, v.Marge)
			}
			if !c.fiable && c.pourquoi != "" && v.Pourquoi != c.pourquoi {
				t.Errorf("pourquoi = %q, attendu %q", v.Pourquoi, c.pourquoi)
			}
		})
	}
}

// La pente retrouvée doit être celle qu'on a injectée.
func TestVitesseRetrouveLaPente(t *testing.T) {
	for _, attendu := range []float64{4.0, 6.5, 9.0} {
		t.Run(fmt.Sprintf("%.1f cm par an", attendu), func(t *testing.T) {
			v := CalculerVitesse(serie(52, 7, 165, attendu))
			if !v.Fiable {
				t.Fatalf("aurait du etre fiable (%q)", v.Pourquoi)
			}
			if diff := v.CmParAn - attendu; diff > 0.2 || diff < -0.2 {
				t.Errorf("pente = %v, attendu %v", v.CmParAn, attendu)
			}
		})
	}
}

/*
Deux points ne prouvent JAMAIS une certitude parfaite.

	Le piège de ce calcul : avec deux points, la droite passe exactement
	par les deux, les résidus sont nuls, et la formule classique de
	l'erreur type rend zéro. Une application qui l'afficherait annoncerait
	une vitesse au dixième de cm près à partir de deux mesures faites au
	mur avec un livre sur la tête.
*/
func TestDeuxPointsNeDonnentPasUneMargeNulle(t *testing.T) {
	v := CalculerVitesse(serie(2, 200, 170, 8))
	if v.Marge <= 0 {
		t.Fatalf("marge = %v : deux points ne peuvent pas donner une certitude parfaite", v.Marge)
	}
}

// La marge doit DIMINUER quand la période couverte s'allonge.
func TestLaMargeSeResserreAvecLeTemps(t *testing.T) {
	court := CalculerVitesse(serie(14, 7, 170, 8)) // ~3 mois
	long := CalculerVitesse(serie(52, 7, 170, 8))  // ~1 an

	if !court.Fiable || !long.Fiable {
		t.Skip("les deux séries doivent être fiables pour comparer")
	}
	if long.Marge >= court.Marge {
		t.Errorf("marge a 1 an (%v) devrait etre plus serree qu'a 3 mois (%v)",
			long.Marge, court.Marge)
	}
}

/*
Une mesure aberrante doit ÉLARGIR la marge, pas passer inaperçue.

	Si un relevé est faux de 3 cm, le résidu augmente, l'erreur type
	augmente, et la marge affichée s'élargit. C'est le comportement voulu :
	l'application dit « je suis moins sûre » plutôt que de lisser en
	silence.
*/
func TestUneMesureAberranteElargitLaMarge(t *testing.T) {
	propre := serie(26, 7, 170, 8)

	bruitee := serie(26, 7, 170, 8)
	bruitee[13].TailleCm += 3.0

	vPropre := CalculerVitesse(propre)
	vBruitee := CalculerVitesse(bruitee)

	if vBruitee.Marge <= vPropre.Marge {
		t.Errorf("marge bruitee (%v) devrait depasser la marge propre (%v)",
			vBruitee.Marge, vPropre.Marge)
	}
}
