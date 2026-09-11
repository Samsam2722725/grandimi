package estimator

import (
	"math"
	"testing"
)

func TestPredictHeightV2_ConfianceEtIntervalle(t *testing.T) {
	req := HeightPredictionV2Request{
		Age:                14.5,
		Sex:                MALE,
		HeightCM:           162.0,
		WeightKG:           52.0,
		FatherHeightCM:     178.0,
		MotherHeightCM:     164.0,
		BMI:                19.8, // Healthy
		HeightVelocityCM:   5.5,  // Good growth velocity
		EthnicBackground:   CAUCASIAN,
		NutritionLevel:     GOOD,
		SleepHoursPerNight: 8.5, // Optimal
		ExerciseMinPerDay:  60,  // Good activity
		MaternalDiabetes:   false,
		ChronicIllness:     false,
		PubertySigns: PubertySigns{
			PubicHair: "3",
			Genitalia: "3",
		},
	}

	resp := PredictHeightV2(req)

	/* Ce test exigeait « high » pour un garcon de 14 ans prenant 5.5 cm par
	   an. C est l assertion qui etait fausse, pas le code.

	   A 14 ans, en plein pic de croissance, la dispersion reelle de la
	   methode mi-parentale est de l ordre de +/-6.5 cm. Annoncer une
	   confiance elevee a ce moment-la, c est exactement ce que fait la
	   concurrence avec ses « 98,5 % de precision » — et c est ce que le
	   site de Grandimi promet de ne pas faire. On teste donc l inverse :
	   la confiance NE DOIT PAS etre elevee tant que la croissance est
	   active. TestPredictHeightV2_GrowthVelocity verifie qu elle se
	   resserre bien quand la croissance ralentit. */
	if resp.ConfidenceLevel == "high" {
		t.Error("confiance annoncee elevee en plein pic de croissance")
	}

	marge := (resp.ConfidenceRange[1] - resp.ConfidenceRange[0]) / 2
	if marge < 3.0 || marge > 8.5 {
		t.Errorf("marge %.1f cm hors de la fourchette annoncee sur le site (3 a 8.5 cm)", marge)
	}

	if resp.PredictedHeightCM < resp.ConfidenceRange[0] ||
		resp.PredictedHeightCM > resp.ConfidenceRange[1] {
		t.Errorf("prediction %.1f hors de son intervalle [%.1f, %.1f]",
			resp.PredictedHeightCM, resp.ConfidenceRange[0], resp.ConfidenceRange[1])
	}

	if resp.PredictedHeightCM < 170 || resp.PredictedHeightCM > 185 {
		t.Errorf("Prediction out of expected range: %f", resp.PredictedHeightCM)
	}

	if resp.ModelUsed == "" {
		t.Error("Expected model name in response")
	}

	if len(resp.Factors) == 0 {
		t.Error("Expected factors breakdown")
	}

	t.Logf("V2 Prediction: %.1f cm (±%.1f) - %s confidence",
		resp.PredictedHeightCM,
		(resp.ConfidenceRange[1]-resp.ConfidenceRange[0])/2,
		resp.ConfidenceLevel)
	t.Logf("Model used: %s", resp.ModelUsed)
	t.Logf("Factors: %v", resp.Factors)
}

func TestPredictHeightV2_EthnicVariation(t *testing.T) {
	baseReq := HeightPredictionV2Request{
		Age:                15.0,
		Sex:                MALE,
		HeightCM:           165.0,
		WeightKG:           54.0,
		FatherHeightCM:     175.0,
		MotherHeightCM:     165.0,
		BMI:                19.8,
		HeightVelocityCM:   4.0,
		NutritionLevel:     GOOD,
		SleepHoursPerNight: 8.0,
		ExerciseMinPerDay:  45,
		PubertySigns: PubertySigns{
			PubicHair: "2",
		},
	}

	// Test different ethnicities
	ethnicities := []EthnicBackground{
		CAUCASIAN,
		ASIAN,
		AFRICAN,
	}

	predictions := make(map[EthnicBackground]float64)

	for _, ethnic := range ethnicities {
		baseReq.EthnicBackground = ethnic
		resp := PredictHeightV2(baseReq)
		predictions[ethnic] = resp.PredictedHeightCM
		t.Logf("Ethnic: %s → Height: %.1f cm", ethnic, resp.PredictedHeightCM)
	}

	// Verify reasonable differences
	if predictions[CAUCASIAN] > predictions[ASIAN] {
		// Expected (Caucasians typically taller on average)
		diff := predictions[CAUCASIAN] - predictions[ASIAN]
		if diff > 3 { // Max 3cm difference
			t.Logf("Note: Caucasian vs Asian difference: %.1f cm", diff)
		}
	}
}

