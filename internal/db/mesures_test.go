package db

import (
	"testing"
	"time"
)

func jours(liste ...string) []time.Time {
	out := make([]time.Time, 0, len(liste))
	for _, s := range liste {
		j, err := time.Parse("2006-01-02", s)
		if err != nil {
			panic(err)
		}
		out = append(out, j)
	}
	return out
}

func le(s string) time.Time {
	j, err := time.Parse("2006-01-02", s)
	if err != nil {
		panic(err)
	}
	return j
}

func TestSerieDepuisJours(t *testing.T) {
	cas := []struct {
		nom        string
		jours      []time.Time
		aujourdhui time.Time
		courant    int
		record     int
		nbPastille int
	}{
		{
			nom:        "compte neuf",
			jours:      nil,
			aujourdhui: le("2026-09-19"),
			courant:    0, record: 0, nbPastille: 0,
		},
		{
			nom:        "premier jour",
			jours:      jours("2026-09-19"),
			aujourdhui: le("2026-09-19"),
			courant:    1, record: 1, nbPastille: 1,
		},
		{
			nom:        "trois jours de suite",
			jours:      jours("2026-09-17", "2026-09-18", "2026-09-19"),
			aujourdhui: le("2026-09-19"),
			courant:    3, record: 3, nbPastille: 3,
		},
		{
			/* Le cas qui décide de tout : quelqu'un qui a ouvert hier
			   soir et pas encore aujourd'hui n'a RIEN perdu, sa journée
			   n'est pas finie. Remettre à zéro dès minuit punit un geste
			   qu'il peut encore faire, et c'est ce qui fait désinstaller. */
			nom:        "derniere ouverture hier : la serie tient",
			jours:      jours("2026-09-17", "2026-09-18"),
			aujourdhui: le("2026-09-19"),
			courant:    2, record: 2, nbPastille: 2,
		},
		{
			nom:        "un jour saute : la serie tombe",
			jours:      jours("2026-09-15", "2026-09-16", "2026-09-17"),
			aujourdhui: le("2026-09-19"),
			courant:    0, record: 3, nbPastille: 3,
		},
		{
			/* Le record survit à la rupture. Sans ça, le « Meilleur : N »
			   de l'accueil retomberait à la série en cours, et afficher
			   un record qui diminue n'a aucun sens. */
			nom:        "le record garde une serie passee plus longue",
			jours:      jours("2026-08-01", "2026-08-02", "2026-08-03", "2026-08-04", "2026-09-18", "2026-09-19"),
			aujourdhui: le("2026-09-19"),
			courant:    2, record: 4, nbPastille: 2,
		},
		{
			// Les pastilles ne montrent que sept jours, la série peut
			// être bien plus longue.
			nom: "dix jours de suite : sept pastilles, serie de dix",
			jours: jours("2026-09-10", "2026-09-11", "2026-09-12", "2026-09-13", "2026-09-14",
				"2026-09-15", "2026-09-16", "2026-09-17", "2026-09-18", "2026-09-19"),
			aujourdhui: le("2026-09-19"),
			courant:    10, record: 10, nbPastille: 7,
		},
	}

	for _, c := range cas {
		t.Run(c.nom, func(t *testing.T) {
			s := serieDepuisJours(c.jours, c.aujourdhui)
			if s.Courant != c.courant {
				t.Errorf("serie courante = %d, attendu %d", s.Courant, c.courant)
			}
			if s.Record != c.record {
				t.Errorf("record = %d, attendu %d", s.Record, c.record)
			}
			if len(s.Jours) != c.nbPastille {
				t.Errorf("pastilles = %d, attendu %d", len(s.Jours), c.nbPastille)
			}
		})
	}
}

func TestMedianeCm(t *testing.T) {
	cas := []struct {
		nom     string
		entree  []float64
		attendu float64
	}{
		{"trois mesures propres", []float64{172.2, 172.4, 172.5}, 172.4},
		{"non triees", []float64{172.5, 172.2, 172.4}, 172.4},
		{
			/* La raison d'être de la médiane. Une mesure ratée (talons
			   décollés) tire la moyenne à 173,03 ; la médiane ne bouge
			   pas d'un millimètre. */
			nom:    "une mesure aberrante ne deplace pas la mediane",
			entree: []float64{172.2, 172.4, 174.5}, attendu: 172.4,
		},
		{"nombre pair : moyenne des deux du milieu", []float64{172.0, 172.2, 172.4, 172.6}, 172.3},
		{"une seule mesure", []float64{170.0}, 170.0},
		{"aucune mesure", nil, 0},
	}

	for _, c := range cas {
		t.Run(c.nom, func(t *testing.T) {
			got := MedianeCm(c.entree)
			if got-c.attendu > 0.001 || c.attendu-got > 0.001 {
				t.Errorf("MedianeCm(%v) = %v, attendu %v", c.entree, got, c.attendu)
			}
		})
	}
}

func TestEcartCm(t *testing.T) {
	if got := EcartCm([]float64{172.2, 172.4, 172.5}); got > 0.301 || got < 0.299 {
		t.Errorf("etendue = %v, attendu 0.3", got)
	}
	// Au-delà de EcartMaxToleCm, la séance doit être refusée : c'est cette
	// comparaison que fait AjouterMesure.
	if EcartCm([]float64{171.0, 172.4, 172.5}) <= EcartMaxToleCm {
		t.Error("une etendue de 1,5 cm devrait depasser la tolerance")
	}
}
