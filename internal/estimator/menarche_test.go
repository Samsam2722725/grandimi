package estimator

import (
	"math"
	"testing"
)

func profilFille(age, taille, ageMenarche float64, survenue bool) HeightPredictionV2Request {
	return HeightPredictionV2Request{
		Age: age, Sex: FEMALE, HeightCM: taille,
		WeightKG: 19 * (taille / 100) * (taille / 100),
		FatherHeightCM: 176, MotherHeightCM: 163,
		MenarcheSurvenue: survenue, AgeMenarcheAnnees: ageMenarche,
	}
}

/* NE RIEN SAVOIR RESTE STRICTEMENT NEUTRE.

   Le principe vaut pour les trois signaux facultatifs du modele. Une
   fille qui ne repond pas doit recevoir exactement le chiffre d avant
   cette ancre — pas une penalite, pas un bonus. */
func TestMenarche_AbsenceStrictementNeutre(t *testing.T) {
	sans := PredictHeightV2(profilFille(16, 163, 0, false))

	for _, cas := range []struct {
		nom string
		req HeightPredictionV2Request
	}{
		{"non declaree", profilFille(16, 163, 0, false)},
		{"declaree sans age", profilFille(16, 163, 0, true)},
		{"age aberrant (3 ans)", profilFille(16, 163, 3, true)},
		{"age aberrant (25 ans)", profilFille(16, 163, 25, true)},
		{"posterieure a l age declare", profilFille(16, 163, 17, true)},
		// Meme age que la reference : sinon on compare deux profils
		// differents et le test echoue pour la mauvaise raison.
		{"eteinte : reglee il y a 3 ans", profilFille(16, 163, 13, true)},
	} {
		got := PredictHeightV2(cas.req)
		if got.PredictedHeightCM != sans.PredictedHeightCM {
			t.Errorf("%s : %.1f cm, attendu %.1f comme sans signal",
				cas.nom, got.PredictedHeightCM, sans.PredictedHeightCM)
		}
	}
}

/* UN GARCON N EST JAMAIS CONCERNE, meme si le champ arrive rempli. */
func TestMenarche_IgnoreeChezLeGarcon(t *testing.T) {
	base := HeightPredictionV2Request{
		Age: 16, Sex: MALE, HeightCM: 175, WeightKG: 60,
		FatherHeightCM: 176, MotherHeightCM: 163,
	}
	avec := base
	avec.MenarcheSurvenue = true
	avec.AgeMenarcheAnnees = 15

	if PredictHeightV2(avec).PredictedHeightCM != PredictHeightV2(base).PredictedHeightCM {
		t.Error("le champ menarche ne doit rien changer pour un garcon")
	}
}

/* LE MODELE SOUS-ESTIME LES FILLES REGLEES TARD, ET L ANCRE LE CORRIGE.

   A seize ans au P50 il annonce environ un centimetre de croissance
   restante, alors qu une fille reglee depuis un an en a encore quatre
   devant elle. C est le seul cas ou cette ancre change quelque chose,
   et c est pour cela qu on la pose. */
func TestMenarche_CorrigeLesFillesRegleesTard(t *testing.T) {
	sans := PredictHeightV2(profilFille(16, 163, 0, false))
	tard := PredictHeightV2(profilFille(16, 163, 15, true))

	if tard.PredictedHeightCM <= sans.PredictedHeightCM {
		t.Errorf("reglee tard : %.1f cm, devrait depasser %.1f",
			tard.PredictedHeightCM, sans.PredictedHeightCM)
	}

	// L effet reste modeste et borne : c est une ancre parmi trois.
	ecart := tard.PredictedHeightCM - sans.PredictedHeightCM
	if ecart > 3.0 {
		t.Errorf("ecart de %.1f cm : une ancre sur trois ne doit pas deplacer autant", ecart)
	}
}

/* Plus la menarche est ancienne, moins il reste de croissance. La
   monotonie est la propriete qui rend l ancre lisible : elle ne doit
   jamais dire qu une fille reglee depuis plus longtemps grandira plus. */
func TestMenarche_MoinsDeResteQuandCEstPlusAncien(t *testing.T) {
	precedent := math.Inf(1)
	for _, ageMenarche := range []float64{15.5, 15.0, 14.5, 14.0, 13.5} {
		resp := PredictHeightV2(profilFille(16, 163, ageMenarche, true))
		if resp.PredictedHeightCM > precedent {
			t.Errorf("menarche a %.1f ans : %.1f cm, superieur au cas plus recent (%.1f)",
				ageMenarche, resp.PredictedHeightCM, precedent)
		}
		precedent = resp.PredictedHeightCM
	}
}

/* L ancre ne doit pas faire sonner le plancher, qui est un detecteur de
   panne. Mesure de reference : sur ce balayage il tombe de 16,4 % sans
   l ancre a 15,3 % avec — elle est eteinte exactement la ou elle serait
   nuisible. Le test verifie qu elle n AGGRAVE pas. */
func TestMenarche_NAggravePasLePlancher(t *testing.T) {
	var avec, sans, total int

	for age := 15.0; age <= 19.0; age += 0.5 {
		for _, taille := range []float64{145, 150, 155, 160, 165, 170, 175} {
			for _, ageMenarche := range []float64{11, 12, 13, 14, 15} {
				if ageMenarche > age {
					continue
				}
				total++
				if PredictHeightV2(profilFille(age, taille, ageMenarche, true)).PlancherDeclenche {
					avec++
				}
				if PredictHeightV2(profilFille(age, taille, 0, false)).PlancherDeclenche {
					sans++
				}
			}
		}
	}

	if avec > sans {
		t.Errorf("plancher declenche %d fois avec l ancre contre %d sans, sur %d profils",
			avec, sans, total)
	}
	t.Logf("plancher : %d avec / %d sans, sur %d profils", avec, sans, total)
}
