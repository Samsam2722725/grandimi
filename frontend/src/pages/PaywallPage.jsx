import { useRef, useState, useEffect } from 'react'
import { Star, X } from 'lucide-react'

import Spinner from '../components/Spinner'
import apiClient from '../lib/api'
import { AVIS } from '@/components/ui/avis'
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
  monthly: { key: 'monthly', label: 'Mensuel', price_eur: 9.99, interval: 'month' },
  annual: { key: 'annual', label: 'Annuel', price_eur: 29.99, interval: 'year' },
}


/* Douze mensualités : le seul repère auquel comparer l'annuel. Jamais
   présenté comme un ancien prix, seulement comme le calcul qui justifie
   « économisez ».

   CALCULÉ SUR LE PRIX REÇU DU SERVEUR, PAS SUR LA VALEUR DE REPLI.
   C'était une constante bâtie sur PLANS_PAR_DEFAUT, donc figée à 4,99 €.
   Le jour où le tarif mensuel change côté serveur, la carte annonçait le
   nouveau montant pendant que la pastille gardait l'ancienne remise :
   à 9,99 €/mois elle aurait affiché « − 50 % » là où la vraie remise est
   de 75 %. Une réduction fausse sur une page de paiement n'est pas une
   coquille, c'est une allégation commerciale inexacte. */
function coutDouzeMensualites(plans) {
  return 12 * plans.monthly.price_eur
}

/* Le prix ramené à la semaine.

   52,18 semaines par an et non 52 : l'année fait 365,25 jours. L'écart
   est d'un centime sur l'offre annuelle, mais un prix affiché se
   vérifie à la calculatrice, et un centime faux sur une page dont
   l'argument est l'honnêteté coûte plus que le centime.

   Le mois vaut donc 52,18 / 12 = 4,348 semaines, pas 4. Diviser par 4
   annoncerait 2,50 € au lieu de 2,30 € : une surestimation, mais une
   erreur quand même — et elle irait contre nous. */
const SEMAINES_PAR_AN = 365.25 / 7

function coutHebdomadaire(plan) {
  const semaines = plan.interval === 'year' ? SEMAINES_PAR_AN : SEMAINES_PAR_AN / 12
  return (plan.price_eur / semaines).toFixed(2).replace('.', ',')
}

/* Au-delà de ce délai, on nomme l'attente au lieu de la laisser tourner.
   Même valeur que ParentPage : les deux écrans mènent au même Whop. */
const DELAI_AVANT_MESSAGE_MS = 4000



/* Ce que le questionnaire a mis de côté pour cet écran.

   Deux champs seulement, et ils viennent tous les deux d'une question
   que le visiteur a répondue lui-même :

     `taille_reve` — le seul chiffre de tout le tunnel qu'il a CHOISI.
       L'écart entre ce nombre et l'estimation qu'il vient de lire est
       exactement ce que cette page a à travailler. Un titre générique
       (« Débloquer ton plan complet ») ne dit rien à personne ; le même
       titre avec ses centimètres à lui nomme la raison pour laquelle il
       est encore sur cette page.

     `profil` — qui remplit le formulaire. Un parent n'a pas besoin qu'on
       lui propose de « faire payer par un parent », et cette proposition
       faite à un adulte muni d'une carte bancaire n'est pas neutre :
       elle suggère qu'il y a un obstacle là où il n'y en a pas.

   Lecture défensive de bout en bout : cette page s'affiche aussi pour
   quelqu'un arrivé d'une session antérieure, dont le stockage local ne
   contient pas encore ces champs. */
function lireLaPrediction() {
  try {
    const brut = JSON.parse(localStorage.getItem('predictionData') || '{}')
    return brut && typeof brut === 'object' ? brut : {}
  } catch {
    return {}
  }
}

