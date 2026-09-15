import { useRef, useState, useEffect } from 'react'
import { ArrowLeft, Lock } from 'lucide-react'

import { CardCarousel } from '@/components/ui/card-carousel'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import '../styles/funnel.css'
/* Feuille dédiée, et non paywall.css : cette dernière habille encore
   ParentPage (page claire, destinée à un adulte arrivé par lien partagé) et
   partage des noms de classe avec elle. La remplacer cassait cet écran. */
import '../styles/paywall-night.css'
import {
  checkoutEchoue,
  checkoutOuvert,
  lienParentCopie,
  lienParentOuvert,
  paywallVue,
  planChoisi as mesurerPlanChoisi,
} from '../lib/analytics'

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

/* Les trois supports de la marque, servis depuis public/offre en WebP.

   Le nom de fichier porte le sujet plutôt qu'un numéro : il se retrouve tel
   quel dans l'onglet réseau et dans le cache du navigateur, où
   « image-3.webp » n'aurait rien dit à personne.

   Les `alt` décrivent ce que montre l'image, pas son titre : un lecteur
   d'écran ne tire rien de « Programme optimal » seul. */
const VISUELS_OFFRE = [
  {
    src: '/offre/programme-optimal.webp',
    alt: 'Programme optimal : la routine quotidienne, jour après jour',
  },
  {
    src: '/offre/guide-pour-grandir.webp',
    alt: 'Guide pour grandir : les leçons sur la croissance, débloquées une à une',
  },
  {
    src: '/offre/optimise-la.webp',
    alt: 'Optimise-la : les actions du jour, à cocher une par une',
  },
]


// 12 mensualités à 4,99 € : le seul repère auquel comparer l'annuel.
// Jamais présenté comme un ancien prix, seulement comme le calcul qui
// justifie "économisez".
const COUT_DOUZE_MENSUALITES = 12 * PLANS_PAR_DEFAUT.monthly.price_eur



/* L'écran du matin, tel qu'un abonné l'ouvre. Les deux premières lignes
   sont les vraies actions du plan (internal/planner/monthly_plan.go) —
   pas un échantillon flatteur : les deux premières de la journée, dans
   l'ordre. Les suivantes sont sous cadenas.

   Les horaires ne sont pas affichés ici : ceux du plan réel sont calés
   sur les heures de lever et de coucher demandées APRÈS le paiement
   (PlanSetupPage). En inventer sur cet écran serait promettre un
   ajustement qu'on n'a pas encore les moyens de faire. */
const APERCU_ACTIONS = [
  { moment: 'Au réveil', texte: 'Suspension à la barre : 5 × 15 s', verrouille: false },
  { moment: 'Petit-déjeuner', texte: '25 g de protéines avant de partir', verrouille: false },
  { moment: 'Journée', texte: '', verrouille: true },
  { moment: 'Le soir', texte: '', verrouille: true },
  { moment: 'Au coucher', texte: '', verrouille: true },
]

