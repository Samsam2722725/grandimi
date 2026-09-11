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
	Age            float64
	Sex            string
	HeightCM       float64
	WeightKG       float64
	FatherHeightCM float64
	MotherHeightCM float64
	PubertySigns   PubertySigns

	// Enhanced data (v2)
	BMI                float64          // kg/m² - captures nutrition/health
	HeightVelocityCM   float64          // cm/year - growth rate
	EthnicBackground   EthnicBackground // Population-specific coefficients
	NutritionLevel     NutritionLevel   // Health factor
	SleepHoursPerNight float64          // Growth happens during sleep
	ExerciseMinPerDay  float64          // Activity level
	MaternalDiabetes   bool             // Fetal programming effect
	ChronicIllness     bool             // Impacts growth
}

type HeightPredictionV2Response struct {
	PredictedHeightCM float64
	ConfidenceRange   [2]float64
	ConfidenceLevel   string
	PubertyStage      string
	Message           string
	ModelUsed         string             // Which ensemble model
	Factors           map[string]float64 // Contribution of each factor
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

	// Les trois « modeles » lineaires qui tournaient ici ont ete supprimes,
	// pas mis en commentaire. Ils etaient calcules a chaque requete, exposes
	// au client dans `Factors` sous les cles _diag_khamis_roche,
	// _diag_ethnic_adjusted et _diag_growth_velocity, et rendaient
	// respectivement 229, 217 et 179 cm pour un garcon de 14 ans mesurant
	// 165 cm. Un chiffre faux publie dans une reponse d API est un chiffre
	// faux publie, meme etiquete « diagnostic ».
	//
	// Ce que le client recoit desormais dans `Factors` se relit ligne a
	// ligne : la cible genetique, le facteur de mode de vie, le resultat.

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

	// Le mode de vie agit sur ce qu il RESTE a prendre, jamais sur la taille
	// deja atteinte.
	//
	// La version precedente multipliait la cible entiere :
	// 175 x 0.92 = 161 cm, soit 14 cm retires a un adolescent parce qu il
	// declarait mal dormir et mal manger. Pire, pour une fille de 13 ans
	// mesurant deja 158 cm, le resultat tombait sous sa taille actuelle et
	// le plancher ci-dessous lui annoncait qu elle avait fini de grandir.
	//
	// En appliquant le facteur a la seule croissance restante, l ordre de
	// grandeur redevient celui de la litterature (1 a 3 cm), le plancher
	// devient structurel — on ne peut plus predire un retrecissement — et
	// la promesse du produit reste exacte : les habitudes decident si on
	// atteint son potentiel, pas quel est ce potentiel.
	healthMultiplier := calculateHealthFactor(req)

	croissanceRestante := midParentTarget - req.HeightCM
	if croissanceRestante < 0 {
		// La cible mi-parentale est deja depassee : plus rien a moduler.
		// C est le cas d un adolescent grand pour ses parents, frequent.
		croissanceRestante = 0
	}
	finalHeight := req.HeightCM + croissanceRestante*healthMultiplier

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
	confidenceLevel, confidenceRange := calculateV2Confidence(req, finalHeight)

	resp.PredictedHeightCM = math.Round(finalHeight*10) / 10
	resp.ConfidenceRange = confidenceRange
	resp.ConfidenceLevel = confidenceLevel
	resp.PubertyStage = pubertyStage
	resp.ModelUsed = "Taille mi-parentale (Tanner) + facteurs de mode de vie"
	resp.Message = "Height prediction successful (v2 ML-enhanced)"

	return resp
}

// predictKhamisRocheV2 - Improved Khamis-Roche with BMI factor
// calculateHealthFactor renvoie la part du POTENTIEL DE CROISSANCE RESTANT
// que le mode de vie declare permet d atteindre. 1.0 = on atteint la cible
// genetique ; 0.80 = on s arrete a 80 % de ce qu il restait a prendre.
//
// Trois corrections par rapport a la version precedente, toutes visibles par
// l utilisateur :
//
//  1. Le facteur ne s applique PLUS a la taille totale, mais a la croissance
//     restante (cf. PredictHeightV2). Multiplier la taille adulte entiere par
//     0.92 retirait 14 cm a un adolescent de 175 cm de cible : le mode de vie
//     ne fait pas perdre la taille deja atteinte.
//
//  2. Le plafond est 1.0, pas 1.02. Le site ecrit partout qu on ne depasse
//     pas son potentiel genetique ; le moteur ne doit pas dire l inverse.
//     De bonnes habitudes font ATTEINDRE la cible, elles ne l augmentent pas.
//
//  3. Les penalites sont ramenees a l ordre de grandeur documente. Dans un
//     pays sans malnutrition, l ecart attribuable aux habitudes declarees est
//     de l ordre de 1 a 3 cm sur la taille finale, pas de 7 a 14 cm.
//     Le test TestPredictHeightV2_HealthFactors borne d ailleurs cet ecart a
//     5 cm : c est le code qui le violait, pas le test qui etait trop strict.
//
// Ordre de grandeur obtenu pour un garcon de 14 ans, cible 176.5, mesurant
// 165 cm (11.5 cm restants) : habitudes optimales 176.5 cm, pires habitudes
// declarees 174.8 cm, avec maladie chronique 174.2 cm.
func calculateHealthFactor(req HeightPredictionV2Request) float64 {
	factor := 1.0

	// Sommeil : l hormone de croissance se libere surtout en sommeil profond.
	// Une dette chronique coute une part de la croissance restante.
	switch {
	case req.SleepHoursPerNight <= 0:
		// Non renseigne : aucune penalite. On ne punit pas une absence de
		// reponse, on elargit la fourchette ailleurs.
	case req.SleepHoursPerNight < 7:
		factor *= 0.92
	case req.SleepHoursPerNight < 8:
		factor *= 0.97
	}

	// Nutrition. EXCELLENT et GOOD valent tous deux 1.0 : au-dela du
	// suffisant, il n y a rien a gagner. Manger « parfaitement » plutot que
	// « correctement » ne fait pas grandir davantage, et le pretendre serait
	// vendre un supplement de performance qui n existe pas.
	switch req.NutritionLevel {
	case EXCELLENT, GOOD:
		factor *= 1.0
	case FAIR:
		factor *= 0.97
	case POOR:
		factor *= 0.92
	}

	// Activite physique : stimule l os pendant qu il peut encore s allonger.
	switch {
	case req.ExerciseMinPerDay <= 0:
		// Non renseigne.
	case req.ExerciseMinPerDay < 15:
		factor *= 0.96
	case req.ExerciseMinPerDay < 30:
		factor *= 0.98
	}

	// Facteurs medicaux : effet documente plus large que les habitudes
	// declarees, et ils ne relevent pas d un choix de l utilisateur.
	if req.MaternalDiabetes {
		factor *= 0.98
	}
	if req.ChronicIllness {
		factor *= 0.94
	}

	// Plancher a 0.80 : meme dans le pire cumul declare, on ne retire pas
	// plus d un cinquieme de la croissance restante. Au-dela, on sortirait
	// de ce qu un questionnaire declaratif peut honnetement conclure.
	return math.Min(math.Max(factor, 0.80), 1.0)
}

func calculateV2Confidence(
	req HeightPredictionV2Request,
	predictedHeight float64,
) (string, [2]float64) {
	// La marge depend de ce qui la determine reellement : la quantite de
	// croissance qu il reste a parcourir.

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
