package planner

import (
	"fmt"
	"math"
)

// Sans tags, Go sérialise en PascalCase et le frontend, qui lit du
// snake_case, ne trouve rien. Les noms ci-dessous sont ceux que
// GrowthPlanPage consomme : les changer casse l'affichage du plan.

type GrowthPlan struct {
	UserID            string        `json:"user_id"`
	PostureExercises  []Exercise    `json:"posture_exercises"`
	NutritionPlan     NutritionPlan `json:"nutrition"`
	SleepOptimization SleepPlan     `json:"sleep"`
	SupplementStack   []Supplement  `json:"supplements"`
	DailyHabits       []Habit       `json:"daily_habits"`
	Timeline          Timeline      `json:"timeline"`
	ExpectedGrowth    float64       `json:"expected_growth"` // cm additional growth possible
	Motivation        string        `json:"motivation"`
}

type Exercise struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Duration    int    `json:"duration_min"`
	Frequency   string `json:"frequency"`
	Difficulty  string `json:"difficulty"`
	Impact      string `json:"impact"`
	Routine     string `json:"routine"`
	Video       string `json:"video"`
}

type NutritionPlan struct {
	DailyCalories  int      `json:"daily_calories"`
	ProteinGrams   int      `json:"protein_g"`
	CalciumMg      int      `json:"calcium_mg"`
	VitaminDmcg    int      `json:"vitamin_d_mcg"`
	ZincMg         int      `json:"zinc_mg"`
	MagnesiumMg    int      `json:"magnesium_mg"`
	MealsPerDay    int      `json:"meals_per_day"`
	MealTiming     []string `json:"meal_timing"`
	FoodsToEat     []string `json:"foods_to_eat"`
	FoodsToAvoid   []string `json:"foods_to_avoid"`
	SampleDayMeals []string `json:"sample_day_meals"`
	Hydration      string   `json:"hydration"`
}

type SleepPlan struct {
	TargetHours     int      `json:"hours"`
	BedTime         string   `json:"bedtime"`
	WakeTime        string   `json:"waketime"`
	Consistency     string   `json:"consistency"`
	Growth          string   `json:"growth"`
	PreSleepRoutine []string `json:"pre_sleep_routine"`
	Environment     []string `json:"environment"`
	AvoidBefore     []string `json:"avoid_before"`
}

type Supplement struct {
	Name            string `json:"name"`
	Dosage          string `json:"dosage"`
	Frequency       string `json:"frequency"`
	BestTakingTime  string `json:"best_taking_time"`
	Purpose         string `json:"purpose"`
	ResearchSupport string `json:"research_support"`
	Safety          string `json:"safety"`
}

type Habit struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	Frequency   string `json:"frequency"`
	Difficulty  string `json:"difficulty"`
	Benefit     string `json:"benefit"`
	TimePerDay  int    `json:"time_per_day_min"`
}

type Timeline struct {
	Month1  string `json:"month_1"`
	Month3  string `json:"month_3"`
	Month6  string `json:"month_6"`
	Month12 string `json:"month_12"`
}

type GrowthPlanRequest struct {
	Age            float64
	Sex            string
	CurrentHeight  float64
	PredictedHeight float64
	Weight         float64
	BMI            float64
	NutritionLevel string
	SleepHours     float64
	ExerciseMin    float64
	Puberty        string
	HeightVelocity float64

	/* Les cinq reponses posees APRES le paiement. Sans elles, le plan
	   donnait la meme heure de coucher a tout le monde. */
	Preferences    PreferencesPlan
}

/* PreferencesPlan reprend, sans dependre du paquet db, ce dont le
   plan a besoin pour poser des heures reelles. Les minutes sont
   comptees depuis minuit : « 30 minutes plus tot » est alors une
   soustraction, pas une analyse de chaine. */
type PreferencesPlan struct {
	CoucherMin int
	LeverMin   int
	PetitDej   string
	JoursSport []int
	Difficulte string
}

// GeneratePersonalizedPlan creates a customized growth plan based on user profile
func GeneratePersonalizedPlan(req GrowthPlanRequest) GrowthPlan {
	plan := GrowthPlan{
		PostureExercises:  generatePostureExercises(req),
		NutritionPlan:     generateNutritionPlan(req),
		SleepOptimization: generateSleepPlan(req),
		SupplementStack:   generateSupplements(req),
		DailyHabits:       generateDailyHabits(req),
		Timeline:          generateTimeline(req),
		ExpectedGrowth:    calculateAdditionalGrowth(req),
		Motivation:        generateMotivation(req),
	}

	return plan
}

