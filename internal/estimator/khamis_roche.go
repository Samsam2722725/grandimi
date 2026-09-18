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
	// Repris tel quel du moteur v2. Vide dans le cas ordinaire ; rempli
	// quand la taille saisie sort des courbes de reference, auquel cas le
	// chiffre rendu ne vaut pas les autres et doit le dire.
	Avertissement string
	HorsDomaine   bool
}

const (
	MALE   = "M"
	FEMALE = "F"
)

// KhamisRoche calculates predicted adult height using the Khamis-Roche method
func PredictHeight(req HeightPredictionRequest) HeightPredictionResponse {
	resp := HeightPredictionResponse{}

	// Validate inputs
	// Meme borne que validateV2Input : la croissance masculine peut se
	// poursuivre jusque vers 22 ans. Voir le commentaire detaille dans
	// v2_enhanced.go.
	if req.Age < 8.0 || req.Age > 22.0 {
		resp.Message = "Age must be between 8 and 22 years"
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

	   Cette route calculait autrefois elle-meme, avec une table intitulee
	   « Simplified Khamis-Roche » qui n etait pas la table Khamis-Roche et
	   qui rendait 217 cm sur ce profil. Elle a ete supprimee ; la vraie
	   table, en pouces et en livres, est dans khamis_roche_table.go et
	   c est le moteur v2 qui s en sert. Cette route delegue.

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
	resp.Avertissement = resultat.Avertissement
	resp.HorsDomaine = resultat.HorsDomaine
	resp.Message = "Height prediction successful"

	return resp
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
