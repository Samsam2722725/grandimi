package api

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"errors"
	"fmt"
	"grandimi/internal/db"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

// Durée de validité d'un token de session.
const dureeToken = 30 * 24 * time.Hour

var (
	ErrTokenInvalide = errors.New("token invalide")
	ErrTokenExpire   = errors.New("token expiré")
	ErrSecretAbsent  = errors.New("AUTH_SECRET n'est pas configuré")
)

// HashPassword hache un mot de passe avec bcrypt.
//
// L'implémentation précédente faisait sha256(motdepasse + sel global
// constant) : un hachage rapide, sans sel par utilisateur, donc
// attaquable par table précalculée et testable à des milliards
// d'essais par seconde sur GPU. bcrypt est lent par construction et
// tire un sel propre à chaque mot de passe.
func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

// VerifyPassword compare un mot de passe en clair à son hash bcrypt.
func VerifyPassword(password, hash string) bool {
	if hash == "" {
		return false
	}
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(password)) == nil
}

// secretAuth renvoie la clé de signature des tokens.
//
// FAIL-CLOSED : sans secret configuré on refuse d'émettre comme de
// valider. Un secret absent est une erreur de déploiement, pas une
// autorisation d'ouvrir les sessions à tout le monde.
func secretAuth() ([]byte, error) {
	secret := os.Getenv("AUTH_SECRET")
	if len(secret) < 32 {
		return nil, ErrSecretAbsent
	}
	return []byte(secret), nil
}

func signature(secret []byte, message string) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(message))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

// GenerateToken émet un token de session signé pour un utilisateur.
//
// L'ancienne version renvoyait sha256(userID + "_" + GetTimestamp()),
// où GetTimestamp() retournait constamment 0 : le token était donc une
// fonction pure de l'identifiant, calculable par quiconque connaissait
// cet identifiant — lequel circule désormais dans le lien de paiement
// partagé au parent. Il n'était de toute façon vérifié nulle part.
func GenerateToken(userID string) (string, error) {
	secret, err := secretAuth()
	if err != nil {
		return "", err
	}
	expiration := strconv.FormatInt(time.Now().Add(dureeToken).Unix(), 10)
	message := userID + "." + expiration
	return message + "." + signature(secret, message), nil
}

// ParseToken valide un token et renvoie l'identifiant qu'il porte.
func ParseToken(token string) (string, error) {
	secret, err := secretAuth()
	if err != nil {
		return "", err
	}

	morceaux := strings.Split(token, ".")
	if len(morceaux) != 3 {
		return "", ErrTokenInvalide
	}
	userID, expiration, recue := morceaux[0], morceaux[1], morceaux[2]

	// Comparaison à temps constant : un == classique s'arrête au premier
	// octet différent et laisse fuir la signature attendue octet par octet.
	attendue := signature(secret, userID+"."+expiration)
	if !hmac.Equal([]byte(recue), []byte(attendue)) {
		return "", ErrTokenInvalide
	}

	instant, err := strconv.ParseInt(expiration, 10, 64)
	if err != nil {
		return "", ErrTokenInvalide
	}
	if time.Now().Unix() > instant {
		return "", ErrTokenExpire
	}
	if userID == "" {
		return "", ErrTokenInvalide
	}
	return userID, nil
}

// journaliserSecretManquant trace une seule fois la cause réelle d'un
// 401 généralisé, sinon indiscernable d'un mauvais mot de passe.
func journaliserSecretManquant(contexte string, err error) {
	if errors.Is(err, ErrSecretAbsent) {
		fmt.Printf("[auth] %s: AUTH_SECRET absent ou trop court (32 caractères minimum)\n", contexte)
	}
}

// AuthMiddleware exige une session valide et publie l'identifiant de
// l'appelant dans le contexte, sous la clé "userID".
//
// Les routes qui exposent des données personnelles s'en servent pour
// répondre sur le compte AUTHENTIFIÉ, jamais sur un identifiant fourni
// dans l'URL : c'est ce qui manquait, et n'importe qui pouvait lire les
// mesures d'un enfant en connaissant simplement son adresse e-mail.
func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		entete := c.GetHeader("Authorization")
		if !strings.HasPrefix(entete, "Bearer ") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "authentification requise"})
			c.Abort()
			return
		}

		userID, err := ParseToken(strings.TrimPrefix(entete, "Bearer "))
		if err != nil {
			journaliserSecretManquant("AuthMiddleware", err)
			c.JSON(http.StatusUnauthorized, gin.H{"error": "session invalide ou expirée"})
			c.Abort()
			return
		}

		c.Set("userID", userID)
		c.Next()
	}
}

// PremiumMiddleware protège ce qui est vendu. À monter derrière
// AuthMiddleware, qui pose l'identifiant de l'appelant.
//
// Sans lui, le plan de croissance facturé 9,99 €/mois s'obtenait par un
// simple POST anonyme sur /api/v1/growth-plan.
func PremiumMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		user, err := db.GetUserByID(c.GetString("userID"))
		if err != nil {
			fmt.Printf("[premium] GetUserByID: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "statut d'abonnement illisible"})
			c.Abort()
			return
		}

		if user == nil || !user.IsPremium {
			c.JSON(http.StatusPaymentRequired, gin.H{"error": "abonnement requis"})
			c.Abort()
			return
		}

		c.Next()
	}
}
