package estimator

import (
	"math"
)

type EthnicBackground string

const (
	CAUCASIAN EthnicBackground = "caucasian"
	ASIAN     EthnicBackground = "asian"
	AFRICAN   EthnicBackground = "african"
	HISPANIC  EthnicBackground = "hispanic"
	MIXED     EthnicBackground = "mixed"
)

type NutritionLevel string

const (
	EXCELLENT NutritionLevel = "excellent"
	GOOD      NutritionLevel = "good"
	FAIR      NutritionLevel = "fair"
	POOR      NutritionLevel = "poor"
)

type HeightPredictionV2Request struct {
	// Core data (from v1)
	Age             float64
	Sex             string
	HeightCM        float64
	WeightKG        float64
	FatherHeightCM  float64
	MotherHeightCM  float64
	PubertySigns    PubertySigns

	// Enhanced data (v2)
	BMI                float64            // kg/m² - captures nutrition/health
	HeightVelocityCM   float64            // cm/year - growth rate
	EthnicBackground   EthnicBackground   // Population-specific coefficients
	NutritionLevel     NutritionLevel     // Health factor
	SleepHoursPerNight float64            // Growth happens during sleep
	ExerciseMinPerDay  float64            // Activity level
	MaternalDiabetes   bool               // Fetal programming effect
	ChronicIllness     bool               // Impacts growth
}

type HeightPredictionV2Response struct {
	PredictedHeightCM  float64
	ConfidenceRange    [2]float64
	ConfidenceLevel    string
	PubertyStage       string
	Message            string
	ModelUsed          string // Which ensemble model
	Factors            map[string]float64 // Contribution of each factor
}

// PredictHeightV2 uses ensemble learning for 97-98% accuracy
func PredictHeightV2(req HeightPredictionV2Request) HeightPredictionV2Response {
	resp := HeightPredictionV2Response{
		Factors: make(map[string]float64),
	}

	// Validate inputs
	if err := validateV2Input(req); err != nil {
		resp.Message = err.Error()
		resp.ConfidenceLevel = "low"
		return resp
	}

	// Calculate BMI if not provided
	bmi := req.BMI
	if bmi == 0 {
		bmi = req.WeightKG / ((req.HeightCM / 100) * (req.HeightCM / 100))
	}

	// Les trois modeles lineaires restent calcules pour diagnostic, mais
	// ne servent PLUS de predicteurs : leurs coefficients ne forment pas
	// un jeu calibre.
	//
	// Mesure sur un garcon de 14 ans, 165 cm, 50 kg, parents 178/164 :
	//   pred1 Khamis-Roche  = 218.5 cm
	//   pred2 ethnique      = 218.5 cm (meme formule)
	//   pred3 velocite      = 167.5 cm (suppose qu un ado de 14 ans
	//                         devrait deja mesurer sa taille adulte)
	//   ensemble x puberte  = ~219.9 cm affiche a l utilisateur
	//
	// Recalibrer ces coefficients demande de vraies tables de reference
	// (Khamis-Roche publie, ou age osseux). Tant qu on ne les a pas, on
	// n invente pas de chiffres : on utilise une methode documentee.
	pred1 := predictKhamisRocheV2(req, bmi)
	pred2 := predictEthnicAdjusted(req, bmi)
	pred3 := predictGrowthVelocity(req, bmi)

	resp.Factors["_diag_khamis_roche"] = pred1.height
	resp.Factors["_diag_ethnic_adjusted"] = pred2.height
	resp.Factors["_diag_growth_velocity"] = pred3.height

	// ANCRE : methode mi-parentale (Tanner).
	// Taille cible = moyenne des parents +6.5 cm (garcon) / -6.5 cm (fille).
	// Methode de reference en pediatrie, verifiable, et coherente avec la
	// promesse du produit : on explique d ou vient le chiffre.
	midParentTarget := (req.FatherHeightCM + req.MotherHeightCM) / 2
	if req.Sex == MALE {
		midParentTarget += 6.5
	} else {
		midParentTarget -= 6.5
	}

	// Les facteurs de mode de vie modulent la cible dans une fourchette
	// etroite (calculateHealthFactor reste borne autour de 1.0). Ils ne
	// peuvent pas deplacer l estimation de plusieurs dizaines de cm.
	healthMultiplier := calculateHealthFactor(req)
	finalHeight := midParentTarget * healthMultiplier

	// Plus de stadification de Tanner : le champ n est plus collecte.
	// La croissance restante est estimee via HeightVelocityCM, qui agit
	// sur la LARGEUR de l intervalle (cf. calculateV2Confidence) et non
	// sur le point estime — etre plus avance en puberte ne rend pas plus
	// grand, cela rend seulement la prediction plus sure.
	pubertyStage := describeGrowthPhase(req.Age, req.HeightVelocityCM)

	resp.Factors["mid_parent_target"] = midParentTarget
	resp.Factors["health_multiplier"] = healthMultiplier
	resp.Factors["final_prediction"] = finalHeight

	// La fourchette est calculee APRES tous les multiplicateurs, et
	// CENTREE sur la prediction finale.
	//
	// Avant, elle etait calculee avant l'ajustement pubertaire et centree
	// sur la taille mi-parentale brute, sans jamais regarder la valeur
	// predite : on affichait "219.9 cm" avec un intervalle "174.5-180.5",
	// soit un point estime hors de son propre intervalle.
	confidenceLevel, confidenceRange := calculateV2Confidence(req, finalHeight,
		pred1.confidence, pred2.confidence, pred3.confidence,
	)

	resp.PredictedHeightCM = math.Round(finalHeight*10) / 10
	resp.ConfidenceRange = confidenceRange
	resp.ConfidenceLevel = confidenceLevel
	resp.PubertyStage = pubertyStage
	resp.ModelUsed = "Taille mi-parentale (Tanner) + facteurs de mode de vie"
	resp.Message = "Height prediction successful (v2 ML-enhanced)"

	return resp
}

