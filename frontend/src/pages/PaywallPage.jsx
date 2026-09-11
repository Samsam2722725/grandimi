import { useRef, useState, useEffect } from 'react'
import { ArrowLeft, Check, Lock } from 'lucide-react'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import '../styles/funnel.css'
/* Feuille dédiée, et non paywall.css : cette dernière habille encore
   ParentPage (page claire, destinée à un adulte arrivé par lien partagé) et
   partage des noms de classe avec elle. La remplacer cassait cet écran. */
import '../styles/paywall-night.css'

/* Deux offres, mêmes fonctionnalités : seul le rythme de facturation
   change. Les montants sont ceux affichés par défaut ; getPlans() les
   confirme au chargement, mais QUEL QUE SOIT ce qu'affiche cet écran, le
   montant réellement prélevé est décidé par le plan Whop choisi côté
   serveur (POST /api/v1/checkout avec plan: "monthly"|"annual") — jamais
   par une valeur envoyée depuis ce composant.

   Un paiement unique (sans abonnement) a été proposé dans une revue
   séparée du tunnel comme second produit Whop — cf. l'ancien
   docs/BRIEF-BACKEND.md, point 1. Non repris ici : il change le montant
   annuel voulu (29,99 € devient alors un prix à vie, pas un prix par an)
   et n'a pas de second produit Whop configuré. À traiter comme une
   décision produit séparée, pas un détail d'implémentation. */
const PLANS_PAR_DEFAUT = {
  monthly: { key: 'monthly', label: 'Mensuel', price_eur: 4.99, interval: 'month' },
  annual: { key: 'annual', label: 'Annuel', price_eur: 29.99, interval: 'year' },
}

const AVANTAGES = [
  'Ton plan du mois : quoi faire chaque jour',
  'Sommeil, nutrition, exercices — les trois leviers, détaillés',
  'Suivi des progrès et re-mesure mensuelle',
  'Résiliable en ligne à tout moment',
]

// 12 mensualités à 4,99 € : le seul repère auquel comparer l'annuel.
// Jamais présenté comme un ancien prix, seulement comme le calcul qui
// justifie "économisez".
const COUT_DOUZE_MENSUALITES = 12 * PLANS_PAR_DEFAUT.monthly.price_eur

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
  const blocParentRef = useRef(null)
  const [planChoisi, setPlanChoisi] = useState('monthly')
  const [plans, setPlans] = useState(PLANS_PAR_DEFAUT)

  /* Les montants par défaut sont déjà corrects ; cet appel ne fait que
     les confirmer. S'il échoue (réseau, backend pas encore redéployé),
     l'écran reste utilisable avec les valeurs par défaut plutôt que de
     bloquer l'affichage du prix sur une page de paiement. */
  useEffect(() => {
    let annule = false
    apiClient
      .getPlans()
      .then((res) => {
        if (annule || !Array.isArray(res.plans)) return
        const parClef = {}
        for (const p of res.plans) parClef[p.key] = p
        setPlans((precedent) => ({ ...precedent, ...parClef }))
      })
      .catch(() => {})
    return () => {
      annule = true
    }
  }, [])

  const offre = plans[planChoisi]
  const economieAnnuelle = COUT_DOUZE_MENSUALITES - plans.annual.price_eur
  const pourcentageEconomie = Math.round((economieAnnuelle / COUT_DOUZE_MENSUALITES) * 100)

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
        plan: planChoisi,
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
          Ton estimation reste gratuite, pour toujours. Seul le plan de croissance est payant.
        </p>

        {/* Carte d'offre : bordure accentuée et prix en display. C'est le seul
            élément coloré de la page — rien d'autre ne doit capter le regard ici.
            Les deux offres partagent la même liste de fonctionnalités, affichée
            une seule fois : seul le rythme de facturation change. */}
        <section className="paywall-offer" aria-labelledby="paywall-offer-title">
          <div
            className="paywall-plan-toggle"
            role="radiogroup"
            aria-label="Choisir la formule"
          >
            <button
              type="button"
              role="radio"
              aria-checked={planChoisi === 'monthly'}
              className={`paywall-plan-option ${planChoisi === 'monthly' ? 'active' : ''}`}
              onClick={() => setPlanChoisi('monthly')}
            >
              Mensuel
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={planChoisi === 'annual'}
              className={`paywall-plan-option ${planChoisi === 'annual' ? 'active' : ''}`}
              onClick={() => setPlanChoisi('annual')}
            >
              Annuel
            </button>
          </div>

          <div className="paywall-offer-head">
            <h2 id="paywall-offer-title">Plan de croissance</h2>
            <p className="paywall-price">
              <span>{offre.price_eur.toFixed(2).replace('.', ',')} €</span>
              {offre.interval === 'year' ? '/an' : '/mois'}
            </p>
            {planChoisi === 'annual' && (
              <p className="paywall-savings">
                Économisez près de {pourcentageEconomie} % par rapport à 12 mensualités à{' '}
                {plans.monthly.price_eur.toFixed(2).replace('.', ',')} €.
              </p>
            )}
          </div>

          <ul className="paywall-features">
            {AVANTAGES.map((avantage) => (
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
              le plan personnalisé (mensuel ou annuel) est payant.
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
            `S’abonner — ${offre.price_eur.toFixed(2).replace('.', ',')} €${
              offre.interval === 'year' ? '/an' : '/mois'
            }`
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
