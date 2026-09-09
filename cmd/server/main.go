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

	// Initialize Supabase (optional - only if env vars are set)
	if os.Getenv("DATABASE_URL") != "" {
		if err := db.Init(); err != nil {
			panic("Failed to init Supabase: " + err.Error())
		}
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

	// Auth
	router.POST("/api/v1/auth/signup", api.Signup)
	router.POST("/api/v1/auth/login", api.Login)

	// Payment & Subscription
	//
	// /checkout reste public : le parent qui règle depuis le lien partagé
	// n'a pas de compte, et la route ne renvoie qu'une URL Whop.
	router.POST("/api/v1/checkout", api.GetCheckout)
	// Le webhook n'est pas protégé par session mais par signature Whop.
	router.POST("/webhooks/whop", api.WhopWebhook)

	/* Routes portant des données personnelles : session obligatoire.
	   Elles répondaient auparavant à un ?user_id= ou ?email= arbitraire,
	   sans authentification. */
	prive := router.Group("/")
	prive.Use(api.AuthMiddleware())
	{
		prive.GET("/api/v1/check-premium", api.CheckPremium)
		prive.GET("/api/user/predictions", api.GetPredictionsByEmail)
	}

	// Admin Panel (protected by ADMIN_TOKEN)
	admin := router.Group("/api/admin")
	admin.Use(api.AdminAuthMiddleware())
	{
		admin.GET("/stats", api.AdminStats)
		admin.GET("/users", api.AdminUsers)
		admin.GET("/subscriptions", api.AdminSubscriptions)
		admin.GET("/webhooks", api.AdminWebhookLogs)
		admin.GET("/user/:id", api.UserDetail)
		admin.POST("/user/grant-premium", api.AdminGrantPremium)
		admin.POST("/user/revoke-premium", api.AdminRevokePremium)
		admin.DELETE("/user/:id", api.AdminDeleteUser)
		admin.POST("/webhook/simulate", api.AdminWebhookSimulator)
	}

	router.Run(":" + port)
}

// originesAutorisees : seuls ces sites peuvent appeler l'API depuis un
// navigateur. Le "*" précédent laissait n'importe quelle page du web
// interroger les routes de données.
var originesAutorisees = map[string]bool{
	"https://grandimi.com":     true,
	"https://www.grandimi.com": true,
	"http://localhost:5173":    true, // vite dev
	"http://localhost:4173":    true, // vite preview
}

func corsMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if origine := c.GetHeader("Origin"); originesAutorisees[origine] {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origine)
			c.Writer.Header().Set("Vary", "Origin")
		}
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
