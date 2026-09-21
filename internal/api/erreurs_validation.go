package api

import (
	"encoding/json"
	"errors"
	"fmt"
	"reflect"
	"strings"

	"github.com/gin-gonic/gin/binding"
	"github.com/go-playground/validator/v10"
)

/* LES ERREURS DE VALIDATION RENDUES EN FRANÇAIS, ET SANS FUITE.

   CE QUI SORTAIT AVANT. Sept routes rendaient err.Error() tel quel au
   client. Sur une taille hors bornes, POST /api/user/mesures répondait :

       Key: 'enregistrerMesureRequest.TailleCM' Error:Field validation
       for 'TailleCM' failed on the 'gt' tag

   Deux défauts, et le second est le plus sérieux. C'est illisible pour
   un adolescent de treize ans. Et ça publie le nom des structures
   internes et de leurs champs : une réponse d'API n'a pas à décrire la
   forme du code qui la produit — c'est la première chose que lit
   quelqu'un qui cherche par où entrer.

   CE QUI SORT MAINTENANT. Une phrase par champ fautif, en français, qui
   dit ce qu'il faut corriger :

       la taille doit être supérieure à 80

   POURQUOI PAS UNE SIMPLE PHRASE GÉNÉRIQUE. « Corps invalide » ne fuit
   rien non plus, et c'était la solution de deux routes déjà correctes.
   Mais à l'inscription, un mot de passe trop court et une adresse mal
   écrite deviennent alors le même message, et l'utilisateur essaie au
   hasard. Le champ fautif doit être nommé ; c'est son nom INTERNE qui ne
   doit pas l'être. */

/* Le validateur rend par défaut le nom du champ Go (TailleCM). On lui
   fait rendre le nom JSON (taille_cm) : c'est celui que le client a
   écrit dans sa requête, donc le seul qu'il puisse rapprocher de ce
   qu'il a envoyé. */
func init() {
	moteur, ok := binding.Validator.Engine().(*validator.Validate)
	if !ok {
		return
	}
	moteur.RegisterTagNameFunc(func(champ reflect.StructField) string {
		nom := strings.SplitN(champ.Tag.Get("json"), ",", 2)[0]
		if nom == "-" {
			return ""
		}
		return nom
	})
}

/* Libellés lisibles pour les champs qui atteignent vraiment un
   utilisateur. Un champ absent de cette table garde son nom JSON :
   moins joli, mais jamais faux, et jamais le nom Go. */
var libelleChamp = map[string]string{
	"email":      "l'adresse e-mail",
	"password":   "le mot de passe",
	"taille_cm":  "la taille",
	"mesuree_le": "la date de mesure",
	"poids_kg":   "le poids",
	"age":        "l'âge",
	"sexe":       "le sexe",
}

func libelle(champJSON string) string {
	if l, ok := libelleChamp[champJSON]; ok {
		return l
	}
	return champJSON
}

/* messageDeValidation traduit l'erreur de liaison en une phrase à
   montrer. Toute erreur qu'on ne sait pas nommer précisément retombe sur
   un message générique : mieux vaut être vague que fuir. */
func messageDeValidation(err error) string {
	var typeErr *json.UnmarshalTypeError
	if errors.As(err, &typeErr) {
		/* Pas de « le champ » devant : les libellés portent déjà leur
		   article (« la taille »), et le préfixe donnait « le champ la
		   taille n'a pas le bon type ». Un champ sans libellé garde son
		   nom JSON, qui se lit sans article. */
		return fmt.Sprintf("%s n'a pas le bon type", libelle(typeErr.Field))
	}

	var erreurs validator.ValidationErrors
	if !errors.As(err, &erreurs) {
		// JSON malformé, corps vide, guillemet manquant : rien à dire de
		// plus précis sans recopier l'analyseur.
		return "le corps de la requête n'est pas un JSON valide"
	}

	phrases := make([]string, 0, len(erreurs))
	for _, e := range erreurs {
		phrases = append(phrases, phrasePourChamp(e))
	}
	return strings.Join(phrases, " ; ")
}

func phrasePourChamp(e validator.FieldError) string {
	nom := libelle(e.Field())

	switch e.Tag() {
	case "required":
		return fmt.Sprintf("%s est obligatoire", nom)
	case "email":
		return "l'adresse e-mail n'est pas valide"
	case "min":
		if e.Kind() == reflect.String {
			return fmt.Sprintf("%s doit faire au moins %s caractères", nom, e.Param())
		}
		return fmt.Sprintf("%s doit valoir au moins %s", nom, e.Param())
	case "max":
		if e.Kind() == reflect.String {
			return fmt.Sprintf("%s ne doit pas dépasser %s caractères", nom, e.Param())
		}
		return fmt.Sprintf("%s ne doit pas dépasser %s", nom, e.Param())
	case "gt":
		return fmt.Sprintf("%s doit être supérieure à %s", nom, e.Param())
	case "gte":
		return fmt.Sprintf("%s doit être supérieure ou égale à %s", nom, e.Param())
	case "lt":
		return fmt.Sprintf("%s doit être inférieure à %s", nom, e.Param())
	case "lte":
		return fmt.Sprintf("%s doit être inférieure ou égale à %s", nom, e.Param())
	case "oneof":
		return fmt.Sprintf("%s doit valoir : %s", nom, strings.ReplaceAll(e.Param(), " ", ", "))
	default:
		/* Un tag qu'on n'a pas prévu. On nomme le champ sans citer le
		   tag : le nom du tag est un détail d'implémentation, et c'est
		   justement ce qu'on a cessé de publier. */
		return fmt.Sprintf("%s n'est pas valide", nom)
	}
}
