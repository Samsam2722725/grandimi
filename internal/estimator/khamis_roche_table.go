package estimator

import "math"

/* KHAMIS-ROCHE — la taille adulte lue sur l enfant lui-meme.

   CE QUE CETTE TABLE REMPLACE
   Le moteur moyennait jusqu ici la cible mi-parentale (Tanner) avec la
   trajectoire OMS. La cible mi-parentale ne regarde JAMAIS l enfant :
   des qu il depasse nettement ses parents — effet seculaire, tailles
   parentales declarees de memoire, simple variation normale — elle le
   tire vers le bas sans limite. Mesure sur 2 450 profils construits a
   partir des percentiles OMS : 19,8 % d entre eux recevaient une taille
   adulte INFERIEURE a leur taille du jour, mediane 3,2 cm, pire cas
   10,4 cm. Concentre sur le coeur de cible : plus d une fille sur deux
   a partir de quinze ans. Le plancher « jamais sous la taille atteinte »
   masquait le defaut en rendant a ces utilisateurs leur propre taille
   saisie, presentee comme une prediction.

   Khamis-Roche regarde la taille du jour, le poids et la taille
   mi-parentale ensemble, avec des coefficients qui varient par demi-
   annee. Moyennee avec la trajectoire OMS, elle ramene la sous-taille de
   19,8 % a 0,3 % et le pire cas de 10,4 cm a 0,3 cm.

   POURQUOI LA MI-PARENTALE DISPARAIT AU LIEU D ETRE RETROGRADEE
   La garder comme troisieme ancre ramene 17,1 % du defaut, soit presque
   tout. La raison est structurelle : b3 EST le coefficient de la taille
   mi-parentale, ajuste selon l age (0,12 a 0,63 chez le garcon). La
   rajouter a cote revient a la compter une seconde fois avec un poids de
   1,0, et c est ce double comptage qui ecrase les grands adolescents.

   LE PIEGE QUI A FAIT ECHOUER LA TENTATIVE PRECEDENTE
   CES COEFFICIENTS TRAVAILLENT EN POUCES ET EN LIVRES. La table qui se
   trouvait dans khamis_roche.go, intitulee « Simplified Khamis-Roche
   coefficients », n etait pas la table Khamis-Roche et etait appliquee a
   des centimetres et des kilogrammes. D ou les 218 cm releves a l epoque,
   et d ou la conclusion — fausse — que la methode n etait pas calibree.
   Ce n etait pas un probleme de calibration, c etait une erreur d unite
   sur une table qui n etait pas la bonne.

   PROVENANCE
   Transcrite par machine — outils/generer-table-khamis-roche.js — depuis
   artifacts/grandimi/src/domain/growth/khamisRocheCoefficients.ts,
   documentee dans artifacts/grandimi/docs/PREDICTION_ENGINE.md :
   Khamis-Roche 1994, erratum 1995 integre. Trois cas de controle publies
   la-bas tombent au dixieme pres, et sont rejoues par les tests.

   CE QU ELLE NE FAIT PAS
   L etude porte sur des enfants blancs americains en bonne sante. Pour
   une autre population, c est une extrapolation. Elle n utilise pas l age
   osseux : une puberte tres precoce ou tres tardive reste hors de sa
   portee, et c est exactement pourquoi on la moyenne avec la trajectoire
   plutot que de la prendre seule. */

type coefficientKR struct {
	age            float64
	b0, b1, b2, b3 float64
}

