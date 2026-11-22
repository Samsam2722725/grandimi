import { useEffect, useRef, useState } from 'react'
import { Settings } from 'lucide-react'

import { CourbeTaille } from '@/components/ui/courbe-taille'

/* « Avec toutes les offres : », copié du paywall de Taller : une seule
   carte à la fois, qui défile toute seule, avec un titre et un seul visuel
   repris de leurs images (la liste d'actions, le chemin de jours, les
   leçons, la courbe de taille). La carte « Prédis ta taille adulte » est
   ajoutée le 21/11/2026 : depuis, la taille prédite est dans toutes les
   offres (1 mois et 1 an). Leurs cartes « Communauté exclusive » et
   « Coach IA » ne sont pas reprises : Grandimi ne les a pas (22/10/2026). */
const DUREE_CARTE_MS = 3200

// « Optimise ta taille » : comme la carte « Optimise-la » de Taller, quatre
// vraies actions, la première faite et barrée, les lignes un peu penchées.
// Toutes viennent de l'app payée (routine de GrowthPlanPage, séances de
// parcours.jsx), avec des gestes qu'un ado connaît sans explication :
// « suspension à la barre » et « cobra » ne parlaient pas (30/10/2026). Leur
// « huile de poisson » devient « une poignée de noix » : aucun complément
// pour des mineurs (30/10/2026).
const ACTIONS = [
  ['1 verre de lait + miel', '🍯🥛'],
  ['Posture du cobra 30 s', '🐍'],
  ['Une poignée de noix', '🌰'],
  ['30 s de planche', '💪'],
]

// « Guide pour grandir » : les mêmes leçons que Taller, qui sont aussi
// celles du guide Grandimi (lecons-plan.jsx).
const LECONS = [
  ['Leçon 1', 'Mythes courants sur la croissance'],
  ['Leçon 2', 'L’impact de la nutrition sur la croissance'],
  ['Leçon 3', 'Le rôle du sommeil dans la croissance'],
]

// « Programme optimal » : même message que la carte de Taller (un
// téléphone, « Routine quotidienne », un plan par niveaux de 7 jours),
// avec l'écran « Ton plan » de l'app Grandimi : 16 niveaux × 7 jours,
// piments de difficulté, trophée en fin de niveau (parcours.jsx). Le
// Niveau 2 coupé en bas et « 112 jours » disent que ça ne dure pas une
// semaine (30/10/2026).
const CHEMIN_HAUT = ['🔥', 'Jour 2', 'Jour 3', 'Jour 4']
const CHEMIN_BAS = ['🏆', 'Jour 7', 'Jour 6', 'Jour 5']

export function TelephonePlan() {
  return (
    <div className="cqo-tel-zone">
      <span className="cqo-tel-etiquette">Routine quotidienne 📅</span>
      <div className="cqo-tel" aria-hidden="true">
        <div className="cqo-tel-tete">
          <strong>Ton plan</strong>
          <span className="cqo-tel-reglages"><Settings size={14} /></span>
        </div>
        <div className="cqo-tel-onglets">
          <span className="is-actif">Exercices</span>
          <span>Nutrition</span>
          <span>Routine</span>
        </div>
        {/* La jauge « Vers ta taille maximale » : où il en est aujourd'hui,
            le trophée au jour 112. Aucun centimètre, aucune toise. */}
        <div className="cqo-tel-bandeau">
          <span className="cqo-tel-jauge-titre">Vers ta taille maximale</span>
          <span className="cqo-tel-jauge"><span className="cqo-tel-jauge-point" /></span>
          <span className="cqo-tel-jauge-bornes">
            <span>Toi aujourd’hui</span>
            <span className="cqo-tel-jauge-fin">🏆 Jour 112</span>
          </span>
        </div>
        <div className="cqo-tel-niveau">
          <span>Niveau 1 🌶️</span>
          <span>1/7</span>
        </div>
        <span className="cqo-tel-barre"><span /></span>
        <div className="cqo-tel-chemin">
          {CHEMIN_HAUT.map((c, i) => (
            <span key={c} className={`cqo-tel-jour${i === 0 ? ' is-fait' : ''}${i === 1 ? ' is-suivant' : ''}`}>{c}</span>
          ))}
          {CHEMIN_BAS.map((c) => (
            <span key={c} className="cqo-tel-jour">{c}</span>
          ))}
        </div>
        <div className="cqo-tel-niveau cqo-tel-niveau--suite">
          <span>Niveau 2 🌶️🌶️</span>
          <span>0/7</span>
        </div>
      </div>
    </div>
  )
}

