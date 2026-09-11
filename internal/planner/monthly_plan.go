package planner

import "fmt"

// Le plan est vendu par abonnement mensuel : chaque mois payé doit livrer
// un plan distinct, sinon le mois 2 n'a aucune raison d'exister. Le numéro
// de mois pilote le thème travaillé et l'intensité des exercices.

type MonthlyPlan struct {
	Month        int          `json:"month"`
	Focus        string       `json:"focus"`
	WhyThisMonth string       `json:"why_this_month"`
	DailyRoutine []DailyBlock `json:"daily_routine"`
	WeeklyGoals  []string     `json:"weekly_goals"`
	MonthTarget  string       `json:"month_target"`
	NextMonth    string       `json:"next_month_preview"`
}

type DailyBlock struct {
	Moment string      `json:"moment"`
	Heure  string      `json:"heure"`
	Tasks  []DailyTask `json:"tasks"`
	DureeM int         `json:"duree_min"`
}

// DailyTask est une action cochable. Key est stable d'un jour à l'autre
// pour le même moment de la journée (le nombre et l'ordre des actions par
// bloc ne changent jamais d'un mois à l'autre, seul leur texte change) :
// c'est ce qui permet à /api/v1/tasks de retrouver "la même tâche" hier,
// aujourd'hui et demain pour calculer une série de jours tenus.
type DailyTask struct {
	Key      string `json:"key"`
	Label    string `json:"label"`
	Pourquoi string `json:"pourquoi"`
	Source   string `json:"source"`
}

type monthTheme struct {
	focus     string
	pourquoi  string
	objectif  string
	semaines  [4]string
	actionSup string
}

