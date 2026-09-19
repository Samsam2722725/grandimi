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
		sexe   string
		agePic float64
		ageFin float64
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

	/* C EST CE CHIFFRE QUI JUSTIFIE LA FENETRE D AGE. A 17 ans la mediane
	   est quasi nulle : le raisonnement « vite = en avance » y est FAUX —
	   a cet age, grandir encore veut dire etre en retard, donc avoir plus
	   de croissance devant soi, pas moins. */
	if v := vitesseAttendue(17, FEMALE); v > 1.0 {
		t.Errorf("fille de 17 ans : vitesse mediane %.2f cm/an, attendue proche de zero", v)
	}
}

func TestPoidsFenetreMaturite(t *testing.T) {
	// Hors fenetre : aucune correction, on ne pretend pas savoir.
	for _, c := range []struct {
		age  float64
		sexe string
	}{
		{8, MALE}, {9.5, MALE}, {16, MALE}, {18, MALE}, {21, MALE},
		{8, FEMALE}, {15, FEMALE}, {17, FEMALE},
	} {
		if p := poidsFenetreMaturite(c.age, c.sexe); p != 0 {
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
		if p := poidsFenetreMaturite(c.age, c.sexe); p != 1 {
			t.Errorf("%s a %.1f ans : poids %.2f, attendu 1 (plateau)", c.sexe, c.age, p)
		}
	}

	/* PAS DE MARCHE A UN ANNIVERSAIRE. Un creneau ferait bouger
	   l estimation de plus d un centimetre entre la veille et le lendemain
	   des quinze ans. Le poids doit varier de moins de 0,15 par mois. */
	for _, sexe := range []string{MALE, FEMALE} {
		precedent := poidsFenetreMaturite(8, sexe)
		for age := 8.0; age <= 20; age += 1.0 / 12.0 {
			p := poidsFenetreMaturite(age, sexe)
			if math.Abs(p-precedent) > 0.15 {
				t.Errorf("%s : saut de poids de %.2f a %.2f vers %.2f ans", sexe, precedent, p, age)
			}
			precedent = p
		}
	}
}

/* LE SENS DES DEUX SIGNAUX. Ils doivent pointer dans la MEME direction :
   positif = en avance. C est le seul moyen de les moyenner sans que l un
   annule l autre par erreur de signe. */
func TestScores_LesDeuxSignauxPointentDansLeMemeSens(t *testing.T) {
	const age, sexe = 12.5, MALE
	attendue := vitesseAttendue(age, sexe)

	rapide, _ := scoreVitesse(age, sexe, attendue*2)
	lent, _ := scoreVitesse(age, sexe, attendue*0.3)
	if rapide <= 0 {
		t.Errorf("vitesse au-dessus de la mediane : score %+.2f, attendu positif (en avance)", rapide)
	}
	if lent >= 0 {
		t.Errorf("vitesse sous la mediane : score %+.2f, attendu negatif (en retard)", lent)
	}

	/* LE SIGNE DE LA POINTURE EST INVERSE PAR RAPPORT A LA VARIATION
	   BRUTE. Pied qui ne bouge plus = pic atteint = EN AVANCE = positif.
	   Pied qui grimpe encore = pic devant = en retard = negatif.
	   Se tromper ici ferait s annuler les deux signaux au lieu de se
	   renforcer, et personne ne le verrait dans le chiffre final. */
	piedArrete, _ := scorePointure(40, 40)
	piedQuiGrimpe, _ := scorePointure(42, 40)
	if piedArrete <= 0 {
		t.Errorf("pied arrete depuis un an : score %+.2f, attendu positif (pic passe)", piedArrete)
	}
	if piedQuiGrimpe >= 0 {
		t.Errorf("pied qui a pris deux pointures : score %+.2f, attendu negatif (pic devant)", piedQuiGrimpe)
	}

	t.Logf("vitesse : lent %+.2f / rapide %+.2f | pointure : +2 pointures %+.2f / stable %+.2f",
		lent, rapide, piedQuiGrimpe, piedArrete)
}

func TestScores_Bornes(t *testing.T) {
	// Une saisie absurde ne doit pas pouvoir emporter l indice.
	for _, v := range []float64{20, 50, 99} {
		s, _ := scoreVitesse(12, MALE, v)
		if s > 1.000001 {
			t.Errorf("%.0f cm/an : score %+.2f, borne a +1", v, s)
		}
	}
	for _, p := range []float64{41, 45, 52} {
		s, _ := scorePointure(p, 38)
		if s < -1.000001 {
			t.Errorf("pointure %.0f contre 38 : score %+.2f, borne a -1", p, s)
		}
	}

	// Un pied qui « retrecit » est une erreur de saisie, pas un signal.
	quiRetrecit, ok := scorePointure(38, 40)
	stable, _ := scorePointure(40, 40)
	if !ok || quiRetrecit != stable {
		t.Errorf("pointure en recul : score %+.2f, attendu le meme qu une variation nulle (%+.2f)", quiRetrecit, stable)
	}
}

func TestScores_NonRenseigne(t *testing.T) {
	if _, ok := scoreVitesse(12, MALE, 0); ok {
		t.Error("vitesse a zero : devrait compter comme non renseignee")
	}
	if _, ok := scoreVitesse(12, MALE, -3); ok {
		t.Error("vitesse negative : devrait compter comme non renseignee")
	}
	// Hors des bornes de plausibilite : on n exploite pas une saisie
	// fantaisiste, on la traite comme absente.
	for _, c := range [][2]float64{{0, 0}, {40, 0}, {0, 40}, {12, 40}, {40, 99}} {
		if _, ok := scorePointure(c[0], c[1]); ok {
			t.Errorf("pointures %.0f / %.0f : devraient compter comme non renseignees", c[0], c[1])
		}
	}
}

/* LE PIEGE PRINCIPAL DU DOSSIER : NE PAS COMPTER DEUX FOIS.

   Vitesse et pointure mesurent le meme phenomene. Deux signaux
   concordants disent la meme chose avec plus de certitude, PAS deux fois
   plus fort. C est l erreur exacte qui a casse 19,8 % des profils quand
   la cible mi-parentale etait ajoutee a cote de Khamis-Roche, qui la
   contenait deja. */
func TestIndiceMaturite_NeCompteJamaisDeuxFois(t *testing.T) {
	base := HeightPredictionV2Request{
		Age: 12.5, Sex: MALE, HeightCM: 153, WeightKG: 47,
		FatherHeightCM: 178, MotherHeightCM: 164,
	}
	attendue := vitesseAttendue(base.Age, base.Sex)

	vitesseSeule := base
	vitesseSeule.HeightVelocityCM = attendue * 2 // nettement en avance

	pointureSeule := base
	pointureSeule.ShoeSizeEU, pointureSeule.ShoeSizeEU1Y = 41, 41 // pied arrete

	lesDeux := base
	lesDeux.HeightVelocityCM = attendue * 2
	lesDeux.ShoeSizeEU, lesDeux.ShoeSizeEU1Y = 41, 41

	iV, _ := indiceMaturite(vitesseSeule)
	iP, _ := indiceMaturite(pointureSeule)
	iD, _ := indiceMaturite(lesDeux)

	if iD > math.Max(iV, iP)+0.000001 {
		t.Errorf("deux signaux concordants donnent %+.2f, plus que chacun seul (%+.2f et %+.2f) : ils sont comptes deux fois",
			iD, iV, iP)
	}

	attenduMoyenne := (iV + iP) / 2
	if math.Abs(iD-attenduMoyenne) > 0.000001 {
		t.Errorf("indice combine %+.2f, attendu la moyenne des deux (%+.2f)", iD, attenduMoyenne)
	}

	// Un seul signal declare : la moyenne ne porte que sur lui, pas sur
	// deux dont un a zero, ce qui diviserait son effet par deux en
	// silence.
	if math.Abs(iV-1) > 0.000001 {
		t.Errorf("vitesse seule, nettement en avance : indice %+.2f, attendu +1 (et non une moyenne avec un zero)", iV)
	}

	if _, ok := indiceMaturite(base); ok {
		t.Error("aucun signal declare : l indice devrait etre marque non renseigne")
	}
}

/* LA PREUVE QUE LE SIGNAL ENTRE DANS LE CALCUL — c est exactement ce que
   la vitesse ne faisait pas avant : deux profils identiques sur tous les
   champs, l un en avance, l autre en retard. */
func TestPredictHeightV2_MaturiteDeplaceLeChiffre(t *testing.T) {
	base := profilNeutre(12.5, MALE, 153, 47, 178, 164)
	attendue := vitesseAttendue(12.5, MALE)

	enAvance := base
	enAvance.HeightVelocityCM = attendue * 2
	enAvance.ShoeSizeEU, enAvance.ShoeSizeEU1Y = 41, 41

	enRetard := base
	enRetard.HeightVelocityCM = attendue * 0.3
	enRetard.ShoeSizeEU, enRetard.ShoeSizeEU1Y = 42, 40

	respAvance := PredictHeightV2(enAvance)
	respRetard := PredictHeightV2(enRetard)

	if respAvance.PredictedHeightCM == respRetard.PredictedHeightCM {
		t.Fatalf("maturites opposees, meme chiffre (%.1f cm) : le signal n entre pas dans le calcul",
			respAvance.PredictedHeightCM)
	}
	if respAvance.PredictedHeightCM >= respRetard.PredictedHeightCM {
		t.Errorf("en avance %.1f cm, en retard %.1f cm : l avance devrait rendre MOINS (son pic est derriere elle)",
			respAvance.PredictedHeightCM, respRetard.PredictedHeightCM)
	}

	ecart := respRetard.PredictedHeightCM - respAvance.PredictedHeightCM
	if ecart > 2*coefficientMaturite+0.2 {
		t.Errorf("ecart de %.1f cm entre les deux maturites : au-dela de ce que k autorise (%.1f)", ecart, 2*coefficientMaturite)
	}

	t.Logf("12,5 ans, 153 cm : en retard %.1f cm | en avance %.1f cm | ecart %.1f cm (indices %+.2f et %+.2f)",
		respRetard.PredictedHeightCM, respAvance.PredictedHeightCM, ecart,
		respRetard.Factors["indice_maturite"], respAvance.Factors["indice_maturite"])
}

/* NE RIEN SAVOIR RESTE STRICTEMENT NEUTRE. Un profil sans vitesse ni
   pointure doit rendre exactement ce qu il rendait avant l indice — pas
   un centimetre de moins. C est la difference entre une question
   facultative et une penalite silencieuse. */
func TestPredictHeightV2_SansSignalAucuneCorrection(t *testing.T) {
	cas := []struct {
		nom                                string
		age                                float64
		sexe                               string
		taille, poids, pere, mere, attendu float64
	}{
		{"F 13 ans, 172 cm", 13, FEMALE, 172, 55, 170, 158, 175.1},
		{"F 14 ans, 168 cm", 14, FEMALE, 168, 55, 174, 162, 170.5},
		{"M 14 ans, 165 cm", 14, MALE, 165, 52, 178, 165, 178.7},
	}

	for _, c := range cas {
		resp := PredictHeightV2(profilNeutre(c.age, c.sexe, c.taille, c.poids, c.pere, c.mere))

		if resp.Factors["correction_maturite"] != 0 {
			t.Errorf("%s : correction %+.2f cm alors qu aucun signal n est declare", c.nom, resp.Factors["correction_maturite"])
		}
		if math.Abs(resp.PredictedHeightCM-c.attendu) > 0.15 {
			t.Errorf("%s : %.1f cm, attendu %.1f cm inchange", c.nom, resp.PredictedHeightCM, c.attendu)
		}
	}
}

// Hors de la fenetre d age, meme un signal tres marque ne corrige rien.
func TestCorrectionMaturite_HorsFenetre(t *testing.T) {
	req := profilNeutre(17, MALE, 178, 68, 178, 165)
	req.HeightVelocityCM = 6
	req.ShoeSizeEU, req.ShoeSizeEU1Y = 44, 44

	correction, indice := correctionMaturite(req)
	if correction != 0 {
		t.Errorf("garcon de 17 ans : correction %+.2f cm, attendue nulle (hors fenetre)", correction)
	}
	if indice == 0 {
		t.Error("l indice devrait rester calcule et expose meme hors fenetre, pour le diagnostic")
	}
}

/* LE FILET. Le balayage des 2 450 profils, multiplie par neuf
   combinaisons de maturite declaree. Si la correction est trop forte,
   elle repousse des profils sous leur taille actuelle et le plancher
   remonte. Seuil identique : 1 %. */
func TestBalayageMaturite_PlancherSousUnPourcent(t *testing.T) {
	ages := []float64{11, 12, 13, 14, 15, 16, 17}
	sexes := []string{MALE, FEMALE}
	zPercentiles := []float64{-1.8808, -1.2816, -0.6745, 0, 0.6745, 1.2816, 1.8808}
	peres := []float64{168.6, 172.1, 175.6, 179.1, 182.6}
	meres := []float64{156.0, 159.25, 162.5, 165.75, 169.0}
	facteursVitesse := []float64{0.3, 1.0, 2.0}
	variationsPointure := []float64{0, 1, 2}

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

				for _, fv := range facteursVitesse {
					for _, vp := range variationsPointure {
						for _, pere := range peres {
							for _, mere := range meres {
								total++
								req := profilNeutre(age, sexe, taille, poids, pere, mere)
								req.HeightVelocityCM = math.Max(0.5, attendue*fv)
								req.ShoeSizeEU1Y = 39
								req.ShoeSizeEU = 39 + vp

								resp := PredictHeightV2(req)
								if !resp.PlancherDeclenche {
									continue
								}
								declenches++

								if ecart := taille - resp.Factors["blended_base"]; ecart > pire {
									pire = ecart
									pireNom = fmt.Sprintf("%s %.0f ans, %.0f cm, %.1f cm/an, +%.0f pointure, parents %.0f/%.0f",
										sexe, age, taille, req.HeightVelocityCM, vp, pere, mere)
								}
							}
						}
					}
				}
			}
		}
	}

	if total != 2450*9 {
		t.Errorf("%d profils attendus, %d construits", 2450*9, total)
	}

	part := 100 * float64(declenches) / float64(total)
	t.Logf("plancher declenche sur %d / %d (%.2f %%), pire ecart %.1f cm", declenches, total, part, pire)

	if part > 1.0 {
		t.Errorf("le plancher se declenche sur %.2f %% des profils (seuil 1 %%) : la correction de maturite est trop forte, baisser coefficientMaturite. Pire ecart %.1f cm, sur %s", part, pire, pireNom)
	}
}

