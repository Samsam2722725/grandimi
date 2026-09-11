package main

import (
	"grandimi/internal/api"
	"grandimi/internal/db"
	"os"
	"time"

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
	// Chaque appel crée un compte et une prédiction en base : plafonné
	// pour qu'on ne puisse pas la remplir depuis une boucle.
	router.POST("/api/v2/predict-height", api.RateLimit(30, time.Hour), api.PredictHeightV2)

	/* Le plan de croissance et les guides sont ce que paie l'abonnement.
	   Servis en accès libre, ils s'obtenaient par un POST anonyme : le
	   produit facturé 9,99 €/mois était récupérable sans payer. */
	paye := router.Group("/api/v1")
	paye.Use(api.AuthMiddleware(), api.PremiumMiddleware())
	{
		paye.POST("/growth-plan", api.GetGrowthPlan)
		paye.GET("/exercise-guide", api.GetExerciseGuide)
		paye.GET("/nutrition-guide", api.GetNutritionGuide)
		paye.GET("/sleep-optimization", api.GetSleepOptimization)
	}

	/* Auth — débit limité : sans plafond, un mot de passe se teste en
	   force brute sur /login, et /signup permet de sonder quelles
	   adresses ont déjà un compte (le 409 les trahit). */
	auth := router.Group("/api/v1/auth")
	auth.Use(api.RateLimit(10, 15*time.Minute))
	{
		auth.POST("/signup", api.Signup)
		auth.POST("/login", api.Login)
	}

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
	// `localhost` et `127.0.0.1` sont deux ORIGINES DISTINCTES pour un
	// navigateur : autoriser l une sans l autre bloque le developpeur qui
	// ouvre l adresse que Vite affiche au demarrage. Aucune exposition
	// supplementaire, la boucle locale etait deja de confiance.
	"http://localhost:5173": true, // vite dev
	"http://127.0.0.1:5173": true,
	"http://localhost:4173": true, // vite preview
	"http://127.0.0.1:4173": true,
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
