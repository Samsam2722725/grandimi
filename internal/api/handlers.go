package api

import (
	"fmt"
	"grandimi/internal/db"
	"grandimi/internal/estimator"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

type PredictHeightRequest struct {
	Age            float64 `json:"age" binding:"required,gte=8,lte=22"`
	Sex            string  `json:"sex" binding:"required,oneof=M F"`
	HeightCM       float64 `json:"height_cm" binding:"required,gt=100,lt=210"`
	WeightKG       float64 `json:"weight_kg" binding:"required,gt=15,lte=200"`
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
	Age                float64 `json:"age" binding:"required,gte=8,lte=22"`
	Sex                string  `json:"sex" binding:"required,oneof=M F"`
	HeightCM           float64 `json:"height_cm" binding:"required,gt=100,lt=210"`
	WeightKG           float64 `json:"weight_kg" binding:"required,gt=15,lte=200"`
	FatherHeightCM     float64 `json:"father_height_cm" binding:"required,gt=140,lt=220"`
	MotherHeightCM     float64 `json:"mother_height_cm" binding:"required,gt=140,lt=210"`
	BMI                float64 `json:"bmi"`                      // Optional, calculated if not provided
	HeightVelocityCM   float64 `json:"height_velocity_cm"`       // cm/year
	// Pointure europeenne, aujourd'hui et il y a un an. Facultatives :
	// c'est la VARIATION qui porte le signal de maturite, et une absence
	// reste strictement neutre (cf. internal/estimator/maturite.go).
	ShoeSizeEU         float64 `json:"shoe_size_eu"`
	ShoeSizeEU1Y       float64 `json:"shoe_size_eu_1y"`
	// Filles de 15 ans et plus uniquement (filtre cote questionnaire).
	MenarcheSurvenue   bool    `json:"menarche_survenue"`
	AgeMenarcheAnnees  float64 `json:"age_menarche_annees"`
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
			"error": messageDeValidation(err),
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
		/* Vide dans le cas ordinaire. Rempli quand la taille saisie sort
		   des courbes de reference : le chiffre rendu ne vaut alors pas
		   les autres, et les deux routes doivent le dire pareil. */
		"warning":       result.Avertissement,
		"out_of_domain": result.HorsDomaine,
		// Le meme libelle que la v2 : les deux routes tournent sur le meme
		// moteur, et annoncer deux methodes differentes pour un chiffre
		// identique serait un mensonge de plus a corriger un jour.
		"model":            "Khamis-Roche + suivi de percentile OMS",
	})
}

// V2 API - Khamis-Roche moyenne avec le suivi de percentile OMS,
// ajuste par les facteurs de mode de vie
func PredictHeightV2(c *gin.Context) {
	var req PredictHeightV2Request

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": messageDeValidation(err),
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
		ShoeSizeEU:       req.ShoeSizeEU,
		ShoeSizeEU1Y:     req.ShoeSizeEU1Y,
		MenarcheSurvenue:  req.MenarcheSurvenue,
		AgeMenarcheAnnees: req.AgeMenarcheAnnees,
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
		// Estimation si les trois leviers de mode de vie etaient a la cible.
		// L ecart avec predicted_height_cm est ce que le plan vise — chiffre
		// par le meme modele que l estimation, pas par le marketing.
		"potential_height_cm": result.PotentialHeightCM,
		// Rang parmi les jeunes du meme age et du meme sexe, tables OMS.
		"percentile_age":      result.PercentileAge,
		"confidence_range": gin.H{
			"min": result.ConfidenceRange[0],
			"max": result.ConfidenceRange[1],
		},
		"confidence_level": result.ConfidenceLevel,
		/* La marge en centimetres, a cote du mot. Sur trente jours de
		   production, "confidence_level" vaut "low" dans 93,2 % des cas —
		   ce qui est vrai, pas casse : sans la croissance de l annee
		   declaree, l incertitude est genuinement d environ 7 cm. Le mot
		   resume mal ce que le nombre dit exactement. */
		"margin_cm":        result.MargeCM,
		/* Vide dans le cas ordinaire. Rempli quand la taille saisie sort
		   des courbes de reference : l estimation reste affichee, mais
		   accompagnee de ce qu elle vaut reellement. */
		"warning":          result.Avertissement,
		"out_of_domain":    result.HorsDomaine,
		"puberty_stage":    result.PubertyStage,
		"model_used":       result.ModelUsed,
		"message":          result.Message,
		"factors":          result.Factors,
	})
}

