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
  monthly: { key: 'monthly', label: 'Mensuel', price_eur: 9.99, interval: 'month' },
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



function PaywallPage({ onBackHome }) {
  const [email] = useState(() => localStorage.getItem('userEmail') || '')
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

                {/* LE COÛT PAR SEMAINE EN GRAND, LE MONTANT PRÉLEVÉ JUSTE EN
                    DESSOUS — et jamais l'un sans l'autre.

                    Un adolescent compare « 2,30 € » à un paquet de chips,
                    pas « 9,99 € » à son argent de poche du mois. C'est le
                    même prix, dit dans l'unité où il pèse le moins.

                    Mais le montant réellement débité reste écrit, en clair,
                    juste en dessous. Afficher un prix hebdomadaire en
                    prélevant au mois sans le dire est une pratique
                    commerciale trompeuse au sens de l'article L121-1 du
                    code de la consommation — et sur un produit vendu à des
                    mineurs, c'est le dernier endroit où jouer sur les mots.
                    Le bouton d'abonnement, lui, n'affiche que le montant
                    prélevé. */}
                <span className="paywall-offer-prix">
                  {coutHebdomadaire(plan)} €
                  <span className="paywall-offer-unite"> / semaine</span>
                </span>

                <span className="paywall-offer-sous">
                  {annuel
                    ? `facturé ${plan.price_eur.toFixed(2).replace('.', ',')} € une fois par an`
                    : `facturé ${plan.price_eur.toFixed(2).replace('.', ',')} € par mois, sans engagement`}
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

        {/* L apercu du plan du matin (« TON PLAN D AUJOURD HUI », cinq lignes
            dont trois sous cadenas) est retire a la demande du client.

            Ce que le visiteur voit maintenant entre le prix et le bouton : la
            phrase d annonce, puis les trois visuels du carrousel. C est la
            seule demonstration qui reste, et elle porte desormais seule le
            travail de montrer ce qu on achete. */}
        <p className="paywall-voici">Voici ce que tu obtiens :</p>

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
