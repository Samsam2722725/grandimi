package estimator

import (
	"fmt"
	"math"
	"testing"
)

/* LE DEFAUT SYMETRIQUE DE CELUI DE SEPTEMBRE.

   En septembre, une ancre non bornee VERS LE BAS (la cible mi-parentale)
   emportait la moyenne et rendait des tailles adultes inferieures a la
   taille du jour. Le plancher masquait le probleme en silence.

   Ici c est l inverse, et la meme cause : Khamis-Roche est une regression
   lineaire, et rien ne la bornait VERS LE HAUT. Mesure en production le
   18/09/2026, un garcon de 11 ans a 180 cm recevait 201,1 cm.

   Ce fichier existe pour que la troisieme version de ce defaut ne passe
   pas non plus. */

func TestBornesTaillePlausible(t *testing.T) {
	basG, hautG := bornesTaillePlausible(MALE)
	basF, hautF := bornesTaillePlausible(FEMALE)

	// Valeurs derivees de la table OMS au 18/09/2026. Une revision de la
	// table les deplacera ; l ordre de grandeur, lui, doit tenir.
	if math.Abs(hautG-198.4) > 0.5 || math.Abs(basG-154.6) > 0.5 {
		t.Errorf("garcons : bande %.1f-%.1f cm, attendue environ 154,6-198,4", basG, hautG)
	}
	if math.Abs(hautF-182.8) > 0.5 || math.Abs(basF-143.5) > 0.5 {
		t.Errorf("filles : bande %.1f-%.1f cm, attendue environ 143,5-182,8", basF, hautF)
	}
	if hautG <= basG || hautF <= basF {
		t.Error("bande inversee")
	}
}

/* Le profil exact releve en production. Il ne doit plus ressortir a
   201 cm, il doit ressortir signale. */
func TestHorsDomaine_LeProfilDeLaRegression(t *testing.T) {
	resp := PredictHeightV2(profilNeutre(11, MALE, 180, 60, 178, 165))
	_, plafond := bornesTaillePlausible(MALE)

	if resp.PredictedHeightCM > plafond {
		t.Errorf("%.1f cm annonces, au-dessus du plafond plausible (%.1f cm)", resp.PredictedHeightCM, plafond)
	}
	if !resp.HorsDomaine {
		t.Error("z = 5,5 : le profil devrait etre signale hors domaine")
	}
	if resp.Avertissement == "" {
		t.Error("hors domaine : aucun avertissement, l utilisateur recoit un chiffre sans savoir ce qu il vaut")
	}
	/* L intervalle doit cesser de pretendre. A +/-7 cm, ce resultat se
	   lisait exactement comme n importe quel autre. */
	if resp.MargeCM < 15 {
		t.Errorf("hors domaine : marge +/-%.1f cm, attendue au moins 15 — l intervalle doit dire qu on ne sait pas", resp.MargeCM)
	}
	if resp.ConfidenceLevel != "low" {
		t.Errorf("hors domaine : niveau %q, attendu \"low\"", resp.ConfidenceLevel)
	}

	t.Logf("garcon 11 ans a 180 cm : %.1f cm +/- %.1f (avant correctif : 201,1 +/- 7,2)",
		resp.PredictedHeightCM, resp.MargeCM)
}

// Le detecteur doit se declencher des deux cotes, pas seulement en haut.
func TestHorsDomaine_LesDeuxCotes(t *testing.T) {
	grand := PredictHeightV2(profilNeutre(11, MALE, 170, 55, 178, 165))
	petit := PredictHeightV2(profilNeutre(12, MALE, 110, 25, 150, 145))

	if !grand.HorsDomaine {
		t.Error("garcon de 11 ans a 170 cm (z = 4,0) : devrait etre signale hors domaine")
	}
	if !petit.HorsDomaine {
		t.Error("garcon de 12 ans a 110 cm (z = -5,5) : devrait etre signale hors domaine")
	}

	// En bas, le plancher reste prioritaire : on ne retrecit pas, meme
	// hors domaine.
	if petit.PredictedHeightCM < 110 {
		t.Errorf("%.1f cm annonces pour quelqu un qui mesure deja 110 cm", petit.PredictedHeightCM)
	}
}

