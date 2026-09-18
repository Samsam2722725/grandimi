package estimator

import (
	"fmt"
	"math"
)

type EthnicBackground string

const (
	CAUCASIAN EthnicBackground = "caucasian"
	ASIAN     EthnicBackground = "asian"
	AFRICAN   EthnicBackground = "african"
	HISPANIC  EthnicBackground = "hispanic"
	MIXED     EthnicBackground = "mixed"
)

type NutritionLevel string

const (
	EXCELLENT NutritionLevel = "excellent"
	GOOD      NutritionLevel = "good"
	FAIR      NutritionLevel = "fair"
	POOR      NutritionLevel = "poor"
)

type HeightPredictionV2Request struct {
	// Core data (from v1)
	Age             float64
	Sex             string
	HeightCM        float64
	WeightKG        float64
	FatherHeightCM  float64
	MotherHeightCM  float64
	PubertySigns    PubertySigns

	// Enhanced data (v2)
	BMI                float64            // kg/m² - captures nutrition/health
	HeightVelocityCM   float64            // cm/year - growth rate
	/* Pointure europeenne du jour et d il y a un an. C est la VARIATION
	   qui porte le signal de maturite, pas la valeur absolue : une
	   pointure seule n apprend presque rien. Facultatives toutes les
	   deux ; zero ou hors des bornes de plausibilite vaut « non
	   renseigne », jamais une penalite. Voir maturite.go. */
	ShoeSizeEU         float64
	ShoeSizeEU1Y       float64
	EthnicBackground   EthnicBackground   // Population-specific coefficients
	NutritionLevel     NutritionLevel     // Health factor
	SleepHoursPerNight float64            // Growth happens during sleep
	ExerciseMinPerDay  float64            // Activity level
	MaternalDiabetes   bool               // Fetal programming effect
	ChronicIllness     bool               // Impacts growth
}

type HeightPredictionV2Response struct {
	PredictedHeightCM  float64
	// Estimation obtenue si les trois leviers de mode de vie (sommeil,
	// alimentation, activite) etaient a la cible. Toujours superieure ou
	// egale a PredictedHeightCM. L ecart entre les deux est ce que les
	// habitudes actuelles coutent — et donc ce que le plan vise.
	PotentialHeightCM  float64
	// Rang parmi les jeunes du meme age et du meme sexe, en pourcentage,
	// d'apres les tables OMS. Sert l'ecran d'analyse : « plus grand que
	// X % des jeunes de ton age ».
	PercentileAge      float64
	ConfidenceRange    [2]float64
	ConfidenceLevel    string
	/* La demi-largeur de l intervalle, en centimetres — l information
	   reelle, dont ConfidenceLevel n est qu un resume a trois valeurs.

	   Mesure sur trente jours de production : « low » sort sur 93,2 % des
	   estimations, « medium » 5,4 %, « high » 1,4 %. Ce n est pas un bug,
	   c est la verite : quelqu un qui n a pas declare sa croissance de
	   l annee est genuinement incertain a environ 7 cm. Requalifier ces
	   7 cm en « moyenne » serait maquiller le meme nombre — exactement ce
	   que le produit reproche a la concurrence. On publie donc le nombre
	   a cote du mot, et c est lui qu il faut lire. */
	MargeCM float64
	PubertyStage       string
	Message            string
	ModelUsed          string // Which ensemble model
	Factors            map[string]float64 // Contribution of each factor
	// Vrai quand le modele a rendu une taille adulte inferieure a la taille
	// deja atteinte, et que le plancher a du la rattraper. C est un signal
	// de panne du modele, pas une donnee produit : il n est pas expose dans
	// la reponse HTTP, il sert aux tests et au journal du serveur.
	PlancherDeclenche bool
	/* Vrai quand la taille du jour sort de plus de trois ecarts-types de
	   la mediane de son age : l adolescent est hors de ce que la table de
	   reference decrit, et le modele ne sait pas le decrire non plus.

	   Second detecteur de panne, symetrique de PlancherDeclenche. Celui-ci
	   a une consequence VISIBLE, elle : l intervalle s elargit fortement
	   et Avertissement renvoie vers un medecin, parce qu afficher un
	   chiffre au dixieme sur ces profils serait une fausse precision. */
	HorsDomaine bool
	/* Message a montrer a l utilisateur quand le modele sort de son
	   domaine. Vide le reste du temps. */
	Avertissement string
}

