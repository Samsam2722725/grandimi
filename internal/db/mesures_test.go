package db

import "testing"

/* La seule partie de ce fichier qui contient un raisonnement est la
   fonction pure : elle se teste sans base de donnees, et c est la raison
   pour laquelle elle a ete separee de la lecture SQL. */

func TestVitesseDepuisMesures_RefuseDeConclure(t *testing.T) {
	cas := []struct {
		nom     string
		mesures []Mesure
	}{
		{"aucune mesure", nil},
		{"une seule mesure", []Mesure{{"2026-01-01", 160}}},
		{"deux mesures a un mois d intervalle", []Mesure{
			{"2026-01-01", 160}, {"2026-02-01", 160.5}}},
		{"deux mesures a 89 jours", []Mesure{
			{"2026-01-01", 160}, {"2026-03-31", 161}}},
		{"taille qui recule : erreur de mesure", []Mesure{
			{"2026-01-01", 162}, {"2026-07-01", 161}}},
		{"date illisible", []Mesure{
			{"01/01/2026", 160}, {"2026-07-01", 163}}},
	}

	for _, c := range cas {
		if _, _, ok := VitesseDepuisMesures(c.mesures); ok {
			t.Errorf("%s : la fonction devrait refuser de conclure", c.nom)
		}
	}
}

func TestVitesseDepuisMesures_CalculeSurLaPlusLongueDuree(t *testing.T) {
	// Six mois, trois centimetres : six centimetres par an.
	mesures := []Mesure{
		{"2026-01-01", 160},
		{"2026-04-01", 161.5},
		{"2026-07-01", 163},
	}

	vitesse, mois, ok := VitesseDepuisMesures(mesures)
	if !ok {
		t.Fatal("trois mesures sur six mois : devrait conclure")
	}
	if vitesse < 5.8 || vitesse > 6.3 {
		t.Errorf("vitesse %.2f cm/an, attendu environ 6", vitesse)
	}
	if mois < 5.8 || mois > 6.2 {
		t.Errorf("duree observee %.1f mois, attendu environ 6", mois)
	}
}

/* Les points intermediaires ne doivent pas deplacer le resultat : c est
   l ecart total sur la plus longue duree qui porte l information, pas la
   densite des mesures. Une regression, elle, aurait bouge. */
func TestVitesseDepuisMesures_LesPointsIntermediairesNeChangentRien(t *testing.T) {
	deuxPoints := []Mesure{{"2026-01-01", 160}, {"2026-07-01", 163}}
	beaucoupDePoints := []Mesure{
		{"2026-01-01", 160},
		{"2026-01-15", 160.1},
		{"2026-02-01", 160.2},
		{"2026-02-15", 160.2},
		{"2026-07-01", 163},
	}

	a, _, okA := VitesseDepuisMesures(deuxPoints)
	b, _, okB := VitesseDepuisMesures(beaucoupDePoints)
	if !okA || !okB {
		t.Fatal("les deux series devraient conclure")
	}
	if a != b {
		t.Errorf("%.3f contre %.3f : les points intermediaires ne doivent rien changer", a, b)
	}
}
