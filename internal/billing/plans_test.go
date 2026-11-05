package billing

import "testing"

func TestPeutAcheter(t *testing.T) {
	cas := []struct {
		nom     string
		offre   string
		actives []string
		attendu bool
	}{
		{"nouveau client, 1 mois", "m1", nil, true},
		{"1 mois vers 3 mois", "m3", []string{"m1"}, true},
		{"1 mois vers À vie", "vie", []string{"m1_normal"}, true},
		{"3 mois vers À vie", "vie_normal", []string{"m3"}, true},
		{"ancien mensuel vers 3 mois", "m3", []string{"monthly"}, true},
		{"ancien annuel vers À vie", "vie", []string{"annual"}, true},
		{"offre inconnue vers 3 mois", "m3", []string{""}, true},
		{"même offre", "m1", []string{"m1"}, false},
		{"même offre au prix normal", "m3_normal", []string{"m3"}, false},
		{"3 mois vers 1 mois", "m1", []string{"m3"}, false},
		{"ancien annuel vers 3 mois", "m3", []string{"annual"}, false},
		{"À vie vers 3 mois", "m3", []string{"vie"}, false},
		{"À vie deux fois", "vie_normal", []string{"vie"}, false},
		{"la plus haute des actives compte", "m3", []string{"m1", "vie"}, false},
	}
	for _, c := range cas {
		if resultat := PeutAcheter(c.offre, c.actives); resultat != c.attendu {
			t.Errorf("%s : PeutAcheter(%q, %v) = %v, attendu %v", c.nom, c.offre, c.actives, resultat, c.attendu)
		}
	}
}
