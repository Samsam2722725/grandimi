package api

import (
	"crypto/hmac"
	"encoding/json"
	"fmt"
	"grandimi/internal/db"
	"io"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
)

// AdminAuthMiddleware verifies ADMIN_TOKEN
func AdminAuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		expectedToken := os.Getenv("ADMIN_TOKEN")

		/* Le Printf de débogage qui se trouvait ici écrivait ADMIN_TOKEN
		   en clair dans les logs Render à chaque requête admin : le secret
		   se lisait dans l'historique de la console. */

		if expectedToken == "" ||
			!hmac.Equal([]byte(token), []byte("Bearer "+expectedToken)) {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid or missing admin token"})
			c.Abort()
			return
		}

		c.Next()
	}
}

// AdminStats returns dashboard statistics
func AdminStats(c *gin.Context) {
	stats, err := db.GetAdminStats()
	if err != nil {
		fmt.Printf("[admin] GetAdminStats: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get stats"})
		return
	}

	c.JSON(http.StatusOK, stats)
}

// AdminUsers returns all users
func AdminUsers(c *gin.Context) {
	users, err := db.ListAllUsers()
	if err != nil {
		fmt.Printf("[admin] ListAllUsers: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list users"})
		return
	}

	if users == nil {
		users = []db.User{}
	}

	c.JSON(http.StatusOK, gin.H{"users": users})
}

// AdminSubscriptions returns all subscriptions
func AdminSubscriptions(c *gin.Context) {
	subs, err := db.ListAllSubscriptions()
	if err != nil {
		fmt.Printf("[admin] ListAllSubscriptions: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to list subscriptions"})
		return
	}

	if subs == nil {
		subs = []db.Subscription{}
	}

	c.JSON(http.StatusOK, gin.H{"subscriptions": subs})
}

// AdminWebhookLogs returns webhook audit trail
func AdminWebhookLogs(c *gin.Context) {
	logs, err := db.GetWebhookLogs()
	if err != nil {
		fmt.Printf("[admin] GetWebhookLogs: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get webhook logs"})
		return
	}

	if logs == nil {
		logs = []db.WebhookLog{}
	}

	c.JSON(http.StatusOK, gin.H{"webhooks": logs})
}

// UserDetail returns detailed info about one user + predictions
func UserDetail(c *gin.Context) {
	userID := c.Param("id")

	user, err := db.GetUserByID(userID)
	if err != nil {
		fmt.Printf("[admin] GetUserByID(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to get user"})
		return
	}

	if user == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	predictions, err := db.GetUserPredictions(userID)
	if err != nil {
		fmt.Printf("[admin] GetUserPredictions(%s): %v\n", userID, err)
		predictions = []db.Prediction{}
	}

	if predictions == nil {
		predictions = []db.Prediction{}
	}

	c.JSON(http.StatusOK, gin.H{
		"user":        user,
		"predictions": predictions,
	})
}

// GrantPremiumRequest grants premium to a user
type GrantPremiumRequest struct {
	UserID string `json:"user_id"`
}

// AdminGrantPremium gives premium status
func AdminGrantPremium(c *gin.Context) {
	var req GrantPremiumRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id required"})
		return
	}

	err := db.GrantPremium(req.UserID)
	if err != nil {
		fmt.Printf("[admin] GrantPremium(%s): %v\n", req.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to grant premium"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "premium granted"})
}

// AdminRevokePremium removes premium status
func AdminRevokePremium(c *gin.Context) {
	var req GrantPremiumRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.UserID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "user_id required"})
		return
	}

	err := db.RevokePremium(req.UserID)
	if err != nil {
		fmt.Printf("[admin] RevokePremium(%s): %v\n", req.UserID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to revoke premium"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "premium revoked"})
}

// AdminDeleteUser removes a user (for test cleanup)
func AdminDeleteUser(c *gin.Context) {
	userID := c.Param("id")

	err := db.DeleteUser(userID)
	if err != nil {
		fmt.Printf("[admin] DeleteUser(%s): %v\n", userID, err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to delete user"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"status": "success", "message": "user deleted"})
}

// WebhookSimulatorRequest simulates a webhook from stored webhook log
type WebhookSimulatorRequest struct {
	WebhookLogID string `json:"webhook_log_id"`
}

// AdminWebhookSimulator replays a webhook from logs (for testing)
func AdminWebhookSimulator(c *gin.Context) {
	var req WebhookSimulatorRequest
	if err := c.BindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid request"})
		return
	}

	if req.WebhookLogID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "webhook_log_id required"})
		return
	}

	// Get the webhook log from DB
	logs, err := db.GetWebhookLogs()
	if err != nil {
		fmt.Printf("[admin] GetWebhookLogs for simulation: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "failed to fetch webhook logs"})
		return
	}

	var targetLog *db.WebhookLog
	for i := range logs {
		if logs[i].ID == req.WebhookLogID {
			targetLog = &logs[i]
			break
		}
	}

	if targetLog == nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "webhook log not found"})
		return
	}

	// Parse the payload
	var payload map[string]interface{}
	if err := json.Unmarshal([]byte(targetLog.Payload), &payload); err != nil {
		fmt.Printf("[admin] Failed to unmarshal webhook payload: %v\n", err)
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid webhook payload"})
		return
	}

	// Simulate: call WhopWebhook with the stored data
	// We'll create a fake request context
	fakeReq, _ := http.NewRequest("POST", "/webhooks/whop", io.NopCloser(io.Reader(nil)))
	fakeReq.Header.Set("webhook-id", "sim_"+req.WebhookLogID)
	fakeReq.Header.Set("webhook-timestamp", "0")
	fakeReq.Header.Set("webhook-signature", "")

	// Just report back what we found
	c.JSON(http.StatusOK, gin.H{
		"status":  "simulated",
		"webhook": targetLog,
		"note":    "webhook data retrieved; run WhopWebhook handler separately to test",
	})
}
