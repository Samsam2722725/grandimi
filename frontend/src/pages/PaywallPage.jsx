import { useRef, useState } from 'react'
import { ArrowLeft, Check, Lock } from 'lucide-react'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import '../styles/funnel.css'
/* Feuille dédiée, et non paywall.css : cette dernière habille encore
   ParentPage (page claire, destinée à un adulte arrivé par lien partagé) et
   partage des noms de classe avec elle. La remplacer cassait cet écran. */
import '../styles/paywall-night.css'

/* ============================================================
   FORMULES
   ============================================================
   Structure à deux offres, mais UNE SEULE affichée aujourd'hui.

   Le comparatif côte à côte (récurrent / paiement unique) est ce qui fait
   vendre chez les concurrents : le mensuel sert d'ancre, le paiement unique
   lève l'objection « encore un abonnement », qui est la vraie objection du
   parent — pas le montant.

   Mais le backend n'expose qu'un produit Whop (`productSlug` codé en dur dans
   whop_handlers.go). Afficher deux cartes qui mènent au même paiement serait
   exactement le genre de mensonge qu'on reproche à la concurrence. La seconde
   formule reste donc inactive tant que le produit n'existe pas : la bascule
   est `VITE_WHOP_ONETIME_ENABLED=true`, et `id` est envoyé au backend dès
   maintenant pour qu'il n'y ait rien à changer ici le jour venu.

   ⚠ NE PAS ACTIVER CE DRAPEAU AVANT QUE LE BACKEND LISE `plan`.
   Le serveur ignore ce champ aujourd'hui et sert toujours le produit mensuel :
   activer la bascule maintenant ferait souscrire un abonnement de 9,99 €/mois
   à quelqu'un qui a cliqué « 29,99 € une seule fois ». C'est une erreur de
   facturation, et sur des mineurs. Cf. BRIEF-BACKEND.md, point 1.
   ============================================================ */
const FORMULES = [
  {
    id: 'mensuel',
    nom: 'Plan mensuel',
    prix: '9,99',
    periode: '/mois',
    actif: true,
    avantages: [
      'Ton plan du mois : quoi faire chaque jour',
      'Sommeil, nutrition, exercices — les trois leviers, détaillés',
      'Suivi des progrès et re-mesure mensuelle',
      'Résiliable en ligne à tout moment',
    ],
  },
  {
    id: 'unique',
    nom: 'Accès complet',
    prix: '29,99',
    periode: 'une seule fois',
    badge: 'Sans abonnement',
    actif: import.meta.env.VITE_WHOP_ONETIME_ENABLED === 'true',
    avantages: [
      'Les 12 plans mensuels, débloqués',
      'Sommeil, nutrition, exercices — les trois leviers, détaillés',
      'Suivi des progrès et re-mesure mensuelle',
      'Payé une fois, rien à résilier',
    ],
  },
]

const FORMULES_ACTIVES = FORMULES.filter((formule) => formule.actif)

const PILIERS = [
  { emoji: '😴', titre: 'Sommeil', detail: 'Heures cibles, routine du soir' },
  { emoji: '🥗', titre: 'Nutrition', detail: 'Protéines, calcium, vitamine D' },
  { emoji: '🏃', titre: 'Exercices', detail: 'Étirements, sauts, posture' },
]

