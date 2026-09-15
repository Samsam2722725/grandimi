package estimator

import (
	"math"
	"testing"
)

// Le z-score doit retomber sur la mediane OMS quand on lui donne la mediane.
func TestZTaillePourAge_MedianeVautZero(t *testing.T) {
	cas := []struct {
		age   float64
		sexe  string
		mediane float64
	}{
		{13, MALE, 156.0},   // table OMS, 156 mois
		{19, MALE, 176.5},   // fin de table
		{19, FEMALE, 163.2}, // fin de table
	}

	for _, c := range cas {
		z := zTaillePourAge(c.age, c.sexe, c.mediane)
		if math.Abs(z) > 0.05 {
			t.Errorf("age %.0f sexe %s taille %.1f : z = %.3f, attendu ~0",
				c.age, c.sexe, c.mediane, z)
		}
	}
}

/*
LE CAS QUI A PRODUIT LA PLAINTE.

Un garcon de 14 ans mesurant 185 cm est tres au-dessus de la mediane de son
age (164 cm). Son medecin lui annoncait environ 2 m ; l estimateur lui
repondait 185 cm, c est-a-dire « ta croissance est terminee », parce qu il ne
regardait que la taille des parents et se contentait de plafonner au sol.

Ce test verrouille les deux proprietes qui manquaient : la projection tient
compte de la taille pour l age, et elle laisse de la croissance a un
adolescent qui en a manifestement encore.
*/
func TestPercentile_GrandPourSonAge(t *testing.T) {
	const age, taille = 14.0, 185.0

	z := zTaillePourAge(age, MALE, taille)
	if z < 2 {
		t.Errorf("z = %.2f pour 185 cm a 14 ans : attendu au-dessus de 2 ecarts-types", z)
	}

	projection := tailleAdulteParPercentile(age, MALE, taille)
	if projection <= taille {
		t.Errorf("projection %.1f cm <= taille actuelle %.1f cm : on lui annonce encore qu il a fini de grandir",
			projection, taille)
	}
	if projection < 190 {
		t.Errorf("projection %.1f cm : trop basse pour un garcon de 14 ans a 185 cm", projection)
	}

	// Et le resultat complet doit suivre : plus de « 0 cm restant ».
	req := HeightPredictionV2Request{
		Age: age, Sex: MALE, HeightCM: taille, WeightKG: 70,
		FatherHeightCM: 180, MotherHeightCM: 168,
		EthnicBackground: CAUCASIAN, NutritionLevel: GOOD,
		SleepHoursPerNight: 8.5, ExerciseMinPerDay: 60, HeightVelocityCM: 6,
	}
	resp := PredictHeightV2(req)
	if resp.PredictedHeightCM-taille < 3 {
		t.Errorf("estimation %.1f cm pour un garcon de 14 ans a 185 cm : il reste %.1f cm, c est le bug d origine",
			resp.PredictedHeightCM, resp.PredictedHeightCM-taille)
	}
	t.Logf("14 ans / 185 cm -> %.1f cm (avant le correctif : 185,0)", resp.PredictedHeightCM)
}

/*
LE MEME DEFAUT DANS L AUTRE SENS, celui qui coute des remboursements.

Un garcon de 14 ans mesurant 150 cm est tres en dessous de la mediane. L
ancienne version lui annoncait 179 cm, soit « + 29 cm », parce qu elle le
ramenait a la cible de ses parents sans jamais regarder ou il en etait.
*/
func TestPercentile_PetitPourSonAge(t *testing.T) {
	req := HeightPredictionV2Request{
		Age: 14, Sex: MALE, HeightCM: 150, WeightKG: 40,
		FatherHeightCM: 178, MotherHeightCM: 165,
		EthnicBackground: CAUCASIAN, NutritionLevel: GOOD,
		SleepHoursPerNight: 8.5, ExerciseMinPerDay: 60, HeightVelocityCM: 5,
	}
	resp := PredictHeightV2(req)

	reste := resp.PredictedHeightCM - req.HeightCM
	if reste > 24 {
		t.Errorf("« + %.1f cm » annonces a un garcon de 14 ans mesurant 150 cm : promesse intenable",
			reste)
	}
	if reste < 5 {
		t.Errorf("« + %.1f cm » : trop pessimiste, il lui reste reellement de la croissance", reste)
	}
	t.Logf("14 ans / 150 cm -> %.1f cm, soit + %.1f cm (avant le correctif : 179,4, soit + 29,4)",
		resp.PredictedHeightCM, reste)
}

// Hors des bornes de la table, on rabat sur l extremite au lieu d extrapoler.
// Un jeune de 21 ans est traite comme un jeune de 19 ans : son couloir ne
// bouge plus, c est la bonne reponse et non un pis-aller.
func TestPercentile_HorsBornes(t *testing.T) {
	a := tailleAdulteParPercentile(19, MALE, 180)
	b := tailleAdulteParPercentile(22, MALE, 180)
	if math.Abs(a-b) > 0.01 {
		t.Errorf("19 ans -> %.2f, 22 ans -> %.2f : la table doit etre rabattue, pas extrapolee", a, b)
	}
}

// Le z est borne a +/- 3 : au-dela on quitte la variation normale pour le
// domaine pathologique, que ce produit ne modelise pas.
func TestPercentile_ZBorne(t *testing.T) {
	// 13 ans, 2 m : z reel largement au-dessus de 4.
	projection := tailleAdulteParPercentile(13, MALE, 200)
	if projection > 205 {
		t.Errorf("projection %.1f cm : la borne a 3 ecarts-types ne s applique pas", projection)
	}
}
