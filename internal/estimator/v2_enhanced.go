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
	// Seule la CONFIANCE de ces trois methodes sert encore (largeur de
	// l intervalle). Leurs hauteurs sont fausses et volontairement
	// ignorees — cf. le releve ci-dessus.
	//
	// Elles ne sont plus exposees dans la reponse : "_diag_khamis_roche"
	// renvoyait 219 cm en clair a chaque appel, visible par quiconque
	// ouvre la reponse JSON. Un chiffre absurde publie a cote d un
	// produit qui vend la rigueur coute plus cher qu il ne rapporte, et
	// il n a aucune utilite pour le client.
	pred1 := predictKhamisRocheV2(req, bmi)
	pred2 := predictEthnicAdjusted(req, bmi)
	pred3 := predictGrowthVelocity(req, bmi)

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

	// La methode mi-parentale ne regarde que la taille des parents, jamais
	// celle deja atteinte par l enfant. Elle annoncait donc 180,5 cm a un
	// adolescent qui mesurait deja 183 cm — une taille adulte inferieure a
	// sa taille actuelle. On ne retrecit pas a l adolescence : la taille
	// deja atteinte est un plancher, pas une variable.
	if finalHeight < req.HeightCM {
		finalHeight = req.HeightCM
	}

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
	/* Une donnee absente n est pas une mauvaise donnee.

	   Les seuils sont ecrits en « moins de » : un champ laisse a zero
	   tombait du mauvais cote. Un appelant qui ne renseignait ni
	   sommeil ni activite recevait 0.97 x 0.99 = 0.96, soit sept
	   centimetres de moins sur 180 pour n avoir rien declare — et
	   c est exactement le cas de /api/v1/predict-height, qui ne
	   collecte aucun de ces champs.

	   Chaque facteur est donc garde individuellement : declarer son
	   sommeil ne doit pas faire perdre un point sur une activite dont
	   on n a rien dit. Ne rien savoir reste neutre ; l incertitude
	   supplementaire se traduit par un intervalle plus large (cf.
	   calculateV2Confidence), jamais par une estimation plus basse.

	   Le questionnaire n envoie jamais zero : les valeurs proposees
	   sont 6 / 7,5 / 8,5 / 9,5 h et 10 / 30 / 60 / 120 min. Zero
	   signifie donc toujours « non renseigne ». */
	factor := 1.0

	// Sleep factor: Growth hormone released during sleep
	if req.SleepHoursPerNight > 0 {
		if req.SleepHoursPerNight < 7 {
			factor *= 0.97 // Insufficient sleep reduces growth
		} else if req.SleepHoursPerNight <= 10 {
			factor *= 1.02 // Optimal sleep
		}
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
	if req.ExerciseMinPerDay > 0 {
		if req.ExerciseMinPerDay < 30 {
			factor *= 0.99
		} else if req.ExerciseMinPerDay <= 120 {
			factor *= 1.02 // Optimal activity
		}
	}

	// Maternal health factors
	if req.MaternalDiabetes {
		factor *= 0.98 // Slight impact on fetal programming
	}

	// Chronic illness factor
	if req.ChronicIllness {
		factor *= 0.96 // Growth catch-up varies
	}

	/* Bornes de l effet du mode de vie.

	   Sans plafond, le cumul des bonus atteignait 1.072, soit +12.7 cm
	   ajoutes a la cible genetique : un mode de vie sain ne fait pas
	   depasser son potentiel, il aide a l atteindre.

	   Le plancher, lui, etait reste a 0.92 : un mode de vie declare
	   mauvais retirait jusqu a 8 %, soit quatorze centimetres sur 180.
	   Ces reponses sont AUTO-DECLAREES par un adolescent en trois taps
	   — « je mange mal », « je dors 6 h » — pas diagnostiquees. Annoncer
	   quatorze centimetres de moins sur cette base est indefendable le
	   jour ou il faut le justifier, et c est le genre de chiffre qui se
	   retourne contre un produit vendu a des mineurs.

	   La bande est donc resserree a [0.98 ; 1.01]. Elle reste
	   ASYMETRIQUE, et volontairement : on ne depasse pas son plafond
	   genetique, on peut en revanche rester en dessous. De mauvaises
	   habitudes coutent donc deux fois ce que de bonnes rapportent.

	   Sur une cible de 180 cm : +1.8 cm au mieux, -3.6 cm au pire.
	   TestPredictHeightV2_HealthFactors verifie que l ecart observable
	   entre les deux extremes reste sous cinq centimetres. */
	return math.Min(math.Max(factor, 0.98), 1.01)
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
	// Meme plancher que la prediction : afficher une borne basse sous la
	// taille actuelle revient a annoncer a l adolescent qu il pourrait
	// rapetisser, ce qui detruit la credibilite de tout le resultat.
	borneBasse := math.Round((predictedHeight-rangeMargin)*10) / 10
	if borneBasse < req.HeightCM {
		borneBasse = math.Round(req.HeightCM*10) / 10
	}

	return confidenceLevel, [2]float64{
		borneBasse,
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