function PaywallPage({ onBackHome }) {
  const [email] = useState(() => localStorage.getItem('userEmail') || '')
  /* La formule retenue par défaut est la dernière de la liste active : quand
     le paiement unique arrivera, c'est lui qui sera présélectionné. Avec une
     seule formule, ça revient au comportement actuel. */
  const [formuleChoisie, setFormuleChoisie] = useState(
    () => FORMULES_ACTIVES[FORMULES_ACTIVES.length - 1].id,
  )
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [lienParentVisible, setLienParentVisible] = useState(false)
  const [lienCopie, setLienCopie] = useState(false)
  const blocParentRef = useRef(null)

  /* Lien à transmettre au parent. Il porte l'id du compte enfant pour que le
     webhook Whop crédite ce compte-là et non celui du payeur. L'id est écrit
     au moment de la prédiction (cf. App.jsx). */
  const idEnfant = (() => {
    try {
      return JSON.parse(localStorage.getItem('user') || '{}').id || ''
    } catch {
      return ''
    }
  })()
  const lienParent = idEnfant
    ? `${window.location.origin}/?parent=${encodeURIComponent(idEnfant)}`
    : ''

  const copierLien = async () => {
    try {
      await navigator.clipboard.writeText(lienParent)
      setLienCopie(true)
      setTimeout(() => setLienCopie(false), 2500)
    } catch {
      // Presse-papiers refusé (permission, http) : le champ reste
      // sélectionnable à la main, on n'affiche pas d'erreur bloquante.
      setLienCopie(false)
    }
  }

  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  const formule =
    FORMULES_ACTIVES.find((item) => item.id === formuleChoisie) || FORMULES_ACTIVES[0]

  /**
   * Redirige vers la page de paiement hébergée par Whop.
   *
   * Le frontend ne voit JAMAIS de données bancaires : c'est Whop qui les
   * collecte sur son propre domaine. Une version précédente affichait des
   * champs « numéro de carte » et « CVC » en clair — une violation PCI-DSS —
   * et validait le paiement avec un setTimeout de 2 s, ce qui offrait le
   * premium à quiconque cliquait.
   *
   * L'accès n'est PAS accordé ici : il l'est par le webhook Whop côté serveur,
   * après paiement réel.
   */
  const lancerPaiement = async () => {
    setErreur(null)
    setLoading(true)

    try {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}')
      const { checkout_url: checkoutURL } = await apiClient.createCheckout({
        email,
        userId: utilisateur.id,
        // Ignoré par le backend actuel, qui n'a qu'un produit. Envoyé dès
        // maintenant pour que l'ajout du second se fasse côté serveur seul.
        plan: formuleChoisie,
      })

      if (!checkoutURL) {
        throw new Error("Le serveur n'a pas renvoyé d'URL de paiement.")
      }

      localStorage.setItem('user', JSON.stringify({ ...utilisateur, email }))
      window.location.href = checkoutURL
    } catch (err) {
      setErreur(
        err.message || "Impossible d'ouvrir la page de paiement. Réessaie dans un instant.",
      )
      setLoading(false)
    }
  }

  return (
    <div className="night paywall">
      <header className="paywall-top">
        <button
          type="button"
          className="funnel-back"
          onClick={onBackHome}
          aria-label="Revenir en arrière"
        >
          <ArrowLeft size={20} aria-hidden="true" />
        </button>
      </header>

      <main className="paywall-scroll">
        <h1 className="paywall-title">Débloquer ton plan complet</h1>
        <p className="paywall-subtitle">
          Ton estimation reste gratuite, pour toujours. Seul le plan mensuel est payant.
        </p>

        {/* Carte d'offre : bordure accentuée et prix en display. C'est le seul
            élément coloré de la page — rien d'autre ne doit capter le regard ici. */}
        <div
          className={`paywall-offers ${FORMULES_ACTIVES.length > 1 ? 'is-multiple' : ''}`}
          role={FORMULES_ACTIVES.length > 1 ? 'radiogroup' : undefined}
          aria-label={FORMULES_ACTIVES.length > 1 ? 'Choix de la formule' : undefined}
        >
          {FORMULES_ACTIVES.map((item) => {
            const retenue = item.id === formule.id
            const multiple = FORMULES_ACTIVES.length > 1
            /* Avec une seule formule il n'y a rien à choisir : la carte est un
               bloc de texte, pas un bouton. Un radio isolé annonce « 1 sur 1 »
               au lecteur d'écran et laisse croire qu'une autre option existe. */
            const Balise = multiple ? 'button' : 'section'

            return (
              <Balise
                key={item.id}
                type={multiple ? 'button' : undefined}
                role={multiple ? 'radio' : undefined}
                aria-checked={multiple ? retenue : undefined}
                onClick={multiple ? () => setFormuleChoisie(item.id) : undefined}
                className={`paywall-offer ${retenue ? 'is-selected' : ''}`}
              >
                {item.badge && <span className="paywall-offer-badge">{item.badge}</span>}

                <div className="paywall-offer-head">
                  <h2>{item.nom}</h2>
                  <p className="paywall-price">
                    <span>{item.prix} €</span>
                    {item.periode}
                  </p>
                </div>

                <ul className="paywall-features">
                  {item.avantages.map((avantage) => (
                    <li key={avantage}>
                      <Check size={18} aria-hidden="true" />
                      <span>{avantage}</span>
                    </li>
                  ))}
                </ul>
              </Balise>
            )
          })}
        </div>

        <section className="paywall-pillars" aria-label="Ce que contient le plan">
          <h2 className="paywall-section-title">Voici ce que tu obtiens</h2>
          <div className="paywall-pillar-grid">
            {PILIERS.map((pilier) => (
              <div className="paywall-pillar" key={pilier.titre}>
                <span aria-hidden="true">{pilier.emoji}</span>
                <strong>{pilier.titre}</strong>
                <em>{pilier.detail}</em>
              </div>
            ))}
          </div>
        </section>

        {email && (
          <p className="paywall-account">
            Compte : <strong>{email}</strong>
            <br />
            C’est l’adresse du questionnaire — l’accès s’ouvrira sur ce compte.
          </p>
        )}

        {erreur && (
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
        )}

        {/* Un seul contrôle pour ce bloc : le bouton du pied de page. Deux
            boutons ouvrant la même chose, l'un en bas l'autre au milieu,
            c'était une commande de trop. */}
        {lienParent && (
          <section className="paywall-parent" ref={blocParentRef}>
            {lienParentVisible && (
              <div className="paywall-parent-body">
                <h2 className="paywall-section-title">Faire payer par un parent</h2>
                <p>
                  Envoie ce lien à ton parent. Il y trouvera l’explication, le prix et
                  la mention que Grandimi n’est pas un dispositif médical — et il pourra
                  régler depuis son e-mail. Ton accès s’ouvrira ici, sur ce compte.
                </p>
                <input
                  type="text"
                  readOnly
                  value={lienParent}
                  onFocus={(evenement) => evenement.target.select()}
                  aria-label="Lien à envoyer à un parent"
                />
                <button type="button" className="funnel-link" onClick={copierLien}>
                  {lienCopie ? '✓ Lien copié' : 'Copier le lien'}
                </button>
              </div>
            )}
          </section>
        )}

        <p className="paywall-security">
          <Lock size={15} aria-hidden="true" />
          Paiement traité par Whop. Grandimi ne voit ni ne stocke ta carte.
        </p>

        <section className="paywall-faq">
          <details>
            <summary>Puis-je annuler mon abonnement ?</summary>
            <p>
              Oui, en ligne et à tout moment, depuis ton espace Whop. L’accès reste
              actif jusqu’à la fin de la période déjà payée.
            </p>
          </details>
          <details>
            <summary>L’estimation est-elle vraiment gratuite ?</summary>
            <p>
              Oui. Le questionnaire et ton estimation de taille adulte le restent. Seul
              le plan personnalisé mensuel est payant.
            </p>
          </details>
          <details>
            <summary>Qui traite le paiement ?</summary>
            <p>
              Whop. Tu es redirigé vers sa page sécurisée : tes données bancaires ne
              passent jamais par Grandimi, et nous ne les stockons pas.
            </p>
          </details>
        </section>

        <p className="paywall-legal">
          En continuant, tu acceptes nos <a href="/cgv.html">conditions d’utilisation</a>{' '}
          et notre <a href="/privacy.html">politique de confidentialité</a>. Résiliable
          en ligne à tout moment.
        </p>
      </main>

      <footer className="funnel-footer">
        <button
          type="button"
          className="funnel-cta"
          onClick={lancerPaiement}
          disabled={!emailValide || loading}
        >
          {loading ? (
            <>
              <Spinner />
              Redirection…
            </>
          ) : (
            formule.id === 'mensuel'
              ? `S’abonner — ${formule.prix} €/mois`
              : `Payer ${formule.prix} € — une seule fois`
          )}
        </button>

        {/* Deuxième action de plein droit, pas un lien replié au milieu de la
            page. L'utilisateur type a 14 ans et pas de carte bancaire : lui
            faire chercher ce chemin, c'est le perdre. Contour et non aplat —
            la hiérarchie reste lisible. */}
        {lienParent && (
          <button
            type="button"
            className="paywall-parent-cta"
            onClick={() => {
              setLienParentVisible(true)
              blocParentRef.current?.scrollIntoView({
                behavior: 'smooth',
                block: 'center',
              })
            }}
          >
            Je n’ai pas de carte — faire payer par un parent
          </button>
        )}
      </footer>
    </div>
  )
}

export default PaywallPage
