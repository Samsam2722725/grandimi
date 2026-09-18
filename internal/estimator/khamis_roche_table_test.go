package estimator

import (
	"math"
	"testing"
)

/* La table et sa formule, verifiees contre des valeurs publiees.

   Ces tests ne mesurent pas la justesse clinique de Khamis-Roche : ils
   verifient qu on l a transcrite et appliquee sans se tromper. C est
   exactement ce qui avait echoue la fois precedente — une table qui n
   etait pas la bonne, appliquee dans les mauvaises unites, sans qu aucun
   test ne le dise. */

func TestTableKR_Forme(t *testing.T) {
	for nom, table := range map[string][]coefficientKR{
		"garcons": coefficientsKRGarcons,
		"filles":  coefficientsKRFilles,
	} {
		if len(table) != 28 {
			t.Errorf("%s : 28 lignes attendues (4,0 a 17,5 ans par demi-annee), obtenu %d", nom, len(table))
		}

		vus := map[float64]bool{}
		for i, ligne := range table {
			if vus[ligne.age] {
				t.Errorf("%s : age %.1f present deux fois", nom, ligne.age)
			}
			vus[ligne.age] = true

			if i > 0 && ligne.age <= table[i-1].age {
				t.Errorf("%s : ages non croissants a l index %d (%.1f apres %.1f)", nom, i, ligne.age, table[i-1].age)
			}

			for _, c := range []float64{ligne.b0, ligne.b1, ligne.b2, ligne.b3} {
				if math.IsNaN(c) || math.IsInf(c, 0) {
					t.Errorf("%s : coefficient non fini a l age %.1f", nom, ligne.age)
				}
			}
		}

		if table[0].age != ageMinKR {
			t.Errorf("%s : commence a %.1f, attendu %.1f", nom, table[0].age, ageMinKR)
		}
		if table[len(table)-1].age != ageMaxKR {
			t.Errorf("%s : finit a %.1f, attendu %.1f", nom, table[len(table)-1].age, ageMaxKR)
		}
	}
}

/* Les trois cas de controle publies dans
   artifacts/grandimi/docs/PREDICTION_ENGINE.md. Ils tombent sur des
   lignes exactes de la table : un ecart ici signale une erreur de
   transcription ou d unite, pas un desaccord de modele.

   Tolerance de 0,1 cm : la doc annonce ses resultats arrondis au
   dixieme. */
func TestKhamisRoche_CasDeControle(t *testing.T) {
	cas := []struct {
		nom                              string
		age                              float64
		sexe                             string
		taille, poids, pere, mere, attendu float64
	}{
		{"garcon 10 ans", 10, MALE, 140, 35, 178, 165, 178.9},
		{"fille 4 ans", 4, FEMALE, 100, 16, 175, 160, 161.7},
		{"garcon 10,5 ans", 10.5, MALE, 170, 60, 185, 168, 201.5},
	}

	/* Sur khamisRocheBrut et non sur la version bornee : ces cas
	   verifient la transcription de la table et la conversion d unites,
	   pas la politique de bornage du produit. Le troisieme est d ailleurs
	   un profil hors domaine — un garcon de 10,5 ans a 170 cm — que le
	   plafond rabote a 198,4 cm, et c est le comportement voulu. */
	for _, c := range cas {
		obtenu := khamisRocheBrut(c.age, c.sexe, c.taille, c.poids, c.pere, c.mere)
		if math.Abs(obtenu-c.attendu) > 0.1 {
			t.Errorf("%s : %.2f cm, attendu %.1f cm (ecart %.2f)", c.nom, obtenu, c.attendu, obtenu-c.attendu)
		}
	}

	/* Et la preuve que le bornage s applique bien par-dessus : le meme
	   troisieme cas, passe par la version que le modele utilise, ne doit
	   plus ressortir a 201,5 cm. */
	_, plafond := bornesTaillePlausible(MALE)
	borne := tailleAdulteKhamisRoche(10.5, MALE, 170, 60, 185, 168)
	if borne > plafond+0.01 {
		t.Errorf("cas hors domaine : %.2f cm apres bornage, plafond %.2f", borne, plafond)
	}
	if math.Abs(borne-plafond) > 0.01 {
		t.Errorf("cas hors domaine : %.2f cm, attendu exactement le plafond %.2f", borne, plafond)
	}
}

