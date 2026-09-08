package planner

import (
	"fmt"
	"math"
)

type GrowthPlan struct {
	UserID            string
	PostureExercises  []Exercise
	NutritionPlan     NutritionPlan
	SleepOptimization SleepPlan
	SupplementStack   []Supplement
	DailyHabits       []Habit
	Timeline          Timeline
	ExpectedGrowth    float64 // cm additional growth possible
	Motivation        string
}

type Exercise struct {
	Name        string
	Description string
	Duration    int    // minutes
	Frequency   string // daily, 3x/week, etc
	Difficulty  string // easy, medium, hard
	Impact      string // posture, spine elongation, core strength
	Routine     string // Morning, Evening, Anytime
	Video       string // Link to form video
}

type NutritionPlan struct {
	DailyCalories      int
	ProteinGrams       int
	CalciumMg          int
	VitaminDmcg        int
	ZincMg             int
	MagnesiumMg        int
	MealsPerDay        int
	MealTiming         []string // "breakfast 7am", "snack 10am", etc
	FoodsToEat         []string
	FoodsToAvoid       []string
	SampleDayMeals     []string
	Hydration          string // "2-3 liters/day"
}

type SleepPlan struct {
	TargetHours      int
	BedTime          string // "10pm"
	WakeTime         string // "7am"
	Consistency      string // Same time every day
	Growth           string // "Human growth hormone peaks 1-2h after sleep onset"
	PreSleepRoutine  []string
	Environment      []string // dark, cool, quiet
	AvoidBefore      []string // caffeine, screens, exercise
}

type Supplement struct {
	Name            string
	Dosage          string
	Frequency       string // daily, etc
	BestTakingTime  string // with meals, before bed, etc
	Purpose         string // calcium for bone growth, etc
	ResearchSupport string // "proven", "promising", "under research"
	Safety          string // "safe for age", "consult doctor"
}

type Habit struct {
	Name        string
	Description string
	Frequency   string
	Difficulty  string // easy, medium, hard
	Benefit     string
	TimePerDay  int    // minutes
}