// PredictHeightV2 uses ensemble learning for 97-98% accuracy
func PredictHeightV2(req HeightPredictionV2Request) HeightPredictionV2Response {
	resp := HeightPredictionV2Response{
		Factors: make(map[string]float64),
	}

	// Validate inputs
	if err := validateV2Input(req); err != nil {
		resp.Message = err.Error()
		resp.ConfidenceLevel = "low"
		return resp
	}

	// L IMC ne sert plus : Khamis-Roche prend le poids directement, avec
	// un coefficient ajuste par demi-annee (b2). Le recalculer pour le
	// jeter ensuite ne ferait que laisser croire qu il entre quelque part.

	/* PREMIERE ANCRE : Khamis-Roche, qui regarde l adolescent lui-meme.

	   Elle remplace la cible mi-parentale (Tanner), qui ne regardait que
	   les parents et rendait une taille adulte INFERIEURE a la taille du
	   jour pour 19,8 % des profils realistes — plus d une fille sur deux
	   a partir de quinze ans. Le detail du defaut, de sa cause et des
	   cinq combinaisons mesurees est dans khamis_roche_table.go.

	   La mi-parentale n a pas disparu du calcul : b3 EST son coefficient,
	   ajuste par demi-annee au lieu d etre applique a 1,0. La rajouter a
	   cote la compterait deux fois, et c est ce double comptage qui
	   ecrasait les grands adolescents. Elle reste exposee plus bas comme
	   valeur de diagnostic, non plus comme predicteur. */
	khamisRoche := tailleAdulteKhamisRoche(
		req.Age, req.Sex, req.HeightCM, req.WeightKG,
		req.FatherHeightCM, req.MotherHeightCM,
	)

	/* SECONDE ANCRE : le couloir de croissance de l adolescent.

	   Le suivi de percentile (percentile.go) dit s il est grand ou petit
	   POUR SON AGE, en gardant son ecart a la mediane jusqu a 19 ans.
	   C est la lecture que fait un generaliste devant une courbe.

	   Les deux ancres restent utiles ensemble parce qu elles echouent sur
	   des cas differents : Khamis-Roche sort de son domaine d ajustement
	   au-dela de 17,5 ans, la trajectoire se trompe quand la puberte est
	   en avance ou en retard — le seul cas que l age osseux trancherait.
	   Elles se trompent rarement dans le meme sens.

	   Moyenne NON PONDEREE. Sur les 2 450 profils de reference, un
	   2/3-1/3 en faveur de Khamis-Roche ne fait pas mieux (1,2 % de
	   sous-taille contre 0,3 %) : inventer une ponderation serait une
	   precision qu on n a pas. */
	trajectoire := tailleAdulteParPercentile(req.Age, req.Sex, req.HeightCM)

	/* CORRECTION DE MATURITE — voir maturite.go, dont le raisonnement va
	   dans le sens INVERSE de l intuition : etre en avance pubertaire,
	   c est avoir son pic derriere soi et finir plus tot, donc etre
	   SURESTIME par l ancre trajectoire qui suppose le couloir tenu
	   jusqu a 19 ans.

	   UN SEUL indice, alimente par la vitesse de croissance ET la
	   variation de pointure, qui mesurent le meme phenomene. Les
	   appliquer separement les compterait deux fois — l erreur exacte qui
	   a casse 19,8 % des profils avec la mi-parentale.

	   Elle s ajoute a la base et non a une seule ancre : c est la
	   trajectoire qu elle corrige, mais l appliquer avant la moyenne
	   doublerait son effet le jour ou on rebalancerait les deux ancres.
	   Nulle si aucun signal n est renseigne. */
	correction, indice := correctionMaturite(req)
	base := (khamisRoche+trajectoire)/2 + correction

	/* CE QUE CE CALCUL SURESTIME ENCORE, ET DE COMBIEN.

	   Un reste connu ne s absorbe pas en silence. Celui-ci vient du
	   bornage de la trajectoire a z = -3 : sous ce seuil elle rend une
	   constante — 154,6 cm chez le garcon, 143,5 chez la fille — alors que
	   la vraie projection du couloir serait bien plus basse. Comme elle
	   pese la moitie de la base, elle tire le resultat vers le haut.

	   Mesure le 18/09/2026, garcon de 17,5 ans mesurant 105 cm,
	   parents 200/185 (z = -9,4) :

	       Khamis-Roche brut ............ 100,2 cm
	       trajectoire bornee (z = -3) .. 154,6 cm
	       trajectoire non bornee ....... 108,2 cm
	       rendu ........................ 127,4 cm

	   Soit une SURESTIMATION DE 23,2 cm sur ce profil. Plus haut dans la
	   plage elle se resorbe : 17,9 cm pour une fille de 16 ans a 105 cm,
	   9,6 cm pour un garcon de 15 ans a 125 cm, et zero des que
	   z >= -3, c est-a-dire pour tout profil realiste.

	   POURQUOI ON LA GARDE MALGRE TOUT. Debornger la trajectoire
	   reintroduirait le defaut symetrique en haut — un adolescent de
	   13 ans a 195 cm recevrait plus de 2,10 m, cf. percentile.go — et
	   surtout ces profils sont TOUS signales hors domaine, avec un
	   intervalle elargi et un renvoi vers un medecin. Le produit ne
	   pretend pas les estimer ; il dit qu il ne sait pas.

	   Ce qui serait fautif, c est de laisser croire que le chiffre est
	   bon. Il ne l est pas, et de combien est ecrit ci-dessus. */

	/* La cible mi-parentale ne sert plus qu au diagnostic : un ecart
	   important entre elle et la base dit que l adolescent s ecarte
	   nettement de sa famille, ce qui est une information pour qui lit
	   les facteurs, pas une raison de deplacer le chiffre. */
	midParentTarget := (req.FatherHeightCM + req.MotherHeightCM) / 2
	if req.Sex == MALE {
		midParentTarget += 6.5
	} else {
		midParentTarget -= 6.5
	}

	// Les facteurs de mode de vie modulent la base dans une fourchette
	// etroite (calculateHealthFactor reste borne autour de 1.0). Ils ne
	// peuvent pas deplacer l estimation de plusieurs dizaines de cm.
	healthMultiplier := calculateHealthFactor(req)
	finalHeight := base * healthMultiplier

	/* SECOND SCENARIO : le meme adolescent, ses trois leviers a la cible.

	   C est la seule facon honnete de chiffrer ce que le plan vise. Jusqu
	   ici la page de resultat disait « ton plan peut aller chercher des
	   centimetres » sans jamais pouvoir dire combien — donc sans rien
	   prouver. Ce chiffre-la sort du meme modele que l estimation
	   affichee, avec la meme formule et les memes bornes : ce n est pas
	   une promesse commerciale posee a cote du calcul, c est le calcul.

	   Seuls les trois leviers que le plan travaille sont remis a la
	   cible. Le diabete maternel et la maladie chronique restent tels
	   quels : un programme quotidien ne les change pas, et les effacer
	   ferait miroiter des centimetres qui ne sont pas a prendre.

	   Les deux planchers s appliquent dans cet ordre : jamais sous la
	   taille deja atteinte, et jamais sous l estimation courante. Le
	   second protege d un cas de bord — un profil dont les facteurs
	   declares depassent deja la cible — ou le « potentiel » sortirait
	   sous la prediction et afficherait une perte a qui fait tout bien. */
	reqOptimal := req
	reqOptimal.SleepHoursPerNight = 9.0
	reqOptimal.NutritionLevel = EXCELLENT
	reqOptimal.ExerciseMinPerDay = 60

	potentialHeight := base * calculateHealthFactor(reqOptimal)
	if potentialHeight < req.HeightCM {
		potentialHeight = req.HeightCM
	}
	if potentialHeight < finalHeight {
		potentialHeight = finalHeight
	}

	/* PLAFOND — le garde-fou symetrique du plancher.

	   Les deux ancres sont maintenant bornees a la meme bande (mediane a
	   19 ans +/- 3 ecarts-types), mais le multiplicateur de mode de vie
	   s applique APRES : sur un profil deja au plafond, un +1 % suffit a
	   ressortir de la bande. On reborne donc ici, sur la valeur finale.

	   L ordre compte : on plafonne AVANT le plancher. Un adolescent qui
	   mesure deja plus que le plafond — cela existe, a 199 cm — doit
	   recevoir sa taille du jour, pas le plafond : on ne retrecit pas. */
	_, plafond := bornesTaillePlausible(req.Sex)
	if finalHeight > plafond {
		finalHeight = plafond
	}
	if potentialHeight > plafond {
		potentialHeight = plafond
	}

	/* HORS DOMAINE — le second detecteur de panne.

	   Au-dela de trois ecarts-types, on a quitte la variation normale pour
	   le domaine pathologique. Borner ne rend pas le chiffre juste : ca le
	   rend seulement moins spectaculairement faux. Ce qu il faut dire a
	   cet utilisateur, c est qu il doit voir un medecin — pas lui servir
	   une estimation au dixieme de centimetre.

	   Mesure en production le 18/09/2026, avant ce correctif : un garcon
	   de 11 ans a 180 cm (z = 5,5) recevait « 201,1 cm » avec un intervalle
	   de +/-7 cm, presente exactement comme n importe quel autre resultat. */
	if horsDomaineModele(req.Age, req.Sex, req.HeightCM) {
		resp.HorsDomaine = true
		resp.Avertissement = "Ta taille sort nettement des courbes de référence pour ton âge. " +
			"Ce n'est pas forcément un problème, mais ce calcul n'est pas fait pour ce cas : " +
			"l'estimation ci-dessous est très approximative. Parles-en à un médecin, " +
			"c'est le seul moyen d'avoir une vraie réponse."
		fmt.Printf("[estimateur] hors domaine : age=%.1f sexe=%s taille=%.1f z=%.2f modele=%.1f\n",
			req.Age, req.Sex, req.HeightCM,
			zTaillePourAge(req.Age, req.Sex, req.HeightCM), finalHeight)
	}

	/* PLANCHER — et surtout, DETECTEUR DE PANNE DU MODELE.

	   On ne retrecit pas a l adolescence : la taille deja atteinte est un
	   plancher, pas une variable. Il reste necessaire pour une poignee de
	   profils (0,3 % des 2 450 de reference, tous des grands de dix-sept
	   ans qui ont effectivement fini).

	   Mais il etait silencieux, et c est ce silence qui a laisse passer le
	   defaut pendant des semaines : il etait le SEUL endroit du code qui
	   savait que le modele venait d echouer, et il ne le disait a
	   personne. L utilisateur recevait sa propre taille saisie, presentee
	   comme une prediction, et tout avait l air normal.

	   Il le dit desormais. Si ce compteur depasse 1 % des appels, quelque
	   chose a casse dans le modele — c est le seuil retenu par les tests
	   (TestBalayage_PlancherSousUnPourcent). */
	if finalHeight < req.HeightCM {
		resp.PlancherDeclenche = true
		fmt.Printf("[estimateur] plancher declenche : age=%.1f sexe=%s taille=%.1f modele=%.1f (khamis=%.1f trajectoire=%.1f)\n",
			req.Age, req.Sex, req.HeightCM, finalHeight, khamisRoche, trajectoire)
		finalHeight = req.HeightCM
	}

	/* Le potentiel se recale APRES le plafond et le plancher, et pas
	   seulement avant.

	   Cas de bord qui l impose : un adolescent qui mesure DEJA plus que le
	   plafond plausible. Le plafond vient de raboter son potentiel a
	   198,4 cm pendant que le plancher remontait son estimation a sa
	   taille du jour, 199 cm. Sans ce recalage, la page afficherait un
	   « potentiel » inferieur a l estimation — donc une perte de
	   centimetres a quelqu un qui ferait tout bien. */
	if potentialHeight < finalHeight {
		potentialHeight = finalHeight
	}

	// Plus de stadification de Tanner : le champ n est plus collecte.
	// La croissance restante est estimee via HeightVelocityCM, qui agit
	// sur la LARGEUR de l intervalle (cf. calculateV2Confidence) et non
	// sur le point estime — etre plus avance en puberte ne rend pas plus
	// grand, cela rend seulement la prediction plus sure.
	pubertyStage := describeGrowthPhase(req.Age, req.HeightVelocityCM)

	/* Le calcul doit rester lisible de bout en bout : d ou on part, ce qu on
	   moyenne, de combien on module, ou on arrive. Les deux ancres sont
	   exposees separement pour qu un ecart entre elles se voie — quand elles
	   divergent de plus de dix centimetres, c est le signe d une puberte en
	   avance ou en retard, exactement le cas que ce modele ne sait pas
	   trancher sans age osseux. */
	resp.Factors["khamis_roche"] = khamisRoche
	resp.Factors["percentile_projection"] = trajectoire
	resp.Factors["indice_maturite"] = indice
	resp.Factors["correction_maturite"] = correction
	resp.Factors["vitesse_attendue"] = vitesseAttendue(req.Age, req.Sex)
	resp.Factors["mid_parent_target"] = midParentTarget
	resp.PercentileAge = percentileTaillePourAge(req.Age, req.Sex, req.HeightCM)
	resp.Factors["blended_base"] = base
	resp.Factors["health_multiplier"] = healthMultiplier
	resp.Factors["final_prediction"] = finalHeight

	// La fourchette est calculee APRES tous les multiplicateurs, et
	// CENTREE sur la prediction finale.
	//
	// Avant, elle etait calculee avant l'ajustement pubertaire et centree
	// sur la taille mi-parentale brute, sans jamais regarder la valeur
	// predite : on affichait "219.9 cm" avec un intervalle "174.5-180.5",
	// soit un point estime hors de son propre intervalle.
	confidenceLevel, confidenceRange := calculateV2Confidence(req, finalHeight)

	resp.PredictedHeightCM = math.Round(finalHeight*10) / 10
	resp.PotentialHeightCM = math.Round(potentialHeight*10) / 10
	resp.ConfidenceRange = confidenceRange
	resp.ConfidenceLevel = confidenceLevel
	/* La marge lue sur la borne HAUTE et non la basse : la borne basse
	   est ramenee a la taille deja atteinte quand l intervalle passerait
	   dessous, elle ne mesure donc plus l incertitude a cet instant. */
	resp.MargeCM = math.Round((confidenceRange[1]-resp.PredictedHeightCM)*10) / 10
	resp.Factors["marge_cm"] = resp.MargeCM
	resp.PubertyStage = pubertyStage
	resp.ModelUsed = "Khamis-Roche + suivi de percentile OMS + facteurs de mode de vie"
	resp.Message = "Height prediction successful (v2 ML-enhanced)"

	return resp
}