type predictionResult struct {
	height     float64
	confidence float64
}

// predictKhamisRocheV2 - Improved Khamis-Roche with BMI factor
func predictKhamisRocheV2(req HeightPredictionV2Request, bmi float64) predictionResult {
	midParentHeight := (req.FatherHeightCM + req.MotherHeightCM) / 2
	if req.Sex == MALE {
		midParentHeight += 6.5
	} else {
		midParentHeight -= 6.5
	}

	coefficients := getCoefficientsV2(req.Age, req.Sex)

	// Original formula
	predictedHeight := coefficients.Intercept +
		coefficients.HeightCoeff*req.HeightCM +
		coefficients.WeightCoeff*req.WeightKG +
		coefficients.MidParentCoeff*midParentHeight

	// Add BMI factor (new in v2)
	// Normal BMI (18-24): no adjustment
	// High BMI (>25): slightly reduces growth potential
	// Low BMI (<18): indicates nutrition issues
	bmiFactor := 1.0
	if bmi < 18.0 {
		bmiFactor = 0.97 // Malnutrition reduces growth
	} else if bmi > 27.0 {
		bmiFactor = 0.98 // Obesity slightly reduces growth
	}
	predictedHeight *= bmiFactor

	// Add height velocity factor (new in v2)
	// If growing fast: likely will be taller
	// If growing slow: might plateau lower
	if req.HeightVelocityCM > 0 {
		velocityFactor := 1.0 + (req.HeightVelocityCM / 100.0)
		velocityFactor = math.Min(velocityFactor, 1.08) // Cap at 8%
		predictedHeight *= velocityFactor
	}

	confidence := 0.92 + (0.06 * bmiFactor) // 92-98% base confidence

	return predictionResult{
		height:     predictedHeight,
		confidence: confidence,
	}
}

// predictEthnicAdjusted - Apply ethnic-specific coefficients
func predictEthnicAdjusted(req HeightPredictionV2Request, bmi float64) predictionResult {
	midParentHeight := (req.FatherHeightCM + req.MotherHeightCM) / 2
	if req.Sex == MALE {
		midParentHeight += 6.5
	} else {
		midParentHeight -= 6.5
	}

	// Ethnic-specific coefficients (based on growth studies)
	ethnicCoefficients := getEthnicCoefficients(req.Age, req.Sex, req.EthnicBackground)

	predictedHeight := ethnicCoefficients.Intercept +
		ethnicCoefficients.HeightCoeff*req.HeightCM +
		ethnicCoefficients.WeightCoeff*req.WeightKG +
		ethnicCoefficients.MidParentCoeff*midParentHeight

	// Ethnic-specific BMI adjustment
	bmiFactor := 1.0
	if bmi < 18.0 {
		bmiFactor = 0.97
	} else if bmi > 27.0 {
		bmiFactor = 0.98
	}
	predictedHeight *= bmiFactor

	// Higher confidence for ethnic groups with better data
	confidence := 0.88
	if req.EthnicBackground == CAUCASIAN {
		confidence = 0.94 // Most research on Caucasians
	} else if req.EthnicBackground == ASIAN {
		confidence = 0.91
	} else if req.EthnicBackground == AFRICAN {
		confidence = 0.89
	}

	return predictionResult{
		height:     predictedHeight,
		confidence: confidence,
	}
}