export function CeQueTuObtiens({ prediction = {} } = {}) {
  // La puce « Calculée pour toi » partait avec la carte « Optimise ta taille » (retirée le 21/11/2026).
  void prediction

  const cartes = [
    // « Optimise ta taille » retirée le 21/11/2026 (Samuel) ; VisuelActions la garde en code.
    { titre: 'Programme optimal', visuel: <TelephonePlan /> },
    // Juste après le programme, avec un cadenas à la place de la taille (21/11/2026).
    { titre: 'Prédis ta taille', visuel: <CourbeTaille cadenas grand /> },
    {
      titre: 'Guide pour grandir',
      visuel: (
        <ul className="cqo-lecons">
          {LECONS.map(([titre, sujet], i) => (
            <li key={titre} className={i === 0 ? 'is-ouverte' : ''}>
              <span className="cqo-pastille" aria-hidden="true">{i === 0 ? '📖' : '🔒'}</span>
              <span className="cqo-lecon">
                <strong>{titre}</strong>
                <span>{sujet}</span>
              </span>
            </li>
          ))}
        </ul>
      ),
    },
  ]

  const liste = useRef(null)
  const [actif, setActif] = useState(0)
  const touche = useRef(false)

  // Défile tout seul, comme chez Taller, sauf si on a touché la carte ou si
  // l'appareil demande moins d'animations.
  useEffect(() => {
    const reduit = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduit) return undefined
    const id = setInterval(() => {
      if (touche.current || !liste.current) return
      const suivant = (Math.round(liste.current.scrollLeft / liste.current.clientWidth) + 1) % cartes.length
      liste.current.scrollTo({ left: suivant * liste.current.clientWidth, behavior: 'smooth' })
    }, DUREE_CARTE_MS)
    return () => clearInterval(id)
  }, [cartes.length])

  return (
    <section className="cqo" aria-label="Ce que tu obtiendras">
      <p className="cqo-intro">Ce que tu obtiendras :</p>
      <ul
        ref={liste}
        className="cqo-liste"
        onScroll={(e) => setActif(Math.round(e.currentTarget.scrollLeft / e.currentTarget.clientWidth))}
        onPointerDown={() => { touche.current = true }}
      >
        {cartes.map(({ titre, visuel }) => (
          <li key={titre} className="cqo-carte">
            <h3>{titre}</h3>
            <div className="cqo-visuel">{visuel}</div>
          </li>
        ))}
      </ul>
      <div className="cqo-points" aria-hidden="true">
        {cartes.map(({ titre }, i) => (
          <span key={titre} className={i === actif ? 'is-actif' : ''} />
        ))}
      </div>
      {/* Vrai : l'estimation utilise les courbes OMS et Khamis-Roche
          (onboarding/content.jsx). Ces noms ne parlent à personne : on dit
          seulement que c'est basé sur la science, sans logo (22/10/2026). */}
      <p className="cqo-science">🔬 Basé sur la science de la croissance</p>
    </section>
  )
}

/* La liste d'actions de la carte « Optimise ta taille », réutilisée dans le
   questionnaire (« Voilà comment on t'amène à ta taille maximale »). */
export function VisuelActions() {
  return (
    <ul className="cqo-actions">
      {ACTIONS.map(([action, icone], i) => (
        <li key={action} className={i === 0 ? 'is-faite' : ''}>
          <span className="cqo-case" aria-hidden="true">{i === 0 ? '✓' : ''}</span>
          <span className="cqo-action"><strong>{action} {icone}</strong></span>
        </li>
      ))}
    </ul>
  )
}

/* La phrase qui résume ce qu'on obtient, sous le titre du paywall, comme chez
   Taller (« Accès illimité à Taller : routine quotidienne… ») : grise, centrée,
   sans fond ni carte. 22/11/2026, demande de Samuel : dire que le plan est
   personnalisé et que la taille adulte prédite est incluse (dans le 1 mois et
   le 1 an). La ligne « Ce que tu obtiendras : » reste juste au-dessus des cartes. */
export function PhraseAcces() {
  return (
    <p className="cqo-acces">
        Un plan <em>personnalisé</em> : routine quotidienne, exercices et repas pour optimiser ta croissance, adaptés à toi. Et ta <em>taille adulte prédite</em>.
      </p>
  )
}
