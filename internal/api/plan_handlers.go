package api

import (
	"grandimi/internal/planner"
	"net/http"

	"github.com/gin-gonic/gin"
)

type GetGrowthPlanRequest struct {
	Age            float64 `json:"age" binding:"required,gt=8,lt=18"`
	Sex            string  `json:"sex" binding:"required,oneof=M F"`
	CurrentHeight  float64 `json:"current_height_cm" binding:"required,gt=100,lt=210"`
	PredictedHeight float64 `json:"predicted_height_cm" binding:"required,gt=100,lt=230"`
	Weight         float64 `json:"weight_kg" binding:"required,gt=15,lt=150"`
	BMI            float64 `json:"bmi"`
	NutritionLevel string  `json:"nutrition_level"`
	SleepHours     float64 `json:"sleep_hours_per_night"`
	ExerciseMin    float64 `json:"exercise_min_per_day"`
	PubertyStage   string  `json:"puberty_stage"`
	HeightVelocity float64 `json:"height_velocity_cm"`
}

type GrowthPlanResponse struct {
	Plan             interface{} `json:"plan"`
	ExpectedGrowth   float64     `json:"expected_growth_cm"`
	Motivation       string      `json:"motivation"`
	PostureCount     int         `json:"posture_exercises_count"`
	SupplementCount  int         `json:"supplements_count"`
	DailyHabitsCount int         `json:"daily_habits_count"`
	Message          string      `json:"message"`
}

// GetGrowthPlan generates a personalized growth maximization plan
func GetGrowthPlan(c *gin.Context) {
	var req GetGrowthPlanRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Default values if not provided
	if req.BMI == 0 {
		req.BMI = req.Weight / ((req.CurrentHeight / 100) * (req.CurrentHeight / 100))
	}
	if req.NutritionLevel == "" {
		req.NutritionLevel = "good"
	}
	if req.SleepHours == 0 {
		req.SleepHours = 8
	}
	if req.ExerciseMin == 0 {
		req.ExerciseMin = 30
	}

	plannerReq := planner.GrowthPlanRequest{
		Age:             req.Age,
		Sex:             req.Sex,
		CurrentHeight:   req.CurrentHeight,
		PredictedHeight: req.PredictedHeight,
		Weight:          req.Weight,
		BMI:             req.BMI,
		NutritionLevel:  req.NutritionLevel,
		SleepHours:      req.SleepHours,
		ExerciseMin:     req.ExerciseMin,
		Puberty:         req.PubertyStage,
		HeightVelocity:  req.HeightVelocity,
	}

	growthPlan := planner.GeneratePersonalizedPlan(plannerReq)

	resp := GrowthPlanResponse{
		Plan:             growthPlan,
		ExpectedGrowth:   growthPlan.ExpectedGrowth,
		Motivation:       growthPlan.Motivation,
		PostureCount:     len(growthPlan.PostureExercises),
		SupplementCount:  len(growthPlan.SupplementStack),
		DailyHabitsCount: len(growthPlan.DailyHabits),
		Message:          "Personalized growth plan generated successfully",
	}

	c.JSON(http.StatusOK, resp)
}