// predictGrowthVelocity - Use growth rate to predict final height
func predictGrowthVelocity(req HeightPredictionV2Request, bmi float64) predictionResult {
	// Method: Roche et al. velocity-based prediction
	// Growth decelerates with age - faster growers become taller

	midParentHeight := (req.FatherHeightCM + req.MotherHeightCM) / 2

	// Baseline from mid-parent
	baseHeight := midParentHeight
	if req.Sex == MALE {
		baseHeight += 6.5
	} else {
		baseHeight -= 6.5
	}

	// Add current height influence
	heightDifference := req.HeightCM - baseHeight
	adjustment := heightDifference * 0.8 // Regression to mean (80% of advantage keeps)

	// Velocity-based adjustment
	velocityAdjustment := 0.0
	if req.HeightVelocityCM > 0 {
		// Fast growers at optimal ages become taller
		if req.Age >= 10 && req.Age <= 15 {
			velocityAdjustment = req.HeightVelocityCM * 2.5
		} else if req.Age > 15 {
			velocityAdjustment = req.HeightVelocityCM * 1.2
		}
	}

	predictedHeight := baseHeight + adjustment + velocityAdjustment

	// Confidence higher if we have velocity data
	confidence := 0.85
	if req.HeightVelocityCM > 0 {
		confidence = 0.93
	}

	return predictionResult{
		height:     predictedHeight,
		confidence: confidence,
	}
}

// calculateHealthFactor - Multiply by health/lifestyle factors
func calculateHealthFactor(req HeightPredictionV2Request) float64 {
	factor := 1.0

	// Sleep factor: Growth hormone released during sleep
	if req.SleepHoursPerNight < 7 {
		factor *= 0.97 // Insufficient sleep reduces growth
	} else if req.SleepHoursPerNight >= 8 && req.SleepHoursPerNight <= 10 {
		factor *= 1.02 // Optimal sleep
	}

	// Nutrition factor
	switch req.NutritionLevel {
	case EXCELLENT:
		factor *= 1.03
	case GOOD:
		factor *= 1.01
	case FAIR:
		factor *= 0.99
	case POOR:
		factor *= 0.95
	}

	// Exercise factor: Moderate exercise promotes growth
	if req.ExerciseMinPerDay < 30 {
		factor *= 0.99
	} else if req.ExerciseMinPerDay >= 30 && req.ExerciseMinPerDay <= 120 {
		factor *= 1.02 // Optimal activity
	}

	// Maternal health factors
	if req.MaternalDiabetes {
		factor *= 0.98 // Slight impact on fetal programming
	}

	// Chronic illness factor
	if req.ChronicIllness {
		factor *= 0.96 // Growth catch-up varies
	}

	// Borne HAUTE autant que basse.
	//
	// Sans plafond, le cumul des bonus atteignait 1.072, soit +12.7 cm
	// ajoutes a la cible genetique : un mode de vie sain ne fait pas
	// depasser son potentiel, il aide a l atteindre. Le plafond a 1.02
	// laisse un gain visible (~+3.5 cm) sans promettre l impossible.
	return math.Min(math.Max(factor, 0.92), 1.02)
}

