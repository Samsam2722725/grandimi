package estimator

type PubertySigns struct {
	PubicHair      string // "N", "1", "2", "3", "4", "5" (Tanner stages)
	Genitalia      string // For males
	BreastDevelop  string // For females
	AxillaryHair   string
	MenstrualCycle bool // For females (menarche)
}

type HeightPredictionRequest struct {
	Age             float64
	Sex             string // "M" or "F"
	HeightCM        float64
	WeightKG        float64
	FatherHeightCM  float64
	MotherHeightCM  float64
	PubertySigns    PubertySigns
}

type HeightPredictionResponse struct {
	PredictedHeightCM float64
	ConfidenceRange   [2]float64 // [min, max]
	ConfidenceLevel   string     // "high", "medium", "low"
	Message           string
	PubertyStage      string
}

const (
	MALE   = "M"
	FEMALE = "F"
)

// KhamisRoche calculates predicted adult height using the Khamis-Roche method
func PredictHeight(req HeightPredictionRequest) HeightPredictionResponse {
	resp := HeightPredictionResponse{}

	// Validate inputs
	if req.Age < 8.0 || req.Age > 18.0 {
		resp.Message = "Age must be between 8 and 18 years"
		resp.ConfidenceLevel = "low"
		return resp
	}

	if req.HeightCM < 100 || req.HeightCM > 210 {
		resp.Message = "Height must be between 100 and 210 cm"
		resp.ConfidenceLevel = "low"
		return resp
	}

	if req.Sex != MALE && req.Sex != FEMALE {
		resp.Message = "Sex must be 'M' or 'F'"
		resp.ConfidenceLevel = "low"
		return resp
	}

	/* Un seul moteur pour les deux routes.

	   Les coefficients getCoefficients ci-dessous ne sont pas calibres :
	   sur ce meme profil ils rendaient 217 cm. On delegue donc au moteur
	   que le site utilise reellement, et cette route cesse de publier un
	   chiffre que le README lui-meme qualifie de faux.

	   Les champs de mode de vie ne sont volontairement pas remplis : la
	   requete v1 ne les collecte pas, et les inventer serait pire que de
	   les laisser vides. calculateHealthFactor traite desormais
	   l absence comme neutre. */
	resultat := PredictHeightV2(HeightPredictionV2Request{
		Age:            req.Age,
		Sex:            req.Sex,
		HeightCM:       req.HeightCM,
		WeightKG:       req.WeightKG,
		FatherHeightCM: req.FatherHeightCM,
		MotherHeightCM: req.MotherHeightCM,
		PubertySigns:   req.PubertySigns,
	})

	/* Le libelle de stade reste celui de la v1 : c est son contrat
	   publie, et la v2 decrit une phase de croissance plutot qu un
	   stade de Tanner. */
	_, pubertyStage := getPubertyAdjustment(req.Sex, req.PubertySigns)

	resp.PredictedHeightCM = resultat.PredictedHeightCM
	resp.ConfidenceRange = resultat.ConfidenceRange
	resp.ConfidenceLevel = resultat.ConfidenceLevel
	resp.PubertyStage = pubertyStage
	resp.Message = "Height prediction successful"

	return resp
}

type Coefficients struct {
	Intercept     float64
	HeightCoeff   float64
	WeightCoeff   float64
	MidParentCoeff float64
}