// generatePostureExercises creates posture-focused exercises
func generatePostureExercises(req GrowthPlanRequest) []Exercise {
	exercises := []Exercise{}

	// Morning stretch routine - universal
	exercises = append(exercises, Exercise{
		Name:        "Suspension à la barre, le matin",
		Description: "Suspends-toi à une barre ou étire les bras vers le haut pour décompresser la colonne après la nuit",
		Duration:    5,
		Frequency:   "tous les jours",
		Difficulty:  "facile",
		Impact:      "Décompression de la colonne, posture",
		Routine:     "Le matin, juste après le réveil",
		Video:       "spinal-elongation-technique",
	})

	// Posture correction - key for height appearance
	exercises = append(exercises, Exercise{
		Name:        "Correction de la posture",
		Description: "Renforcement du dos pour te tenir droit et arrêter de t'affaisser",
		Duration:    10,
		Frequency:   "tous les jours",
		Difficulty:  "facile",
		Impact:      "Une meilleure posture, c'est 1 à 2 cm visibles en plus",
		Routine:     "N'importe quand",
		Video:       "posture-correction-routine",
	})

	// Pilates/Core - based on age
	if req.Age >= 14 {
		exercises = append(exercises, Exercise{
			Name:        "Gainage (Pilates)",
			Description: "Renforce le centre du corps : c'est lui qui tient la posture sans que tu y penses",
			Duration:    15,
			Frequency:   "3 fois par semaine",
			Difficulty:  "moyen",
			Impact:      "Centre solide, posture, alignement de la colonne",
			Routine:     "Le soir",
			Video:       "pilates-core-routine",
		})
	}

	// Swimming/Hanging - best for height
	if req.Age >= 12 {
		exercises = append(exercises, Exercise{
			Name:        "Natation ou suspension",
			Description: "Étire la colonne en mouvement, sans impact sur les articulations",
			Duration:    30,
			Frequency:   "3 à 4 fois par semaine",
			Difficulty:  "moyen",
			Impact:      "Étirement de la colonne, posture, condition physique",
			Routine:     "Après les cours",
			Video:       "swimming-hanging-technique",
		})
	}

	// Yoga - for flexibility and spine
	exercises = append(exercises, Exercise{
		Name:        "Yoga d'étirement",
		Description: "Yoga doux centré sur l'extension de la colonne et la souplesse",
		Duration:    20,
		Frequency:   "3 fois par semaine",
		Difficulty:  "facile",
		Impact:      "Souplesse, étirement de la colonne, moins de stress",
		Routine:     "Le matin ou le soir",
		Video:       "yoga-height-sequence",
	})

	return exercises
}

// generateNutritionPlan creates personalized nutrition
func generateNutritionPlan(req GrowthPlanRequest) NutritionPlan {
	// Base on age and weight
	dailyCalories := calculateCalories(req.Age, req.Sex, req.Weight)

	plan := NutritionPlan{
		DailyCalories:  dailyCalories,
		ProteinGrams:   int(req.Weight * 1.6), // 1.6g per kg for growth
		CalciumMg:      1300,                   // Growing child RDA
		VitaminDmcg:    15,                     // 600 IU
		ZincMg:         11,                     // Important for height growth
		MagnesiumMg:    400,
		MealsPerDay:    4, // 3 meals + 1 snack
		Hydration:      "2.5-3 liters/day",
		FoodsToEat: []string{
			"Milk & dairy (calcium, vitamin D)",
			"Lean meats & fish (protein, zinc)",
			"Eggs (complete protein, choline)",
			"Whole grains (B vitamins, energy)",
			"Fruits & vegetables (micronutrients)",
			"Nuts & seeds (healthy fats, minerals)",
			"Legumes (protein, iron)",
			"Yogurt (probiotics, calcium)",
		},
		FoodsToAvoid: []string{
			"Sugary drinks (limit growth hormone)",
			"Processed junk food (empty calories)",
			"Excess caffeine (interferes with sleep)",
			"Alcohol (if applicable - blocks growth)",
		},
		MealTiming: []string{
			"Breakfast 7-8am (protein + carbs)",
			"Mid-morning snack 10am (milk + fruit)",
			"Lunch 12-1pm (protein + vegetables + grains)",
			"Afternoon snack 4pm (yogurt + nuts)",
			"Dinner 7pm (lean protein + veggies)",
		},
		SampleDayMeals: []string{
			"Breakfast: Eggs, whole wheat toast, milk, orange juice",
			"Snack: Glass of milk, banana, almonds",
			"Lunch: Grilled chicken, brown rice, broccoli, water",
			"Snack: Greek yogurt, berries, granola",
			"Dinner: Salmon, sweet potato, spinach, milk",
		},
	}

	// Adjust based on current nutrition level
	if req.NutritionLevel == "poor" {
		plan.CalciumMg = 1500
		plan.ProteinGrams = int(float64(plan.ProteinGrams) * 1.2)
		plan.MealsPerDay = 5 // More frequent meals
	}

	return plan
}