// Un profil ordinaire ne doit rien declencher du tout.
func TestHorsDomaine_SilencieuxSurLesProfilsOrdinaires(t *testing.T) {
	for _, c := range []struct {
		nom                        string
		age                        float64
		sexe                       string
		taille, poids, pere, mere  float64
	}{
		{"M 14 ans, 165 cm", 14, MALE, 165, 52, 178, 165},
		{"F 13 ans, 172 cm", 13, FEMALE, 172, 55, 170, 158},
		{"M 16 ans, 188 cm", 16, MALE, 188, 75, 179, 163},
	} {
		resp := PredictHeightV2(profilNeutre(c.age, c.sexe, c.taille, c.poids, c.pere, c.mere))
		if resp.HorsDomaine {
			t.Errorf("%s : signale hors domaine alors qu il est dans les courbes", c.nom)
		}
		if resp.Avertissement != "" {
			t.Errorf("%s : avertissement inutile affiche", c.nom)
		}
		if resp.MargeCM > 8 {
			t.Errorf("%s : marge +/-%.1f cm, au-dela du maximum ordinaire de 8", c.nom, resp.MargeCM)
		}
	}
}

/* LE TEST DEMANDE : aucun profil du balayage ne doit produire une
   estimation hors de l intervalle plausible pour son sexe. */
func TestBalayage_AucuneEstimationImplausible(t *testing.T) {
	ages := []float64{11, 12, 13, 14, 15, 16, 17}
	sexes := []string{MALE, FEMALE}
	zPercentiles := []float64{-1.8808, -1.2816, -0.6745, 0, 0.6745, 1.2816, 1.8808}
	peres := []float64{168.6, 172.1, 175.6, 179.1, 182.6}
	meres := []float64{156.0, 159.25, 162.5, 165.75, 169.0}

	total := 0
	var pireHaut, pireBas float64
	var nomHaut, nomBas string

	for _, age := range ages {
		for _, sexe := range sexes {
			m, s := interpolerLMS(tablePourSexe(sexe), moisDepuisAge(age))
			bas, haut := bornesTaillePlausible(sexe)

			for _, z := range zPercentiles {
				taille := m * (1 + z*s)
				poids := 19 * (taille / 100) * (taille / 100)

				for _, pere := range peres {
					for _, mere := range meres {
						total++
						resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, pere, mere))

						if depassement := resp.PredictedHeightCM - haut; depassement > pireHaut {
							pireHaut = depassement
							nomHaut = fmt.Sprintf("%s %.0f ans, %.0f cm, parents %.0f/%.0f -> %.1f cm",
								sexe, age, taille, pere, mere, resp.PredictedHeightCM)
						}
						if manque := bas - resp.PredictedHeightCM; manque > pireBas {
							pireBas = manque
							nomBas = fmt.Sprintf("%s %.0f ans, %.0f cm, parents %.0f/%.0f -> %.1f cm",
								sexe, age, taille, pere, mere, resp.PredictedHeightCM)
						}

						// Le potentiel est affiche lui aussi : il doit tenir
						// dans la meme bande.
						if resp.PotentialHeightCM > haut {
							t.Errorf("potentiel %.1f cm au-dessus du plafond %.1f (%s %.0f ans, %.0f cm)",
								resp.PotentialHeightCM, haut, sexe, age, taille)
						}
					}
				}
			}
		}
	}

	if total != 2450 {
		t.Errorf("2 450 profils attendus, %d construits", total)
	}
	if pireHaut > 0 {
		t.Errorf("estimation au-dessus du plafond plausible, de %.1f cm : %s", pireHaut, nomHaut)
	}
	if pireBas > 0 {
		t.Errorf("estimation sous le plancher plausible, de %.1f cm : %s", pireBas, nomBas)
	}
}

/* Le balayage ci-dessus reste dans les courbes par construction (z de
   -1,88 a +1,88) : il ne toucherait jamais le garde-fou. Celui-ci va
   CHERCHER les extremes, ceux que la validation accepte encore. */