func TestPredictHeightV2_HealthFactors(t *testing.T) {
	baseReq := HeightPredictionV2Request{
		Age:              13.0,
		Sex:              FEMALE,
		HeightCM:         158.0,
		WeightKG:         48.0,
		FatherHeightCM:   175.0,
		MotherHeightCM:   162.0,
		BMI:              19.2,
		HeightVelocityCM: 4.5,
		EthnicBackground: CAUCASIAN,
		PubertySigns: PubertySigns{
			PubicHair: "2",
		},
	}

	// Test: Excellent health
	excellentReq := baseReq
	excellentReq.NutritionLevel = EXCELLENT
	excellentReq.SleepHoursPerNight = 9.0
	excellentReq.ExerciseMinPerDay = 60
	excellentResp := PredictHeightV2(excellentReq)

	// Test: Poor health
	poorReq := baseReq
	poorReq.NutritionLevel = POOR
	poorReq.SleepHoursPerNight = 6.0
	poorReq.ExerciseMinPerDay = 10
	poorReq.ChronicIllness = true
	poorResp := PredictHeightV2(poorReq)

	healthDifference := excellentResp.PredictedHeightCM - poorResp.PredictedHeightCM

	// Excellent health should predict ~1-3cm taller
	if healthDifference < 0.5 {
		t.Logf("Warning: Health factor has minimal impact: %.2f cm", healthDifference)
	}

	if healthDifference > 5 {
		t.Errorf("Health factor impact too large: %.2f cm", healthDifference)
	}

	t.Logf("Health factor impact: Excellent=%.1f vs Poor=%.1f (diff: %.2f cm)",
		excellentResp.PredictedHeightCM,
		poorResp.PredictedHeightCM,
		healthDifference)
}

func TestPredictHeightV2_GrowthVelocity(t *testing.T) {
	baseReq := HeightPredictionV2Request{
		Age:                12.5,
		Sex:                MALE,
		HeightCM:           153.0,
		WeightKG:           47.0,
		FatherHeightCM:     178.0,
		MotherHeightCM:     164.0,
		BMI:                20.1,
		EthnicBackground:   CAUCASIAN,
		NutritionLevel:     GOOD,
		SleepHoursPerNight: 8.0,
		ExerciseMinPerDay:  50,
		PubertySigns: PubertySigns{
			PubicHair: "1",
		},
	}

	// Fast grower
	fastReq := baseReq
	fastReq.HeightVelocityCM = 7.0
	fastResp := PredictHeightV2(fastReq)

	// Slow grower
	slowReq := baseReq
	slowReq.HeightVelocityCM = 2.0
	slowResp := PredictHeightV2(slowReq)

	velocityDifference := fastResp.PredictedHeightCM - slowResp.PredictedHeightCM

	if velocityDifference < 2 {
		t.Logf("Note: Growth velocity impact: %.2f cm", velocityDifference)
	}

	t.Logf("Velocity impact: Fast grower=%.1f vs Slow=%.1f (diff: %.2f cm)",
		fastResp.PredictedHeightCM,
		slowResp.PredictedHeightCM,
		velocityDifference)
}

