package estimator

import (
	"math"
	"testing"
)

/* Profil de reference, repris tel quel des mesures faites en production :
   garcon de 14 ans mesurant 166 cm, pere 180, mere 168. C'est sur ce
   profil que /api/v1/predict-height renvoyait 217,3 cm. */
var profilProduction = HeightPredictionRequest{
	Age:            14.0,
	Sex:            MALE,
	HeightCM:       166.0,
	WeightKG:       55.0,
	FatherHeightCM: 180.0,
	MotherHeightCM: 168.0,
}

func TestPredictHeight_ValidInput(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            12.5,
		Sex:            MALE,
		HeightCM:       150.0,
		WeightKG:       45.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
		PubertySigns: PubertySigns{
			PubicHair: "1",
		},
	}

	resp := PredictHeight(req)

	if resp.ConfidenceLevel == "" {
		t.Error("Expected confidence level, got empty")
	}

	if resp.PredictedHeightCM < 160 || resp.PredictedHeightCM > 190 {
		t.Errorf("Predicted height out of reasonable range: %f", resp.PredictedHeightCM)
	}

	if resp.ConfidenceRange[0] >= resp.ConfidenceRange[1] {
		t.Error("Invalid confidence range")
	}
}

func TestPredictHeight_AgeValidation(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            7.0, // Too young
		Sex:            MALE,
		HeightCM:       150.0,
		WeightKG:       45.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
	}

	resp := PredictHeight(req)

	if resp.ConfidenceLevel != "low" {
		t.Error("Expected low confidence for invalid age")
	}
}

/* Ce test verifiait auparavant qu'une fille presentant des signes de
   puberte obtenait une confiance « medium ou high ». Cette regle a
   disparu avec le modele qu'elle decrivait : les stades de Tanner ne
   sont plus collectes (donnee de sante intime demandee a un mineur) et
   la confiance depend maintenant de la vitesse de croissance. Ce qui
   reste vrai, et qui compte, c'est que le resultat soit exploitable. */
func TestPredictHeight_Female(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            14.0,
		Sex:            FEMALE,
		HeightCM:       155.0,
		WeightKG:       48.0,
		FatherHeightCM: 175.0,
		MotherHeightCM: 162.0,
	}

	resp := PredictHeight(req)

	if resp.PredictedHeightCM == 0 {
		t.Fatal("Expected non-zero prediction")
	}

	// Personne ne retrecit a 14 ans : la taille deja atteinte est un
	// plancher, jamais une variable.
	if resp.PredictedHeightCM < req.HeightCM {
		t.Errorf("prediction %.1f sous la taille actuelle %.1f",
			resp.PredictedHeightCM, req.HeightCM)
	}

	// L'estimation doit tomber dans son propre intervalle. Une version
	// precedente affichait 219,9 cm avec un intervalle 174,5-180,5.
	if resp.PredictedHeightCM < resp.ConfidenceRange[0] ||
		resp.PredictedHeightCM > resp.ConfidenceRange[1] {
		t.Errorf("estimation %.1f hors de son intervalle [%.1f ; %.1f]",
			resp.PredictedHeightCM, resp.ConfidenceRange[0], resp.ConfidenceRange[1])
	}
}

func TestPredictHeight_PubertySeniorStage(t *testing.T) {
	req := HeightPredictionRequest{
		Age:            17.0,
		Sex:            MALE,
		HeightCM:       178.0,
		WeightKG:       70.0,
		FatherHeightCM: 180.0,
		MotherHeightCM: 165.0,
		PubertySigns: PubertySigns{
			PubicHair: "5",
		},
	}

	resp := PredictHeight(req)

	if resp.PubertyStage != "Fully developed" {
		t.Errorf("Expected 'Fully developed', got %s", resp.PubertyStage)
	}
}

/* Garde-fou contre le retour du chiffre aberrant.

   Les coefficients getCoefficients ne sont pas calibres : appliques tels
   quels, ils rendaient 217,3 cm sur ce profil, et la route publique
   /api/v1/predict-height servait ce chiffre a qui l'appelait. Ce test
   echouerait si quelqu'un les rebranchait sans les avoir remplaces par
   de vraies tables de reference. */
func TestPredictHeight_PasDeValeurAberrante(t *testing.T) {
	resp := PredictHeight(profilProduction)

	if resp.PredictedHeightCM > 200 {
		t.Errorf("estimation aberrante : %.1f cm (coefficients non calibres rebranches ?)",
			resp.PredictedHeightCM)
	}
	if resp.PredictedHeightCM < profilProduction.HeightCM {
		t.Errorf("estimation %.1f sous la taille actuelle %.1f",
			resp.PredictedHeightCM, profilProduction.HeightCM)
	}
}

/* Les deux routes doivent rendre le meme chiffre.

   /api/v1/predict-height et /api/v2/predict-height decrivent le meme
   enfant ; deux reponses differentes pour les memes mesures seraient
   indefendables sur un produit qui vend la rigueur. La v1 delegue
   desormais a la v2, ce test verifie que la delegation ne derive pas. */
func TestPredictHeight_MemeMoteurQueV2(t *testing.T) {
	v1 := PredictHeight(profilProduction)

	v2 := PredictHeightV2(HeightPredictionV2Request{
		Age:            profilProduction.Age,
		Sex:            profilProduction.Sex,
		HeightCM:       profilProduction.HeightCM,
		WeightKG:       profilProduction.WeightKG,
		FatherHeightCM: profilProduction.FatherHeightCM,
		MotherHeightCM: profilProduction.MotherHeightCM,
	})

	if math.Abs(v1.PredictedHeightCM-v2.PredictedHeightCM) > 0.01 {
		t.Errorf("v1 rend %.2f cm, v2 rend %.2f cm pour les memes mesures",
			v1.PredictedHeightCM, v2.PredictedHeightCM)
	}
	if v1.ConfidenceRange != v2.ConfidenceRange {
		t.Errorf("intervalles differents : v1 %v, v2 %v", v1.ConfidenceRange, v2.ConfidenceRange)
	}
}

/* Une donnee absente ne doit pas etre lue comme une mauvaise donnee.

   Les seuils de calculateHealthFactor sont ecrits en « moins de » : un
   appelant qui ne renseigne ni sommeil ni activite tombait du mauvais
   cote et perdait 4 % de son estimation, soit sept centimetres sur 180,
   pour n'avoir rien declare. C'est exactement le cas de la requete v1,
   qui ne collecte aucun de ces champs. */
func TestFacteurModeDeVie_AbsenceNeutre(t *testing.T) {
	if facteur := calculateHealthFactor(HeightPredictionV2Request{}); facteur != 1.0 {
		t.Errorf("aucune donnee de mode de vie : facteur %.4f, attendu 1.0", facteur)
	}

	// Une seule donnee renseignee suffit a reactiver la modulation.
	avecSommeil := calculateHealthFactor(HeightPredictionV2Request{SleepHoursPerNight: 6})
	if avecSommeil == 1.0 {
		t.Error("un sommeil declare insuffisant devrait moduler l'estimation")
	}
}