// calculateHealthFactor - Multiply by health/lifestyle factors
func calculateHealthFactor(req HeightPredictionV2Request) float64 {
	/* Une donnee absente n est pas une mauvaise donnee.

	   Les seuils sont ecrits en « moins de » : un champ laisse a zero
	   tombait du mauvais cote. Un appelant qui ne renseignait ni
	   sommeil ni activite recevait 0.97 x 0.99 = 0.96, soit sept
	   centimetres de moins sur 180 pour n avoir rien declare — et
	   c est exactement le cas de /api/v1/predict-height, qui ne
	   collecte aucun de ces champs.

	   Chaque facteur est donc garde individuellement : declarer son
	   sommeil ne doit pas faire perdre un point sur une activite dont
	   on n a rien dit. Ne rien savoir reste neutre ; l incertitude
	   supplementaire se traduit par un intervalle plus large (cf.
	   calculateV2Confidence), jamais par une estimation plus basse.

	   Le questionnaire n envoie jamais zero : les valeurs proposees
	   sont 6 / 7,5 / 8,5 / 9,5 h et 10 / 30 / 60 / 120 min. Zero
	   signifie donc toujours « non renseigne ».

	   ─────────────────────────────────────────────────────────────
	   POURQUOI UN SCORE, ET PLUS UN PRODUIT DE COEFFICIENTS

	   Les trois leviers se multipliaient (1.02 x 0.99 x 1.02 ...), et
	   le produit etait ensuite ramene dans [0.98 ; 1.01]. Le plafond
	   etait atteint bien avant le mode de vie ideal : un adolescent
	   declarant 7,5 h de sommeil, une alimentation MOYENNE et 30 min
	   d activite obtenait 1.030, donc 1.01 apres bornage — exactement
	   le meme resultat que s il dormait 9 h, mangeait tres suivi et
	   bougeait une heure.

	   Mesure en production le 14/09/2026, garcon de 14 ans, 165 cm,
	   parents 176/164 :
	     habitudes degradees ....... 173,0 cm
	     habitudes moyennes ........ 178,3 cm
	     habitudes a la cible ...... 178,3 cm   <- identique

	   Autrement dit le modele ne savait pas exprimer « tu gagnerais a
	   mieux manger » pour quiconque dort et bouge correctement. C est
	   une propriete du bornage, pas un fait biologique — et elle vide
	   de son sens le second scenario (PotentialHeightCM), qui est
	   justement ce que le plan vend.

	   Chaque levier note maintenant de -1 (nettement sous la cible) a
	   +1 (a la cible), la moyenne des leviers DECLARES est reportee
	   sur la meme bande qu avant. L enveloppe ne bouge pas — au mieux
	   +1 %, au pire -2 % — et l asymetrie voulue est conservee : de
	   mauvaises habitudes coutent toujours deux fois ce que de bonnes
	   rapportent. Seul le milieu de la bande devient atteignable.
	   ───────────────────────────────────────────────────────────── */
	scores := make([]float64, 0, 3)

	// Sommeil : l hormone de croissance se libere en sommeil profond.
	if req.SleepHoursPerNight > 0 {
		switch {
		case req.SleepHoursPerNight < 7:
			scores = append(scores, -1)
		case req.SleepHoursPerNight < 8:
			scores = append(scores, 0)
		default:
			// 8 h et plus : la cible pediatrique pour cette tranche d age.
			scores = append(scores, 1)
		}
	}

	switch req.NutritionLevel {
	case EXCELLENT:
		scores = append(scores, 1)
	case GOOD:
		scores = append(scores, 1.0/3.0)
	case FAIR:
		scores = append(scores, -1.0/3.0)
	case POOR:
		scores = append(scores, -1)
	}

	// Activite : la mise en charge stimule l os tant qu il peut s allonger.
	if req.ExerciseMinPerDay > 0 {
		switch {
		case req.ExerciseMinPerDay < 30:
			scores = append(scores, -1)
		case req.ExerciseMinPerDay < 60:
			scores = append(scores, 0)
		default:
			scores = append(scores, 1)
		}
	}

	/* Moyenne des leviers DECLARES uniquement. Ne rien savoir reste
	   neutre : un questionnaire vide donne un score nul, donc un
	   facteur de 1.0, et non une penalite silencieuse. */
	score := 0.0
	if len(scores) > 0 {
		somme := 0.0
		for _, s := range scores {
			somme += s
		}
		score = somme / float64(len(scores))
	}

	// Bande asymetrique : +1 % au mieux, -2 % au pire.
	factor := 1.0
	if score >= 0 {
		factor += score * 0.01
	} else {
		factor += score * 0.02
	}

	// Maternal health factors
	if req.MaternalDiabetes {
		factor *= 0.98 // Slight impact on fetal programming
	}

	// Chronic illness factor
	if req.ChronicIllness {
		factor *= 0.96 // Growth catch-up varies
	}

	/* Bornes de l effet du mode de vie.

	   Depuis le passage au score, le calcul des trois leviers ne peut
	   plus sortir de la bande par lui-meme : il la parcourt. Ce bornage
	   garde deux roles, tous deux necessaires — il rattrape les facteurs
	   MEDICAUX appliques juste au-dessus (diabete maternel, maladie
	   chronique), qui eux multiplient encore et peuvent pousser sous
	   0.98 ; et il fixe noir sur blanc l enveloppe que le produit
	   s interdit de depasser, quel que soit ce qu on ajoutera plus tard.

	   L historique qui a conduit a ces deux valeurs, et qui reste la
	   raison de les garder :

	   Sans plafond, le cumul des bonus atteignait 1.072, soit +12.7 cm
	   ajoutes a la cible genetique : un mode de vie sain ne fait pas
	   depasser son potentiel, il aide a l atteindre.

	   Le plancher, lui, etait reste a 0.92 : un mode de vie declare
	   mauvais retirait jusqu a 8 %, soit quatorze centimetres sur 180.
	   Ces reponses sont AUTO-DECLAREES par un adolescent en trois taps
	   — « je mange mal », « je dors 6 h » — pas diagnostiquees. Annoncer
	   quatorze centimetres de moins sur cette base est indefendable le
	   jour ou il faut le justifier, et c est le genre de chiffre qui se
	   retourne contre un produit vendu a des mineurs.

	   La bande est donc resserree a [0.98 ; 1.01]. Elle reste
	   ASYMETRIQUE, et volontairement : on ne depasse pas son plafond
	   genetique, on peut en revanche rester en dessous. De mauvaises
	   habitudes coutent donc deux fois ce que de bonnes rapportent.

	   Sur une cible de 180 cm : +1.8 cm au mieux, -3.6 cm au pire.
	   TestPredictHeightV2_HealthFactors verifie que l ecart observable
	   entre les deux extremes reste sous cinq centimetres. */
	return math.Min(math.Max(factor, 0.98), 1.01)
}

