package estimator

/* LE RETARD PUBERTAIRE — le cas ou ce modele se trompe le plus.

   CE QU IL CORRIGE

   Un garcon de dix-sept ans qui mesure 165 cm et n a pas commence sa
   puberte recoit aujourd hui « +1,7 cm ». La realite, pour un Tanner 1-2
   a cet age, est de quinze a vingt-cinq centimetres. C est la plus grosse
   erreur que ce modele produise encore, et elle frappe des adolescents
   qui, eux, sentent tres bien qu ils ne sont pas finis.

   C est aussi, tres probablement, le profil du client qui a rapporte
   « le medecin dit deux metres, le site dit 1,81 m ».

   POURQUOI LE SIGNAL MARCHE A PARTIR DE QUINZE ANS, ET PAS AVANT

   L age median de la mue est d environ 13,5 ans, celui de la pilosite du
   visage de 14 a 15. A quinze ans, repondre « oui » ne distingue donc
   presque personne : c est le cas de la majorite.

   Repondre « PAS ENCORE » a quinze ans, en revanche, est rare et parlant.
   C est un retard pubertaire, deux a trois pour cent des adolescents. Le
   signal est donc ASYMETRIQUE, et volontairement : l absence informe,
   la presence non. On ne corrige jamais vers le bas ici.

   TROIS SIGNAUX RETENUS SUR SIX, ET POURQUOI

   Retenus : mue de la voix, pilosite du visage, pilosite des aisselles.
   Ils marquent la puberte vraie (gonadarche) et leur calendrier est
   documente.

   Ecartes :
     - l odeur corporelle releve de l adrenarche, vers huit-dix ans. A
       quinze ans elle ne distingue plus personne.
     - l acne correle mal avec le stade pubertaire : beaucoup d ados
       pubres n en ont pas, et elle persiste apres la fin de la croissance.
     - la largeur des epaules est une auto-evaluation subjective sans
       reference : deux adolescents identiques repondront differemment.

   Les trois ecartes restent collectees pour personnaliser le plan ; elles
   n entrent pas dans le chiffre, et ce fichier est l endroit ou c est dit.

   POURQUOI CETTE CORRECTION NE PEUT PAS DOUBLER L INDICE DE MATURITE

   correctionMaturite (maturite.go) travaille autour du pic, via une
   fenetre d age qui vaut 1 entre 11 et 14,5 ans chez le garcon puis
   redescend a 0 a seize ans. Cette correction-ci travaille exactement la
   ou l autre s eteint, et le poids de l une est le complement de l autre :

       poidsRetard = 1 - poidsFenetreMaturite(age, sexe)

   Les deux ne peuvent donc jamais s appliquer a pleine force en meme
   temps. Ce n est pas une precaution decorative : ajouter une correction
   a cote d une autre qui portait deja la meme information est l erreur
   exacte qui a casse 19,8 % des profils avec la cible mi-parentale. */

const (
	// Age a partir duquel l absence de signe pubertaire devient
	// informative plutot que banale. Aligne sur le filtre du
	// questionnaire, qui ne pose ces questions qu a partir de quinze ans.
	agePuberteInformative = 15.0

	/* Correction maximale, en centimetres, pour un retard pubertaire
	   complet. Volontairement conservatrice.

	   Un Tanner 1-2 de dix-sept ans a reellement quinze a vingt-cinq
	   centimetres devant lui, soit bien plus que quatre. Mais ce chiffre
	   n est PAS calibre — il n existe aucune donnee de suivi pour le
	   faire — et une correction non calibree appliquee largement ferait
	   plus de degats qu elle n en repare. On corrige donc modestement le
	   chiffre, et on le DIT a l utilisateur : c est l avertissement qui
	   porte le reste, pas le nombre. */
	correctionRetardMaxCM = 4.0
)

/* scoreRetardPubertaire rend la part des signes DECLARES qui sont encore
   absents, de 0 a 1, et si au moins un signe a ete declare.

   « Je ne sais pas » et « je prefere ne pas repondre » ne comptent ni
   pour ni contre : ne rien savoir reste neutre, comme partout ailleurs
   dans ce moteur. */
func scoreRetardPubertaire(req HeightPredictionV2Request) (float64, bool) {
	absents, declares := 0, 0

	// "no" / "starting" / "yes" / "unknown"
	switch req.VoixMuee {
	case "no":
		absents++
		declares++
	case "starting", "yes":
		declares++
	}

	// "none" / "light" / "developed" / "" (prefere ne pas repondre)
	for _, signe := range []string{req.PilositeVisage, req.PilositeAisselles} {
		switch signe {
		case "none":
			absents++
			declares++
		case "light", "developed":
			declares++
		}
	}

	/* Chez la fille, l absence de menarche a quinze ans passee est le
	   signe de retard le plus net qui soit. Le champ existait deja mais
	   n etait pas exploite : menarche.go ne se sert que de la DATE, donc
	   uniquement des filles deja reglees. */
	if req.Sex == FEMALE && req.MenarcheDeclaree {
		declares++
		if !req.MenarcheSurvenue {
			absents++
		}
	}

	if declares == 0 {
		return 0, false
	}
	return float64(absents) / float64(declares), true
}

/* correctionRetardPubertaire rend les centimetres a AJOUTER, et si le
   profil doit etre signale a l utilisateur.

   Toujours positive ou nulle : la presence d un signe pubertaire a quinze
   ans ne dit rien, seule son absence parle. */
func correctionRetardPubertaire(req HeightPredictionV2Request) (cm float64, signale bool) {
	if req.Age < agePuberteInformative {
		return 0, false
	}

	score, declare := scoreRetardPubertaire(req)
	if !declare || score == 0 {
		return 0, false
	}

	// Complementaire de l indice de maturite : voir l en-tete.
	poids := 1 - poidsFenetreMaturite(req.Age, req.Sex)
	if poids <= 0 {
		return 0, false
	}

	cm = correctionRetardMaxCM * score * poids

	/* On ne signale que les retards nets — la moitie des signes declares
	   encore absents. Un seul signe manquant sur trois est frequent et ne
	   justifie pas d alerter un adolescent sur son propre developpement. */
	return cm, score >= 0.5
}
