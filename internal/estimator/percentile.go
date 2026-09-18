package estimator

import "math"

/*
SUIVI DE PERCENTILE — la deuxieme estimation, independante de la premiere.

LE DEFAUT QU ELLE CORRIGE

Jusqu ici l estimateur ne connaissait qu une seule chose : la taille des
parents. La taille de l adolescent lui-meme n entrait nulle part dans le
calcul, sauf comme plancher pour eviter d annoncer un chiffre inferieur a sa
taille du jour. Tout le monde etait donc ramene a la moyenne de ses parents.

Mesure sur l API en production, garcons, bonnes habitudes :

	13 ans, 175 cm, parents 178/165  ->  179 cm annonces
	14 ans, 185 cm, parents 180/168  ->  185 cm annonces, soit « 0 cm restant »
	14 ans, 150 cm, parents 178/165  ->  179 cm annonces, soit « + 29 cm »

Le grand etait ecrase vers le bas — et s il depassait deja sa cible
mi-parentale, on lui annoncait que sa croissance etait terminee. Le petit
etait gonfle vers le haut et repartait avec une promesse intenable.

LE PRINCIPE

Le percentile de taille d un enfant est remarquablement stable apres 3-4 ans :
celui qui est au 90e percentile a 12 ans y est encore a 18. On peut donc lire
sa taille adulte en gardant son ecart a la mediane, exprime en z-score, et en
allant le chercher a la fin de la table.

	z      = (taille - M(age)) / (M(age) * S(age))
	adulte = M(19 ans) * (1 + z * S(19 ans))

C est la lecture rapide que fait un generaliste devant une courbe de
croissance. Elle ne remplace pas un age osseux, mais elle sait faire la seule
chose qui manquait totalement ici : distinguer un grand d un petit.

CE QU ELLE NE FAIT PAS

Elle suppose que l adolescent reste sur son couloir. Un retard ou une avance
pubertaire le fait changer de couloir, et la methode se trompe alors dans le
sens de l avance. C est precisement le cas que l age osseux tranche, et qu on
ne sait pas trancher sans radio. D ou la moyenne avec la cible mi-parentale
plutot qu un remplacement : les deux methodes se trompent rarement dans le
meme sens, et leur moyenne est plus sure que chacune prise seule.
*/

// moisDepuisAge convertit un age en annees vers l index de la table.
// Les demi-annees du questionnaire (13,5) tombent donc sur 162 mois.
func moisDepuisAge(ageAnnees float64) float64 {
	return ageAnnees * 12
}

// interpolerLMS rend M et S a un age donne, en interpolant lineairement entre
// les deux points mensuels qui l encadrent.
//
// Hors bornes, on RABAT sur l extremite plutot que d extrapoler :
//   - sous 5 ans 1 mois, le questionnaire n accepte personne (il commence a 8) ;
//   - au-dela de 19 ans, la table s arrete parce que la croissance aussi. Un
//     jeune de 21 ans est traite comme un jeune de 19 ans, ce qui est la bonne
//     reponse et non un pis-aller : son couloir ne bouge plus.
func interpolerLMS(table []pointLMS, mois float64) (float64, float64) {
	premier := table[0]
	dernier := table[len(table)-1]

	if mois <= float64(premier.mois) {
		return premier.m, premier.s
	}
	if mois >= float64(dernier.mois) {
		return dernier.m, dernier.s
	}

	// La table est contigue mois par mois : l index se deduit, pas besoin de
	// parcourir. Un decalage d un cran est rattrape par la boucle de garde.
	i := int(mois) - premier.mois
	if i < 0 {
		i = 0
	}
	if i >= len(table)-1 {
		i = len(table) - 2
	}

	bas := table[i]
	haut := table[i+1]
	t := (mois - float64(bas.mois)) / float64(haut.mois-bas.mois)

	return bas.m + t*(haut.m-bas.m), bas.s + t*(haut.s-bas.s)
}

func tablePourSexe(sexe string) []pointLMS {
	if sexe == FEMALE {
		return hfaFilles
	}
	return hfaGarcons
}

// zTaillePourAge rend l ecart a la mediane OMS, en ecarts-types.
//
// L vaut 1 sur toute la table taille-pour-age (verifie a la generation), donc
// la formule de Cole se reduit a (X - M) / (M * S).
func zTaillePourAge(ageAnnees float64, sexe string, tailleCM float64) float64 {
	m, s := interpolerLMS(tablePourSexe(sexe), moisDepuisAge(ageAnnees))
	if m <= 0 || s <= 0 {
		return 0
	}
	return (tailleCM - m) / (m * s)
}

