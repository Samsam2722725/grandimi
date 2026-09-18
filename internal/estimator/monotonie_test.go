package estimator

import (
	"fmt"
	"math"
	"testing"
)

/* L ORDRE. Quatre assertions, et il a fallu les quatre.

   Le defaut qui les motive : la borne BASSE posee sur Khamis-Roche
   rendait une constante. Un garcon de 15 ans mesurant 125, 135 ou
   145 cm, parents 150/145, recevait 154,6 cm dans les trois cas.

   DEUX ASSERTIONS SUR QUATRE NE L AURAIENT PAS VU, ET C EST INSTRUCTIF.

   La premiere — « une taille plus grande doit donner une estimation plus
   grande OU EGALE » — ne detectait rien : le modele etait deja croissant
   au sens large, zero inversion sur 18 270 points. C est le « ou egale »
   qui laissait passer les paliers.

   La deuxieme non plus, pour une raison moins evidente : la zone plate
   se situait entierement HORS du domaine (|z| > 3), que cette assertion
   ignore par construction. Une borne posee hors domaine ne se voit pas
   en regardant le domaine.

   C est la TROISIEME qui l attrape, et elle seule : 49 cm d amplitude
   d entree pour un seul chiffre de sortie, sur un garcon de 18,5 ans aux
   parents 150/145, de 105 a 154 cm rendus a 154,6 cm. */

// profilsMonotonie : les axes sur lesquels on fait varier la taille, tout
// le reste fixe. Parents volontairement contrastes : un plancher qui
// depend des parents se verrait sur l un des trois et pas sur les autres.
var parentsMonotonie = [][2]float64{{150, 145}, {178, 165}, {200, 185}}

/* 1. NON-DECROISSANCE PARTOUT.

   Le filet de base, sur toute la plage que la validation accepte. Il ne
   suffit pas — c est tout l objet du commentaire en tete — mais une
   inversion reste le pire defaut possible : deux adolescents dont le
   plus grand recoit le plus petit chiffre. */
func TestMonotonie_JamaisDecroissante(t *testing.T) {
	for _, sexe := range []string{MALE, FEMALE} {
		for age := 8.0; age <= 22.0; age += 0.5 {
			for _, parents := range parentsMonotonie {
				precedent := -1.0
				tailleePrecedente := 0.0

				for taille := 105.0; taille <= 209.0; taille += 1 {
					poids := 19 * (taille / 100) * (taille / 100)
					resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, parents[0], parents[1]))

					if precedent >= 0 && resp.PredictedHeightCM < precedent-0.001 {
						t.Fatalf("%s %.1f ans, parents %.0f/%.0f : %.0f cm -> %.1f puis %.0f cm -> %.1f. Le plus grand recoit moins.",
							sexe, age, parents[0], parents[1],
							tailleePrecedente, precedent, taille, resp.PredictedHeightCM)
					}
					precedent = resp.PredictedHeightCM
					tailleePrecedente = taille
				}
			}
		}
	}
}

/* 2. STRICTE CROISSANCE DANS LE DOMAINE.

   Dans les courbes (|z| <= 3) et sous le plafond, le modele est cense
   MODELISER : deux tailles distinctes doivent donner deux chiffres
   distincts. Un palier plat y signifie qu une borne a remplace le
   calcul.

   ELLE N A PAS ATTRAPE LE DEFAUT DE SEPTEMBRE — la zone plate etait hors
   domaine, et cette assertion l ignore. Elle reste : le jour ou une
   borne sera posee un cran trop haut, elle mordra DANS les courbes, et
   c est celle-ci qui le dira. */
func TestMonotonie_StrictementCroissanteDansLeDomaine(t *testing.T) {
	for _, sexe := range []string{MALE, FEMALE} {
		_, plafond := bornesTaillePlausible(sexe)

		for age := 10.0; age <= 18.0; age += 0.5 {
			for _, parents := range parentsMonotonie {
				precedent := -1.0
				taillePrecedente := 0.0

				for taille := 105.0; taille <= 209.0; taille += 1 {
					// Uniquement les tailles que la table decrit.
					if math.Abs(zTaillePourAge(age, sexe, taille)) > 3 {
						precedent = -1
						continue
					}

					poids := 19 * (taille / 100) * (taille / 100)
					resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, parents[0], parents[1]))

					// Au plafond, le palier est legitime : c est la borne
					// haute qui fait son travail.
					if resp.PredictedHeightCM >= plafond-0.05 {
						precedent = -1
						continue
					}
					// Au plancher « jamais sous la taille atteinte » non plus,
					// le chiffre suit la taille et ne sort pas du modele.
					if resp.PlancherDeclenche {
						precedent = -1
						continue
					}

					if precedent >= 0 && resp.PredictedHeightCM <= precedent+0.001 {
						t.Fatalf("%s %.1f ans, parents %.0f/%.0f : %.0f cm et %.0f cm donnent le meme chiffre (%.1f cm). Dans les courbes, une borne a remplace le calcul.",
							sexe, age, parents[0], parents[1],
							taillePrecedente, taille, resp.PredictedHeightCM)
					}
					precedent = resp.PredictedHeightCM
					taillePrecedente = taille
				}
			}
		}
	}
}

