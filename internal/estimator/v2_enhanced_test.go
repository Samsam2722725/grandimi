package estimator

import (
	"math"
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

	/* LE SENS EST L INVERSE DE L INTUITION, ET C EST TOUT L INTERET DU
	   TEST. Grandir vite pour son age, c est surtout etre en avance
	   pubertaire : le pic est en cours, la croissance finira plus tot, et
	   l ancre trajectoire — qui suppose le couloir tenu jusqu a 19 ans —
	   surestime. Le rapide doit donc recevoir MOINS que le lent.

	   Ce test n assertait rien avant : il mesurait un ecart puis le
	   passait a t.Logf quel qu il soit. Il valait exactement zero, et la
	   vitesse ne deplacait effectivement pas le chiffre. */
	if fastResp.PredictedHeightCM >= slowResp.PredictedHeightCM {
		t.Errorf("a 12,5 ans, 7 cm/an (%.1f) devrait rendre MOINS que 2 cm/an (%.1f) : en avance pubertaire, la croissance finit plus tot",
			fastResp.PredictedHeightCM, slowResp.PredictedHeightCM)
	}

	ecart := slowResp.PredictedHeightCM - fastResp.PredictedHeightCM
	if ecart > 4 {
		t.Errorf("ecart de %.1f cm entre les deux vitesses : trop fort pour un signal auto-declare, baisser coefficientVitesse", ecart)
	}

	// Vitesse non renseignee : ni bonus ni malus, la correction est nulle.
	sansVitesse := PredictHeightV2(baseReq)
	if sansVitesse.Factors["correction_maturite"] != 0 {
		t.Errorf("aucun signal de maturite : correction %.2f cm, attendu 0", sansVitesse.Factors["correction_maturite"])
	}

	t.Logf("12,5 ans : 2 cm/an -> %.1f cm | 7 cm/an -> %.1f cm | ecart %.1f cm",
		slowResp.PredictedHeightCM, fastResp.PredictedHeightCM, ecart)
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

	// Le calcul doit etre lisible : d ou part-on, de combien module-t-on,
	// ou arrive-t-on. C est ce que la page promet d expliquer.
	for _, cle := range []string{
		"khamis_roche", "percentile_projection", "mid_parent_target",
		"vitesse_attendue", "blended_base", "health_multiplier", "final_prediction",
	} {
		if resp.Factors[cle] == 0 {
			t.Errorf("facteur %q absent de la reponse", cle)
		}
	}

	/* Les trois predicteurs lineaires non calibres ne doivent PAS
	   ressortir. Ils rendaient 218 cm sur cet enfant, et la reponse les
	   publiait en clair a chaque appel. Ils ont depuis ete supprimes du
	   code ; "khamis_roche" ci-dessus est la VRAIE methode, en unites
	   imperiales (khamis_roche_table.go), et non l ancienne table mal
	   nommee qui portait ce nom. */
	for _, cle := range []string{"ethnic_adjusted", "growth_velocity", "ensemble_prediction", "_diag_khamis_roche"} {
		if _, present := resp.Factors[cle]; present {
			t.Errorf("le facteur non calibre %q est reexpose dans la reponse", cle)
		}
	}

	/* La base est la moyenne de Khamis-Roche et de la trajectoire OMS.
	   La cible mi-parentale reste exposee, mais elle n entre PLUS dans le
	   calcul : c est precisement le correctif. */
	moyenne := (resp.Factors["khamis_roche"]+resp.Factors["percentile_projection"])/2 +
		resp.Factors["correction_maturite"]
	if math.Abs(resp.Factors["blended_base"]-moyenne) > 0.01 {
		t.Errorf("blended_base = %.2f, attendu %.2f (Khamis-Roche %.1f, percentile %.1f, correction maturite %+.2f)",
			resp.Factors["blended_base"], moyenne,
			resp.Factors["khamis_roche"], resp.Factors["percentile_projection"],
			resp.Factors["correction_maturite"])
	}

	ancienne := (resp.Factors["mid_parent_target"] + resp.Factors["percentile_projection"]) / 2
	if math.Abs(resp.Factors["blended_base"]-ancienne) < 0.01 {
		t.Errorf("blended_base vaut encore la moyenne mi-parentale + trajectoire (%.2f) : l ancre mi-parentale est revenue dans le calcul", ancienne)
	}

	// Le resultat annonce est bien cette base modulee, pas autre chose.
	attendu := resp.Factors["blended_base"] * resp.Factors["health_multiplier"]
	if attendu < req.HeightCM {
		attendu = req.HeightCM // plancher : on ne retrecit pas
	}
	if math.Abs(resp.Factors["final_prediction"]-attendu) > 0.01 {
		t.Errorf("final_prediction = %.2f, attendu %.2f (base %.2f x facteur %.4f)",
			resp.Factors["final_prediction"], attendu,
			resp.Factors["blended_base"], resp.Factors["health_multiplier"])
	}

	t.Logf("Khamis-Roche %.1f / percentile %.1f -> base %.1f x %.4f = %.1f cm",
		resp.Factors["khamis_roche"], resp.Factors["percentile_projection"],
		resp.Factors["blended_base"], resp.Factors["health_multiplier"],
		resp.Factors["final_prediction"])
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
			// 20 ans : accepte depuis que la borne haute est passee a 22.
			// Chez le garcon la fermeture des cartilages s etale jusque vers
			// 21-22 ans ; refuser ce profil renvoyait une erreur de
			// validation en fin de questionnaire a quelqu un qui venait
			// precisement poser la question.
			name: "Jeune adulte encore dans la fenetre",
			req: HeightPredictionV2Request{
				Age: 20.0, Sex: MALE, HeightCM: 178, WeightKG: 70,
				FatherHeightCM: 175, MotherHeightCM: 162,
			},
			invalid: false,
		},
		{
			name: "Age too old",
			req: HeightPredictionV2Request{
				Age: 23.0, Sex: MALE, HeightCM: 178, WeightKG: 70,
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

// Le second scenario chiffre ce que les habitudes actuelles coutent : c est
// la seule justification honnete du plan payant, et elle doit sortir du meme
// modele que l estimation affichee.
func TestPredictHeightV2_PotentielSelonHabitudes(t *testing.T) {
	base := HeightPredictionV2Request{
		Age:              14.0,
		Sex:              MALE,
		HeightCM:         165.0,
		WeightKG:         55.0,
		FatherHeightCM:   176.0,
		MotherHeightCM:   164.0,
		HeightVelocityCM: 5.0,
		EthnicBackground: CAUCASIAN,
	}

	// Habitudes degradees : le potentiel doit etre STRICTEMENT au-dessus de
	// l estimation courante, sinon la page de resultat n a rien a montrer.
	degrade := base
	degrade.SleepHoursPerNight = 6.0
	degrade.NutritionLevel = POOR
	degrade.ExerciseMinPerDay = 10

	rDegrade := PredictHeightV2(degrade)
	if rDegrade.PotentialHeightCM <= rDegrade.PredictedHeightCM {
		t.Errorf("habitudes degradees : potentiel %.1f devrait depasser l estimation %.1f",
			rDegrade.PotentialHeightCM, rDegrade.PredictedHeightCM)
	}

	// L ecart reste borne par la bande de calculateHealthFactor. Au-dela de
	// six centimetres, c est que le plafond a saute — et on se remettrait a
	// promettre ce que le produit refuse de promettre.
	ecart := rDegrade.PotentialHeightCM - rDegrade.PredictedHeightCM
	if ecart > 6.0 {
		t.Errorf("ecart de %.1f cm : trop large pour un effet de mode de vie", ecart)
	}

	// Habitudes deja a la cible : rien a aller chercher, les deux valeurs se
	// rejoignent. L ecran doit alors dire « tes habitudes ne te coutent
	// rien », pas inventer un manque.
	optimal := base
	optimal.SleepHoursPerNight = 9.0
	optimal.NutritionLevel = EXCELLENT
	optimal.ExerciseMinPerDay = 60

	rOptimal := PredictHeightV2(optimal)
	if rOptimal.PotentialHeightCM != rOptimal.PredictedHeightCM {
		t.Errorf("habitudes optimales : potentiel %.1f et estimation %.1f devraient etre egaux",
			rOptimal.PotentialHeightCM, rOptimal.PredictedHeightCM)
	}

	// Le potentiel ne descend jamais sous l estimation, quel que soit le
	// profil : ce serait afficher une perte a qui fait deja tout bien.
	if rOptimal.PotentialHeightCM < rOptimal.PredictedHeightCM {
		t.Error("le potentiel ne doit jamais passer sous l estimation")
	}
}

// Le milieu de la bande doit etre ATTEIGNABLE. Avant le passage au score, le
// produit des coefficients saturait le plafond des qu on dormait et bougeait
// correctement : « alimentation moyenne » et « alimentation tres suivie »
// rendaient le meme centimetre, et le second scenario n avait plus rien a
// montrer. C est la regression que ce test empeche de revenir.
func TestCalculateHealthFactor_GradientLisible(t *testing.T) {
	base := HeightPredictionV2Request{
		Age: 14, Sex: MALE, HeightCM: 165, WeightKG: 55,
		FatherHeightCM: 176, MotherHeightCM: 164, HeightVelocityCM: 5,
	}

	moyen := base
	moyen.SleepHoursPerNight = 7.5
	moyen.NutritionLevel = FAIR
	moyen.ExerciseMinPerDay = 30

	cible := base
	cible.SleepHoursPerNight = 9
	cible.NutritionLevel = EXCELLENT
	cible.ExerciseMinPerDay = 60

	degrade := base
	degrade.SleepHoursPerNight = 6
	degrade.NutritionLevel = POOR
	degrade.ExerciseMinPerDay = 10

	fMoyen := calculateHealthFactor(moyen)
	fCible := calculateHealthFactor(cible)
	fDegrade := calculateHealthFactor(degrade)

	// L ordre doit etre strict : chaque palier se distingue du suivant.
	if !(fDegrade < fMoyen && fMoyen < fCible) {
		t.Errorf("les trois paliers doivent etre strictement ordonnes : degrade=%.4f moyen=%.4f cible=%.4f",
			fDegrade, fMoyen, fCible)
	}

	// L enveloppe documentee ne bouge pas.
	if fCible > 1.01 || fDegrade < 0.98 {
		t.Errorf("enveloppe depassee : cible=%.4f (max 1.01), degrade=%.4f (min 0.98)", fCible, fDegrade)
	}

	// Ne rien declarer reste neutre : pas de penalite silencieuse.
	if f := calculateHealthFactor(base); f != 1.0 {
		t.Errorf("aucun levier declare : facteur attendu 1.0, obtenu %.4f", f)
	}

	// Un seul levier ameliore doit se voir, meme si les autres ne bougent pas.
	nutritionMieux := moyen
	nutritionMieux.NutritionLevel = EXCELLENT
	if calculateHealthFactor(nutritionMieux) <= fMoyen {
		t.Error("ameliorer la seule alimentation ne change rien : le plafond sature de nouveau")
	}
}
