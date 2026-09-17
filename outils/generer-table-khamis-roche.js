// Genere internal/estimator/khamis_roche_table.go depuis la source TypeScript.
// Recopier 224 coefficients a la main, c'est 224 occasions de se tromper d'un
// chiffre sans que rien ne le signale : la table est transcrite par machine.
const fs = require('fs')
const path = require('path')

const racine = process.argv[2]
const ts = fs.readFileSync(
  path.join(racine, 'artifacts/grandimi/src/domain/growth/khamisRocheCoefficients.ts'),
  'utf8',
)

function lignesDe(nom) {
  const i = ts.indexOf(nom + ': [')
  const j = ts.indexOf('],', i)
  return ts.slice(i, j).split('\n').filter((l) => l.includes('age:'))
}

function versGo(lignes) {
  return lignes
    .map((l) => {
      const m = l.match(
        /age:\s*(-?[\d.]+),\s*B0:\s*(-?[\d.]+),\s*B1:\s*(-?[\d.]+),\s*B2:\s*(-?[\d.]+),\s*B3:\s*(-?[\d.]+)/,
      )
      if (!m) throw new Error('ligne non reconnue : ' + l)
      return `\t{age: ${m[1]}, b0: ${m[2]}, b1: ${m[3]}, b2: ${m[4]}, b3: ${m[5]}},`
    })
    .join('\n')
}

const garcons = lignesDe('male')
const filles = lignesDe('female')
if (garcons.length !== 28 || filles.length !== 28) {
  throw new Error('28 lignes attendues par sexe, obtenu ' + garcons.length + '/' + filles.length)
}

const entete = `package estimator

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
   Transcrite par machine (voir le generateur dans le journal de ce
   commit) depuis
   artifacts/grandimi/src/domain/growth/khamisRocheCoefficients.ts,
   documentee dans artifacts/grandimi/docs/PREDICTION_ENGINE.md :
   Khamis-Roche 1994, erratum 1995 integre. Trois cas de controle publies
   la-bas tombent au dixième pres, et sont rejoues par les tests.

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
${versGo(garcons)}
}

var coefficientsKRFilles = []coefficientKR{
${versGo(filles)}
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

	return resultat
}
`

fs.writeFileSync(path.join(racine, 'internal/estimator/khamis_roche_table.go'), entete)
console.log('ecrit : 28 lignes garcons, 28 lignes filles')