func calculateV2Confidence(
	req HeightPredictionV2Request,
	predictedHeight float64,
) (string, [2]float64) {
	/* La marge ne depend plus que de ce qui la determine reellement : la
	   quantite de croissance qu il reste a parcourir. Les trois
	   "confiances" des anciens modeles lineaires entraient ici en
	   parametres et etaient jetees a la ligne suivante (_ = conf1). Elles
	   ont disparu avec les modeles. */

	// Khamis-Roche a une erreur moyenne d environ 5,3 cm chez le garcon et
	// 4,3 cm chez la fille dans l echantillon d origine ; la mi-parentale
	// tournait autour de +/-8,5 cm a 95 %. On part de 6,5 et on resserre a
	// mesure que la croissance se termine.
	rangeMargin := 6.5

	// La vitesse de croissance remplace le stade de Tanner comme
	// indicateur de croissance restante : elle porte la meme information
	// utile sans demander a un mineur d auto-evaluer sa pilosite pubienne
	// ou son developpement genital (donnee de sante sensible au RGPD).
	//
	// Beaucoup de croissance recente = pic pubertaire en cours = plus
	// d incertitude. Croissance quasi nulle = taille presque finale.
	if req.HeightVelocityCM > 0 {
		switch {
		case req.HeightVelocityCM >= 6.0:
			rangeMargin *= 1.15 // pic de croissance : issue moins previsible
		case req.HeightVelocityCM <= 2.0:
			rangeMargin *= 0.70 // croissance qui s arrete : estimation sure
		}
	} else if _, maturiteConnue := indiceMaturite(req); !maturiteConnue {
		/* On ne sait RIEN de la maturite : ni la croissance de l annee, ni
		   la pointure. On elargit plutot que de faire semblant d etre
		   precis — les deux questions sont facultatives.

		   La pointure suffit a lever cette penalite, et c est le point :
		   avant, elle etait infligee a quelqu un qui avait pourtant donne
		   un signal de maturite, simplement parce que ce n etait pas
		   celui-la. Elle ne resserre pas la marge pour autant : savoir
		   quelque chose n est pas savoir la meme chose. */
		rangeMargin *= 1.10
	}

	if req.Age > 16 {
		rangeMargin *= 0.8
	} else if req.Age < 10 {
		rangeMargin *= 1.2
	}

	/* Bornes alignees sur ce que le site annonce : « +/-4 a +/-8 cm selon
	   l age ». Le plancher etait a 3,0 et le plafond a 8,5 — le calcul
	   pouvait donc sortir une fourchette PLUS SERREE que la precision
	   revendiquee publiquement, ce qui est la forme discrete du meme defaut
	   que tout le reste de ce correctif : promettre une exactitude qu on n a
	   pas.

	   4 cm reste optimiste pour un modele sans age osseux. C est defendable
	   maintenant que deux ancres independantes se corrigent l une l autre ;
	   ca ne l etait pas avec la mi-parentale seule, dont la dispersion
	   avoisine 8,5 cm a elle toute seule. */
	if rangeMargin < 4.0 {
		rangeMargin = 4.0
	}
	if rangeMargin > 8.0 {
		rangeMargin = 8.0
	}

	/* HORS DOMAINE : on cesse de pretendre.

	   Au-dela de trois ecarts-types, l intervalle n est plus un intervalle
	   de confiance calcule — c est un refus de revendiquer une precision
	   qu on n a pas. Les 2,5 et le plancher a 15 cm ne sortent d aucune
	   statistique, et c est assume : leur seul role est de rendre visible,
	   sur l ecran, que ce chiffre-la ne vaut pas les autres. Le message
	   d Avertissement dit le reste.

	   Le bornage a 8 cm est volontairement ignore ici : c est la borne du
	   domaine ou le modele fonctionne, et on en est sorti. */
	if horsDomaineModele(req.Age, req.Sex, req.HeightCM) {
		rangeMargin = math.Max(rangeMargin*2.5, 15.0)
	}

	confidenceLevel := "low"
	if rangeMargin <= 4.0 {
		confidenceLevel = "high"
	} else if rangeMargin <= 5.5 {
		confidenceLevel = "medium"
	}

	// L'intervalle encadre la valeur reellement affichee.
	//
	// L'ancienne version le centrait sur la taille mi-parentale et
	// oubliait le "else" du cas feminin : pour une fille la fourchette
	// etait decalee de +6.5 cm par rapport a sa propre reference.
	// Meme plancher que la prediction : afficher une borne basse sous la
	// taille actuelle revient a annoncer a l adolescent qu il pourrait
	// rapetisser, ce qui detruit la credibilite de tout le resultat.
	borneBasse := math.Round((predictedHeight-rangeMargin)*10) / 10
	if borneBasse < req.HeightCM {
		borneBasse = math.Round(req.HeightCM*10) / 10
	}

	/* LA BORNE HAUTE N EST PAS PLAFONNEE, ET C EST DELIBERE.

	   J ai essaye l inverse. Hors domaine, l estimation est pinglee AU
	   plafond ; plafonner aussi la borne haute reduit alors l intervalle a
	   ZERO, et l ecran affiche « 198,4 cm » sans marge — une certitude
	   parfaite, precisement sur les profils ou le modele ne sait rien. Les
	   tests l ont attrape avant la production.

	   Une borne haute qui depasse le plafond est laide : un garcon de
	   11 ans a 180 cm voit son intervalle monter a 216 cm. Mais elle ne
	   pretend rien — elle dit « on ne sait pas jusqu ou », ce qui est la
	   verite, et l avertissement qui l accompagne dit le reste. Entre un
	   chiffre laid et un chiffre faussement sur, on garde le laid.

	   Le vrai correctif serait de ne pas afficher d intervalle du tout sur
	   ces profils : c est une decision d ecran, pas de moteur. */
	return confidenceLevel, [2]float64{
		borneBasse,
		math.Round((predictedHeight+rangeMargin)*10) / 10,
	}
}