/* 3. AUCUN PALIER PLAT TROP LONG — CELLE QUI A ATTRAPE LE DEFAUT.

   Les deux precedentes le laissaient passer. Celle-ci rend le defaut
   visible COMME un defaut plutot que comme une borne legitime : un
   plafond produit un palier court, une constante mal placee en produit
   un tres long. Sur le code d avant, elle sortait 49 cm d amplitude
   d entree pour un seul chiffre de sortie — garcon de 18,5 ans, parents
   150/145, de 105 a 154 cm rendus a 154,6 cm. Apres retrait de la borne
   basse, le plus long palier hors plafond fait 0 cm.

   Dix centimetres est la limite retenue.

   Le palier au plafond est exclu, lui : il est borne par construction et
   peut legitimement s etendre loin. */
func TestMonotonie_AucunPalierTropLong(t *testing.T) {
	const amplitudeMax = 10.0

	for _, sexe := range []string{MALE, FEMALE} {
		_, plafond := bornesTaillePlausible(sexe)

		for age := 8.0; age <= 22.0; age += 0.5 {
			for _, parents := range parentsMonotonie {
				valeurPalier := -1.0
				debutPalier := 0.0

				for taille := 105.0; taille <= 210.0; taille += 1 {
					var valeur float64
					if taille <= 209.0 {
						poids := 19 * (taille / 100) * (taille / 100)
						resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, parents[0], parents[1]))
						// Le palier du plafond est legitime : on ne le suit pas.
						if resp.PredictedHeightCM >= plafond-0.05 {
							valeur = -1
						} else {
							valeur = resp.PredictedHeightCM
						}
					} else {
						valeur = -1 // sentinelle de fin, ferme le dernier palier
					}

					if valeur >= 0 && math.Abs(valeur-valeurPalier) < 0.001 {
						continue // le palier continue
					}

					if valeurPalier >= 0 {
						if amplitude := taille - 1 - debutPalier; amplitude >= amplitudeMax {
							t.Fatalf("%s %.1f ans, parents %.0f/%.0f : %.1f cm rendu a l identique de %.0f a %.0f cm (%.0f cm d amplitude). Une constante a remplace le calcul.",
								sexe, age, parents[0], parents[1],
								valeurPalier, debutPalier, taille-1, amplitude)
						}
					}

					valeurPalier = valeur
					debutPalier = taille
				}
			}
		}
	}
}

/* 4. AUCUN PROFIL REALISTE SIGNALE HORS DOMAINE.

   Le garde-fou envoie chez le medecin. Elargi d un cran de trop, il y
   enverrait des adolescents parfaitement ordinaires — et rien ne le
   dirait, puisque le message est plausible et que personne ne teste
   l absence d une alerte.

   Grille construite sur les percentiles OMS eux-memes, de P3 a P97 :
   trois pour cent des adolescents de chaque age sont sous P3 et trois
   pour cent au-dessus de P97. Si l un de ces profils se met a etre
   signale, le seuil a bouge. */
func TestGardeFou_AucunProfilRealisteSignale(t *testing.T) {
	// P3, P10, P25, P50, P75, P90, P97
	zPercentiles := []struct {
		nom string
		z   float64
	}{
		{"P3", -1.8808}, {"P10", -1.2816}, {"P25", -0.6745}, {"P50", 0},
		{"P75", 0.6745}, {"P90", 1.2816}, {"P97", 1.8808},
	}
	// Tailles parentales moyennes francaises.
	const pere, mere = 175.6, 162.5

	total, signales := 0, 0
	var coupables []string

	for age := 11.0; age <= 17.0; age++ {
		for _, sexe := range []string{MALE, FEMALE} {
			m, s := interpolerLMS(tablePourSexe(sexe), moisDepuisAge(age))

			for _, p := range zPercentiles {
				taille := m * (1 + p.z*s)
				poids := 19 * (taille / 100) * (taille / 100)
				total++

				resp := PredictHeightV2(profilNeutre(age, sexe, taille, poids, pere, mere))
				if resp.HorsDomaine {
					signales++
					coupables = append(coupables, fmt.Sprintf("%s %.0f ans au %s (%.1f cm)", sexe, age, p.nom, taille))
				}
			}
		}
	}

	if signales > 0 {
		t.Errorf("%d profils realistes sur %d envoyes chez le medecin : %v", signales, total, coupables)
	}
	t.Logf("%d profils de P3 a P97, de 11 a 17 ans : %d signale(s)", total, signales)
}