/* heureFr écrit des minutes depuis minuit à la française : 1350 → « 22 h 30 ».

   Le plan annonçait « 10:00 PM » et « 7:00 AM » à des adolescents
   français. Ce n'était pas qu'une question de format : ces deux heures
   étaient écrites en dur, donc identiques pour tout le monde. */
func heureFr(minutes int) string {
	minutes = ((minutes % minutesParJourPlan) + minutesParJourPlan) % minutesParJourPlan
	h := minutes / 60
	m := minutes % 60
	if m == 0 {
		return fmt.Sprintf("%d h", h)
	}
	return fmt.Sprintf("%d h %02d", h, m)
}

const minutesParJourPlan = 24 * 60

/* dureeSommeil compte les minutes entre le coucher et le lever, en
   passant par minuit. Sans le rattrapage, un coucher à 22 h 30 et un
   lever à 7 h donnent un nombre négatif. */
func dureeSommeil(coucher, lever int) int {
	duree := lever - coucher
	if duree <= 0 {
		duree += minutesParJourPlan
	}
	return duree
}

// generateSleepPlan creates sleep optimization strategy
func generateSleepPlan(req GrowthPlanRequest) SleepPlan {
	targetHours := 9
	if req.Age > 16 {
		targetHours = 8
	}

	coucher := req.Preferences.CoucherMin
	lever := req.Preferences.LeverMin

	/* Zero est une heure valide — minuit — donc indistinguable d un
	   champ jamais rempli. Deux zeros ensemble, eux, ne decrivent
	   aucun emploi du temps reel : on retombe alors sur 22 h 30 /
	   7 h. Sans ce garde-fou, un plan genere sans preferences (appel
	   direct, test) annoncerait « couche-toi a 0 h ». */
	if coucher == 0 && lever == 0 {
		coucher, lever = 1350, 420
	}
	dormies := dureeSommeil(coucher, lever)

	/* La consigne dépend de l'écart réel, pas d'une phrase générique.
	   Dire « couche-toi plus tôt » à quelqu'un qui dort déjà neuf heures
	   est le meilleur moyen qu'il cesse de lire le plan. */
	consigne := fmt.Sprintf(
		"Tu dors %s. C'est ce qu'il te faut à ton âge — garde ces horaires, même le week-end (à 1 h près).",
		heureFr(dormies))
	if dormies < targetHours*60 {
		manque := targetHours*60 - dormies
		consigne = fmt.Sprintf(
			"Tu dors %s, il t'en manque %s. Avance ton coucher à %s : c'est la première heure de sommeil profond qui porte le pic d'hormone de croissance, et c'est celle qu'on perd en se couchant tard.",
			heureFr(dormies), heureFr(manque), heureFr(coucher-manque))
	}

	plan := SleepPlan{
		TargetHours: targetHours,
		BedTime:     heureFr(coucher),
		WakeTime:    heureFr(lever),
		Consistency: consigne,
		Growth:      "L'hormone de croissance atteint son pic 1 à 2 h après l'endormissement, pendant le sommeil profond.",
		PreSleepRoutine: []string{
			fmt.Sprintf("%s : écrans éteints — la lumière bleue retarde la mélatonine", heureFr(coucher-60)),
			fmt.Sprintf("%s : au calme — lecture, étirements, respiration", heureFr(coucher-30)),
			fmt.Sprintf("%s : lumière éteinte, chambre sombre et fraîche (18-20 °C)", heureFr(coucher)),
		},
		Environment: []string{
			"Complete darkness (blackout curtains)",
			"Cool temperature (65-68°F / 18-20°C)",
			"Quiet (white noise if needed)",
			"Comfortable mattress & pillow",
		},
		AvoidBefore: []string{
			"Caffeine after 3 PM",
			"Heavy meals after 7 PM",
			"Intense exercise within 3 hours",
			"Screens 30-60 min before bed",
			"Stimulating activities",
		},
	}

	// Adjust based on current sleep
	if req.SleepHours < 7 {
		plan.TargetHours = targetHours + 1 // Extra recovery needed
	}

	return plan
}

