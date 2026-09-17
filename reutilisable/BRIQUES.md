# Ce qui est repompable tel quel

Inventaire du code de Grandimi qui a été **débogué en production** et qui
ne dépend pas du produit. Copier plutôt que réécrire.

Légende : 🟢 générique · 🟡 à adapter · 🔴 spécifique Grandimi

---

## Backend Go

| Fichier | Ce qu'il fait | |
|---|---|---|
| `internal/api/whop_handlers.go` | Vérification de signature Standard Webhooks, fail-closed. La version d'origine lisait un en-tête inexistant et aurait rejeté 100 % des webhooks réels. | 🟢 |
| `internal/db/paiements.go` | **La brique la plus chère.** Rattachement paiement↔compte par `payment_id`, réservation atomique, réclamation unique, libération de l'index UNIQUE. | 🟢 |
| `internal/api/paiement_handlers.go` | Route publique de réclamation, avec l'état `pending` quand le webhook n'est pas encore arrivé. | 🟢 |
| `internal/api/ratelimit.go` | Limiteur par IP en mémoire, avec purge opportuniste (sans elle, fuite mémoire lente). | 🟢 |
| `internal/api/auth.go` | Session, middlewares `Auth` et `Premium`. | 🟡 |
| `internal/db/supabase.go` | Connexion directe via `DATABASE_URL`. Ne PAS reconstruire l'hôte depuis `SUPABASE_URL` : les deux clés Supabase servent au SDK REST, pas à psql. | 🟢 |
| `internal/api/tunnel_handlers.go` + `internal/db/tunnel.go` | Mesure du tunnel écrite dans SA PROPRE base : liste fermée d'événements, corps plafonné, champs tronqués par runes, réponse toujours 204. | 🟢 |
| `internal/api/preferences_handlers.go` | Réglages posés après paiement. Montre le piège du pointeur : sans lui, `0` (minuit) est indistinguable d'un champ absent. | 🟡 |

## Base de données

| | | |
|---|---|---|
| `migrations/00*.sql` | Le modèle : `IF NOT EXISTS`, commentaire qui explique POURQUOI, `ENABLE ROW LEVEL SECURITY` sans politique, requête de vérification à la fin. | 🟢 |
| `migrations/lire_le_tunnel.sql` | Requêtes prêtes pour lire l'entonnoir (courbe de décrochage, tunnel complet, boutons d'entrée). | 🟡 |

## CI

| | | |
|---|---|---|
| `.github/workflows/verifier-le-backend.yml` | Compile, `go vet`, tests, **et remonte les échecs en annotations** — les journaux d'un dépôt public ne se lisent qu'une fois connecté, les annotations non. | 🟢 |
| `.github/workflows/verifier-le-site.yml` | Vérification du front. | 🟡 |

## Front

| | | |
|---|---|---|
| `components/ui/funnel-shell.jsx` | Cadre de tunnel : barre de progression, retour, pied collant. | 🟢 |
| `components/ui/wheel-picker.jsx` | Molette. Gère la dérive en virgule flottante des pas fractionnaires. | 🟢 |
| `components/ui/choice-card.jsx` | Carte de choix, `radio` ou `checkbox` selon le cas. | 🟢 |
| `pages/PlanSetupPage.jsx` | Modèle d'un questionnaire court post-paiement bâti sur les trois briques ci-dessus. | 🟡 |
| `lib/analytics.js` | Registre d'événements **écrit à un seul endroit** : un nom retapé ailleurs crée un second événement qui ressemble au premier sans s'agréger. Double envoi tiers + base propre. | 🟢 |
| `styles/funnel.css` + `paywall-night.css` | Jetons `--funnel-*` et thème sombre du tunnel. | 🟡 |

## Outillage

| | | |
|---|---|---|
| `patch.js` (scratchpad) | Remplacement exact qui **préserve les fins de ligne** et refuse un motif absent ou ambigu. Indispensable quand front CRLF et Go LF cohabitent. | 🟢 |
| `servir-docs.js` | Sert le dossier publié tel quel, pour vérifier l'artefact réellement déployé et non le serveur de dev. | 🟢 |
| `equilibre.js` | Compte les délimiteurs d'un fichier Go — filet quand il n'y a pas de compilateur local. | 🟢 |

---

## Ce qui ne se recopie PAS

`internal/estimator/` et `internal/planner/` sont le produit lui-même.
`pages/HomePage.jsx`, `ResultsPage.jsx`, `ParentPage.jsx` portent le
discours de Grandimi — leur **structure** est réutilisable, leur texte non.