// GetExerciseGuide returns detailed exercise information
func GetExerciseGuide(c *gin.Context) {
	exerciseName := c.Query("name")

	if exerciseName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Exercise name required",
		})
		return
	}

	guides := map[string]interface{}{
		"spinal-elongation-technique": map[string]interface{}{
			"name":        "Spinal Elongation Technique",
			"duration":    "5-10 minutes",
			"frequency":   "Daily, preferably morning",
			"description": "Decompress your spine to add 0.5-1cm appearance",
			"steps": []string{
				"1. Find a pull-up bar or sturdy horizontal bar at shoulder height",
				"2. Grip the bar with hands shoulder-width apart",
				"3. Hang with straight arms, letting your body weight pull down",
				"4. Keep legs straight or slightly bent",
				"5. Hold for 10-30 seconds, 5-10 repetitions",
				"6. Repeat 3-5 sets with 1-minute rest between",
			},
			"benefits": []string{
				"Decompresses intervertebral discs",
				"Stretches chest and shoulders",
				"Improves posture",
				"Adds temporary height (0.5-1cm)",
				"Strengthens grip and forearms",
			},
			"safety": "Do not jump down - lower yourself slowly to avoid injury",
		},
		"posture-correction-routine": map[string]interface{}{
			"name":        "Posture Correction Routine",
			"duration":    "10-15 minutes",
			"frequency":   "Daily",
			"description": "Strengthen back and correct poor posture (appear 1-2cm taller)",
			"exercises": []map[string]interface{}{
				{
					"name":     "Wall Angels",
					"sets":     3,
					"reps":     12,
					"duration": "3 minutes",
					"how":      "Stand with back against wall, move arms up and down slowly",
				},
				{
					"name":     "Scapular Squeezes",
					"sets":     3,
					"reps":     15,
					"duration": "3 minutes",
					"how":      "Squeeze shoulder blades together, hold 2 seconds",
				},
				{
					"name":     "Cat-Cow Stretch",
					"sets":     3,
					"reps":     10,
					"duration": "3 minutes",
					"how":      "On hands and knees, alternate arching and rounding spine",
				},
				{
					"name":     "Reverse Rows",
					"sets":     3,
					"reps":     12,
					"duration": "3 minutes",
					"how":      "Under low bar, pull chest to bar with straight body",
				},
			},
			"benefits": []string{
				"Stronger back muscles",
				"Better posture (look 1-2cm taller)",
				"Reduced slouching",
				"Spine alignment",
			},
		},
		"swimming-hanging-technique": map[string]interface{}{
			"name":        "Swimming & Hanging for Height",
			"duration":    "30-45 minutes",
			"frequency":   "3-4 times per week",
			"description": "Best exercises for spine elongation and full-body development",
			"swimming": map[string]interface{}{
				"duration": "20-30 minutes",
				"strokes": []string{
					"Freestyle (4x per week ideal)",
					"Backstroke (extends spine)",
					"Breaststroke (expands chest)",
				},
				"benefits": []string{
					"Decompresses spine while moving",
					"Full-body workout",
					"Improves posture naturally",
					"Low impact on joints",
					"Increases lung capacity",
				},
			},
			"hanging": map[string]interface{}{
				"duration": "10-15 minutes total",
				"protocol": []string{
					"Warm-up: 2 minutes light stretching",
					"Active hang: 15-30 seconds, rest 30 seconds",
					"Repeat 8-10 times",
					"Cool-down: gentle stretching",
				},
				"progression": []string{
					"Week 1-2: 15 seconds hangs",
					"Week 3-4: 20-25 seconds hangs",
					"Week 5+: 30+ seconds hangs",
				},
				"benefits": []string{
					"Maximum spine decompression",
					"Can add 1-2cm temporarily (permanent over time)",
					"Strengthens grip and core",
					"Improves shoulder mobility",
				},
			},
		},
		"pilates-core-routine": map[string]interface{}{
			"name":        "Core Strengthening with Pilates",
			"duration":    "15-20 minutes",
			"frequency":   "3 times per week",
			"description": "Build core strength for better posture and spine stability",
			"exercises": []map[string]interface{}{
				{
					"name": "The Hundred",
					"reps": 100,
					"time": "3-5 minutes",
				},
				{
					"name": "Roll Up",
					"reps": 10,
					"time": "3 minutes",
				},
				{
					"name": "Single Leg Circle",
					"reps": 10,
					"time": "3 minutes",
				},
				{
					"name": "Criss Cross",
					"reps": 10,
					"time": "2 minutes",
				},
			},
		},
	}

	guide, exists := guides[exerciseName]
	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Exercise guide not found",
			"available": []string{
				"spinal-elongation-technique",
				"posture-correction-routine",
				"swimming-hanging-technique",
				"pilates-core-routine",
			},
		})
		return
	}

	c.JSON(http.StatusOK, guide)
}