function PaywallPage({ onBackHome }) {
  const [email] = useState(() => localStorage.getItem('userEmail') || '')
  const [loading, setLoading] = useState(false)
  const [erreur, setErreur] = useState(null)
  const [lienParentVisible, setLienParentVisible] = useState(false)
  const [lienCopie, setLienCopie] = useState(false)
  const blocParentRef = useRef(null)
  /* L'annuel est présélectionné, comme sur tous les tunnels qui vendent
     sur ce marché. Ce n'est pas un piège : les deux offres sont affichées
     côte à côte, l'autre se prend en un geste, et le bouton du pied écrit
     le montant exact qui sera prélevé. Le défaut penche simplement du
     côté de l'offre qui coûte le moins cher au mois — et du seul format
     qu'un parent accepte volontiers, un paiement par an plutôt qu'un
     prélèvement mensuel sur le compte de son enfant. */
  const [planChoisi, setPlanChoisi] = useState('annual')
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

  /* Dénominateur du seul taux que le brief demande de suivre :
     « paywall affichée → checkout Whop ouvert ». Sans cet
     événement, le numérateur seul ne veut rien dire. */
  useEffect(() => {
    paywallVue(planChoisi)
    // Une fois par affichage : le changement d'offre est un autre
    // événement, il ne doit pas regonfler celui-ci.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      lienParentCopie()
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
      /* Émis AVANT window.location.href : la redirection décharge la
         page, et PostHog n'aurait plus le temps d'envoyer quoi que ce
         soit après. */
      checkoutOuvert(planChoisi)
      window.location.href = checkoutURL
    } catch (err) {
      checkoutEchoue(planChoisi, err.message)
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
          Ta taille adulte, ce que tes habitudes te coûtent, et tes 11 actions par jour.
        </p>

        {/* Les deux formules CÔTE À CÔTE, avant tout argument.

            Elles étaient présentées par un sélecteur à bascule (deux
            pastilles dans une glissière) qui n'affichait qu'un prix à la
            fois : pour comparer, il fallait cliquer, retenir, recliquer.
            Un choix qu'on ne peut pas voir d'un coup d'œil n'est pas un
            choix, c'est une manipulation à faire.

            Deux cartes visibles ensemble changent la question posée au
            visiteur : non plus « est-ce que je paie ? » mais « laquelle
            je prends ? ». C'est le motif de tous les tunnels qui
            convertissent sur ce marché, et la feuille de style le
            prévoyait déjà (`.paywall-offers.is-multiple`, badge compris)
            sans que personne ne s'en serve.

            L'ordre des cartes n'est pas neutre : le mensuel à gauche sert
            d'ancre — c'est en le lisant qu'on comprend ce que l'annuel
            fait économiser. L'inverse ne marche pas. */}
        <section
          className="paywall-offers is-multiple"
          role="radiogroup"
          aria-label="Choisir la formule"
        >
          {['monthly', 'annual'].map((clef) => {
            const plan = plans[clef]
            const selectionne = planChoisi === clef
            const annuel = clef === 'annual'

            return (
              <button
                key={clef}
                type="button"
                role="radio"
                aria-checked={selectionne}
                className={`paywall-offer ${selectionne ? 'is-selected' : ''}`}
                onClick={() => {
                  setPlanChoisi(clef)
                  mesurerPlanChoisi(clef)
                }}
              >
                {annuel && <span className="paywall-offer-badge">Meilleure offre</span>}

                <span className="paywall-offer-label">{plan.label}</span>

                <span className="paywall-offer-prix">
                  {plan.price_eur.toFixed(2).replace('.', ',')} €
                </span>

                <span className="paywall-offer-sous">
                  {annuel
                    ? `soit ${(plan.price_eur / 12).toFixed(2).replace('.', ',')} € par mois`
                    : 'sans engagement'}
                </span>

                {/* « − 50 % sur l'année » passait à la ligne dans une
                    demi-colonne et la pastille se lisait comme un pavé de
                    deux lignes. Le pourcentage seul suffit : la ligne du
                    dessus vient de dire à quoi il se rapporte. */}
                {annuel && <span className="paywall-offer-eco">− {pourcentageEconomie} %</span>}
              </button>
            )
          })}
        </section>

        {/* ---------- Montrer le produit, pas le décrire ----------

            La page listait quatre avantages en texte, puis trois
            pastilles emoji. Aucun des deux ne dit à quoi ressemble la
            chose qu'on achète — et sur un abonnement à un écran
            quotidien, c'est précisément la seule question.

            Ce bloc montre donc l'écran du matin, avec les actions
            réelles du plan (internal/planner/monthly_plan.go, les mêmes
            que sur la page d'accueil). Deux sont lisibles, le reste est
            sous cadenas : le visiteur juge la qualité sur celles qu'il
            voit et achète celles qu'il ne voit pas.

            Les deux lignes en clair ne sont pas un échantillon choisi
            pour impressionner — ce sont les deux premières de la
            journée, dans l'ordre où le plan les donne. */}
        <p className="paywall-voici">Voici ce que tu obtiens :</p>

        <section className="paywall-apercu" aria-label="Aperçu du plan quotidien">
          <div className="apercu-tete">
            <span className="apercu-titre">Ton plan d’aujourd’hui</span>
            <span className="apercu-compte">0 / 11 faites</span>
          </div>

          <ul className="apercu-liste">
            {APERCU_ACTIONS.map((action) => (
              <li
                key={action.texte}
                className={`apercu-ligne ${action.verrouille ? 'apercu-ligne--verrouille' : ''}`}
              >
                <span className="apercu-case" aria-hidden="true">
                  {action.verrouille ? <Lock size={12} /> : null}
                </span>
                <span className="apercu-moment">{action.moment}</span>
                <span className="apercu-texte">
                  {action.verrouille ? '—' : action.texte}
                </span>
              </li>
            ))}
          </ul>

          <p className="apercu-pied">
            <strong>11 actions par jour</strong>, renouvelées chaque mois. Chacune dit
            pourquoi elle est là et d’où elle vient.
          </p>
        </section>

        {/* La liste à coches « ce que tu auras » est retirée à la demande du
            client. Elle répétait en texte ce que l'aperçu du plan montre
            juste au-dessus et ce que les trois visuels du carrousel montrent
            juste en dessous — trois fois la même promesse sur le même écran,
            dont une seule en montrant quelque chose. */}

        {/* Les visuels dessinés cèdent la place aux vrais supports de la
            marque, en coverflow : carte centrale de face, voisines en
            perspective, avance automatique. Ils pesaient 6,2 Mo en PNG —
            converti en WebP à 760 px de large, l'ensemble tient en 106 Ko,
            ce qui est la différence entre une page de paiement utilisable en
            4G et une page qui ne s'affiche jamais. */}
        <section aria-label="Ce que contient le plan">
          <CardCarousel images={VISUELS_OFFRE} />
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
            <summary>Qu’est-ce que je débloque exactement ?</summary>
            <p>
              Ta taille adulte estimée avec sa marge d’erreur, ce que tes habitudes
              actuelles te coûtent en centimètres, ton frein principal nommé, et les
              11 actions quotidiennes de ton plan — renouvelé chaque mois d’abonnement.
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
              lienParentOuvert()
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