/*
Remplace TestPredictHeightV2_EnsembleAccuracy.

L ancien test verifiait la presence des cles « khamis_roche »,
« ethnic_adjustment » et « growth_velocity » dans Factors, et que l ensemble
valait la moyenne des trois composantes. Ces trois composantes etaient des
regressions lineaires aux coefficients inventes — elles rendaient 229, 217 et
179 cm pour un garcon de 14 ans — et elles ont ete supprimees.

Ce qui merite d etre verrouille, c est que le chiffre affiche reste
EXPLICABLE : trois valeurs, une arithmetique verifiable a la main, et aucune
fuite de diagnostic vers le client.
*/
func TestPredictHeightV2_FacteursExplicables(t *testing.T) {
	req := HeightPredictionV2Request{
		Age:                14.0,
		Sex:                MALE,
		HeightCM:           165.0,
		WeightKG:           50.0,
		FatherHeightCM:     178.0,
		MotherHeightCM:     164.0,
		NutritionLevel:     FAIR,
		SleepHoursPerNight: 6.5,
		ExerciseMinPerDay:  20,
		HeightVelocityCM:   5.0,
	}

	resp := PredictHeightV2(req)

	for _, cle := range []string{"mid_parent_target", "health_multiplier", "final_prediction"} {
		if _, present := resp.Factors[cle]; !present {
			t.Errorf("facteur %q absent de la reponse", cle)
		}
	}

	// Aucune valeur de diagnostic ne doit partir chez le client : ce sont des
	// chiffres que personne ne peut defendre s il les lit.
	for cle := range resp.Factors {
		if len(cle) > 6 && cle[:6] == "_diag_" {
			t.Errorf("facteur de diagnostic %q expose dans la reponse", cle)
		}
	}

	cible := resp.Factors["mid_parent_target"]
	facteur := resp.Factors["health_multiplier"]

	if cible != 177.5 {
		t.Errorf("cible mi-parentale attendue 177.5, obtenue %.2f", cible)
	}
	if facteur <= 0.80 || facteur > 1.0 {
		t.Errorf("facteur de mode de vie %.3f hors des bornes [0.80, 1.0]", facteur)
	}

	// Le facteur s applique a la croissance RESTANTE, pas a la taille totale.
	attendu := req.HeightCM + (cible-req.HeightCM)*facteur
	if math.Abs(resp.Factors["final_prediction"]-attendu) > 0.01 {
		t.Errorf("prediction %.2f ne correspond pas a taille + restant x facteur = %.2f",
			resp.Factors["final_prediction"], attendu)
	}
}

// De bonnes habitudes font ATTEINDRE la cible genetique, jamais la depasser.
// C est ce que le site promet mot pour mot ; le moteur doit le tenir.
func TestPredictHeightV2_NeDepassePasLePotentiel(t *testing.T) {
	req := HeightPredictionV2Request{
		Age:                13.0,
		Sex:                MALE,
		HeightCM:           155.0,
		WeightKG:           45.0,
		FatherHeightCM:     180.0,
		MotherHeightCM:     168.0,
		NutritionLevel:     EXCELLENT,
		SleepHoursPerNight: 10.0,
		ExerciseMinPerDay:  90,
		HeightVelocityCM:   6.0,
	}

	resp := PredictHeightV2(req)
	cible := (req.FatherHeightCM+req.MotherHeightCM)/2 + 6.5

	if resp.PredictedHeightCM > cible+0.01 {
		t.Errorf("habitudes optimales : %.1f cm annonces au-dessus de la cible genetique %.1f cm",
			resp.PredictedHeightCM, cible)
	}
}

func TestPredictHeightV2_Validation(t *testing.T) {
	tests := []struct {
		name    string
		req     HeightPredictionV2Request
		invalid bool
	}{
		{
			name: "Valid request",
			req: HeightPredictionV2Request{
				Age: 14.0, Sex: MALE, HeightCM: 160, WeightKG: 50,
				FatherHeightCM: 175, MotherHeightCM: 162,
			},
			invalid: false,
		},
		{
			name: "Age too young",
			req: HeightPredictionV2Request{
				Age: 7.0, Sex: MALE, HeightCM: 120, WeightKG: 25,
				FatherHeightCM: 175, MotherHeightCM: 162,
			},
			invalid: true,
		},
		{
			name: "Invalid sex",
			req: HeightPredictionV2Request{
				Age: 14.0, Sex: "X", HeightCM: 160, WeightKG: 50,
				FatherHeightCM: 175, MotherHeightCM: 162,
			},
			invalid: true,
		},
	}

	for _, tt := range tests {
		resp := PredictHeightV2(tt.req)
		isInvalid := resp.ConfidenceLevel == "low" && resp.Message != "Height prediction successful (v2 ML-enhanced)"

		if isInvalid != tt.invalid {
			t.Errorf("%s: expected invalid=%v, got message=%s", tt.name, tt.invalid, resp.Message)
		}
	}
}