// Les deux tables vont de 4,0 a 17,5 ans par pas d une demi-annee.
var coefficientsKRGarcons = []coefficientKR{
	{age: 4, b0: -10.2567, b1: 1.23812, b2: -0.087235, b3: 0.50286},
	{age: 4.5, b0: -10.719, b1: 1.15964, b2: -0.074454, b3: 0.52887},
	{age: 5, b0: -11.0213, b1: 1.10674, b2: -0.064778, b3: 0.53919},
	{age: 5.5, b0: -11.1556, b1: 1.0748, b2: -0.05776, b3: 0.53691},
	{age: 6, b0: -11.1138, b1: 1.05923, b2: -0.052947, b3: 0.52513},
	{age: 6.5, b0: -11.0221, b1: 1.05542, b2: -0.049892, b3: 0.50692},
	{age: 7, b0: -10.9984, b1: 1.05877, b2: -0.048144, b3: 0.48538},
	{age: 7.5, b0: -11.0214, b1: 1.06467, b2: -0.047256, b3: 0.46361},
	{age: 8, b0: -11.0696, b1: 1.06853, b2: -0.046778, b3: 0.44469},
	{age: 8.5, b0: -11.122, b1: 1.06572, b2: -0.046261, b3: 0.43171},
	{age: 9, b0: -11.1571, b1: 1.05166, b2: -0.045254, b3: 0.42776},
	{age: 9.5, b0: -11.1405, b1: 1.02174, b2: -0.043311, b3: 0.43593},
	{age: 10, b0: -11.038, b1: 0.97135, b2: -0.039981, b3: 0.45932},
	{age: 10.5, b0: -10.8286, b1: 0.89589, b2: -0.034814, b3: 0.50101},
	{age: 11, b0: -10.4917, b1: 0.81239, b2: -0.02905, b3: 0.54781},
	{age: 11.5, b0: -10.0065, b1: 0.74134, b2: -0.024167, b3: 0.58409},
	{age: 12, b0: -9.3522, b1: 0.68325, b2: -0.020076, b3: 0.60927},
	{age: 12.5, b0: -8.6055, b1: 0.63869, b2: -0.016681, b3: 0.62279},
	{age: 13, b0: -7.8632, b1: 0.60818, b2: -0.013895, b3: 0.62407},
	{age: 13.5, b0: -7.1348, b1: 0.59228, b2: -0.011624, b3: 0.61253},
	{age: 14, b0: -6.4299, b1: 0.59151, b2: -0.009776, b3: 0.58762},
	{age: 14.5, b0: -5.7578, b1: 0.60643, b2: -0.008261, b3: 0.54875},
	{age: 15, b0: -5.1282, b1: 0.63757, b2: -0.006988, b3: 0.49536},
	{age: 15.5, b0: -4.5092, b1: 0.68548, b2: -0.005863, b3: 0.42687},
	{age: 16, b0: -3.9292, b1: 0.75069, b2: -0.004795, b3: 0.34271},
	{age: 16.5, b0: -3.4873, b1: 0.83375, b2: -0.003695, b3: 0.24231},
	{age: 17, b0: -3.283, b1: 0.9352, b2: -0.00247, b3: 0.1251},
	{age: 17.5, b0: -3.4156, b1: 1.05558, b2: -0.001027, b3: -0.0095},
}

var coefficientsKRFilles = []coefficientKR{
	{age: 4, b0: -8.1325, b1: 1.24768, b2: -0.19435, b3: 0.44774},
	{age: 4.5, b0: -6.47656, b1: 1.22177, b2: -0.18519, b3: 0.41381},
	{age: 5, b0: -5.13582, b1: 1.19932, b2: -0.1753, b3: 0.38467},
	{age: 5.5, b0: -4.13791, b1: 1.1788, b2: -0.16484, b3: 0.36039},
	{age: 6, b0: -3.51039, b1: 1.15866, b2: -0.154, b3: 0.34105},
	{age: 6.5, b0: -3.14322, b1: 1.13737, b2: -0.14294, b3: 0.32672},
	{age: 7, b0: -2.87645, b1: 1.11342, b2: -0.13184, b3: 0.31748},
	{age: 7.5, b0: -2.66291, b1: 1.08525, b2: -0.12086, b3: 0.3134},
	{age: 8, b0: -2.45559, b1: 1.05135, b2: -0.11019, b3: 0.31457},
	{age: 8.5, b0: -2.20728, b1: 1.01018, b2: -0.09999, b3: 0.32105},
	{age: 9, b0: -1.87098, b1: 0.9602, b2: -0.09044, b3: 0.33291},
	{age: 9.5, b0: -1.0633, b1: 0.89989, b2: -0.08171, b3: 0.35025},
	{age: 10, b0: 0.33468, b1: 0.82771, b2: -0.07397, b3: 0.37312},
	{age: 10.5, b0: 1.97366, b1: 0.74213, b2: -0.06739, b3: 0.40161},
	{age: 11, b0: 3.50436, b1: 0.67173, b2: -0.06136, b3: 0.42042},
	{age: 11.5, b0: 4.57747, b1: 0.6415, b2: -0.05518, b3: 0.41686},
	{age: 12, b0: 4.84365, b1: 0.64452, b2: -0.04894, b3: 0.3949},
	{age: 12.5, b0: 4.27869, b1: 0.67386, b2: -0.04272, b3: 0.3585},
	{age: 13, b0: 3.21417, b1: 0.7226, b2: -0.03661, b3: 0.31163},
	{age: 13.5, b0: 1.83456, b1: 0.78383, b2: -0.03067, b3: 0.25826},
	{age: 14, b0: 0.32425, b1: 0.85062, b2: -0.025, b3: 0.20235},
	{age: 14.5, b0: -1.13224, b1: 0.91605, b2: -0.01967, b3: 0.14787},
	{age: 15, b0: -2.35055, b1: 0.97319, b2: -0.01477, b3: 0.0988},
	{age: 15.5, b0: -3.10326, b1: 1.01514, b2: -0.01037, b3: 0.05909},
	{age: 16, b0: -3.17885, b1: 1.03496, b2: -0.00655, b3: 0.03272},
	{age: 16.5, b0: -2.41657, b1: 1.02573, b2: -0.0034, b3: 0.02364},
	{age: 17, b0: -0.65579, b1: 0.98054, b2: -0.001, b3: 0.03584},
	{age: 17.5, b0: 2.26429, b1: 0.89246, b2: 0.00057, b3: 0.07327},
}