// generateSupplements creates supplement recommendations
func generateSupplements(req GrowthPlanRequest) []Supplement {
	supplements := []Supplement{
		{
			Name:            "Multivitamines",
			Dosage:          "1 comprimé",
			Frequency:       "tous les jours",
			BestTakingTime:  "au petit-déjeuner",
			Purpose:         "Comble les manques de l'alimentation",
			ResearchSupport: "démontré",
			Safety:          "adapté à ton âge",
		},
		{
			Name:            "Calcium + vitamine D",
			Dosage:          "1000 à 1300 mg de calcium, 600 UI de vitamine D",
			Frequency:       "tous les jours",
			BestTakingTime:  "pendant les repas",
			Purpose:         "Le calcium construit l'os, la vitamine D permet de l'absorber",
			ResearchSupport: "démontré",
			Safety:          "adapté à ton âge",
		},
		{
			Name:            "Zinc",
			Dosage:          "8 à 11 mg",
			Frequency:       "tous les jours",
			BestTakingTime:  "au dîner",
			Purpose:         "Indispensable à l'hormone de croissance",
			ResearchSupport: "démontré",
			Safety:          "adapté à ton âge",
		},
	}

	// Add additional based on deficiencies
	if req.NutritionLevel == "poor" {
		supplements = append(supplements, Supplement{
			Name:            "Fer + B12",
			Dosage:          "Selon l'âge",
			Frequency:       "tous les jours",
			BestTakingTime:  "pendant les repas (le fer avec de la vitamine C)",
			Purpose:         "Transport de l'oxygène, énergie",
			ResearchSupport: "démontré",
			Safety:          "demande la dose à un médecin",
		})
	}

	return supplements
}

// generateDailyHabits creates daily habits to build
func generateDailyHabits(req GrowthPlanRequest) []Habit {
	habits := []Habit{
		{
			Name:        "Boire au réveil",
			Description: "50 cl d'eau dès le lever",
			Frequency:   "tous les jours",
			Difficulty:  "facile",
			Benefit:     "Réhydrate après la nuit, relance le métabolisme",
			TimePerDay:  2,
		},
		{
			Name:        "Vérifier ta posture",
			Description: "Toutes les 2 heures : épaules en arrière, dos droit",
			Frequency:   "tous les jours",
			Difficulty:  "facile",
			Benefit:     "1 à 2 cm visibles en plus, dos renforcé",
			TimePerDay:  5,
		},
		{
			Name:        "Pauses étirement",
			Description: "2 minutes d'étirement toutes les 4 heures",
			Frequency:   "tous les jours",
			Difficulty:  "facile",
			Benefit:     "Garde la souplesse, décompresse la colonne",
			TimePerDay:  10,
		},
		{
			Name:        "Horaires de sommeil réguliers",
			Description: "Te coucher et te lever à la même heure, week-end compris",
			Frequency:   "tous les jours",
			Difficulty:  "moyen",
			Benefit:     "C'est ce qui déclenche le mieux l'hormone de croissance",
			TimePerDay:  0, // Built into sleep
		},
		{
			Name:        "Suivre ton alimentation",
			Description: "Noter tes repas pour vérifier que tu atteins tes apports en protéines et calcium",
			Frequency:   "tous les jours",
			Difficulty:  "facile",
			Benefit:     "Te permet de voir ce qui manque vraiment",
			TimePerDay:  10,
		},
	}

	return habits
}

