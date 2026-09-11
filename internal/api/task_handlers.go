package api

import (
	"net/http"
	"strconv"
	"time"

	"grandimi/internal/db"

	"github.com/gin-gonic/gin"
)

type ToggleTaskRequest struct {
	TaskKey string `json:"task_key" binding:"required"`
	// Format YYYY-MM-DD. Vide = aujourd'hui. On garde ce champ ouvert (au
	// lieu de forcer "aujourd'hui" côté serveur) pour permettre à un
	// utilisateur de rattraper une case oubliée la veille.
	Date string `json:"date"`
}

func resoudreDateTache(brut string) string {
	if brut == "" {
		return time.Now().Format("2006-01-02")
	}
	return brut
}

// ToggleTaskCompletion coche/décoche une tâche du jour pour l'utilisateur
// connecté. Protégé par AuthMiddleware + PremiumMiddleware : la todo-liste
// quotidienne fait partie du plan payant.
func ToggleTaskCompletion(c *gin.Context) {
	userID := c.GetString("userID")

	var req ToggleTaskRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	date := resoudreDateTache(req.Date)

	fait, err := db.ToggleTask(userID, date, req.TaskKey)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to update task"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"task_key": req.TaskKey, "date": date, "completed": fait})
}

// GetTodayCompletions renvoie les clés déjà cochées pour une date (aujourd'hui
// par défaut). Le libellé et le "pourquoi" de chaque tâche viennent de
// /api/v1/growth-plan ; cet endpoint ne renvoie que l'état coché/pas coché,
// à fusionner côté front avec la liste du plan du mois.
func GetTodayCompletions(c *gin.Context) {
	userID := c.GetString("userID")
	date := resoudreDateTache(c.Query("date"))

	fait, err := db.GetCompletionsForDate(userID, date)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load tasks"})
		return
	}

	cles := make([]string, 0, len(fait))
	for k := range fait {
		cles = append(cles, k)
	}

	c.JSON(http.StatusOK, gin.H{"date": date, "completed_keys": cles})
}

// GetTaskHistory renvoie le nombre de tâches cochées par jour sur les N
// derniers jours (30 par défaut, 365 max), pour le calendrier de série du
// dashboard.
func GetTaskHistory(c *gin.Context) {
	userID := c.GetString("userID")

	jours := 30
	if v := c.Query("days"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 365 {
			jours = n
		}
	}

	historique, err := db.GetHistory(userID, jours)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to load history"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"days": jours, "history": historique})
}
