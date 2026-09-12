package estimator

import (
	"testing"
)

func TestPredictHeightV2_HighConfidenceData(t *testing.T) {
	req := HeightPredictionV2Request{
		Age:            14.5,
		Sex:            MALE,
		HeightCM:       162.0,
		WeightKG:       52.0,
		FatherHeightCM: 178.0,
		MotherHeightCM: 164.0,
		BMI:            19.8, // Healthy
		HeightVelocityCM: 5.5, // Good growth velocity
		EthnicBackground: CAUCASIAN,
		NutritionLevel: GOOD,
		SleepHoursPerNight: 8.5, // Optimal
		ExerciseMinPerDay: 60,   // Good activity
		MaternalDiabetes: false,
		ChronicIllness:   false,
		PubertySigns: PubertySigns{
			PubicHair: "3",
			Genitalia: "3",
		},
	}

	resp := PredictHeightV2(req)

	// La confiance suit la croissance qui RESTE a parcourir, pas le
	// nombre de champs renseignes : a 14,5 ans avec 5,5 cm pris dans
	// l annee, l issue est genuinement incertaine.
	if resp.ConfidenceLevel == "" {
		t.Error("Expected a confidence level, got empty")
	}

	// Ce qui doit etre vrai : un adolescent dont la croissance touche a
	// sa fin obtient un intervalle PLUS ETROIT que le meme profil en
	// plein pic. C est la regle que le modele applique reellement.
	finDeCroissance := req
	finDeCroissance.Age = 17.0
	finDeCroissance.HeightVelocityCM = 1.5
	respFin := PredictHeightV2(finDeCroissance)

	picDeCroissance := req
	picDeCroissance.Age = 13.0
	picDeCroissance.HeightVelocityCM = 8.0
	respPic := PredictHeightV2(picDeCroissance)

	largeurFin := respFin.ConfidenceRange[1] - respFin.ConfidenceRange[0]
	largeurPic := respPic.ConfidenceRange[1] - respPic.ConfidenceRange[0]
	if largeurFin >= largeurPic {
		t.Errorf("croissance finie : intervalle %.1f cm ; pic de croissance : %.1f cm — le premier devrait etre plus etroit",
			largeurFin, largeurPic)
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
		Age:            15.0,
		Sex:            MALE,
		HeightCM:       165.0,
		WeightKG:       54.0,
		FatherHeightCM: 175.0,
		MotherHeightCM: 165.0,
		BMI:            19.8,
		HeightVelocityCM: 4.0,
		NutritionLevel: GOOD,
		SleepHoursPerNight: 8.0,
		ExerciseMinPerDay: 45,
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
		Age:            13.0,
		Sex:            FEMALE,
		HeightCM:       158.0,
		WeightKG:       48.0,
		FatherHeightCM: 175.0,
		MotherHeightCM: 162.0,
		BMI:            19.2,
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
		Age:            12.5,
		Sex:            MALE,
		HeightCM:       153.0,
		WeightKG:       47.0,
		FatherHeightCM: 178.0,
		MotherHeightCM: 164.0,
		BMI:            20.1,
		EthnicBackground: CAUCASIAN,
		NutritionLevel: GOOD,
		SleepHoursPerNight: 8.0,
		ExerciseMinPerDay: 50,
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

func TestPredictHeightV2_EnsembleAccuracy(t *testing.T) {
	req := HeightPredictionV2Request{
		Age:            14.0,
		Sex:            MALE,
		HeightCM:       165.0,
		WeightKG:       55.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
		BMI:            20.2,
		HeightVelocityCM: 5.0,
		EthnicBackground: CAUCASIAN,
		NutritionLevel: GOOD,
		SleepHoursPerNight: 8.5,
		ExerciseMinPerDay: 60,
		PubertySigns: PubertySigns{
			PubicHair: "3",
		},
	}

	resp := PredictHeightV2(req)

	// Check that ensemble combines multiple models
	if resp.Factors["khamis_roche"] == 0 {
		t.Error("Missing Khamis-Roche factor")
	}
	if resp.Factors["ethnic_adjusted"] == 0 {
		t.Error("Missing ethnic adjustment factor")
	}
	if resp.Factors["growth_velocity"] == 0 {
		t.Error("Missing growth velocity factor")
	}

	// Ensemble should be roughly average of components
	components := []float64{
		resp.Factors["khamis_roche"],
		resp.Factors["ethnic_adjusted"],
		resp.Factors["growth_velocity"],
	}

	sum := 0.0
	for _, c := range components {
		sum += c
	}
	average := sum / float64(len(components))

	ensemblePred := resp.Factors["ensemble_prediction"]
	difference := (ensemblePred - average) / average * 100

	if difference > 5 {
		t.Logf("Warning: Ensemble diverged from average by %.1f%%", difference)
	}

	t.Logf("Ensemble calculation: Avg of components=%.1f, Ensemble=%.1f (diff: %.1f%%)",
		average, ensemblePred, difference)
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
