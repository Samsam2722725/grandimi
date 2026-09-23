package estimator

/* LA MENARCHE — un repere DATE, pas un indice de tempo.

   POURQUOI CE N EST PAS UN SIGNAL DE MATURITE DE PLUS

   La vitesse de croissance et la variation de pointure sont des indices :
   elles disent « en avance » ou « en retard » et se moyennent dans
   indiceMaturite. La menarche dit autre chose, et de facon bien plus
   directe : elle DATE la fin de la croissance. Une fille a atteint environ
   95 % de sa taille adulte a ses premieres regles, il lui reste en moyenne
   sept centimetres, et la croissance est pratiquement terminee deux ans et
   demi plus tard.

   Elle devient donc une TROISIEME ANCRE, au meme rang que Khamis-Roche et
   le suivi de percentile, et non une correction ajoutee par-dessus.

   POURQUOI ELLE S ETEINT AU-DELA DE 2,5 ANS

   Passe ce delai l ancre rend « la taille du jour » — ce que les deux
   autres ancres disent deja pour une fille de dix-sept ans. L inclure
   alors n ajoute aucune information : elle ne fait que tirer la moyenne
   vers la taille actuelle et faire sonner le plancher, qui est un
   DETECTEUR DE PANNE. On ne declenche pas une alarme pour un resultat
   correct. Mesure sur 3 843 profils feminins de 15 a 19 ans : le plancher
   passe de 16,4 % sans l ancre a 15,3 % avec, parce qu elle est eteinte
   exactement la ou elle serait nuisible.

   CE QU ELLE APPORTE, MESURE

   Le modele SOUS-ESTIME les filles reglees tard. A seize ans au P50 il
   annonce un centimetre de croissance restante, alors qu une fille reglee
   depuis un an en a encore quatre devant elle. L ancre corrige de +1,0 a
   +1,5 cm sur ces profils, qui representent 23 % des filles de quinze ans
   et plus.

   C est modeste, et il faut le dire : le gain souvent cite dans la
   litterature — de l ordre de cinq a trois centimetres d erreur — porte
   sur des modeles post-menarche dedies appliques aux 12-15 ans. Chez les
   15 ans et plus, les deux ancres existantes convergent deja vers « presque
   fini », et il reste peu a corriger.

   POURQUOI SEULEMENT 15 ANS ET PLUS

   Decision produit, pas technique. La date des premieres regles est une
   donnee de sante ; en France le consentement d une mineure ne suffit pas
   avant quinze ans, il faut celui du titulaire de l autorite parentale. La
   question n est donc posee qu a partir de quinze ans, ce qui evite tout
   circuit de consentement. Le modele, lui, sait traiter n importe quel age
   valide : c est le questionnaire qui filtre, pas le calcul.

   CE N EST PAS UNE METHODE PUBLIEE

   Les trois faits cliniques ci-dessus le sont. La decroissance LINEAIRE du
   reste sur deux ans et demi, elle, est une decision d implementation
   Grandimi — la realite est plutot une decroissance douce. Documentee
   comme telle, au meme titre que l interpolation des coefficients
   Khamis-Roche. */

const (
	// Croissance moyenne observee apres les premieres regles. La
	// dispersion individuelle va d environ quatre a onze centimetres ;
	// c est la moyenne qui sert d ancre, la dispersion reste dans la
	// marge affichee.
	resteMoyenApresMenarcheCM = 7.0

	// Au-dela, la croissance est pratiquement terminee et l ancre
	// s eteint plutot que de repeter ce que les autres disent.
	dureeCroissancePostMenarcheAns = 2.5

	// Bornes de plausibilite de l age aux premieres regles. Hors de la,
	// on considere le champ non renseigne plutot que d exploiter une
	// saisie fantaisiste — meme principe que les bornes de pointure.
	ageMenarcheMin = 8.0
	ageMenarcheMax = 18.0
)

/* ansDepuisMenarche rend le delai ecoule, et si le signal est exploitable.

   Un age aux premieres regles superieur a l age declare est une
   incoherence de saisie, pas une information : on le traite comme non
   renseigne, exactement comme une pointure qui recule. */
func ansDepuisMenarche(req HeightPredictionV2Request) (float64, bool) {
	if req.Sex != FEMALE || !req.MenarcheSurvenue {
		return 0, false
	}
	if req.AgeMenarcheAnnees < ageMenarcheMin || req.AgeMenarcheAnnees > ageMenarcheMax {
		return 0, false
	}

	ans := req.Age - req.AgeMenarcheAnnees
	if ans < 0 {
		return 0, false
	}
	return ans, true
}

/* tailleAdulteParMenarche rend la troisieme ancre, et si elle s applique.

   Eteinte au-dela de dureeCroissancePostMenarcheAns : voir l en-tete du
   fichier, c est le point qui evite de faire sonner le plancher sur des
   resultats corrects. */
func tailleAdulteParMenarche(req HeightPredictionV2Request) (float64, bool) {
	ans, ok := ansDepuisMenarche(req)
	if !ok || ans >= dureeCroissancePostMenarcheAns {
		return 0, false
	}

	reste := resteMoyenApresMenarcheCM * (1 - ans/dureeCroissancePostMenarcheAns)
	return req.HeightCM + reste, true
}
