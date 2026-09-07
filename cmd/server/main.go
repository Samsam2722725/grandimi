package main

import (
	"grandimi/internal/api"
	"grandimi/internal/db"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	// Initialize Supabase
	if err := db.Init(); err != nil {
		panic("Failed to init Supabase: " + err.Error())
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	gin.SetMode(gin.ReleaseMode)
	router := gin.Default()

	// Middleware
	router.Use(gin.Logger())
	router.Use(gin.Recovery())
	router.Use(corsMiddleware())

	// Routes
	router.GET("/health", api.HealthCheck)

	// V1 API (Original Khamis-Roche)
	router.POST("/api/v1/predict-height", api.PredictHeight)

	// V2 API (ML-Enhanced with ethnic/health factors)
	router.POST("/api/v2/predict-height", api.PredictHeightV2)

	// Maximize Potential - Growth Plans
	router.POST("/api/v1/growth-plan", api.GetGrowthPlan)
	router.GET("/api/v1/exercise-guide", api.GetExerciseGuide)
	router.GET("/api/v1/nutrition-guide", api.GetNutritionGuide)
	router.GET("/api/v1/sleep-optimization", api.GetSleepOptimization)

	// Payment & Subscription
	router.POST("/api/v1/checkout", api.GetCheckout)
	router.POST("/webhooks/whop", api.WhopWebhook)
	router.GET("/api/v1/check-premium", api.CheckPremium)

	router.Run(":" + port)
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
