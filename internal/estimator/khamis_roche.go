package estimator

type PubertySigns struct {
	PubicHair      string // "N", "1", "2", "3", "4", "5" (Tanner stages)
	Genitalia      string // For males
	BreastDevelop  string // For females
	AxillaryHair   string
	MenstrualCycle bool // For females (menarche)
}

type HeightPredictionRequest struct {
	Age            float64
	Sex            string // "M" or "F"
	HeightCM       float64
	WeightKG       float64
	FatherHeightCM float64
	MotherHeightCM float64
	PubertySigns   PubertySigns
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

// PredictHeight — API v1.
//
// Delegue desormais au moteur v2. Les coefficients lineaires qui servaient ici
// etaient annonces comme « Khamis-Roche (real values from research) » ; ils ne
// le sont pas. Verification sur un garcon de 14 ans, 165 cm, 50 kg, parents
// 178/164 :
//
//	10.1 + 0.50x165 + 0.14x50 + 0.67x177.5 = 218.5 cm
//
// puis x1.05 d ajustement pubertaire = 229 cm. La table double-compte la
// taille de l enfant et celle des parents. L endpoint /api/v1/predict-height
// etait public et sans limite de debit : n importe qui pouvait lire ces
// chiffres et conclure, a juste titre, que le modele est invente.
//
// On ne recalibre pas au jugé : recalibrer demande les vraies tables publiees
// (ou l age osseux). En attendant, v1 et v2 rendent la meme reponse, issue de
// la methode mi-parentale de Tanner — documentee, verifiable, et coherente
// avec ce que le site promet.
func PredictHeight(req HeightPredictionRequest) HeightPredictionResponse {
	v2 := PredictHeightV2(HeightPredictionV2Request{
		Age:            req.Age,
		Sex:            req.Sex,
		HeightCM:       req.HeightCM,
		WeightKG:       req.WeightKG,
		FatherHeightCM: req.FatherHeightCM,
		MotherHeightCM: req.MotherHeightCM,
		// v1 ne collecte aucune donnee de mode de vie : le facteur sante
		// vaut 1.0 et la prediction se reduit a la cible mi-parentale.
		// C est le comportement voulu, pas une perte d information.
		PubertySigns: req.PubertySigns,
	})

	return HeightPredictionResponse{
		PredictedHeightCM: v2.PredictedHeightCM,
		ConfidenceRange:   v2.ConfidenceRange,
		ConfidenceLevel:   v2.ConfidenceLevel,
		Message:           v2.Message,
		PubertyStage:      v2.PubertyStage,
	}
}