// SignupRequest - Create account with email and password
type SignupRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required,min=8"`
}

// Signup creates a new user account with password
func Signup(c *gin.Context) {
	var req SignupRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messageDeValidation(err)})
		return
	}

	user, err := db.GetUserByEmail(req.Email)
	if err != nil {
		fmt.Printf("[signup] GetUserByEmail(%q): %v\n", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
		return
	}

	/* Un compte déjà protégé par un mot de passe n'est jamais réécrit.
	   Auparavant Signup posait le mot de passe sans rien vérifier : comme
	   le questionnaire crée un compte pour chaque adresse saisie, il
	   suffisait de « s'inscrire » avec l'adresse d'un tiers pour prendre
	   son compte, abonnement compris. */
	if user != nil {
		hashExistant, err := db.GetUserPassword(user.ID)
		if err != nil {
			fmt.Printf("[signup] GetUserPassword(%s): %v\n", user.ID, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}
		if hashExistant != "" {
			c.JSON(http.StatusConflict, gin.H{"error": "un compte existe déjà pour cette adresse"})
			return
		}
	} else {
		user, err = db.GetOrCreateUser(req.Email)
		if err != nil {
			fmt.Printf("[signup] GetOrCreateUser(%q): %v\n", req.Email, err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to create user"})
			return
		}
	}

	passwordHash, err := HashPassword(req.Password)
	if err != nil {
		fmt.Printf("[signup] HashPassword: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set password"})
		return
	}

	if err := db.UpdateUserPassword(user.ID, passwordHash); err != nil {
		fmt.Printf("[signup] UpdateUserPassword(%s): %v\n", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to set password"})
		return
	}

	token, err := GenerateToken(user.ID)
	if err != nil {
		journaliserSecretManquant("signup", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
		},
		"token": token,
	})
}

// LoginRequest - Login with email and password
type LoginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login authenticates user with email and password
func Login(c *gin.Context) {
	var req LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": messageDeValidation(err)})
		return
	}

	/* Recherche stricte : GetOrCreateUser créait un compte à chaque
	   tentative sur une adresse inconnue. */
	user, err := db.GetUserByEmail(req.Email)
	if err != nil {
		fmt.Printf("[login] GetUserByEmail(%q): %v\n", req.Email, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur interne"})
		return
	}
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	hashEnregistre, err := db.GetUserPassword(user.ID)
	if err != nil {
		fmt.Printf("[login] GetUserPassword(%s): %v\n", user.ID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "erreur interne"})
		return
	}

	if !VerifyPassword(req.Password, hashEnregistre) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}

	token, err := GenerateToken(user.ID)
	if err != nil {
		journaliserSecretManquant("login", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to open session"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":    user.ID,
			"email": user.Email,
		},
		"token": token,
	})
}

// GetPredictionsByEmail récupère les prédictions d'un utilisateur par email
func GetPredictionsByEmail(c *gin.Context) {
	/* L'identifiant vient de la session, jamais de la requête.
	   Cette route acceptait un ?email= arbitraire et renvoyait, sans
	   aucune authentification, l'âge, le sexe, la taille et le poids de
	   l'enfant ainsi que la taille de ses deux parents. */
	userID := c.GetString("userID")

	predictions, err := db.GetUserPredictions(userID)
	if err != nil {
		fmt.Printf("[predictions] GetUserPredictions(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get predictions"})
		return
	}

	if predictions == nil {
		predictions = []db.Prediction{}
	}

	c.JSON(http.StatusOK, predictions)
}

func HealthCheck(c *gin.Context) {
	/* Le commit déployé : sans lui, rien ne permet de savoir si un
	   correctif pousse sur main tourne vraiment en production — Render
	   garde la version précédente en ligne quand un build échoue, donc
	   l'API répond "ok" avec l'ancien code et l'échec passe inaperçu.
	   RENDER_GIT_COMMIT est fourni par Render ; hors Render la variable
	   est absente et le champ vaut "inconnu". */
	commit := os.Getenv("RENDER_GIT_COMMIT")
	if commit == "" {
		commit = "inconnu"
	}
	if len(commit) > 7 {
		commit = commit[:7]
	}

	c.JSON(http.StatusOK, gin.H{
		"status": "ok",
		"app":    "Grandimi Height Estimator API",
		"models": []string{"v1 et v2 : Khamis-Roche + suivi de percentile OMS + facteurs de mode de vie"},
		"commit": commit,
	})
}