// Les thèmes tournent sur 12 mois, la durée pendant laquelle la fenêtre de
// croissance reste exploitable pour un adolescent. Au-delà, le cycle
// recommence avec l'intensité atteinte.
var themesMensuels = [12]monthTheme{
	{
		focus:    "Le sommeil",
		pourquoi: "L'hormone de croissance est libérée en pic 1 à 2 h après l'endormissement, pendant le sommeil profond. C'est le levier le plus puissant, et le plus souvent négligé.",
		objectif: "Se coucher à la même heure (±30 min) 25 nuits sur 30.",
		semaines: [4]string{
			"Note ton heure de coucher réelle chaque soir, sans rien changer.",
			"Avance ton coucher de 15 min par rapport à ta moyenne de la semaine 1.",
			"Coupe les écrans 45 min avant le coucher.",
			"Tiens l'horaire cible 7 nuits d'affilée.",
		},
		actionSup: "Chambre à 18-20 °C, noir complet.",
	},
	{
		focus:    "La posture",
		pourquoi: "Une posture affaissée coûte 1 à 3 cm de taille debout. Ce n'est pas de la croissance, c'est de la taille que tu as déjà et que tu n'utilises pas.",
		objectif: "Tenir la posture corrigée sans y penser en fin de mois.",
		semaines: [4]string{
			"Wall angels : 3 séries de 12, un jour sur deux.",
			"Ajoute les squeezes d'omoplates, 3×15 par jour.",
			"Passe à 4 séances par semaine, contrôle-toi dans un miroir.",
			"Photo de profil au mur, comparée à celle du début du mois.",
		},
		actionSup: "Écran de téléphone à hauteur des yeux, pas sur les genoux.",
	},
	{
		focus:    "Les protéines",
		pourquoi: "Sans apport suffisant, le corps ne peut pas construire l'os et le muscle, même avec le meilleur sommeil du monde. Les besoins montent fort à l'adolescence.",
		objectif: "Atteindre la cible protéique 6 jours sur 7.",
		semaines: [4]string{
			"Ajoute une source de protéines au petit-déjeuner.",
			"Une source de protéines à chacun des 3 repas.",
			"Ajoute une collation protéinée l'après-midi.",
			"Tiens les 4 apports quotidiens toute la semaine.",
		},
		actionSup: "Œufs, laitages, poisson, légumineuses : varie les sources.",
	},
	{
		focus:    "L'étirement et la suspension",
		pourquoi: "La suspension décompresse les disques intervertébraux tassés par la journée. L'effet est réel mais temporaire : c'est la répétition qui installe la posture.",
		objectif: "Tenir des suspensions de 30 s en fin de mois.",
		semaines: [4]string{
			"Suspension passive : 8 × 15 s, un jour sur deux.",
			"Passe à 8 × 20 s.",
			"Passe à 10 × 25 s.",
			"10 × 30 s, avec étirement doux en fin de série.",
		},
		actionSup: "Redescends toujours en douceur, ne saute jamais de la barre.",
	},
	{
		focus:    "Le dos et les épaules",
		pourquoi: "Les muscles du haut du dos maintiennent la posture acquise au mois 2. Sans eux, tu retombes en avant dès que tu arrêtes d'y penser.",
		objectif: "Passer de l'effort conscient au maintien automatique.",
		semaines: [4]string{
			"Rowing inversé : 3 séries de 8.",
			"3 séries de 10, tempo lent.",
			"3 séries de 12.",
			"4 séries de 12, plus gainage 3 × 45 s.",
		},
		actionSup: "Le dos droit doit devenir la position par défaut, pas un effort.",
	},
	{
		focus:    "La régularité du sommeil",
		pourquoi: "Le mois 1 a posé l'horaire. Ici, on travaille la qualité : c'est le sommeil profond, pas seulement sa durée, qui déclenche le pic hormonal.",
		objectif: "Réveils spontanés avant l'alarme, plusieurs fois par semaine.",
		semaines: [4]string{
			"Même heure de lever, week-end compris.",
			"Plus de caféine après 15 h.",
			"Rituel fixe de 15 min avant le coucher.",
			"Tiens l'ensemble sur 7 jours, note ton état au réveil.",
		},
		actionSup: "Un réveil difficile chaque matin veut dire que le coucher est trop tard.",
	},
	{
		focus:    "Le calcium et la vitamine D",
		pourquoi: "Le calcium construit l'os ; la vitamine D permet de l'absorber. L'un sans l'autre ne sert quasiment à rien.",
		objectif: "Atteindre la cible calcium 6 jours sur 7.",
		semaines: [4]string{
			"3 sources de calcium par jour.",
			"Ajoute 15 à 30 min de lumière du jour.",
			"Poisson gras deux fois dans la semaine.",
			"Tiens les trois habitudes en même temps.",
		},
		actionSup: "Toute supplémentation se décide avec un médecin, jamais seul.",
	},
	{
		focus:    "La mobilité des hanches",
		pourquoi: "Des hanches raides basculent le bassin et creusent le bas du dos. Le résultat est le même qu'une mauvaise posture : de la taille perdue debout.",
		objectif: "Tenir la fente basse 60 s de chaque côté sans compenser.",
		semaines: [4]string{
			"Fente basse : 30 s de chaque côté, tous les jours.",
			"45 s de chaque côté.",
			"Ajoute l'ouverture des ischio-jambiers.",
			"60 s par côté, bassin bien aligné.",
		},
		actionSup: "Si tu restes assis longtemps, lève-toi toutes les heures.",
	},
	{
		focus:    "La natation et le cardio",
		pourquoi: "Nager étire la colonne en mouvement, sans impact sur les articulations, et développe la capacité respiratoire.",
		objectif: "Trois séances par semaine tenues sur tout le mois.",
		semaines: [4]string{
			"Une séance de 20 min.",
			"Deux séances de 25 min.",
			"Trois séances de 25 min.",
			"Trois séances de 30 min, en variant les nages.",
		},
		actionSup: "Le dos crawlé est la nage la plus utile pour la colonne.",
	},
	{
		focus:    "Le gainage",
		pourquoi: "Un centre solide stabilise la colonne et verrouille tout ce qui a été gagné depuis le mois 2.",
		objectif: "Planche 90 s, dos parfaitement aligné.",
		semaines: [4]string{
			"Planche 3 × 30 s.",
			"Planche 3 × 45 s + gainage latéral.",
			"Planche 3 × 60 s.",
			"Planche 3 × 90 s, circuit complet.",
		},
		actionSup: "Aligné veut dire aligné : les fesses ne montent pas.",
	},
	{
		focus:    "La récupération et le stress",
		pourquoi: "Le stress chronique élève le cortisol, qui s'oppose directement à l'hormone de croissance. Se reposer fait partie du plan.",
		objectif: "Deux vraies journées de récupération par semaine.",
		semaines: [4]string{
			"Une journée sans entraînement, complète.",
			"Ajoute 10 min de respiration lente le soir.",
			"Deux journées de récupération.",
			"Tiens l'équilibre effort/repos sur la semaine.",
		},
		actionSup: "Progresser sans récupérer, c'est stagner plus lentement.",
	},
	{
		focus:    "Le bilan",
		pourquoi: "Douze mois de données valent mieux qu'une estimation. On mesure ce qui a bougé et on garde ce qui a marché.",
		objectif: "Re-mesure complète et plan de l'année suivante.",
		semaines: [4]string{
			"Re-mesure : taille, poids, photo de posture.",
			"Compare avec les valeurs du mois 1.",
			"Garde les 3 habitudes que tu tiens vraiment.",
			"Abandonne celles que tu ne tiens pas, sans culpabilité.",
		},
		actionSup: "Une habitude tenue vaut mieux que cinq abandonnées.",
	},
}