/* La pointure leve la penalite « on ne sait rien de la maturite » sur la
   largeur de l intervalle.

   Avant, seule la vitesse comptait : quelqu un qui declarait sa pointure
   sans declarer sa croissance recevait quand meme les 10 % d elargissement
   reserves a l ignorance complete. Il avait pourtant donne un signal de
   maturite — simplement pas celui-la. */
func TestMarge_LaPointureLeveLaPenaliteDIgnorance(t *testing.T) {
	rien := PredictHeightV2(profilNeutre(12.5, MALE, 153, 47, 178, 164))

	avecPointure := profilNeutre(12.5, MALE, 153, 47, 178, 164)
	avecPointure.ShoeSizeEU, avecPointure.ShoeSizeEU1Y = 40, 39 // variation ordinaire, indice neutre
	resp := PredictHeightV2(avecPointure)

	if resp.MargeCM >= rien.MargeCM {
		t.Errorf("pointure declaree : marge %.1f cm, attendue plus etroite que sans aucun signal (%.1f cm)",
			resp.MargeCM, rien.MargeCM)
	}

	// Savoir quelque chose n est pas savoir la meme chose : la pointure
	// leve la penalite, elle ne resserre pas au-dela.
	if resp.MargeCM < 6.0 {
		t.Errorf("pointure seule : marge %.1f cm, trop etroite — elle ne doit que lever la penalite", resp.MargeCM)
	}

	t.Logf("marge : aucun signal %.1f cm | pointure declaree %.1f cm", rien.MargeCM, resp.MargeCM)
}

