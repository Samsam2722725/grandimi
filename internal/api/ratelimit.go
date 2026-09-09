package api

import (
	"net/http"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

/* Limitation de débit par IP, en mémoire.

   Le service tourne sur une instance unique (Render free), donc un
   compteur en mémoire suffit et évite d'ajouter Redis pour un MVP.
   Si le service passe un jour à plusieurs instances, chaque instance
   aura son propre compteur : la limite effective sera multipliée par
   leur nombre, et il faudra alors un compteur partagé.

   Sans ce garde-fou, /auth/login acceptait un nombre illimité de
   tentatives : un mot de passe se testait en force brute, et
   /auth/signup permettait de sonder quelles adresses ont déjà un
   compte (la réponse 409 les distingue). */

type fenetreIP struct {
	debut  time.Time
	nombre int
}

type limiteur struct {
	mu      sync.Mutex
	vues    map[string]*fenetreIP
	max     int
	fenetre time.Duration
	purge   time.Time
}

// autorise incrémente le compteur de l'IP et dit si la requête passe.
func (l *limiteur) autorise(ip string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	maintenant := time.Now()

	/* Purge opportuniste : sans elle, la map grossit d'une entrée par IP
	   vue et ne rétrécit jamais — une fuite mémoire lente sur un service
	   qui tourne en continu. */
	if maintenant.Sub(l.purge) > l.fenetre {
		for ip, vue := range l.vues {
			if maintenant.Sub(vue.debut) > l.fenetre {
				delete(l.vues, ip)
			}
		}
		l.purge = maintenant
	}

	vue, connue := l.vues[ip]
	if !connue || maintenant.Sub(vue.debut) > l.fenetre {
		l.vues[ip] = &fenetreIP{debut: maintenant, nombre: 1}
		return true
	}

	vue.nombre++
	return vue.nombre <= l.max
}

// RateLimit limite chaque IP à `max` requêtes par `fenetre`.
func RateLimit(max int, fenetre time.Duration) gin.HandlerFunc {
	l := &limiteur{
		vues:    make(map[string]*fenetreIP),
		max:     max,
		fenetre: fenetre,
		purge:   time.Now(),
	}

	return func(c *gin.Context) {
		// ClientIP tient compte de X-Forwarded-For, que Render renseigne.
		if !l.autorise(c.ClientIP()) {
			c.JSON(http.StatusTooManyRequests, gin.H{
				"error": "trop de tentatives, réessayez dans quelques minutes",
			})
			c.Abort()
			return
		}
		c.Next()
	}
}