// generateTimeline creates progress timeline
func generateTimeline(req GrowthPlanRequest) Timeline {
	return Timeline{
		Month1:  "Establish routine: posture exercises, nutrition tracking, sleep schedule. Expect 0.5-1cm growth (normal).",
		Month3:  "Routine becomes habitual. Posture improves noticeably. May see 1-2cm growth. Energy levels increase.",
		Month6:  "Significant posture improvement (appear 2-3cm taller). Consistent growth. Health markers improve.",
		Month12: "Maximum potential realized. Habits deeply ingrained. Final growth plateau depending on age.",
	}
}

// calculateAdditionalGrowth estimates additional growth possible
func calculateAdditionalGrowth(req GrowthPlanRequest) float64 {
	// Factors that can add 1-3cm beyond prediction
	additional := 1.0 // Base: optimized posture adds ~1cm appearance

	// If nutrition is poor, can gain 0.5-1cm from optimization
	if req.NutritionLevel == "poor" {
		additional += 0.5
	}

	// If sleep is low, can gain 0.5-1cm from better sleep
	if req.SleepHours < 8 {
		additional += 0.5
	}

	// If exercise is low, posture improvement adds more
	if req.ExerciseMin < 30 {
		additional += 0.5
	}

	return math.Min(additional, 3.0) // Cap at 3cm additional
}

// generateMotivation écrit le message d'ouverture du plan.
//
// Il cible le levier le PLUS FAIBLE de la personne plutôt que de citer
// les trois à égalité : un ado qui dort 6 h et mange correctement n'a
// pas le même premier chantier que l'inverse. C'est aussi la seule
// partie du plan qui prouve, dès la première phrase, qu'on a lu ses
// réponses — sans ça le plan a l'air générique même quand il ne l'est
// pas.
//
// Le texte était auparavant en anglais, et annonçait « you have X cm of
// growth potential » juste au-dessus d'une carte « croissance attendue :
// 1 cm » : deux chiffres contradictoires pour le lecteur. On distingue
// désormais explicitement les deux (croissance restante naturelle vs
// gain attribuable aux habitudes).
func generateMotivation(req GrowthPlanRequest) string {
	restant := req.PredictedHeight - req.CurrentHeight

	// Chaque levier est noté sur 1 : plus c'est bas, plus il y a à gagner.
	scoreSommeil := req.SleepHours / 9.0
	scoreActivite := req.ExerciseMin / 60.0
	scoreNutrition := map[string]float64{
		"poor": 0.25, "fair": 0.5, "good": 0.75, "excellent": 1.0,
	}[req.NutritionLevel]
	if scoreNutrition == 0 {
		scoreNutrition = 0.75
	}

	levier := "ton sommeil"
	detail := fmt.Sprintf("tu dors %.1f h, l'hormone de croissance se libère surtout pendant le sommeil profond", req.SleepHours)
	pire := scoreSommeil

	if scoreNutrition < pire {
		levier = "ton alimentation"
		detail = "sans apports suffisants, le corps ne peut pas construire l'os, même avec un sommeil parfait"
		pire = scoreNutrition
	}
	if scoreActivite < pire {
		levier = "ton activité physique"
		detail = fmt.Sprintf("tu bouges %.0f min par jour, c'est le levier où tu as le plus de marge", req.ExerciseMin)
	}

	if restant <= 0 {
		return fmt.Sprintf(
			"Ta croissance est probablement terminée ou proche de l'être. Ce plan ne te fera "+
				"pas gagner de centimètres, mais il travaille ce que tu peux encore changer : "+
				"la posture, qui vaut 1 à 2 cm visibles. On commence par %s — %s.",
			levier, detail,
		)
	}

	return fmt.Sprintf(
		"Il te reste environ %.1f cm de croissance naturelle devant toi. Ce plan ne les "+
			"crée pas : il sert à ne pas les perdre, et à ne pas finir en dessous de ton "+
			"potentiel. On commence par %s, parce que c'est là que tu as le plus à gagner — %s.",
		restant, levier, detail,
	)
}

// Helper functions
func calculateCalories(age float64, sex string, weight float64) int {
	// Approximate based on age, sex, weight
	base := 1800.0
	if sex == "M" {
		base = 2200.0
	}

	// Increase for growth years (12-18)
	if age >= 12 && age <= 18 {
		base *= 1.2
	}

	// Adjust for weight
	base = base * (weight / 60.0) // Normalize to 60kg baseline

	return int(base)
}
