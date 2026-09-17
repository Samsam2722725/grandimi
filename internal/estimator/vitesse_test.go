package estimator

import (
	"fmt"
	"math"
	"testing"
)

// La vitesse attendue sort de la table OMS : elle doit culminer au moment
// du pic pubertaire, plus tot chez la fille, et s effondrer ensuite.
func TestVitesseAttendue_FormeDeLaCourbe(t *testing.T) {
	for _, c := range []struct {
		sexe    string
		agePic  float64
		ageFin  float64
	}{
		{MALE, 13.5, 18},
		{FEMALE, 11.5, 18},
	} {
		pic := vitesseAttendue(c.agePic, c.sexe)
		fin := vitesseAttendue(c.ageFin, c.sexe)

		if pic < 4 {
			t.Errorf("%s : vitesse au pic (%.1f ans) = %.1f cm/an, attendu au moins 4", c.sexe, c.agePic, pic)
		}
		if fin > 1.5 {
			t.Errorf("%s : vitesse a %.0f ans = %.1f cm/an, attendu quasi nulle", c.sexe, c.ageFin, fin)
		}
		if fin >= pic {
			t.Errorf("%s : la vitesse ne decroit pas apres le pic (%.1f puis %.1f)", c.sexe, pic, fin)
		}
	}

	/* C EST CE CHIFFRE QUI JUSTIFIE LA FENETRE D AGE. A 17 ans la
	   mediane est quasi nulle : normaliser l ecart par elle ferait
	   exploser la correction, et surtout le raisonnement « vite = en
	   avance » y est FAUX — a cet age, grandir encore veut dire etre en
	   retard, donc avoir plus de croissance devant soi, pas moins. */
	if v := vitesseAttendue(17, FEMALE); v > 1.0 {
		t.Errorf("fille de 17 ans : vitesse mediane %.2f cm/an, attendue proche de zero", v)
	}
}

func TestPoidsFenetreVitesse(t *testing.T) {
	// Hors fenetre : aucune correction, on ne pretend pas savoir.
	for _, c := range []struct {
		age  float64
		sexe string
	}{
		{8, MALE}, {9.5, MALE}, {16, MALE}, {18, MALE}, {21, MALE},
		{8, FEMALE}, {15, FEMALE}, {17, FEMALE},
	} {
		if p := poidsFenetreVitesse(c.age, c.sexe); p != 0 {
			t.Errorf("%s a %.1f ans : poids %.2f, attendu 0 (hors fenetre)", c.sexe, c.age, p)
		}
	}

	// Plateau : pleine confiance.
	for _, c := range []struct {
		age  float64
		sexe string
	}{
		{12, MALE}, {14, MALE}, {11, FEMALE}, {12.5, FEMALE},
	} {
		if p := poidsFenetreVitesse(c.age, c.sexe); p != 1 {
			t.Errorf("%s a %.1f ans : poids %.2f, attendu 1 (plateau)", c.sexe, c.age, p)
		}
	}

	/* PAS DE MARCHE A UN ANNIVERSAIRE. Un creneau ferait bouger
	   l estimation de plus d un centimetre entre la veille et le
	   lendemain des quinze ans. On verifie que le poids varie de moins
	   de 0,15 par mois sur toute la plage. */
	for _, sexe := range []string{MALE, FEMALE} {
		precedent := poidsFenetreVitesse(8, sexe)
		for age := 8.0; age <= 20; age += 1.0 / 12.0 {
			p := poidsFenetreVitesse(age, sexe)
			if math.Abs(p-precedent) > 0.15 {
				t.Errorf("%s : saut de poids de %.2f a %.2f vers %.2f ans", sexe, precedent, p, age)
			}
			precedent = p
		}
	}
}

/* LE SENS DE LA CORRECTION. Le test qui compte : grandir vite pour son
   age doit faire BAISSER l estimation, pas monter. Voir vitesse.go. */
func TestCorrectionVitesse_Sens(t *testing.T) {
	const age, sexe = 12.5, MALE
	attendue := vitesseAttendue(age, sexe)

	rapide := correctionVitesse(age, sexe, attendue*1.8)
	lent := correctionVitesse(age, sexe, attendue*0.4)
	pile := correctionVitesse(age, sexe, attendue)

	if rapide >= 0 {
		t.Errorf("vitesse superieure a l attendu : correction %+.2f cm, attendue negative", rapide)
	}
	if lent <= 0 {
		t.Errorf("vitesse inferieure a l attendu : correction %+.2f cm, attendue positive", lent)
	}
	if math.Abs(pile) > 0.01 {
		t.Errorf("vitesse pile a l attendu : correction %+.2f cm, attendue nulle", pile)
	}

	t.Logf("a %.1f ans (attendu %.1f cm/an) : lent %+.2f cm | pile %+.2f cm | rapide %+.2f cm",
		age, attendue, lent, pile, rapide)
}