function PaywallPage({ onBackHome }) {
  const [email] = useState(() => localStorage.getItem('userEmail') || '')
  const prediction = useState(lireLaPrediction)[0]
  const [loading, setLoading] = useState(false)
  /* Passe à vrai quand la redirection dépasse DELAI_AVANT_MESSAGE_MS, pour
     nommer l'attente sous le bouton au lieu de la laisser tourner. */
  const [attenteLongue, setAttenteLongue] = useState(false)
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

  /* Déclaré ICI, au-dessus du préchargement, et non plus après : il figure
     dans le tableau de dépendances de l'effet ci-dessous, et ce tableau est
     évalué PENDANT le rendu. Plus bas, la constante était encore en zone
     morte temporelle — le composant levait une ReferenceError et l'écran de
     paiement restait blanc. */
  const emailValide = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  /* ---------- Préparer la sortie pendant qu'il lit ----------

     Mesuré : notre appel de checkout prend 450 ms, et l'ouverture de la page
     Whop 400 à 700 ms de plus, auxquels s'ajoutent DNS et TLS vers un domaine
     que le navigateur n'a jamais contacté. Tout cela se payait au clic.

     Rien n'oblige à attendre le clic. L'URL de paiement est une adresse
     déterministe (identifiant de plan + e-mail), pas une session à usage
     unique : la demander à l'affichage ne réserve rien et ne coûte rien.
     Pendant que l'utilisateur lit le prix, on obtient donc l'URL ET on ouvre
     la connexion vers whop.com.

     Résultat : au clic il ne reste que la redirection elle-même. On ne peut
     pas accélérer la page de Whop — 925 ko reconstruits côté navigateur —
     mais on peut faire en sorte qu'elle commence à se charger une seconde
     plus tôt. */
  const [urlPrechargee, setUrlPrechargee] = useState(null)

  useEffect(() => {
    const lien = document.createElement('link')
    lien.rel = 'preconnect'
    lien.href = 'https://whop.com'
    lien.crossOrigin = ''
    document.head.appendChild(lien)
    return () => lien.remove()
  }, [])

  /* Relancé quand l'offre change : les deux formules n'ont pas la même URL,
     et servir celle de l'offre non retenue ferait payer le mauvais montant.
     `annule` empêche une réponse lente d'écraser un choix plus récent. */
  useEffect(() => {
    if (!emailValide) return undefined
    let annule = false
    setUrlPrechargee(null)

    const utilisateur = (() => {
      try {
        return JSON.parse(localStorage.getItem('user') || '{}')
      } catch {
        return {}
      }
    })()

    apiClient
      .createCheckout({ email, userId: utilisateur.id, plan: planChoisi })
      .then((res) => {
        if (!annule && res.checkout_url) setUrlPrechargee(res.checkout_url)
      })
      .catch(() => {
        /* Sans conséquence : le clic refera l'appel, simplement sans l'avance. */
      })

    return () => {
      annule = true
    }
  }, [planChoisi, email, emailValide])

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
  const douzeMensualites = coutDouzeMensualites(plans)
  const economieAnnuelle = douzeMensualites - plans.annual.price_eur
  const pourcentageEconomie = Math.round((economieAnnuelle / douzeMensualites) * 100)

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

    /* Passé quatre secondes, on NOMME l'attente au lieu de la laisser
       tourner. ParentPage le fait déjà ; cet écran-ci ne le faisait pas.

       Mesuré : notre appel prend 450 ms à instance chaude. Ce n'est donc
       pas lui le sujet. Ce sont les deux étapes qui suivent, et qu'on ne
       contrôle ni l'une ni l'autre — le réveil éventuel de l'instance
       Render sur l'offre gratuite, puis la page de paiement de Whop, qui
       fait 925 ko et n'a aucun prix dans son HTML : tout y est reconstruit
       côté navigateur, d'où les rectangles gris.

       Un bouton qui tourne en silence pendant ce temps-là se lit comme un
       bouton cassé. Une phrase qui dit où l'on va se lit comme une
       redirection. */
    const minuterie = setTimeout(() => setAttenteLongue(true), DELAI_AVANT_MESSAGE_MS)
    const finir = () => {
      clearTimeout(minuterie)
      setAttenteLongue(false)
    }

    try {
      const utilisateur = JSON.parse(localStorage.getItem('user') || '{}')

      /* L'URL a presque toujours été obtenue pendant la lecture de l'écran.
         Quand c'est le cas, il ne reste rien entre le doigt et Whop. Sinon —
         premier rendu très rapide, réseau capricieux, e-mail arrivé tard — on
         la demande ici, exactement comme avant. */
      const checkoutURL =
        urlPrechargee ||
        (
          await apiClient.createCheckout({
            email,
            userId: utilisateur.id,
            plan: planChoisi,
          })
        ).checkout_url

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
      finir()
      checkoutEchoue(planChoisi, err.message)
      setErreur(
        err.message || "Impossible d'ouvrir la page de paiement. Réessaie dans un instant.",
      )
      setLoading(false)
    }
  }



  /* Un parent est le payeur : lui proposer de faire payer un parent n'a
     pas de sens. Le lien reste offert à tous les autres, y compris quand
     le profil n'a pas été renseigné (session antérieure au tunnel actuel)
     — c'est le défaut le moins coûteux des deux. */
  const proposerLeParent = prediction.profil !== 'parent'

  return (
    <div className="night paywall">
      {/* Mise en page calquée sur le paywall GoTall, à la demande du
          client : logo, « Choisis ton offre », cinq étoiles, un avis, les
          deux offres l’une sous l’autre, un bouton. Rien d’autre. Pas de
          compte à rebours ni de « X personnes aujourd’hui » : ce seraient
          des chiffres inventés. */}
      <header className="pw2-top">
        <button type="button" className="pw2-fermer" onClick={onBackHome} aria-label="Fermer">
          <X size={24} aria-hidden="true" />
        </button>
        <span className="pw2-logo">Grandimi</span>
      </header>

      <main className="paywall-scroll pw2">
        <h1 className="pw2-titre">Choisis ton offre</h1>

        <div className="pw2-etoiles" aria-label="5 étoiles sur 5">
          {[0, 1, 2, 3, 4].map((n) => (
            <Star key={n} size={34} fill="currentColor" strokeWidth={0} aria-hidden="true" />
          ))}
        </div>

        <blockquote className="pw2-avis">
          <p>« {AVIS[0].texte} »</p>
          <cite>— {AVIS[0].prenom}, {AVIS[0].age} ans</cite>
        </blockquote>

        <p className="pw2-offre-speciale">− {pourcentageEconomie} % avec l’offre annuelle</p>

        <section className="pw2-offres" role="radiogroup" aria-label="Choisir la formule">
          {['annual', 'monthly'].map((clef) => {
            const plan = plans[clef]
            const selectionne = planChoisi === clef
            const annuel = clef === 'annual'
            return (
              <button
                key={clef}
                type="button"
                role="radio"
                aria-checked={selectionne}
                className={`pw2-offre ${selectionne ? 'is-choisie' : ''}`}
                onClick={() => {
                  setPlanChoisi(clef)
                  mesurerPlanChoisi(clef)
                }}
              >
                {annuel && <span className="pw2-offre-bandeau">Meilleure offre</span>}
                <span className="pw2-offre-ligne">
                  <span className="pw2-offre-nom">{annuel ? 'Offre annuelle' : 'Offre mensuelle'}</span>
                  <span className="pw2-offre-prix">{coutHebdomadaire(plan)} €/semaine</span>
                </span>
              </button>
            )
          })}
        </section>

        {erreur && (
          <p className="funnel-error" role="alert">
            {erreur}
          </p>
        )}

        {lienParent && proposerLeParent && (
          <section className="paywall-parent" ref={blocParentRef}>
            {lienParentVisible && (
              <div className="paywall-parent-body">
                <h2 className="paywall-section-title">Faire payer par un parent</h2>
                <p>
                  Envoie ce lien à ton parent. Il pourra régler depuis son e-mail, et ton
                  accès s’ouvrira ici, sur ce compte.
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
            'Commencer mon parcours'
          )}
        </button>

        <p className="pw2-facture">
          {offre.interval === 'year'
            ? `Facturé ${offre.price_eur.toFixed(2).replace('.', ',')} € par an`
            : `Facturé ${offre.price_eur.toFixed(2).replace('.', ',')} € par mois, sans engagement`}
          {' · '}
          <a href="/cgv.html">Conditions</a> · Résiliable à tout moment
        </p>

        {/* `role="status"` et non un paragraphe muet : le message apparaît
            plusieurs secondes après le clic, donc un lecteur d'écran doit
            l'annoncer sans que l'utilisateur ait à aller le chercher. */}
        {attenteLongue && (
          <p className="paywall-attente" role="status">
            On ouvre la page de paiement sécurisée de Whop. Ça peut prendre
            quelques secondes — ne ferme pas.
          </p>
        )}

        {/* Deuxième action de plein droit, pas un lien replié au milieu de la
            page. L'utilisateur type a 14 ans et pas de carte bancaire : lui
            faire chercher ce chemin, c'est le perdre. Contour et non aplat —
            la hiérarchie reste lisible. */}
        {lienParent && proposerLeParent && (
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
