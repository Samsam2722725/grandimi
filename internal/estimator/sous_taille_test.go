package estimator

import (
	"fmt"
	"math"
	"strings"
	"testing"
)

/* L INVARIANT QUI MANQUAIT.

   Le defaut repare ici a vecu des semaines en production sans qu aucun
   test ne le voie, parce qu aucun test ne posait la seule question qui
   comptait : le modele rend-il une taille adulte SUPERIEURE a la taille
   deja atteinte ? Il rendait moins pour un profil realiste sur cinq, et
   le plancher « jamais sous la taille actuelle » rattrapait la valeur en
   silence. L utilisateur recevait sa propre taille saisie, presentee
   comme une prediction — et la page lui annoncait ensuite qu il etait
   deja au maximum, juste avant de lui vendre un plan pour grandir.

   Les tests de ce fichier echouent sur le code d avant le correctif.
   C est ce qui les rend utiles. */

// profilNeutre : aucun champ de mode de vie declare, donc multiplicateur
// de sante a 1,0. On mesure le modele, pas l enveloppe des habitudes.
func profilNeutre(age float64, sexe string, taille, poids, pere, mere float64) HeightPredictionV2Request {
	return HeightPredictionV2Request{
		Age:            age,
		Sex:            sexe,
		HeightCM:       taille,
		WeightKG:       poids,
		FatherHeightCM: pere,
		MotherHeightCM: mere,
	}
}

func TestPredictHeightV2_JamaisSousLaTailleActuelle(t *testing.T) {
	cas := []struct {
		nom                                string
		age                                float64
		sexe                               string
		taille, poids, pere, mere, attendu float64
	}{
		// Les cinq profils releves en production, qui recevaient tous
		// exactement leur propre taille saisie.
		{"F 13 ans, 172 cm", 13, FEMALE, 172, 55, 170, 158, 175.1},
		{"F 14 ans, 168 cm", 14, FEMALE, 168, 55, 174, 162, 170.5},
		{"F 15 ans, 175 cm", 15, FEMALE, 175, 60, 176, 170, 176.1},
		{"M 15 ans, 190 cm", 15, MALE, 190, 75, 175, 162, 192.4},
		{"M 16 ans, 188 cm", 16, MALE, 188, 75, 179, 163, 189.2},
		// Profil ordinaire, qui fonctionnait deja : il ne doit pas bouger
		// de plus d un centimetre.
		{"M 14 ans, 165 cm", 14, MALE, 165, 52, 178, 165, 178.7},
	}

	for _, c := range cas {
		resp := PredictHeightV2(profilNeutre(c.age, c.sexe, c.taille, c.poids, c.pere, c.mere))

		if resp.PlancherDeclenche {
			t.Errorf("%s : le plancher s est declenche — le modele a rendu moins que la taille actuelle", c.nom)
		}
		if resp.PredictedHeightCM <= c.taille {
			t.Errorf("%s : %.1f cm annonces pour quelqu un qui mesure deja %.1f cm", c.nom, resp.PredictedHeightCM, c.taille)
		}

		/* La valeur au dixieme n est pas l assertion qui compte — elle
		   bougera si la ponderation des deux ancres change un jour. Une
		   tolerance d un centimetre laisse cette liberte tout en
		   attrapant une erreur de table, d unite ou d interpolation. */
		if math.Abs(resp.PredictedHeightCM-c.attendu) > 1.0 {
			t.Errorf("%s : %.1f cm, attendu %.1f cm (ecart %.1f)", c.nom, resp.PredictedHeightCM, c.attendu, resp.PredictedHeightCM-c.attendu)
		}
	}
}

/* Un plancher qui se declenche n est pas toujours une panne.

   Un garcon de dix-sept ans a 190 cm dont les parents mesurent 168 et 155
   a effectivement fini de grandir, et il est de surcroit hors du domaine
   d ajustement de Khamis-Roche. Le plancher fait ici son travail. Ce
   test existe pour qu on ne confonde pas ce cas legitime avec une
   regression le jour ou le balayage ci-dessous remontera a 0,5 %. */
func TestPredictHeightV2_PlancherLegitime(t *testing.T) {
	resp := PredictHeightV2(profilNeutre(17, MALE, 190, 80, 168, 155))

	if resp.PredictedHeightCM < 190 {
		t.Errorf("le plancher doit rendre au moins la taille actuelle, obtenu %.1f cm", resp.PredictedHeightCM)
	}
	if !resp.PlancherDeclenche {
		t.Log("note : ce profil ne declenche plus le plancher, ce n est pas une erreur")
	}
}