const (
	cmParPouce = 2.54
	kgParLivre = 0.45359237

	ageMinKR = 4.0
	ageMaxKR = 17.5
)

/* coefficientsKR rend les quatre coefficients a un age donne, interpoles
   lineairement entre les deux lignes qui l encadrent.

   HORS BORNES, ON RABAT PLUTOT QUE D EXTRAPOLER.
   Sous 4 ans le questionnaire n accepte personne (il commence a 8). Au-dela
   de 17,5 ans, reutiliser la derniere ligne donne -0,2 a -0,4 cm de
   croissance restante pour un garcon de 18 a 22 ans, que le plancher ramene
   a sa taille actuelle. C est le bon resultat, pas un pis-aller : a cet age
   la croissance est finie. Extrapoler la pente des dernieres lignes, en
   revanche, produirait des chiffres inventes. */
func coefficientsKR(age float64, sexe string) coefficientKR {
	table := coefficientsKRGarcons
	if sexe == FEMALE {
		table = coefficientsKRFilles
	}

	if age <= ageMinKR {
		return table[0]
	}
	if age >= ageMaxKR {
		return table[len(table)-1]
	}

	for i := 0; i < len(table)-1; i++ {
		bas, haut := table[i], table[i+1]
		if age < bas.age || age > haut.age {
			continue
		}
		t := (age - bas.age) / (haut.age - bas.age)
		return coefficientKR{
			age: age,
			b0:  bas.b0 + t*(haut.b0-bas.b0),
			b1:  bas.b1 + t*(haut.b1-bas.b1),
			b2:  bas.b2 + t*(haut.b2-bas.b2),
			b3:  bas.b3 + t*(haut.b3-bas.b3),
		}
	}

	return table[len(table)-1]
}

/* tailleAdulteKhamisRoche rend la taille adulte estimee, en centimetres.

   La conversion vers les pouces et les livres se fait ICI et une seule
   fois, sans arrondi intermediaire : c est la seule frontiere ou le
   systeme d unites change, et la confondre coute 40 cm (cf. l en-tete).

   La taille mi-parentale entre BRUTE, moyenne des deux parents, SANS le
   +/- 6,5 cm de Tanner. Cet ajustement appartient a la methode mi-
   parentale ; b3 a ete ajuste sur la moyenne nue. */
func tailleAdulteKhamisRoche(age float64, sexe string, tailleCM, poidsKG, pereCM, mereCM float64) float64 {
	/* Le poids n est pas valide en entree et peut arriver a zero. Un zero
	   passerait silencieusement dans la formule : b2 etant negatif, il
	   GONFLERAIT le resultat, de pres de 8 cm chez une fille de 10 ans. On
	   substitue donc le poids d un IMC de 19, ordinaire a cet age. Ce n est
	   pas sa vraie valeur, mais c est un ordre de grandeur plausible au lieu
	   d une absurdite silencieuse. */
	if poidsKG <= 0 {
		metres := tailleCM / 100
		poidsKG = 19 * metres * metres
	}

	c := coefficientsKR(age, sexe)

	taillePouces := tailleCM / cmParPouce
	poidsLivres := poidsKG / kgParLivre
	miParentPouces := ((pereCM + mereCM) / 2) / cmParPouce

	resultatPouces := c.b0 + c.b1*taillePouces + c.b2*poidsLivres + c.b3*miParentPouces
	resultat := resultatPouces * cmParPouce

	// Garde-fou de forme, pas de modele : une entree aberrante qui aurait
	// franchi la validation ne doit pas ressortir en NaN et contaminer la
	// moyenne avec la trajectoire.
	if math.IsNaN(resultat) || math.IsInf(resultat, 0) {
		return tailleCM
	}

	/* GARDE-FOU HAUT ET BAS — la borne qui manquait.

	   Ceci est une REGRESSION LINEAIRE. Hors de son domaine d ajustement
	   elle extrapole sans rien pour l arreter : mesure en production le
	   18/09/2026, un garcon de 11 ans a 180 cm (z = 5,5) en sortait
	   203,8 cm, et la moyenne avec la trajectoire — elle plafonnee a
	   198,4 cm — affichait 201,1 cm a l utilisateur.

	   On la ramene donc dans la MEME bande que la trajectoire, mediane a
	   19 ans plus ou moins trois ecarts-types. Sans quoi l une des deux
	   ancres est bornee et l autre non, et c est la non bornee qui emporte
	   la moyenne — le defaut symetrique de celui repare en septembre.

	   Le bornage ne suffit pas a lui seul : sur ces profils le chiffre
	   reste faux, seulement moins spectaculairement. C est pourquoi
	   horsDomaineModele le signale en plus (voir v2_enhanced.go). */
	bas, haut := bornesTaillePlausible(sexe)
	return math.Max(bas, math.Min(haut, resultat))
}
