package estimator

import "math"

/* LA VITESSE DE CROISSANCE — le seul signal de maturite qu on collecte.

   CE QU ELLE APPORTE
   Le questionnaire demande les centimetres pris depuis un an. Jusqu ici
   cette reponse ne servait qu a elargir ou resserrer la fourchette, jamais
   a deplacer le chiffre : deux adolescents de 14 ans a 165 cm, l un ayant
   pris 9 cm dans l annee et l autre 1 cm, recevaient la meme estimation.

   Or la maturite est precisement la variable manquante qui tient le
   plancher d erreur autour de cinq centimetres. Sans radiographie, la
   vitesse est le meilleur substitut disponible, et elle est deja en base.

   LE SENS EST CONTRE-INTUITIF, ET C EST LE PIEGE
   « Il grandit vite donc il sera grand » est FAUX. Grandir vite pour son
   age, c est surtout etre en AVANCE pubertaire : le pic est en cours, il
   finira plus tot. L ancre trajectoire, elle, suppose qu il reste sur son
   couloir jusqu a 19 ans — elle le SURESTIME donc. Symetriquement, un
   adolescent lent pour son age est probablement en retard, son pic est
   devant lui, et la trajectoire le sous-estime.

       vitesse superieure a l attendu  ->  corriger VERS LE BAS
       vitesse inferieure a l attendu  ->  corriger VERS LE HAUT

   MAIS CE RAISONNEMENT S INVERSE APRES LE PIC, D OU LA FENETRE D AGE
   Le meme raisonnement applique a 17 ans donne l inverse de la verite.
   La vitesse mediane OMS a 17 ans vaut 1,5 cm/an chez le garcon et
   0,2 cm/an chez la fille : un adolescent de 17 ans qui declare 3 cm n est
   pas en avance, il est en RETARD — son pic est arrive tard et il lui
   reste de la croissance. Le corriger vers le bas serait exactement le
   contraire de ce qu il faut faire. Pire, normaliser par une vitesse
   attendue de 0,2 cm/an fait exploser l ecart relatif.

   La correction n est donc appliquee QUE dans la fenetre ou l inference
   « vite = en avance » tient, c est-a-dire autour du pic de vitesse et
   avant lui : 10-13 ans chez la fille, 11-14,5 ans chez le garcon, avec
   des rampes pour ne pas produire une marche de plusieurs centimetres a
   un anniversaire. Hors de cette fenetre, la correction est NULLE — on ne
   pretend pas savoir. C est le meme principe que calculateHealthFactor :
   ne rien savoir reste neutre, l incertitude passe dans la largeur de
   l intervalle, jamais dans le point estime.

   CE N EST PAS UNE METHODE PUBLIEE
   Ni la fenetre d age, ni le coefficient k, ni le plafond de trois
   centimetres ne viennent d un article. C est une decision
   d implementation Grandimi, prise sur la lecture pediatrique standard du
   tempo pubertaire, au meme titre que l interpolation des coefficients
   Khamis-Roche entre deux demi-annees. Elle est documentee comme telle
   plutot que presentee comme de la science.

   k = 1,5 : DELIBEREMENT PRUDENT, ET NON CALIBRE
   Faute de tailles adultes reelles a comparer, aucun balayage ne peut
   fixer k. Le balayage des 7 350 profils (voir vitesse_test.go) ne fait
   que verifier qu il ne casse rien : il est insensible a k, parce que les
   profils qui declenchent le plancher sont des grands de dix-sept ans,
   hors fenetre. k a donc ete choisi pour que l ecart total entre le plus
   lent et le plus rapide reste autour de deux centimetres — moins que la
   marge affichee. Le relever demanderait des donnees qu on n a pas. */

const (
	// Plancher sur la vitesse attendue, en cm/an. Sans lui, l ecart
	// relatif est divise par un nombre proche de zero en fin de
	// croissance et part a l infini. Il ne sert qu en bordure de fenetre.
	vitesseAttendueMin = 1.0

	// Coefficient de la correction. Voir l en-tete : non calibre, prudent.
	coefficientVitesse = 1.5

	// Plafond dur, en centimetres. Une vitesse declaree absurde (20 cm a
	// 12 ans, saisie par erreur) ne doit pas pouvoir emporter le chiffre.
	correctionVitesseMax = 3.0
)

/* vitesseAttendue rend la croissance annuelle mediane a cet age, lue sur
   la table OMS deja presente : M(age + 0,5) - M(age - 0,5).

   Derivee de la table et non d une constante ecrite a la main : le jour
   ou l OMS revise ses courbes, la vitesse attendue suit sans qu on ait a
   se souvenir qu il existe un second endroit a mettre a jour. */
func vitesseAttendue(ageAnnees float64, sexe string) float64 {
	table := tablePourSexe(sexe)
	haut, _ := interpolerLMS(table, moisDepuisAge(ageAnnees+0.5))
	bas, _ := interpolerLMS(table, moisDepuisAge(ageAnnees-0.5))
	return haut - bas
}

/* poidsFenetreVitesse rend de 0 a 1 la confiance qu on accorde a
   l inference « vite = en avance » a cet age.

   Trapeze et non creneau : un creneau ferait bouger l estimation de
   plusieurs centimetres entre la veille et le lendemain d un
   anniversaire, ce qu aucun utilisateur ne pourrait comprendre — et ce
   que le produit ne pourrait pas expliquer, ce qui revient au meme. */
func poidsFenetreVitesse(ageAnnees float64, sexe string) float64 {
	// montee, plateau debut, plateau fin, descente
	debutMontee, finMontee, debutDescente, finDescente := 10.0, 11.0, 14.5, 16.0
	if sexe == FEMALE {
		// Le pic de vitesse arrive environ deux ans plus tot chez la fille.
		debutMontee, finMontee, debutDescente, finDescente = 9.0, 10.0, 13.0, 14.5
	}

	switch {
	case ageAnnees <= debutMontee || ageAnnees >= finDescente:
		return 0
	case ageAnnees < finMontee:
		return (ageAnnees - debutMontee) / (finMontee - debutMontee)
	case ageAnnees <= debutDescente:
		return 1
	default:
		return (finDescente - ageAnnees) / (finDescente - debutDescente)
	}
}

/* correctionVitesse rend les centimetres a AJOUTER a la base.

   Negative quand l adolescent grandit plus vite que la mediane de son
   age, positive quand il grandit moins vite. Nulle si la vitesse n est
   pas renseignee — le questionnaire propose « Je ne sais pas », qui
   arrive ici a zero — ou hors de la fenetre d age. */
func correctionVitesse(ageAnnees float64, sexe string, vitesseDeclareeCM float64) float64 {
	if !(vitesseDeclareeCM > 0) {
		return 0
	}

	poids := poidsFenetreVitesse(ageAnnees, sexe)
	if poids == 0 {
		return 0
	}

	attendue := math.Max(vitesseAttendueMin, vitesseAttendue(ageAnnees, sexe))
	ecart := (vitesseDeclareeCM - attendue) / attendue

	correction := -coefficientVitesse * ecart * poids
	return math.Max(-correctionVitesseMax, math.Min(correctionVitesseMax, correction))
}