/* LE TEST QUI AURAIT ATTRAPE LE DEFAUT, ET QUI EMPECHERA SON RETOUR.

   2 450 profils : sept ages, deux sexes, sept percentiles OMS de P3 a
   P97, et vingt-cinq combinaisons de tailles parentales autour des
   moyennes francaises a plus ou moins un ecart-type. Ce sont des
   morphologies banales, pas des cas limites fabriques.

   Sur le modele d avant le correctif, 19 % d entre eux declenchaient le
   plancher. Le seuil est fixe a 1 % : au-dessus, le modele a casse. */
func TestBalayage_PlancherSousUnPourcent(t *testing.T) {
	ages := []float64{11, 12, 13, 14, 15, 16, 17}
	sexes := []string{MALE, FEMALE}
	// P3, P10, P25, P50, P75, P90, P97
	zPercentiles := []float64{-1.8808, -1.2816, -0.6745, 0, 0.6745, 1.2816, 1.8808}
	peres := []float64{168.6, 172.1, 175.6, 179.1, 182.6}  // 175,6 +/- 1 sigma
	meres := []float64{156.0, 159.25, 162.5, 165.75, 169.0} // 162,5 +/- 1 sigma

	total, declenches := 0, 0
	var pire float64
	var pireNom string

	for _, age := range ages {
		for _, sexe := range sexes {
			m, s := interpolerLMS(tablePourSexe(sexe), moisDepuisAge(age))
			for _, z := range zPercentiles {
				taille := m * (1 + z*s)
				metres := taille / 100
				poids := 19 * metres * metres

				for _, pere := range peres {
					for _, mere := range meres {
						total++
						resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, pere, mere))
						if !resp.PlancherDeclenche {
							continue
						}
						declenches++

						// De combien le modele est-il tombe sous la taille
						// actuelle avant d etre rattrape ? Le pire profil
						// est nomme dans le message d echec : sans lui, on
						// sait qu il y a un probleme sans savoir ou.
						kr := tailleAdulteKhamisRoche(age, sexe, taille, poids, pere, mere)
						base := (kr + tailleAdulteParPercentile(age, sexe, taille)) / 2
						if ecart := taille - base; ecart > pire {
							pire = ecart
							pireNom = fmt.Sprintf("%s %.0f ans, %.0f cm, parents %.0f/%.0f",
								sexe, age, taille, pere, mere)
						}
					}
				}
			}
		}
	}

	if total != 2450 {
		t.Errorf("2 450 profils attendus, %d construits — la grille a change, relire le commentaire", total)
	}

	part := 100 * float64(declenches) / float64(total)
	t.Logf("plancher declenche sur %d profils / %d (%.1f %%), pire ecart %.1f cm", declenches, total, part, pire)

	if part > 1.0 {
		t.Errorf("le plancher se declenche sur %.1f %% des profils (seuil 1 %%) : le modele rend une taille adulte inferieure a la taille actuelle. Pire ecart %.1f cm, sur %s", part, pire, pireNom)
	}
}

/* Le poids doit changer le chiffre affiche.

   Verifie en production avant ce correctif : de 35 kg a 95 kg, toutes
   choses egales par ailleurs, la reponse ne bougeait pas d un dixieme de
   millimetre. Le quatrieme ecran du questionnaire demandait une donnee
   qui n entrait nulle part. */
func TestPredictHeightV2_LePoidsEntreDansLeChiffre(t *testing.T) {
	leger := PredictHeightV2(profilNeutre(14, MALE, 165, 45, 178, 165))
	lourd := PredictHeightV2(profilNeutre(14, MALE, 165, 85, 178, 165))

	if math.Abs(leger.PredictedHeightCM-lourd.PredictedHeightCM) < 0.1 {
		t.Errorf("40 kg d ecart ne changent rien : %.1f cm contre %.1f cm", leger.PredictedHeightCM, lourd.PredictedHeightCM)
	}
}

// Le contrat public ne doit plus annoncer la methode mi-parentale.
func TestPredictHeightV2_NomDuModele(t *testing.T) {
	resp := PredictHeightV2(profilNeutre(14, MALE, 165, 52, 178, 165))

	if resp.ModelUsed == "" {
		t.Fatal("ModelUsed vide")
	}
	for _, interdit := range []string{"mi-parentale", "Tanner"} {
		if strings.Contains(resp.ModelUsed, interdit) {
			t.Errorf("ModelUsed annonce encore %q : %q", interdit, resp.ModelUsed)
		}
	}
	if !strings.Contains(resp.ModelUsed, "Khamis-Roche") {
		t.Errorf("ModelUsed devrait nommer Khamis-Roche : %q", resp.ModelUsed)
	}
}