/* L unite est le piege du dossier : la table travaille en pouces et en
   livres. Si quelqu un rebranche des centimetres un jour, ce test le
   dit tout de suite plutot que dans six semaines.

   Applique aux centimetres et aux kilogrammes, le cas du garcon de 10
   ans rendrait environ 118 cm au lieu de 178,9. */
func TestKhamisRoche_UnitesImperiales(t *testing.T) {
	c := coefficientsKR(10, MALE)
	sansConversion := c.b0 + c.b1*140 + c.b2*35 + c.b3*((178+165)/2)

	if math.Abs(sansConversion-178.9) < 5 {
		t.Fatalf("le calcul sans conversion donne %.1f cm : la table n est plus en unites imperiales, tout le reste du fichier est a relire", sansConversion)
	}
}

// L interpolation doit rendre exactement la ligne quand l age tombe
// dessus, et rester strictement entre les deux voisines sinon.
func TestKhamisRoche_Interpolation(t *testing.T) {
	exact := coefficientsKR(14, MALE)
	if exact.b0 != -6.4299 || exact.b3 != 0.58762 {
		t.Errorf("age exact 14 : coefficients %v, attendus ceux de la ligne 14", exact)
	}

	milieu := coefficientsKR(14.25, MALE)
	bas, haut := coefficientsKR(14, MALE), coefficientsKR(14.5, MALE)
	attendu := (bas.b0 + haut.b0) / 2
	if math.Abs(milieu.b0-attendu) > 1e-9 {
		t.Errorf("age 14,25 : b0 = %.6f, attendu %.6f (milieu de %.4f et %.4f)", milieu.b0, attendu, bas.b0, haut.b0)
	}

	// Hors bornes : on rabat, on n extrapole pas.
	if coefficientsKR(25, MALE).b0 != coefficientsKRGarcons[len(coefficientsKRGarcons)-1].b0 {
		t.Error("au-dela de 17,5 ans, la derniere ligne doit etre reutilisee telle quelle")
	}
	if coefficientsKR(2, FEMALE).b0 != coefficientsKRFilles[0].b0 {
		t.Error("sous 4 ans, la premiere ligne doit etre reutilisee telle quelle")
	}
}

/* Le poids entre vraiment dans le chiffre.

   Avant ce correctif, il etait collecte au quatrieme ecran du
   questionnaire et n entrait nulle part : verifie en production, de
   35 kg a 95 kg toutes choses egales par ailleurs, la reponse ne
   bougeait pas d un dixieme de millimetre. */
func TestKhamisRoche_LePoidsCompte(t *testing.T) {
	leger := tailleAdulteKhamisRoche(14, MALE, 165, 45, 178, 165)
	lourd := tailleAdulteKhamisRoche(14, MALE, 165, 85, 178, 165)

	if math.Abs(leger-lourd) < 0.2 {
		t.Errorf("40 kg d ecart ne changent que %.3f cm : le poids n entre pas dans le calcul", math.Abs(leger-lourd))
	}
	// b2 est negatif a cet age : plus lourd, un peu moins haut.
	if lourd >= leger {
		t.Errorf("a 14 ans b2 est negatif : le profil lourd (%.1f) devrait sortir sous le leger (%.1f)", lourd, leger)
	}
}

// Un poids absent ne doit pas gonfler le resultat en silence.
func TestKhamisRoche_PoidsAbsent(t *testing.T) {
	sansPoids := tailleAdulteKhamisRoche(14, MALE, 165, 0, 178, 165)
	plausible := tailleAdulteKhamisRoche(14, MALE, 165, 19*1.65*1.65, 178, 165)

	if math.Abs(sansPoids-plausible) > 0.01 {
		t.Errorf("poids absent : %.2f cm, attendu le substitut IMC 19 (%.2f cm)", sansPoids, plausible)
	}
}
