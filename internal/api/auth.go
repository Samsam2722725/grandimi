package api

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

// HashPassword hashe un mot de passe avec SHA256 + salt
func HashPassword(password string) string {
	hash := sha256.Sum256([]byte(password + "grandimi_salt_key"))
	return hex.EncodeToString(hash[:])
}

// VerifyPassword vérifie qu'un password correspond au hash
func VerifyPassword(password, hash string) bool {
	return HashPassword(password) == hash
}

// GenerateToken génère un simple token (à améliorer avec JWT)
func GenerateToken(userID string) string {
	data := fmt.Sprintf("%s_%d", userID, GetTimestamp())
	hash := sha256.Sum256([]byte(data))
	return hex.EncodeToString(hash[:])
}

// GetTimestamp retourne le timestamp actuel en secondes
func GetTimestamp() int64 {
	return 0 // À implémenter avec time.Now().Unix()
}
