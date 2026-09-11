package estimator

import (
	"math"
	"testing"
)

/*
Ces tests portent sur le CONTRAT de l API v1, pas sur une implementation.

Les versions precedentes verifiaient le stade de Tanner renvoye et le niveau de
confiance qui en decoulait. Les stades de Tanner ne sont plus collectes — ce
sont des donnees de sante sensibles auto-declarees par des mineurs — et v1
delegue desormais au moteur v2. Tester le retour de « Fully developed »
revenait a exiger le maintien d un comportement retire volontairement.

Ce qui est teste ici tient en quatre proprietes, chacune correspondant a un bug
reellement rencontre en production.
*/

func requeteGarcon14() HeightPredictionRequest {
	return HeightPredictionRequest{
		Age:            14.0,
		Sex:            MALE,
		HeightCM:       165.0,
		WeightKG:       50.0,
		FatherHeightCM: 178.0,
		MotherHeightCM: 164.0,
	}
}

// La prediction doit rester dans les bornes humaines. L ancienne table de
// coefficients rendait 206 a 229 cm : c est ce test qui l a revele.
func TestPredictHeight_ResteDansLesBornesHumaines(t *testing.T) {
	resp := PredictHeight(requeteGarcon14())

	if resp.PredictedHeightCM < 130 || resp.PredictedHeightCM > 215 {
		t.Errorf("prediction hors des bornes humaines : %.1f cm", resp.PredictedHeightCM)
	}
}

// On ne retrecit pas a l adolescence. La methode mi-parentale ignore la taille
// deja atteinte et annoncait une taille adulte inferieure a la taille actuelle
// pour un adolescent grand par rapport a ses parents.
func TestPredictHeight_JamaisSousLaTailleActuelle(t *testing.T) {
	req := requeteGarcon14()
	// Deja plus grand que la cible mi-parentale (177.5 cm).
	req.HeightCM = 183.0

	resp := PredictHeight(req)

	if resp.PredictedHeightCM < req.HeightCM {
		t.Errorf("taille adulte %.1f cm annoncee sous la taille actuelle %.1f cm",
			resp.PredictedHeightCM, req.HeightCM)
	}
	if resp.ConfidenceRange[0] < req.HeightCM {
		t.Errorf("borne basse %.1f cm sous la taille actuelle %.1f cm",
			resp.ConfidenceRange[0], req.HeightCM)
	}
}

// L ajustement de sexe est de +6.5 cm pour un garcon et -6.5 pour une fille.
// Une version precedente oubliait le cas feminin dans le calcul de la
// fourchette, qui se retrouvait decalee de 13 cm.
func TestPredictHeight_AjustementDeSexe(t *testing.T) {
	garcon := requeteGarcon14()
	garcon.HeightCM = 150.0 // loin de la cible, pour que le plancher n intervienne pas

	fille := garcon
	fille.Sex = FEMALE

	respGarcon := PredictHeight(garcon)
	respFille := PredictHeight(fille)

	ecart := respGarcon.PredictedHeightCM - respFille.PredictedHeightCM
	if math.Abs(ecart-13.0) > 0.2 {
		t.Errorf("ecart garcon/fille attendu 13.0 cm, obtenu %.1f cm", ecart)
	}
}

// Un point estime hors de son propre intervalle a ete affiche en production
// (« 219.9 cm, fourchette 174.5-180.5 »).
func TestPredictHeight_IntervalleContientLaPrediction(t *testing.T) {
	for _, req := range []HeightPredictionRequest{
		requeteGarcon14(),
		{Age: 9, Sex: FEMALE, HeightCM: 132, WeightKG: 28, FatherHeightCM: 172, MotherHeightCM: 158},
		{Age: 17.5, Sex: MALE, HeightCM: 181, WeightKG: 72, FatherHeightCM: 176, MotherHeightCM: 163},
	} {
		resp := PredictHeight(req)
		if resp.PredictedHeightCM < resp.ConfidenceRange[0] ||
			resp.PredictedHeightCM > resp.ConfidenceRange[1] {
			t.Errorf("prediction %.1f hors de son intervalle [%.1f, %.1f] (age %.1f, %s)",
				resp.PredictedHeightCM, resp.ConfidenceRange[0], resp.ConfidenceRange[1],
				req.Age, req.Sex)
		}
	}
}

// v1 delegue a v2 : les deux endpoints doivent rendre le meme chiffre pour les
// memes donnees. Sans ce test, les deux implementations divergeraient de
// nouveau en silence.
func TestPredictHeight_AccordeAvecV2(t *testing.T) {
	req := requeteGarcon14()

	v1 := PredictHeight(req)
	v2 := PredictHeightV2(HeightPredictionV2Request{
		Age:            req.Age,
		Sex:            req.Sex,
		HeightCM:       req.HeightCM,
		WeightKG:       req.WeightKG,
		FatherHeightCM: req.FatherHeightCM,
		MotherHeightCM: req.MotherHeightCM,
	})

	if v1.PredictedHeightCM != v2.PredictedHeightCM {
		t.Errorf("v1 rend %.1f cm, v2 rend %.1f cm", v1.PredictedHeightCM, v2.PredictedHeightCM)
	}
}

func TestPredictHeight_AgeValidation(t *testing.T) {
	for _, age := range []float64{7.0, 19.0} {
		req := requeteGarcon14()
		req.Age = age

		resp := PredictHeight(req)
		if resp.Message == "" || resp.ConfidenceLevel != "low" {
			t.Errorf("age %.0f hors bornes : attendu un refus, obtenu %q / %q",
				age, resp.Message, resp.ConfidenceLevel)
		}
	}
}
