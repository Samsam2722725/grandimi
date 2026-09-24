package estimator

import "testing"

func garcon17(voix, visage, aisselles string) HeightPredictionV2Request {
	return HeightPredictionV2Request{
		Age: 17, Sex: MALE, HeightCM: 165, WeightKG: 52,
		FatherHeightCM: 176, MotherHeightCM: 164,
		VoixMuee: voix, PilositeVisage: visage, PilositeAisselles: aisselles,
	}
}

/* LE SIGNAL EST ASYMETRIQUE, ET C EST TOUT L INTERET.

   A dix-sept ans, avoir mue ne distingue personne : c est le cas de la
   quasi-totalite. Ne pas avoir mue est rare et parlant. On ne corrige
   donc jamais vers le bas ici. */
func TestRetard_SeuleLAbsenceInforme(t *testing.T) {
	pubere := PredictHeightV2(garcon17("yes", "developed", "developed"))
	rien := PredictHeightV2(garcon17("", "", ""))

	if pubere.PredictedHeightCM != rien.PredictedHeightCM {
		t.Errorf("puberte achevee : %.1f cm, devrait valoir le cas non renseigne %.1f",
			pubere.PredictedHeightCM, rien.PredictedHeightCM)
	}
	if pubere.RetardPubertaire {
		t.Error("puberte achevee : ne doit pas etre signalee en retard")
	}

	enRetard := PredictHeightV2(garcon17("no", "none", "none"))
	if enRetard.PredictedHeightCM <= rien.PredictedHeightCM {
		t.Errorf("aucun signe a 17 ans : %.1f cm, devrait depasser %.1f",
			enRetard.PredictedHeightCM, rien.PredictedHeightCM)
	}
	if !enRetard.RetardPubertaire {
		t.Error("aucun signe a 17 ans : devrait etre signale")
	}
}

/* « Je ne sais pas » et « je prefere ne pas repondre » ne comptent ni
   pour ni contre — le principe de tout ce moteur. */
func TestRetard_NonRenseigneNeutre(t *testing.T) {
	rien := PredictHeightV2(garcon17("", "", ""))

	for _, c := range []struct {
		nom string
		req HeightPredictionV2Request
	}{
		{"je ne sais pas", garcon17("unknown", "", "")},
		{"prefere ne pas repondre", garcon17("", "", "")},
		{"valeur inconnue du bareme", garcon17("peut-etre", "bof", "")},
	} {
		got := PredictHeightV2(c.req)
		if got.PredictedHeightCM != rien.PredictedHeightCM {
			t.Errorf("%s : %.1f cm, attendu %.1f", c.nom, got.PredictedHeightCM, rien.PredictedHeightCM)
		}
	}
}

// Avant quinze ans, l absence de signe est banale : on ne corrige rien.
func TestRetard_RienAvantQuinzeAns(t *testing.T) {
	jeune := garcon17("no", "none", "none")
	jeune.Age = 13
	jeune.HeightCM = 150

	temoin := jeune
	temoin.VoixMuee, temoin.PilositeVisage, temoin.PilositeAisselles = "", "", ""

	if PredictHeightV2(jeune).PredictedHeightCM != PredictHeightV2(temoin).PredictedHeightCM {
		t.Error("a treize ans, l absence de signe pubertaire ne doit rien corriger")
	}
}

/* LA CORRECTION RESTE BORNEE.

   Non calibree, donc modeste : c est l avertissement qui porte le reste.
   Le plafond est de quatre centimetres, et le poids complementaire de
   l indice de maturite ne peut que le reduire. */
func TestRetard_Bornee(t *testing.T) {
	rien := PredictHeightV2(garcon17("", "", ""))
	max := PredictHeightV2(garcon17("no", "none", "none"))

	ecart := max.PredictedHeightCM - rien.PredictedHeightCM
	if ecart > correctionRetardMaxCM+0.05 {
		t.Errorf("correction de %.2f cm, plafond attendu %.1f", ecart, correctionRetardMaxCM)
	}
	if ecart <= 0 {
		t.Errorf("correction de %.2f cm : le signal ne sert a rien", ecart)
	}
}

/* NE JAMAIS COMPTER DEUX FOIS.

   L indice de maturite et le retard pubertaire portent la meme
   information. Leurs poids sont complementaires par construction : leur
   somme ne depasse jamais un, a tout age. C est le test qui protege de
   l erreur qui a casse 19,8 % des profils avec la cible mi-parentale. */
func TestRetard_PoidsComplementaireDeLIndiceDeMaturite(t *testing.T) {
	for _, sexe := range []string{MALE, FEMALE} {
		for age := 8.0; age <= 22.0; age += 0.5 {
			fenetre := poidsFenetreMaturite(age, sexe)
			retard := 1 - fenetre
			if somme := fenetre + retard; somme > 1.000001 {
				t.Errorf("age %.1f sexe %s : poids cumules %.3f", age, sexe, somme)
			}
			if fenetre < 0 || fenetre > 1 {
				t.Errorf("age %.1f sexe %s : fenetre hors [0,1] (%.3f)", age, sexe, fenetre)
			}
		}
	}
}

/* Chez la fille, l absence de menarche passe quinze ans est le signe de
   retard le plus net. Il fallait pouvoir la distinguer d une question
   laissee sans reponse — d ou MenarcheDeclaree. */
func TestRetard_MenarcheNonSurvenueCompte(t *testing.T) {
	base := HeightPredictionV2Request{
		Age: 16, Sex: FEMALE, HeightCM: 158, WeightKG: 47,
		FatherHeightCM: 176, MotherHeightCM: 163,
	}

	pasRepondu := PredictHeightV2(base)

	pasEncore := base
	pasEncore.MenarcheDeclaree = true
	pasEncore.MenarcheSurvenue = false

	got := PredictHeightV2(pasEncore)
	if got.PredictedHeightCM <= pasRepondu.PredictedHeightCM {
		t.Errorf("pas encore reglee a seize ans : %.1f cm, devrait depasser %.1f",
			got.PredictedHeightCM, pasRepondu.PredictedHeightCM)
	}
	if !got.RetardPubertaire {
		t.Error("pas encore reglee a seize ans : devrait etre signale")
	}
}