/* UNE POINTURE QUI RECULE NE DOIT PAS VALOIR UN PIED FIGE.

   Le math.Max(0, ...) d origine ramenait une variation negative a zero.
   Or zero est le signal le PLUS FORT du bareme : indice +1, donc la
   correction maximale vers le bas. Une faute de frappe retirait autant
   de centimetres qu un pied reellement immobile depuis un an.

   Mesure avant correction, garcon de 13 ans : 42 -> 42, 41 apres 42 et
   38 apres 43 rendaient tous les trois un indice de 1,00. */
func TestScorePointure_UnePointureQuiReculeEstNonRenseignee(t *testing.T) {
	for _, c := range [][2]float64{{41, 42}, {38, 43}, {30, 31}} {
		if _, ok := scorePointure(c[0], c[1]); ok {
			t.Errorf("pointure %.0f apres %.0f : devrait compter comme non renseignee", c[0], c[1])
		}
	}

	// Le pied reellement fige, lui, garde son signal maximal.
	if s, ok := scorePointure(42, 42); !ok || s != 1 {
		t.Errorf("pied fige : attendu score 1 renseigne, obtenu %.2f (renseigne=%v)", s, ok)
	}
}

/* Le defaut doit disparaitre du CHIFFRE RENDU, pas seulement du score :
   une saisie qui recule ne doit plus rien deplacer du tout. */
func TestPredictHeightV2_PointureQuiReculeNeDeplaceRien(t *testing.T) {
	base := HeightPredictionV2Request{
		Age: 13, Sex: MALE, HeightCM: 160, WeightKG: 48,
		FatherHeightCM: 178, MotherHeightCM: 165,
	}
	sansSignal := PredictHeightV2(base)

	avecFaute := base
	avecFaute.ShoeSizeEU = 41
	avecFaute.ShoeSizeEU1Y = 42
	resp := PredictHeightV2(avecFaute)

	if resp.PredictedHeightCM != sansSignal.PredictedHeightCM {
		t.Errorf("pointure qui recule : attendu %.1f cm comme sans signal, obtenu %.1f",
			sansSignal.PredictedHeightCM, resp.PredictedHeightCM)
	}
	if resp.ConfidenceRange != sansSignal.ConfidenceRange {
		t.Errorf("pointure qui recule : l intervalle doit rester celui d un profil sans signal")
	}
}
