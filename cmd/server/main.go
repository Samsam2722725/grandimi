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

	// V2 API (Khamis-Roche + percentile OMS + facteurs de mode de vie)
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

		/* L'accueil de l'application : mesure, verrou hebdomadaire, série
		   de connexions et les six piliers, en un seul appel. Ouvrir cet
		   écran EST la connexion du jour — la série n'a pas de bouton. */
		paye.GET("/dashboard", api.GetDashboard)
		paye.POST("/mesures", api.AjouterMesure)

		/* La séance du jour : six exercices tirés d'un cycle de sept
		   jours. Les exercices faits sont enregistrés dans
		   task_completions sous la clé « exercice-<slug> » — un exercice
		   fait EST une tâche faite, et une seconde table de complétion
		   aurait imposé deux compteurs à garder cohérents. */
		paye.GET("/exercices/jour", api.GetSeanceDuJour)
		paye.GET("/exercices/semaine", api.GetSemaineSeances)
		paye.POST("/exercices/valider", api.ValiderSeance)
		paye.POST("/exercices/basculer", api.BasculerExercice)

		/* Nutrition : quatre compteurs (énergie, protéines, calcium,
		   vitamine D), un journal, un catalogue d'aliments. Les
		   objectifs sont calculés depuis le poids du questionnaire puis
		   modifiables — 150 g de protéines pour tout le monde, ce qu'
		   affiche le concurrent, convient à quelqu'un de 110 kg. */
		paye.GET("/nutrition/jour", api.GetNutritionJour)
		paye.GET("/nutrition/aliments", api.GetAliments)
		paye.POST("/nutrition/repas", api.PostRepas)
		paye.DELETE("/nutrition/repas/:id", api.DeleteRepas)
		paye.PUT("/nutrition/objectifs", api.PutObjectifs)

		/* Sommeil. Les jours SANS saisie sont renvoyés tels quels, avec
		   un drapeau : une nuit non notée n'est pas une nuit de zéro
		   heure, et le graphe doit pouvoir faire la différence. */
		paye.GET("/sommeil/semaine", api.GetSemaineSommeil)
		paye.POST("/sommeil", api.PostSommeil)
		paye.DELETE("/sommeil", api.DeleteSommeil)

		// Todo-liste quotidienne : cocher/décocher une tâche du jour, lire
		// l'état du jour, et l'historique pour le calendrier de série.
		paye.POST("/tasks/toggle", api.ToggleTaskCompletion)
		paye.GET("/tasks/today", api.GetTodayCompletions)
		paye.GET("/tasks/history", api.GetTaskHistory)

		/* Les cinq reponses posees apres le paiement, qui donnent au
		   plan des heures reelles. Derriere abonnement comme le reste
		   du groupe : l ecran qui les demande n existe que pour
		   quelqu'un qui a paye. */
		paye.GET("/preferences", api.GetPreferencesPlan)
		paye.POST("/preferences", api.EnregistrerPreferencesPlan)
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
	/* Ces deux routes n'exigent pas de session, volontairement : elles
	   servent précisément à des appareils qui n'en ont pas encore une —
	   le payeur qui revient de Whop, et l'enfant qui découvre que
	   quelqu'un d'autre a payé pour lui depuis un autre appareil. */
	router.GET("/api/v1/checkout-status", api.GetCheckoutStatus)

	/* Rattache un paiement au compte qui l a fait, par l identifiant
	   que Whop met dans l URL de retour. Publique et sans session : a
	   cet instant le client vient de payer et n a pas encore de mot de
	   passe. C est l identifiant de paiement, connu du seul payeur et
	   utilisable une seule fois, qui fait autorite. */
	router.POST("/api/v1/checkout/reclamer", api.ReclamerPaiement)
	router.GET("/api/v1/child-status", api.GetChildStatus)
	/* Désinscription des e-mails. Publique et sans session, par
	   construction : le lien est ouvert depuis le pied d'un e-mail, par
	   quelqu'un qui n'a pas de session et souvent pas de mot de passe.
	   C'est le jeton signé porté par le lien qui fait autorité. */
	router.GET("/api/v1/emails/desinscription", api.Desinscription)

	// Le webhook n'est pas protégé par session mais par signature Whop.
	router.POST("/webhooks/whop", api.WhopWebhook)

	/* Tarifs publics : lus par la paywall, le lien parent et "Mon compte"
	   pour ne jamais afficher un montant différent de celui réellement
	   envoyé à Whop. */
	router.GET("/api/v1/plans", api.GetPlans)

	/* Mesure du tunnel : une ligne par ecran vu, pour savoir OU les
	   visiteurs s arretent. Publique et sans session par construction
	   (celui qu on mesure n a pas encore de compte), et sans effet de
	   bord : elle n ecrit que dans evenements_tunnel.

	   600 par heure et par IP : un questionnaire complet en emet une
	   vingtaine, donc la marge est large. Elle reste large a dessein,
	   parce qu'un operateur mobile fait passer beaucoup d abonnes par
	   la meme adresse : une limite serree couperait de vrais visiteurs
	   avant de gener qui que ce soit. */
	router.POST("/api/v1/tunnel", api.RateLimit(600, time.Hour), api.EnregistrerEtapeTunnel)

	/* La page qui lit cette mesure, sans passer par Supabase dont la
	   session expire sans arret. Publique parce qu elle ne contient
	   aucun chiffre : un champ qui demande ADMIN_TOKEN, et c est tout.
	   Les chiffres, eux, sont dans le groupe admin plus bas.
	   Voir internal/api/tunnel_rapport.go. */
	router.GET("/api/v1/tunnel/rapport", api.PageRapportTunnel)

	/* Routes portant des données personnelles : session obligatoire.
	   Elles répondaient auparavant à un ?user_id= ou ?email= arbitraire,
	   sans authentification. */
	prive := router.Group("/")
	prive.Use(api.AuthMiddleware())
	{
		prive.GET("/api/v1/check-premium", api.CheckPremium)
		prive.GET("/api/user/predictions", api.GetPredictionsByEmail)

		// "Mon compte -> Abonnement" : offre en cours, prochaine date de
		// paiement, bouton de résiliation.
		prive.GET("/api/v1/subscription", api.GetSubscription)
		prive.POST("/api/v1/subscription/cancel", api.CancelSubscription)
	}

	// Admin Panel (protected by ADMIN_TOKEN)
	admin := router.Group("/api/admin")
	admin.Use(api.AdminAuthMiddleware())
	{
		admin.GET("/stats", api.AdminStats)

		// Ou les visiteurs s arretent, ecran par ecran. Lue par la
		// page /api/v1/tunnel/rapport.
		admin.GET("/tunnel", api.RapportTunnelJSON)
		admin.GET("/users", api.AdminUsers)
		admin.GET("/subscriptions", api.AdminSubscriptions)
		admin.GET("/webhooks", api.AdminWebhookLogs)
		admin.GET("/user/:id", api.UserDetail)
		admin.POST("/user/grant-premium", api.AdminGrantPremium)
		admin.POST("/user/revoke-premium", api.AdminRevokePremium)
		admin.DELETE("/user/:id", api.AdminDeleteUser)
		admin.POST("/webhook/simulate", api.AdminWebhookSimulator)

		/* Relance à un mois. Déclenchée une fois par jour depuis GitHub
		   Actions plutôt que par une minuterie interne : sur l'offre
		   gratuite Render l'instance s'endort au bout d'un quart d'heure
		   sans trafic, et un ticker ne tournerait donc jamais la nuit.
		   Rejouable sans risque de doublon (cf. email_handlers.go). */
		admin.POST("/relances/j30", api.LancerRelancesJ30)
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