// GetNutritionGuide returns meal plan and nutrition tips
func GetNutritionGuide(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"title": "Complete Nutrition Guide for Height Growth",
		"key_nutrients": map[string]interface{}{
			"calcium": map[string]interface{}{
				"target_daily_mg": 1300,
				"why":             "Essential for bone growth and density",
				"sources": []string{
					"Milk (1 cup = 300mg)",
					"Yogurt (1 cup = 400mg)",
					"Cheese (1 oz = 200mg)",
					"Broccoli (1 cup = 100mg)",
					"Almonds (1 oz = 80mg)",
				},
			},
			"vitamin_d": map[string]interface{}{
				"target_daily_mcg": 15,
				"why":              "Enables calcium absorption, crucial for height",
				"sources": []string{
					"Fatty fish (salmon, mackerel)",
					"Egg yolks",
					"Fortified milk",
					"Sunlight exposure (15-30 min daily)",
				},
			},
			"protein": map[string]interface{}{
				"target_daily_g":  "1.6-2g per kg bodyweight",
				"why":             "Builds muscle and supports growth",
				"sources": []string{
					"Chicken, turkey, lean beef",
					"Fish and seafood",
					"Eggs",
					"Milk and dairy",
					"Legumes and nuts",
				},
			},
			"zinc": map[string]interface{}{
				"target_daily_mg": 11,
				"why":             "Critical for growth hormone and protein synthesis",
				"sources": []string{
					"Oysters (5oz = 30mg)",
					"Beef (3oz = 6mg)",
					"Chicken (3oz = 2mg)",
					"Pumpkin seeds (1oz = 2mg)",
					"Chickpeas (1 cup = 2mg)",
				},
			},
		},
		"sample_daily_meal_plan": map[string]interface{}{
			"breakfast": map[string]interface{}{
				"time":  "7:00 AM",
				"meal":  "2 eggs, 2 slices whole wheat toast, 1 cup milk, 1 orange",
				"cals":  450,
				"protein_g": 18,
				"calcium_mg": 300,
			},
			"mid_morning_snack": map[string]interface{}{
				"time":  "10:00 AM",
				"meal":  "1 cup Greek yogurt, handful berries, granola",
				"cals":  250,
				"protein_g": 15,
				"calcium_mg": 200,
			},
			"lunch": map[string]interface{}{
				"time":  "12:30 PM",
				"meal":  "150g grilled chicken, 1 cup brown rice, 1 cup broccoli",
				"cals":  550,
				"protein_g": 35,
				"calcium_mg": 80,
			},
			"afternoon_snack": map[string]interface{}{
				"time":  "3:30 PM",
				"meal":  "1 cup milk, apple, almonds (1oz)",
				"cals":  300,
				"protein_g": 12,
				"calcium_mg": 300,
			},
			"dinner": map[string]interface{}{
				"time":  "7:00 PM",
				"meal":  "150g salmon, sweet potato, spinach salad with olive oil",
				"cals":  600,
				"protein_g": 30,
				"calcium_mg": 100,
			},
		},
		"daily_totals": map[string]interface{}{
			"calories":      2150,
			"protein_g":     110,
			"calcium_mg":    980,
			"vitamin_d_mcg": 20,
			"water_liters":  2.5,
		},
	})
}

// GetSleepOptimization returns sleep tips for growth
func GetSleepOptimization(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"title":        "Sleep Optimization for Height Growth",
		"key_fact":     "Growth hormone peaks 1-2 hours after sleep onset during deep sleep (stages 3-4)",
		"target_hours": "8-10 hours for teenagers",
		"schedule": map[string]string{
			"bed_time":      "10:00 PM",
			"wake_time":     "7:00 AM",
			"consistency":   "Same time every day (±30 minutes)",
			"why":           "Consistent schedule optimizes circadian rhythm and growth hormone release",
		},
		"bedroom_environment": []string{
			"✅ Complete darkness (blackout curtains)",
			"✅ Cool temperature (65-68°F / 18-20°C)",
			"✅ Quiet (white noise if needed)",
			"✅ Comfortable mattress and pillow",
			"✅ No screens (EMF interference)",
		},
		"pre_sleep_routine": map[string]string{
			"9:30 PM": "Stop using screens (blue light suppresses melatonin)",
			"9:45 PM": "Relaxation (reading, meditation, gentle stretching)",
			"10:00 PM": "Lights off",
		},
		"avoid_before_sleep": []string{
			"❌ Caffeine after 3 PM (half-life = 5-6 hours)",
			"❌ Heavy meals after 7 PM",
			"❌ Intense exercise within 3 hours",
			"❌ Screens 30-60 min before bed",
			"❌ Stimulating activities",
			"❌ Alcohol (disrupts REM sleep)",
		},
		"supplementation": map[string]interface{}{
			"magnesium": "200-300mg (helps sleep quality)",
			"zinc":      "included in main supplement",
		},
	})
}
