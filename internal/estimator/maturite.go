package estimator

import "math"

/* L INDICE DE MATURITE — un seul indice, nourri par plusieurs signaux.

   CE QU IL APPORTE
   La maturite pubertaire est la variable manquante qui tient le plancher
   d erreur autour de cinq centimetres : deux adolescents identiques sur
   tous les champs collectes peuvent finir a quatorze centimetres d ecart
   selon que la puberte est en avance ou en retard. Sans radiographie, on
   ne peut que l approcher.

   UN SEUL INDICE, ET PAS UNE CORRECTION PAR SIGNAL
   La vitesse de croissance et la variation de pointure mesurent LE MEME
   phenomene. Les appliquer comme deux corrections independantes le
   compterait deux fois — c est exactement l erreur qui a casse 19,8 %
   des profils quand la cible mi-parentale etait ajoutee a cote de
   Khamis-Roche, qui la contenait deja (voir khamis_roche_table.go). On
   ne la refait pas : les signaux se moyennent d abord, la correction
   s applique une fois.

   LE SENS EST L INVERSE DE L INTUITION, ET C EST LE PIEGE
   « Il grandit vite donc il sera grand » est FAUX. Etre en avance
   pubertaire, c est avoir son pic derriere soi et finir plus tot. L ancre
   trajectoire, elle, suppose que l adolescent reste sur son couloir
   jusqu a 19 ans — elle SURESTIME donc celui qui est en avance, et
   sous-estime celui qui est en retard.

       maturite en avance  ->  corriger VERS LE BAS
       maturite en retard  ->  corriger vers le haut

   L indice est donc oriente : POSITIF = en avance.

   LES DEUX SIGNAUX, ET POURQUOI ILS POINTENT DANS LE MEME SENS

   Vitesse : grandir plus vite que la mediane de son age, c est etre dans
   son pic quand les autres n y sont pas encore. Score positif.

   Pointure : l augmentation de pointure S ARRETE au moment du pic de
   taille, et le pic du pied precede celui de la taille de 1,3 an chez la
   fille et 2,5 ans chez le garcon (van der Eerden, Hermanussen). Un pied
   qui ne bouge plus depuis un an signale donc un pic atteint ou passe —
   en avance. Un pied qui grimpe encore signale un pic devant soi. Score
   positif quand la pointure stagne : c est bien l INVERSE du signe brut
   de la variation, et c est voulu.

   CE N EST PAS UNE METHODE PUBLIEE
   Les reperes de timing du pied sont publies. Leur combinaison avec la
   vitesse en un indice unique, la fenetre d age, le coefficient k et le
   plafond de trois centimetres ne le sont pas : c est une decision
   d implementation Grandimi, au meme titre que l interpolation des
   coefficients Khamis-Roche entre deux demi-annees. Documentee comme
   telle plutot que presentee comme de la science.

   NE RIEN SAVOIR RESTE STRICTEMENT NEUTRE
   Seuls les signaux DECLARES entrent dans la moyenne. Un adolescent qui
   ne repond a aucune des deux questions recoit exactement le chiffre
   d avant cet indice — pas une penalite silencieuse. C est le principe
   deja etabli par calculateHealthFactor, pour la meme raison : les deux
   questions sont facultatives, et un champ vide ne doit jamais couter
   des centimetres. L incertitude passe dans la largeur de l intervalle,
   jamais dans le point estime. */