/*
percentileTaillePourAge rend le rang de l adolescent parmi ceux de son age
et de son sexe, en pourcentage : 60 signifie qu il depasse 60 % d entre eux.

Le score-z suit une loi normale une fois la transformation LMS appliquee,
donc le rang est sa fonction de repartition — d ou l erreur de Gauss.

Meme bornage a +/- 3 que la projection : au-dela on quitte la variation
normale pour le domaine pathologique, que ce produit ne modelise pas. Le
resultat est ensuite ramene dans 1-99 : « plus grand que 0 % » et « plus
grand que 100 % » ne veulent rien dire pour un lecteur, et surestiment
tous deux la precision d une table de reference.
*/
func percentileTaillePourAge(ageAnnees float64, sexe string, tailleCM float64) float64 {
	z := zTaillePourAge(ageAnnees, sexe, tailleCM)
	z = math.Max(-3, math.Min(3, z))

	rang := 100 * 0.5 * (1 + math.Erf(z/math.Sqrt2))
	return math.Max(1, math.Min(99, math.Round(rang)))
}

/*
tailleAdulteParPercentile rend la taille a 19 ans d un adolescent qui resterait
sur son couloir actuel.

Le z-score est BORNE a +/- 3. Au-dela, on n est plus dans la variation normale
mais dans le domaine pathologique — deficit en hormone de croissance, syndrome
de Marfan, puberte precoce — que ce produit ne sait pas modeliser et n a pas a
pretendre modeliser. Sans cette borne, un adolescent de 13 ans a 195 cm (z > 4)
recevrait une projection a plus de 2,10 m, calculee avec le meme aplomb que
tout le reste.
*/
func tailleAdulteParPercentile(ageAnnees float64, sexe string, tailleCM float64) float64 {
	z := zTaillePourAge(ageAnnees, sexe, tailleCM)
	z = math.Max(-3, math.Min(3, z))

	table := tablePourSexe(sexe)
	fin := table[len(table)-1]

	return fin.m * (1 + z*fin.s)
}

/*
bornesTaillePlausible rend l intervalle de tailles adultes que ce modele
accepte de produire, pour un sexe donne : la mediane a 19 ans, plus ou
moins trois ecarts-types.

C EST LA MEME BORNE QUE CELLE QUE LA TRAJECTOIRE S IMPOSE DEJA, et c est
tout l interet : tailleAdulteParPercentile borne son z-score a +/-3, donc
elle ne peut structurellement pas sortir de cette bande. Khamis-Roche, en
revanche, est une REGRESSION LINEAIRE : hors de son domaine d ajustement
elle extrapole sans limite, et rien ne l arretait.

Mesure sur l API en production le 18/09/2026, garcon de 11 ans a 180 cm
(z = 5,5, tres au-dela de ce que la table decrit) :

	Khamis-Roche ....... 203,8 cm   (extrapolation libre)
	trajectoire ........ 198,4 cm   (plafonnee a z = +3)
	moyenne affichee ... 201,1 cm

Un adolescent recevait donc 2,01 m annonces avec le meme aplomb que tout
le reste. C est le defaut SYMETRIQUE de celui repare en septembre, ou la
cible mi-parentale rendait une taille adulte inferieure a la taille du
jour : dans les deux cas une ancre non bornee emportait la moyenne.

Au-dela de +/-3 ecarts-types, on quitte la variation normale pour le
domaine pathologique — deficit en hormone de croissance, syndrome de
Marfan, puberte precoce. Ce produit ne sait pas le modeliser et n a pas a
pretendre le faire : il borne, il le SIGNALE (voir HorsDomaine), et il
renvoie vers un medecin.

Valeurs au 18/09/2026 : garcons 154,6-198,4 cm, filles 143,5-182,8 cm.
Elles sont derivees de la table a chaque appel et non ecrites en dur :
une revision OMS les deplace sans qu on ait a s en souvenir.
*/
func bornesTaillePlausible(sexe string) (float64, float64) {
	table := tablePourSexe(sexe)
	fin := table[len(table)-1]
	return fin.m * (1 - 3*fin.s), fin.m * (1 + 3*fin.s)
}

/*
horsDomaineModele dit si l adolescent sort de ce que la table de reference
decrit, c est-a-dire si son ecart a la mediane depasse trois ecarts-types.

C est un DETECTEUR DE PANNE, au meme titre que PlancherDeclenche : sur ces
profils, le modele ne borne pas par prudence, il borne parce qu il ne sait
pas. La difference doit se voir dans la reponse et dans les journaux,
faute de quoi on publie un chiffre faussement precis sans que personne ne
s en apercoive — exactement ce qui vient d arriver.
*/
func horsDomaineModele(ageAnnees float64, sexe string, tailleCM float64) bool {
	return math.Abs(zTaillePourAge(ageAnnees, sexe, tailleCM)) > 3
}