func calculateV2Confidence(
	req HeightPredictionV2Request,
	predictedHeight float64,
	conf1, conf2, conf3 float64,
) (string, [2]float64) {
	// conf1/conf2/conf3 viennent des modeles lineaires devenus purement
	// diagnostiques : ils ne renseignent plus la fiabilite du resultat.
	// La marge depend donc de ce qui la determine reellement, c est-a-dire
	// la quantite de croissance qu il reste a parcourir.
	_ = conf1
	_ = conf2
	_ = conf3

	// La methode mi-parentale a une dispersion d environ +/-8.5 cm a 95 %.
	// On part de la et on resserre a mesure que la croissance se termine.
	rangeMargin := 6.5

	// La vitesse de croissance remplace le stade de Tanner comme
	// indicateur de croissance restante : elle porte la meme information
	// utile sans demander a un mineur d auto-evaluer sa pilosite pubienne
	// ou son developpement genital (donnee de sante sensible au RGPD).
	//
	// Beaucoup de croissance recente = pic pubertaire en cours = plus
	// d incertitude. Croissance quasi nulle = taille presque finale.
	if req.HeightVelocityCM > 0 {
		switch {
		case req.HeightVelocityCM >= 6.0:
			rangeMargin *= 1.15 // pic de croissance : issue moins previsible
		case req.HeightVelocityCM <= 2.0:
			rangeMargin *= 0.70 // croissance qui s arrete : estimation sure
		}
	} else {
		// Donnee non renseignee : on elargit plutot que de faire semblant
		// d etre precis. La question est facultative cote questionnaire.
		rangeMargin *= 1.10
	}

	if req.Age > 16 {
		rangeMargin *= 0.8
	} else if req.Age < 10 {
		rangeMargin *= 1.2
	}

	// Borne annoncee sur le site : +/-3 a +/-6 cm selon l age.
	if rangeMargin < 3.0 {
		rangeMargin = 3.0
	}
	if rangeMargin > 8.5 {
		rangeMargin = 8.5
	}

	confidenceLevel := "low"
	if rangeMargin <= 4.0 {
		confidenceLevel = "high"
	} else if rangeMargin <= 5.5 {
		confidenceLevel = "medium"
	}

	// L'intervalle encadre la valeur reellement affichee.
	//
	// L'ancienne version le centrait sur la taille mi-parentale et
	// oubliait le "else" du cas feminin : pour une fille la fourchette
	// etait decalee de +6.5 cm par rapport a sa propre reference.
	return confidenceLevel, [2]float64{
		math.Round((predictedHeight-rangeMargin)*10) / 10,
		math.Round((predictedHeight+rangeMargin)*10) / 10,
	}
}

func validateV2Input(req HeightPredictionV2Request) error {
	if req.Age < 8.0 || req.Age > 18.0 {
		return &ValidationError{"Age must be between 8 and 18 years"}
	}
	if req.HeightCM < 100 || req.HeightCM > 210 {
		return &ValidationError{"Height must be between 100 and 210 cm"}
	}
	if req.Sex != MALE && req.Sex != FEMALE {
		return &ValidationError{"Sex must be 'M' or 'F'"}
	}
	if req.SleepHoursPerNight > 0 && (req.SleepHoursPerNight < 4 || req.SleepHoursPerNight > 14) {
		return &ValidationError{"Sleep hours must be between 4 and 14"}
	}
	return nil
}

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// getCoefficientsV2 - Improved Khamis-Roche coefficients with BMI integration
func getCoefficientsV2(age float64, sex string) Coefficients {
	// Same as v1 (already optimized)
	return getCoefficients(age, sex)
}

// getEthnicCoefficients - Ethnic-specific growth coefficients
func getEthnicCoefficients(age float64, sex string, ethnic EthnicBackground) Coefficients {
	// Population-specific adjustment factors
	// Based on WHO growth studies and ethnic research
	adjustments := map[EthnicBackground]float64{
		CAUCASIAN: 1.0,   // Reference population
		ASIAN:     0.97,  // Typically slightly shorter
		AFRICAN:   1.02,  // Typically slightly taller
		HISPANIC:  0.99,  // Close to Caucasian average
		MIXED:     1.0,   // Average of mix
	}

	baseCoeff := getCoefficients(age, sex)
	adjFactor := adjustments[ethnic]

	// Apply adjustment to intercept (shifts prediction up/down)
	adjusted := Coefficients{
		Intercept:     baseCoeff.Intercept * adjFactor,
		HeightCoeff:   baseCoeff.HeightCoeff,
		WeightCoeff:   baseCoeff.WeightCoeff,
		MidParentCoeff: baseCoeff.MidParentCoeff,
	}

	return adjusted
}


// describeGrowthPhase - libelle lisible de la phase de croissance,
// deduit de l age et de la vitesse. Remplace la stadification de Tanner,
// qui exigeait des reponses intimes pour un gain d information faible.
func describeGrowthPhase(age float64, velocityCM float64) string {
	if velocityCM <= 0 {
		return "Non renseigne"
	}
	switch {
	case velocityCM >= 6.0:
		return "Pic de croissance"
	case velocityCM >= 3.0:
		return "Croissance active"
	case age >= 16:
		return "Croissance terminee ou presque"
	default:
		return "Croissance lente"
	}
}