const (
	// Plancher sur la vitesse attendue, en cm/an. Sans lui, l ecart
	// relatif est divise par un nombre proche de zero en fin de
	// croissance et part a l infini.
	vitesseAttendueMin = 1.0

	/* Pivot de la variation de pointure, en pointures europeennes par an.
	   Une pointure par an est la variation ordinaire d un enfant encore
	   loin de son pic ; zero veut dire que le pied a fini. C est ce pivot
	   qui fait basculer le score, et c est une valeur d implementation,
	   pas une constante publiee. */
	pointureAttendueParAn = 1.0

	// Bornes de plausibilite d une pointure europeenne. Hors de la, on
	// considere que le champ n est pas renseigne plutot que d exploiter
	// une saisie fantaisiste.
	pointureMin = 25.0
	pointureMax = 55.0

	/* Coefficient de la correction. Chaque score etant borne a +/-1, la
	   correction ne peut pas depasser k centimetres : l ecart total entre
	   un profil pleinement en avance et un profil pleinement en retard
	   vaut 2k, soit trois centimetres — moins que la marge affichee.

	   NON CALIBRE, ET IL FAUT LE DIRE. Faute de tailles adultes reelles a
	   comparer, aucun balayage ne peut fixer k : le balayage verifie qu il
	   ne casse rien, il ne le calibre pas. Le relever demanderait des
	   donnees qu on n a pas. */
	coefficientMaturite = 1.5

	// Plafond dur. Avec des scores bornes a +/-1 il n est jamais atteint ;
	// il reste comme garde-fou si quelqu un ajoute un signal plus tard.
	correctionMaturiteMax = 3.0
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

/* poidsFenetreMaturite rend de 0 a 1 la confiance qu on accorde a
   l inference « en avance = finira plus tot » a cet age.

   POURQUOI UNE FENETRE. Le raisonnement s inverse apres le pic. La
   vitesse mediane OMS a 17 ans vaut 1,5 cm/an chez le garcon et
   0,25 cm/an chez la fille : un adolescent de 17 ans qui declare 3 cm n
   est pas en avance, il est en RETARD — son pic est arrive tard et il
   lui reste de la croissance. Le corriger vers le bas serait l exact
   contraire de la verite. Meme chose pour le pied : a 16 ans il a fini
   de grandir chez tout le monde, le signal ne distingue plus personne.

   Symetriquement, avant 10-11 ans, personne n est encore dans son pic :
   le signal ne distingue rien non plus.

   La correction n est donc appliquee qu autour du pic et juste avant :
   10-13 ans chez la fille, 11-14,5 ans chez le garcon. Hors de la, elle
   est nulle — on ne pretend pas savoir.

   Trapeze et non creneau : un creneau ferait bouger l estimation de plus
   d un centimetre entre la veille et le lendemain d un anniversaire, ce
   qu aucun utilisateur ne pourrait comprendre — et ce que le produit ne
   pourrait pas expliquer, ce qui revient au meme. */
func poidsFenetreMaturite(ageAnnees float64, sexe string) float64 {
	debutMontee, finMontee, debutDescente, finDescente := 10.0, 11.0, 14.5, 16.0
	if sexe == FEMALE {
		// Le pic arrive environ deux ans plus tot chez la fille.
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

/* scoreVitesse : +1 nettement en avance, -1 nettement en retard, 0 pile
   sur la mediane de son age. Le second retour dit si le signal est
   renseigne — zero est une valeur legitime du score, pas une absence. */
func scoreVitesse(ageAnnees float64, sexe string, vitesseDeclareeCM float64) (float64, bool) {
	if !(vitesseDeclareeCM > 0) {
		return 0, false
	}

	attendue := math.Max(vitesseAttendueMin, vitesseAttendue(ageAnnees, sexe))
	return borner1((vitesseDeclareeCM - attendue) / attendue), true
}

/* scorePointure : +1 quand le pied n a pas bouge depuis un an (pic
   atteint ou passe), -1 quand il a pris deux pointures ou plus (pic
   encore devant).

   LE SIGNE EST INVERSE PAR RAPPORT A LA VARIATION BRUTE, et c est le
   point qu il ne faut pas rater en relisant : beaucoup de variation =
   score NEGATIF = en retard = correction vers le haut.

   Une pointure qui recule d une annee sur l autre est une erreur de
   saisie ou un souvenir approximatif, pas un pied qui retrecit : on la
   traite comme une variation nulle plutot que d en tirer un signal. */
func scorePointure(pointureEU, pointureEUilYaUnAn float64) (float64, bool) {
	if pointureEU < pointureMin || pointureEU > pointureMax {
		return 0, false
	}
	if pointureEUilYaUnAn < pointureMin || pointureEUilYaUnAn > pointureMax {
		return 0, false
	}

	variation := math.Max(0, pointureEU-pointureEUilYaUnAn)
	return borner1((pointureAttendueParAn - variation) / pointureAttendueParAn), true
}

func borner1(v float64) float64 {
	return math.Max(-1, math.Min(1, v))
}

/* indiceMaturite moyenne les signaux DECLARES, et eux seuls.

   Moyenne et non somme : deux signaux concordants disent la meme chose
   avec plus de certitude, pas deux fois plus fort. Sommer reviendrait a
   compter deux fois le meme phenomene, ce que tout ce fichier existe
   pour eviter. */
func indiceMaturite(req HeightPredictionV2Request) (float64, bool) {
	somme, nombre := 0.0, 0

	if s, ok := scoreVitesse(req.Age, req.Sex, req.HeightVelocityCM); ok {
		somme += s
		nombre++
	}
	if s, ok := scorePointure(req.ShoeSizeEU, req.ShoeSizeEU1Y); ok {
		somme += s
		nombre++
	}

	if nombre == 0 {
		return 0, false
	}
	return somme / float64(nombre), true
}

/* correctionMaturite rend les centimetres a AJOUTER a la base, et
   l indice qui l a produite — le second sert a l exposer dans Factors,
   pour qu un ecart se voie au lieu de se deviner.

   Negative quand l adolescent est en avance, positive quand il est en
   retard, nulle quand aucun signal n est renseigne ou qu on est hors de
   la fenetre d age. */
func correctionMaturite(req HeightPredictionV2Request) (correction float64, indice float64) {
	indice, renseigne := indiceMaturite(req)
	if !renseigne {
		return 0, 0
	}

	poids := poidsFenetreMaturite(req.Age, req.Sex)
	if poids == 0 {
		return 0, indice
	}

	correction = -coefficientMaturite * indice * poids
	return math.Max(-correctionMaturiteMax, math.Min(correctionMaturiteMax, correction)), indice
}