type Timeline struct {
	Month1 string
	Month3 string
	Month6 string
	Month12 string
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
		Name:        "Morning Spinal Elongation Stretch",
		Description: "Hang from pull-up bar or stretch arms upward to decompress spine after sleep",
		Duration:    5,
		Frequency:   "daily",
		Difficulty:  "easy",
		Impact:      "Spine decompression, posture correction",
		Routine:     "Morning (immediately after waking)",
		Video:       "spinal-elongation-technique",
	})

	// Posture correction - key for height appearance
	exercises = append(exercises, Exercise{
		Name:        "Posture Correction Exercises",
		Description: "Back strengthening to maintain tall posture and prevent slouching",
		Duration:    10,
		Frequency:   "daily",
		Difficulty:  "easy",
		Impact:      "Better posture = appear 1-2cm taller",
		Routine:     "Anytime",
		Video:       "posture-correction-routine",
	})

	// Pilates/Core - based on age
	if req.Age >= 14 {
		exercises = append(exercises, Exercise{
			Name:        "Core Strengthening (Pilates)",
			Description: "Builds core stability for better posture and spinal alignment",
			Duration:    15,
			Frequency:   "3x/week",
			Difficulty:  "medium",
			Impact:      "Core strength, posture, spinal alignment",
			Routine:     "Evening",
			Video:       "pilates-core-routine",
		})
	}

	// Swimming/Hanging - best for height
	if req.Age >= 12 {
		exercises = append(exercises, Exercise{
			Name:        "Swimming or Bar Hanging",
			Description: "Decompresses spine and promotes vertical growth",
			Duration:    30,
			Frequency:   "3-4x/week",
			Difficulty:  "medium",
			Impact:      "Spine elongation, posture, full body conditioning",
			Routine:     "After school/work",
			Video:       "swimming-hanging-technique",
		})
	}

	// Yoga - for flexibility and spine
	exercises = append(exercises, Exercise{
		Name:        "Yoga for Height Growth",
		Description: "Gentle yoga focused on spine extension and flexibility",
		Duration:    20,
		Frequency:   "3x/week",
		Difficulty:  "easy",
		Impact:      "Flexibility, spine elongation, stress relief",
		Routine:     "Morning or Evening",
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

// generateSleepPlan creates sleep optimization strategy
func generateSleepPlan(req GrowthPlanRequest) SleepPlan {
	targetHours := 9
	if req.Age > 16 {
		targetHours = 8
	}

	plan := SleepPlan{
		TargetHours:    targetHours,
		BedTime:        "10:00 PM",
		WakeTime:       "7:00 AM",
		Consistency:    "Same time every day (±30 minutes)",
		Growth:         "Growth hormone peaks 1-2 hours after sleep onset during deep sleep (stages 3-4)",
		PreSleepRoutine: []string{
			"9:30 PM: Stop using screens (blue light suppresses melatonin)",
			"9:45 PM: Relaxation (reading, meditation, stretching)",
			"10:00 PM: Lights off, bedroom dark & cool (65-68°F)",
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
			Name:            "Multivitamin",
			Dosage:          "1 tablet",
			Frequency:       "daily",
			BestTakingTime:  "with breakfast",
			Purpose:         "Fills nutritional gaps, supports overall health",
			ResearchSupport: "proven",
			Safety:          "safe for age",
		},
		{
			Name:            "Calcium + Vitamin D",
			Dosage:          "1000-1300mg calcium, 600 IU vitamin D",
			Frequency:       "daily",
			BestTakingTime:  "with meals",
			Purpose:         "Critical for bone growth and density",
			ResearchSupport: "proven",
			Safety:          "safe for age",
		},
		{
			Name:            "Zinc",
			Dosage:          "8-11mg",
			Frequency:       "daily",
			BestTakingTime:  "with dinner",
			Purpose:         "Essential for growth hormone and protein synthesis",
			ResearchSupport: "proven",
			Safety:          "safe for age",
		},
	}

	// Add additional based on deficiencies
	if req.NutritionLevel == "poor" {
		supplements = append(supplements, Supplement{
			Name:            "Iron + B12",
			Dosage:          "Varies by age",
			Frequency:       "daily",
			BestTakingTime:  "with meals (iron with vitamin C)",
			Purpose:         "Oxygen transport, energy production",
			ResearchSupport: "proven",
			Safety:          "consult doctor for dosage",
		})
	}

	return supplements
}

// generateDailyHabits creates daily habits to build
func generateDailyHabits(req GrowthPlanRequest) []Habit {
	habits := []Habit{
		{
			Name:        "Morning Hydration",
			Description: "Drink 500ml water immediately upon waking",
			Frequency:   "daily",
			Difficulty:  "easy",
			Benefit:     "Rehydration, activates metabolism",
			TimePerDay:  2,
		},
		{
			Name:        "Posture Check-ins",
			Description: "Every 2 hours, correct posture (shoulders back, spine straight)",
			Frequency:   "daily",
			Difficulty:  "easy",
			Benefit:     "Appear 1-2cm taller, strengthen back muscles",
			TimePerDay:  5,
		},
		{
			Name:        "Stretching Breaks",
			Description: "Take 2-minute stretching breaks every 4 hours",
			Frequency:   "daily",
			Difficulty:  "easy",
			Benefit:     "Maintains flexibility, decompresses spine",
			TimePerDay:  10,
		},
		{
			Name:        "Consistent Sleep Schedule",
			Description: "Sleep & wake at same time every day",
			Frequency:   "daily",
			Difficulty:  "medium",
			Benefit:     "Optimizes growth hormone production",
			TimePerDay:  0, // Built into sleep
		},
		{
			Name:        "Nutrition Tracking",
			Description: "Log meals in app to ensure hitting protein/calcium targets",
			Frequency:   "daily",
			Difficulty:  "easy",
			Benefit:     "Accountability, ensures proper nutrition",
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

// generateMotivation creates personalized motivation message
func generateMotivation(req GrowthPlanRequest) string {
	gap := req.PredictedHeight - req.CurrentHeight
	motivation := fmt.Sprintf(
		"You have %.1fcm of growth potential ahead! By following this plan, "+
			"you can optimize your genetics and reach your maximum height. "+
			"The key is consistency - these habits compound over months. "+
			"You're not just getting taller, you're building a healthier version of yourself. "+
			"Let's maximize your potential! 💪",
		gap,
	)
	return motivation
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