func TestCorrectionVitesse_NeutreQuandOnNeSaitPas(t *testing.T) {
	// « Je ne sais pas » au questionnaire arrive ici a zero.
	if c := correctionVitesse(12.5, MALE, 0); c != 0 {
		t.Errorf("vitesse non renseignee : correction %+.2f cm, attendue nulle", c)
	}
	if c := correctionVitesse(12.5, MALE, -3); c != 0 {
		t.Errorf("vitesse negative : correction %+.2f cm, attendue nulle", c)
	}

	/* Hors fenetre, meme une vitesse tres au-dessus de la mediane ne
	   corrige rien. C est le garde-fou contre l erreur de signe : a
	   17 ans, corriger vers le bas quelqu un qui grandit encore serait
	   l inverse de la verite. */
	if c := correctionVitesse(17, MALE, 6); c != 0 {
		t.Errorf("garcon de 17 ans a 6 cm/an : correction %+.2f cm, attendue nulle (hors fenetre)", c)
	}
	if c := correctionVitesse(16, FEMALE, 5); c != 0 {
		t.Errorf("fille de 16 ans a 5 cm/an : correction %+.2f cm, attendue nulle (hors fenetre)", c)
	}
}

// Une saisie absurde ne doit pas pouvoir emporter le chiffre.
func TestCorrectionVitesse_Plafonnee(t *testing.T) {
	for _, v := range []float64{20, 50, 99} {
		if c := correctionVitesse(12, MALE, v); c < -correctionVitesseMax-0.001 {
			t.Errorf("%.0f cm/an : correction %+.2f cm, plafond %.1f", v, c, correctionVitesseMax)
		}
	}
	if c := correctionVitesse(12, MALE, 0.1); c > correctionVitesseMax+0.001 {
		t.Errorf("0,1 cm/an : correction %+.2f cm, plafond %.1f", c, correctionVitesseMax)
	}
}

/* LE FILET. Le meme balayage que sous_taille_test.go, multiplie par trois
   vitesses declarees : lente, attendue, rapide. Si la correction est trop
   forte, elle repousse des profils sous leur taille actuelle et le
   plancher remonte. Seuil identique : 1 %. */
func TestBalayageVitesse_PlancherSousUnPourcent(t *testing.T) {
	ages := []float64{11, 12, 13, 14, 15, 16, 17}
	sexes := []string{MALE, FEMALE}
	zPercentiles := []float64{-1.8808, -1.2816, -0.6745, 0, 0.6745, 1.2816, 1.8808}
	peres := []float64{168.6, 172.1, 175.6, 179.1, 182.6}
	meres := []float64{156.0, 159.25, 162.5, 165.75, 169.0}
	facteurs := []float64{0.4, 1.0, 1.8}

	total, declenches := 0, 0
	var pire float64
	var pireNom string

	for _, age := range ages {
		for _, sexe := range sexes {
			m, s := interpolerLMS(tablePourSexe(sexe), moisDepuisAge(age))
			attendue := vitesseAttendue(age, sexe)

			for _, z := range zPercentiles {
				taille := m * (1 + z*s)
				metres := taille / 100
				poids := 19 * metres * metres

				for _, facteur := range facteurs {
					vitesse := math.Max(0.5, attendue*facteur)

					for _, pere := range peres {
						for _, mere := range meres {
							total++
							req := profilNeutre(age, sexe, taille, poids, pere, mere)
							req.HeightVelocityCM = vitesse

							resp := PredictHeightV2(req)
							if !resp.PlancherDeclenche {
								continue
							}
							declenches++

							if ecart := taille - resp.Factors["blended_base"]; ecart > pire {
								pire = ecart
								pireNom = fmt.Sprintf("%s %.0f ans, %.0f cm, %.1f cm/an, parents %.0f/%.0f",
									sexe, age, taille, vitesse, pere, mere)
							}
						}
					}
				}
			}
		}
	}

	if total != 7350 {
		t.Errorf("7 350 profils attendus, %d construits", total)
	}

	part := 100 * float64(declenches) / float64(total)
	t.Logf("plancher declenche sur %d / %d (%.2f %%), pire ecart %.1f cm", declenches, total, part, pire)

	if part > 1.0 {
		t.Errorf("le plancher se declenche sur %.2f %% des profils (seuil 1 %%) : la correction de vitesse est trop forte, baisser coefficientVitesse. Pire ecart %.1f cm, sur %s", part, pire, pireNom)
	}
}
