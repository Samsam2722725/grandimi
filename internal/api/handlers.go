package api

import (
	"fmt"
	"grandimi/internal/db"
	"grandimi/internal/estimator"
	"net/http"

	"github.com/gin-gonic/gin"
)

type PredictHeightRequest struct {
	Age            float64 `json:"age" binding:"required,gt=8,lt=18"`
	Sex            string  `json:"sex" binding:"required,oneof=M F"`
	HeightCM       float64 `json:"height_cm" binding:"required,gt=100,lt=210"`
	WeightKG       float64 `json:"weight_kg" binding:"required,gt=15,lt=150"`
	FatherHeightCM float64 `json:"father_height_cm" binding:"required,gt=140,lt=220"`
	MotherHeightCM float64 `json:"mother_height_cm" binding:"required,gt=140,lt=210"`
	PubertySigns   struct {
		PubicHair     string `json:"pubic_hair"`
		BreastDevelop string `json:"breast_develop"`
		Genitalia     string `json:"genitalia"`
		AxillaryHair  string `json:"axillary_hair"`
		Menarche      bool   `json:"menarche"`
	} `json:"puberty_signs"`
}

type PredictHeightV2Request struct {
	Email              string  `json:"email" binding:"required,email"`
	Age                float64 `json:"age" binding:"required,gt=8,lt=18"`
	Sex                string  `json:"sex" binding:"required,oneof=M F"`
	HeightCM           float64 `json:"height_cm" binding:"required,gt=100,lt=210"`
	WeightKG           float64 `json:"weight_kg" binding:"required,gt=15,lt=150"`
	FatherHeightCM     float64 `json:"father_height_cm" binding:"required,gt=140,lt=220"`
	MotherHeightCM     float64 `json:"mother_height_cm" binding:"required,gt=140,lt=210"`
	BMI                float64 `json:"bmi"`                      // Optional, calculated if not provided
	HeightVelocityCM   float64 `json:"height_velocity_cm"`       // cm/year
	EthnicBackground   string  `json:"ethnic_background"`        // caucasian, asian, african, hispanic, mixed
	NutritionLevel     string  `json:"nutrition_level"`          // excellent, good, fair, poor
	SleepHoursPerNight float64 `json:"sleep_hours_per_night"`    // 4-14 hours
	ExerciseMinPerDay  float64 `json:"exercise_min_per_day"`     // minutes
	MaternalDiabetes   bool    `json:"maternal_diabetes"`
	ChronicIllness     bool    `json:"chronic_illness"`
	PubertySigns       struct {
		PubicHair     string `json:"pubic_hair"`
		BreastDevelop string `json:"breast_develop"`
		Genitalia     string `json:"genitalia"`
		AxillaryHair  string `json:"axillary_hair"`
		Menarche      bool   `json:"menarche"`
	} `json:"puberty_signs"`
}

// V1 API - Original Khamis-Roche
func PredictHeight(c *gin.Context) {
	var req PredictHeightRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	estimatorReq := estimator.HeightPredictionRequest{
		Age:             req.Age,
		Sex:             req.Sex,
		HeightCM:        req.HeightCM,
		WeightKG:        req.WeightKG,
		FatherHeightCM:  req.FatherHeightCM,
		MotherHeightCM:  req.MotherHeightCM,
		PubertySigns: estimator.PubertySigns{
			PubicHair:      req.PubertySigns.PubicHair,
			BreastDevelop:  req.PubertySigns.BreastDevelop,
			Genitalia:      req.PubertySigns.Genitalia,
			AxillaryHair:   req.PubertySigns.AxillaryHair,
			MenstrualCycle: req.PubertySigns.Menarche,
		},
	}

	result := estimator.PredictHeight(estimatorReq)

	c.JSON(http.StatusOK, gin.H{
		"predicted_height_cm": result.PredictedHeightCM,
		"confidence_range": gin.H{
			"min": result.ConfidenceRange[0],
			"max": result.ConfidenceRange[1],
		},
		"confidence_level": result.ConfidenceLevel,
		"puberty_stage":    result.PubertyStage,
		"message":          result.Message,
		"model":            "Khamis-Roche v1",
	})
}

// V2 API - ML-Enhanced with ethnic adjustments and health factors
func PredictHeightV2(c *gin.Context) {
	var req PredictHeightV2Request

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
		})
		return
	}

	// Convert string enums to proper types
	ethnic := estimator.EthnicBackground(req.EthnicBackground)
	if ethnic == "" {
		ethnic = estimator.CAUCASIAN
	}

	nutrition := estimator.NutritionLevel(req.NutritionLevel)
	if nutrition == "" {
		nutrition = estimator.GOOD
	}

	estimatorReq := estimator.HeightPredictionV2Request{
		Age:             req.Age,
		Sex:             req.Sex,
		HeightCM:        req.HeightCM,
		WeightKG:        req.WeightKG,
		FatherHeightCM:  req.FatherHeightCM,
		MotherHeightCM:  req.MotherHeightCM,
		BMI:             req.BMI,
		HeightVelocityCM: req.HeightVelocityCM,
		EthnicBackground: ethnic,
		NutritionLevel:   nutrition,
		SleepHoursPerNight: req.SleepHoursPerNight,
		ExerciseMinPerDay: req.ExerciseMinPerDay,
		MaternalDiabetes: req.MaternalDiabetes,
		ChronicIllness:   req.ChronicIllness,
		PubertySigns: estimator.PubertySigns{
			PubicHair:      req.PubertySigns.PubicHair,
			BreastDevelop:  req.PubertySigns.BreastDevelop,
			Genitalia:      req.PubertySigns.Genitalia,
			AxillaryHair:   req.PubertySigns.AxillaryHair,
			MenstrualCycle: req.PubertySigns.Menarche,
		},
	}

	result := estimator.PredictHeightV2(estimatorReq)

	// Get or create user by email
	user, err := db.GetOrCreateUser(req.Email)
	if err != nil {
		fmt.Printf("[predict] GetOrCreateUser(%q): %v\n", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	// Save prediction to database
	pred, err := db.SavePrediction(user.ID, &db.Prediction{
		Age:             req.Age,
		Sex:             req.Sex,
		HeightCm:        req.HeightCM,
		WeightKg:        req.WeightKG,
		FatherHeightCm:  req.FatherHeightCM,
		MotherHeightCm:  req.MotherHeightCM,
		PredictedHeight: result.PredictedHeightCM,
		ConfidenceLevel: result.ConfidenceLevel,
		ConfidenceMin:   result.ConfidenceRange[0],
		ConfidenceMax:   result.ConfidenceRange[1],
	})
	if err != nil {
		fmt.Printf("[predict] SavePrediction(%s): %v\n", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to save prediction"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user_id":            user.ID,
		"prediction_id":      pred.ID,
		"predicted_height_cm": result.PredictedHeightCM,
		"confidence_range": gin.H{
			"min": result.ConfidenceRange[0],
			"max": result.ConfidenceRange[1],
		},
		"confidence_level": result.ConfidenceLevel,
		"puberty_stage":    result.PubertyStage,
		"model_used":       result.ModelUsed,
		"message":          result.Message,
		"factors":          result.Factors,
	})
}

func HealthCheck(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"app":    "Grandimi Height Estimator API",
		"models": []string{"v1 (Khamis-Roche)", "v2 (ML-Enhanced)"},
	})
}