func TestBalayageExtreme_LeGardeFouTient(t *testing.T) {
	total, signales := 0, 0

	for _, sexe := range []string{MALE, FEMALE} {
		_, plafond := bornesTaillePlausible(sexe)

		for age := 8.0; age <= 22.0; age += 0.5 {
			for taille := 105.0; taille <= 209.0; taille += 4 {
				for _, parents := range [][2]float64{{150, 145}, {178, 165}, {200, 185}} {
					total++
					poids := 19 * (taille / 100) * (taille / 100)
					resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, parents[0], parents[1]))

					if resp.HorsDomaine {
						signales++
					}

					/* Le plafond cede devant le plancher, et c est voulu :
					   quelqu un qui mesure deja plus que le plafond ne
					   retrecit pas. Au-dela de ce cas, rien ne doit sortir. */
					limite := math.Max(plafond, taille)
					if resp.PredictedHeightCM > limite+0.05 {
						t.Fatalf("%s %.1f ans a %.0f cm, parents %.0f/%.0f : %.1f cm annonces, au-dessus de %.1f",
							sexe, age, taille, parents[0], parents[1], resp.PredictedHeightCM, limite)
					}
					if resp.PredictedHeightCM < taille-0.05 {
						t.Fatalf("%s %.1f ans a %.0f cm : %.1f cm annonces, sous sa taille actuelle",
							sexe, age, taille, resp.PredictedHeightCM)
					}
					// Un profil signale doit l etre jusqu au bout : marge
					// elargie ET message, sinon le signal ne sert a rien.
					if resp.HorsDomaine && (resp.MargeCM < 15 || resp.Avertissement == "") {
						t.Fatalf("%s %.1f ans a %.0f cm : signale hors domaine mais marge %.1f et avertissement %q",
							sexe, age, taille, resp.MargeCM, resp.Avertissement)
					}
				}
			}
		}
	}

	t.Logf("%d profils extremes balayes, %d signales hors domaine (%.1f %%)",
		total, signales, 100*float64(signales)/float64(total))

	if signales == 0 {
		t.Error("aucun profil signale sur un balayage volontairement extreme : le detecteur ne se declenche jamais")
	}
}

/* L intervalle ne doit pas reintroduire ce que le plafond vient de
   chasser.

   Releve en production juste apres le premier correctif : l estimation
   etait bien bornee a 198,4 cm, mais l elargissement hors domaine
   poussait la borne haute a 216,3 cm. Un chiffre que le produit declare
   lui-meme impossible, affiche a cote de celui qu il vient de corriger. */
func TestHorsDomaine_LaBorneHauteResteePlausible(t *testing.T) {
	for _, c := range []struct {
		nom                       string
		age                       float64
		sexe                      string
		taille, poids, pere, mere float64
	}{
		{"M 11 ans, 180 cm", 11, MALE, 180, 60, 178, 165},
		{"M 11 ans, 170 cm", 11, MALE, 170, 55, 178, 165},
		{"F 10 ans, 170 cm", 10, FEMALE, 170, 50, 178, 165},
	} {
		resp := PredictHeightV2(profilNeutre(c.age, c.sexe, c.taille, c.poids, c.pere, c.mere))
		_, plafond := bornesTaillePlausible(c.sexe)
		limite := math.Max(plafond, c.taille)

		if resp.ConfidenceRange[1] > limite+0.05 {
			t.Errorf("%s : borne haute %.1f cm, au-dessus de la limite plausible %.1f",
				c.nom, resp.ConfidenceRange[1], limite)
		}
		if resp.ConfidenceRange[0] < c.taille-0.05 {
			t.Errorf("%s : borne basse %.1f cm, sous sa taille actuelle %.1f",
				c.nom, resp.ConfidenceRange[0], c.taille)
		}
		if resp.ConfidenceRange[1] < resp.PredictedHeightCM {
			t.Errorf("%s : estimation %.1f hors de son propre intervalle [%.1f ; %.1f]",
				c.nom, resp.PredictedHeightCM, resp.ConfidenceRange[0], resp.ConfidenceRange[1])
		}
	}
}

/* Sur TOUS les profils, pas seulement les extremes : aucune borne
   affichee ne doit sortir de ce que le produit declare possible. */
func TestBalayage_AucuneBorneImplausible(t *testing.T) {
	for _, sexe := range []string{MALE, FEMALE} {
		_, plafond := bornesTaillePlausible(sexe)

		for age := 8.0; age <= 22.0; age += 0.5 {
			for taille := 105.0; taille <= 209.0; taille += 4 {
				for _, parents := range [][2]float64{{150, 145}, {178, 165}, {200, 185}} {
					poids := 19 * (taille / 100) * (taille / 100)
					resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, parents[0], parents[1]))

					limite := math.Max(plafond, taille)
					if resp.ConfidenceRange[1] > limite+0.05 {
						t.Fatalf("%s %.1f ans a %.0f cm : borne haute %.1f cm, au-dessus de %.1f",
							sexe, age, taille, resp.ConfidenceRange[1], limite)
					}
					if resp.PredictedHeightCM < resp.ConfidenceRange[0]-0.05 ||
						resp.PredictedHeightCM > resp.ConfidenceRange[1]+0.05 {
						t.Fatalf("%s %.1f ans a %.0f cm : estimation %.1f hors de [%.1f ; %.1f]",
							sexe, age, taille, resp.PredictedHeightCM,
							resp.ConfidenceRange[0], resp.ConfidenceRange[1])
					}
				}
			}
		}
	}
}