func validateV2Input(req HeightPredictionV2Request) error {
	/* Borne haute portee de 18 a 22 ans.

	   Chez le garcon, les cartilages de conjugaison ne se ferment pas tous
	   a 18 ans : la fermeture s etale jusque vers 21-22 ans, et une
	   croissance residuelle de quelques millimetres a un ou deux
	   centimetres reste possible sur cette periode. Refuser un utilisateur
	   de 19 ans lui renvoyait une erreur de validation en fin de
	   questionnaire — apres quinze ecrans — alors qu il venait justement
	   chercher une reponse a cette question.

	   Le modele n a pas besoin d etre retouche pour les accueillir : la
	   correction de vitesse au-dela de 15 ans (req.Age > 15) s applique
	   telle quelle, et la marge se resserre deja d elle-meme au-dela de 16
	   ans. Pour un profil de 20 ans avec une croissance quasi nulle, elle
	   tombe au plancher de 3 cm, ce qui est le comportement attendu.

	   Le plancher « jamais sous la taille deja atteinte » fait le reste :
	   ces utilisateurs obtiennent une estimation egale ou tres proche de
	   leur taille actuelle, ce qui est la verite. */
	if req.Age < 8.0 || req.Age > 22.0 {
		return &ValidationError{"Age must be between 8 and 22 years"}
	}
	if req.HeightCM < 100 || req.HeightCM > 210 {
		return &ValidationError{"Height must be between 100 and 210 cm"}
	}
	if req.Sex != MALE && req.Sex != FEMALE {
		return &ValidationError{"Sex must be 'M' or 'F'"}
	}
	if req.SleepHoursPerNight > 0 && (req.SleepHoursPerNight < 4 || req.SleepHoursPerNight > 14) {
		return &ValidationError{"Sleep hours must be between 4 and 14"}
	}
	return nil
}

type ValidationError struct {
	Message string
}

func (e *ValidationError) Error() string {
	return e.Message
}

// describeGrowthPhase - libelle lisible de la phase de croissance,
// deduit de l age et de la vitesse. Remplace la stadification de Tanner,
// qui exigeait des reponses intimes pour un gain d information faible.
func describeGrowthPhase(age float64, velocityCM float64) string {
	if velocityCM <= 0 {
		return "Non renseigne"
	}
	switch {
	case velocityCM >= 6.0:
		return "Pic de croissance"
	case velocityCM >= 3.0:
		return "Croissance active"
	case age >= 16:
		return "Croissance terminee ou presque"
	default:
		return "Croissance lente"
	}
}
