import { useState } from 'react'
import { ArrowLeft, Check, Lock } from 'lucide-react'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import '../styles/funnel.css'
/* Feuille dédiée, et non paywall.css : cette dernière habille encore
   ParentPage (page claire, destinée à un adulte arrivé par lien partagé) et
   partage des noms de classe avec elle. La remplacer cassait cet écran. */
import '../styles/paywall-night.css'

/* Formule unique à 9,99 €/mois.
   Le backend n'expose qu'un seul produit Whop (productSlug codé en dur dans
   whop_handlers.go) : afficher deux formules côte à côte, comme le font les
   applis concurrentes, enverrait les deux vers le même paiement. On garde donc
   une seule carte — et pas de badge « meilleure offre », qui n'a aucun sens
   sans offre à comparer. */
const FORMULE = {
  nom: 'Plan de croissance',
  prix: '9,99',
  periode: '/mois',
  avantages: [
    'Ton plan du mois : quoi faire chaque jour',
    'Sommeil, nutrition, exercices — les trois leviers, détaillés',
    'Suivi des progrès et re-mesure mensuelle',
    'Résiliable en ligne à tout moment',
  ],
}

const PILIERS = [
  { emoji: '😴', titre: 'Sommeil', detail: 'Heures cibles, routine du soir' },
  { emoji: '🥗', titre: 'Nutrition', detail: 'Protéines, calcium, vitamine D' },
  { emoji: '🏃', titre: 'Exercices', detail: 'Étirements, sauts, posture' },
]

function PaywallPage({ onBackHome }) {
  const [email] = useState(() => localStorage.getItem('userEmail') || '')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [lienParentVisible, setLienParentVisible] = useState(false)
  const [lienCopie, setLienCopie] = useState(false)

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
        <section className="paywall-offer" aria-labelledby="paywall-offer-title">
          <div className="paywall-offer-head">
            <h2 id="paywall-offer-title">{FORMULE.nom}</h2>
            <p className="paywall-price">
              <span>{FORMULE.prix} €</span>
              {FORMULE.periode}
            </p>
          </div>

          <ul className="paywall-features">
            {FORMULE.avantages.map((avantage) => (
              <li key={avantage}>
                <Check size={18} aria-hidden="true" />
                <span>{avantage}</span>
              </li>
            ))}
          </ul>
        </section>

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

        {lienParent && (
          <section className="paywall-parent">
            <button
              type="button"
              className="paywall-parent-toggle"
              onClick={() => setLienParentVisible((visible) => !visible)}
              aria-expanded={lienParentVisible}
            >
              Faire payer par un parent
            </button>

            {lienParentVisible && (
              <div className="paywall-parent-body">
                <p>
                  Envoie ce lien à ton parent. Il y trouvera l’explication et pourra
                  régler depuis son e-mail — ton accès s’ouvrira ici, sur ce compte.
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
            `S’abonner — ${FORMULE.prix} €/mois`
          )}
        </button>
      </footer>
    </div>
  )
}

export default PaywallPage