// GenerateMonthlyPlan construit le plan du mois d'abonnement demandé.
// month commence à 1 ; au-delà de 12 le cycle recommence.
func GenerateMonthlyPlan(req GrowthPlanRequest, month int) MonthlyPlan {
	if month < 1 {
		month = 1
	}

	theme := themesMensuels[(month-1)%12]

	plan := MonthlyPlan{
		Month:        month,
		Focus:        theme.focus,
		WhyThisMonth: theme.pourquoi,
		MonthTarget:  theme.objectif,
		DailyRoutine: routineQuotidienne(req, theme, month),
	}

	for i, semaine := range theme.semaines {
		plan.WeeklyGoals = append(plan.WeeklyGoals, fmt.Sprintf("Semaine %d : %s", i+1, semaine))
	}

	suivant := themesMensuels[month%12]
	plan.NextMonth = fmt.Sprintf("Mois %d : %s", month+1, suivant.focus)

	return plan
}

func routineQuotidienne(req GrowthPlanRequest, theme monthTheme, month int) []DailyBlock {
	// La suspension s'allonge de 5 s par mois, plafonnée à 40 s : une
	// progression annoncée que l'élève peut vérifier lui-même.
	suspension := 15 + 5*((month-1)%6)
	if suspension > 40 {
		suspension = 40
	}

	coucher := "22h00"
	if req.Age >= 16 {
		coucher = "22h30"
	}

	return []DailyBlock{
		{
			Moment: "Matin",
			Heure:  "au lever",
			DureeM: 10,
			Tasks: []DailyTask{
				{
					Key:      "matin-0",
					Label:    fmt.Sprintf("Suspension à la barre : 5 × %d s", suspension),
					Pourquoi: "Décompresse la colonne tassée par la nuit et par la posture de la veille.",
					Source:   "Littérature sur la décompression spinale par suspension passive",
				},
				{
					Key:      "matin-1",
					Label:    "Étirement vers le haut, 5 respirations lentes",
					Pourquoi: "Réactive la posture avant que la journée ne l'affaisse.",
					Source:   "Kinésithérapie posturale",
				},
				{
					Key:      "matin-2",
					Label:    "Petit-déjeuner avec une source de protéines",
					Pourquoi: "Le corps a besoin d'acides aminés disponibles dès le matin pour construire l'os et le muscle.",
					Source:   "Recommandations nutritionnelles adolescents",
				},
			},
		},
		{
			Moment: "Journée",
			Heure:  "entre les cours",
			DureeM: 5,
			Tasks: []DailyTask{
				{
					Key:      "journee-0",
					Label:    theme.actionSup,
					Pourquoi: theme.pourquoi,
					Source:   "Programme mensuel Grandimi — " + theme.focus,
				},
				{
					Key:      "journee-1",
					Label:    "Se lever et marcher 2 min toutes les heures assises",
					Pourquoi: "Une position assise prolongée tasse la colonne et affaisse la posture.",
					Source:   "Ergonomie posturale",
				},
				{
					Key:      "journee-2",
					Label:    "Boire régulièrement, viser 2 L sur la journée",
					Pourquoi: "Les disques intervertébraux sont en grande partie composés d'eau ; la déshydratation les tasse.",
					Source:   "Physiologie du disque intervertébral",
				},
			},
		},
		{
			Moment: "Soir",
			Heure:  "avant le dîner",
			DureeM: 20,
			Tasks: []DailyTask{
				{
					Key:      "soir-0",
					Label:    fmt.Sprintf("Séance du mois — %s : %s", theme.focus, theme.objectif),
					Pourquoi: theme.pourquoi,
					Source:   "Programme mensuel Grandimi — " + theme.focus,
				},
				{
					Key:      "soir-1",
					Label:    "Étirement doux du dos et des hanches, 5 min",
					Pourquoi: "Relâche les tensions accumulées avant le pic hormonal du sommeil.",
					Source:   "Kinésithérapie posturale",
				},
			},
		},
		{
			Moment: "Coucher",
			Heure:  coucher,
			DureeM: 0,
			Tasks: []DailyTask{
				{
					Key:      "coucher-0",
					Label:    "Écrans coupés 45 min avant",
					Pourquoi: "La lumière bleue retarde la sécrétion de mélatonine et l'endormissement.",
					Source:   "Physiologie du sommeil",
				},
				{
					Key:      "coucher-1",
					Label:    "Chambre sombre et fraîche (18-20 °C)",
					Pourquoi: "Le sommeil profond, où l'hormone de croissance culmine, est plus stable dans le noir et le frais.",
					Source:   "Physiologie du sommeil et de la croissance",
				},
				{
					Key:      "coucher-2",
					Label:    "Même heure qu'hier, à 30 min près",
					Pourquoi: "Un rythme régulier avance et stabilise le pic de sommeil profond.",
					Source:   "Physiologie du sommeil et de la croissance",
				},
			},
		},
	}
}