// getCoefficients returns Khamis-Roche coefficients based on age and sex
func getCoefficients(age float64, sex string) Coefficients {
	// Simplified Khamis-Roche coefficients (real values from research)
	coefficients := map[int]map[string]Coefficients{
		8: {
			MALE: {Intercept: -21.2, HeightCoeff: 0.67, WeightCoeff: 0.05, MidParentCoeff: 0.54},
			FEMALE: {Intercept: -21.2, HeightCoeff: 0.67, WeightCoeff: 0.05, MidParentCoeff: 0.54},
		},
		9: {
			MALE: {Intercept: -18.1, HeightCoeff: 0.63, WeightCoeff: 0.07, MidParentCoeff: 0.58},
			FEMALE: {Intercept: -18.1, HeightCoeff: 0.63, WeightCoeff: 0.07, MidParentCoeff: 0.58},
		},
		10: {
			MALE: {Intercept: -13.4, HeightCoeff: 0.60, WeightCoeff: 0.08, MidParentCoeff: 0.61},
			FEMALE: {Intercept: -11.1, HeightCoeff: 0.59, WeightCoeff: 0.10, MidParentCoeff: 0.61},
		},
		11: {
			MALE: {Intercept: -8.0, HeightCoeff: 0.57, WeightCoeff: 0.10, MidParentCoeff: 0.64},
			FEMALE: {Intercept: -3.9, HeightCoeff: 0.54, WeightCoeff: 0.12, MidParentCoeff: 0.64},
		},
		12: {
			MALE: {Intercept: -2.2, HeightCoeff: 0.54, WeightCoeff: 0.12, MidParentCoeff: 0.66},
			FEMALE: {Intercept: 4.8, HeightCoeff: 0.50, WeightCoeff: 0.14, MidParentCoeff: 0.66},
		},
		13: {
			MALE: {Intercept: 4.5, HeightCoeff: 0.52, WeightCoeff: 0.13, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 12.9, HeightCoeff: 0.47, WeightCoeff: 0.15, MidParentCoeff: 0.67},
		},
		14: {
			MALE: {Intercept: 10.1, HeightCoeff: 0.50, WeightCoeff: 0.14, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 18.2, HeightCoeff: 0.45, WeightCoeff: 0.16, MidParentCoeff: 0.67},
		},
		15: {
			MALE: {Intercept: 14.9, HeightCoeff: 0.49, WeightCoeff: 0.15, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 21.3, HeightCoeff: 0.44, WeightCoeff: 0.16, MidParentCoeff: 0.67},
		},
		16: {
			MALE: {Intercept: 18.2, HeightCoeff: 0.48, WeightCoeff: 0.15, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 23.5, HeightCoeff: 0.43, WeightCoeff: 0.17, MidParentCoeff: 0.67},
		},
		17: {
			MALE: {Intercept: 20.8, HeightCoeff: 0.47, WeightCoeff: 0.15, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 25.0, HeightCoeff: 0.43, WeightCoeff: 0.17, MidParentCoeff: 0.67},
		},
		18: {
			MALE: {Intercept: 22.7, HeightCoeff: 0.47, WeightCoeff: 0.15, MidParentCoeff: 0.67},
			FEMALE: {Intercept: 25.9, HeightCoeff: 0.42, WeightCoeff: 0.17, MidParentCoeff: 0.67},
		},
	}

	// Get coefficients for closest age
	ageInt := int(age)
	if c, exists := coefficients[ageInt]; exists {
		if coeff, ok := c[sex]; ok {
			return coeff
		}
	}

	// Fallback to age 15 if exact age not found
	return coefficients[15][sex]
}

// getPubertyAdjustment returns height multiplier and stage name based on puberty signs
func getPubertyAdjustment(sex string, signs PubertySigns) (float64, string) {
	tannerStage := getTannerStage(signs.PubicHair)

	multiplier := 1.0
	stageName := "Pre-pubertal"

	switch tannerStage {
	case 1:
		stageName = "Pre-pubertal"
		multiplier = 0.98
	case 2:
		stageName = "Early puberty"
		multiplier = 1.02
	case 3:
		stageName = "Mid puberty"
		multiplier = 1.05
	case 4:
		stageName = "Late puberty"
		multiplier = 1.03
	case 5:
		stageName = "Fully developed"
		multiplier = 1.00
	}

	return multiplier, stageName
}

func getTannerStage(stage string) int {
	switch stage {
	case "N":
		return 1
	case "1":
		return 2
	case "2":
		return 3
	case "3":
		return 4
	case "4", "5":
		return 5
	default:
		return 1
	}
}

/* calculateConfidenceRange et evaluateConfidence ont ete retirees.

   La premiere tirait la marge du seul age ; la seconde tirait la
   confiance des stades de Tanner, qui ne sont plus collectes. Les
   deux sont desormais calculees par calculateV2Confidence a partir
   de la vitesse de croissance. Les garder aurait laisse deux modeles
   de confiance dans le meme paquet, dont un sans appelant. */
