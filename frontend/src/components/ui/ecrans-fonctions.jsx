/* Écrans « fonctionnalités » et « études » du questionnaire, sur le modèle
   de GoTall : un titre, un visuel, rien d'autre.

   CE QUI A CHANGÉ : ces écrans montraient de vraies captures de l'app
   (`/apercus/*.png`), en thème sombre — alors que le reste du tunnel est
   passé au papier clair (voir funnel.css). Deux univers visuels dans le
   même parcours cassaient la cohérence que le reste du tunnel construit
   écran après écran. Remplacées par des illustrations dessinées, dans le
   même langage que `reseau-neurones.jsx` / `ruche-potentiel.jsx` /
   `long-terme-chart.jsx` : du vecteur, pas des captures — ça s'anime et ça
   reste dans la peau du tunnel, comme le fait la concurrence sur ces
   écrans-là. Le plan du jour reprend des actions réelles du planner ; les
   deux nouvelles illustrations ci-dessous décrivent des mécanismes réels
   de l'app (cocher une séance, suivre sa taille), sans en simuler l'écran
   exact. Pas de logos d'institutions sur l'écran « études » : un logo
   laisse croire à une caution ; un résultat cité avec sa source, non. */

import { useEffect, useState } from 'react'
import { Check } from 'lucide-react'

import { decelere, lisser } from '@/components/ui/growth-chart'

const EXERCICES_SEANCE = [
  { texte: 'Suspension à la barre', duree: '5 × 15 s' },
  { texte: 'Étirement du dos', duree: '3 × 30 s' },
  { texte: 'Squats profonds', duree: '4 × 12' },
  { texte: 'Gainage', duree: '3 × 40 s' },
]

/* Les cases se cochent seules, l'une après l'autre : ça montre le
   mécanisme (cocher une séance) plutôt que de le décrire, sur le même
   principe que l'anneau de l'écran d'analyse (analyse-en-cours.jsx). */
export function FonctionExercices() {
  const total = EXERCICES_SEANCE.length
  const [fait, setFait] = useState(0)

  useEffect(() => {
    const reduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (reduit) {
      setFait(total)
      return undefined
    }

    let compte = 0
    const id = setInterval(() => {
      compte += 1
      setFait(Math.min(total, compte))
      if (compte >= total) clearInterval(id)
    }, 340)
    return () => clearInterval(id)
  }, [total])

  const avancement = fait / total
  const rayon = 42
  const circonference = 2 * Math.PI * rayon

  return (
    <div className="fonction-seance">
      <SilhouetteSeance />

      <div className="fonction-seance-anneau" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          <circle className="fs-anneau-piste" cx="50" cy="50" r={rayon} />
          <circle
            className="fs-anneau-arc"
            cx="50"
            cy="50"
            r={rayon}
            style={{
              strokeDasharray: circonference,
              strokeDashoffset: circonference * (1 - avancement),
            }}
          />
        </svg>
        <span className="fonction-seance-compte">
          {fait}/{total}
        </span>
      </div>

      <div className="fonction-plan">
        <ul>
          {EXERCICES_SEANCE.map(({ texte, duree }, index) => (
            <li key={texte} className={index < fait ? 'est-faite' : ''}>
              <span className="fonction-plan-case" aria-hidden="true">
                {index < fait ? <Check size={13} strokeWidth={3} /> : null}
              </span>
              <span className="fonction-plan-texte">{texte}</span>
              <span className="fonction-plan-duree">{duree}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

/* Silhouette en pictogramme plat — tête, tronc et membres en traits
   épais à bouts ronds, comme la pilule de sélection des molettes ou le
   point central des courbes. Volontairement PAS un rendu figuratif
   (pas de visage, pas de dégradé de peau) : un pictogramme reste dans
   le langage géométrique déjà établi par reseau-neurones.jsx et
   ruche-potentiel.jsx, là où une mascotte détaillée jurerait avec le
   reste du tunnel et risquerait de paraître bon marché. */
function SilhouetteSeance() {
  return (
    <svg
      className="fonction-seance-silhouette"
      viewBox="0 0 100 110"
      role="presentation"
      aria-hidden="true"
    >
      <ellipse className="fs-socle" cx="50" cy="100" rx="30" ry="6" />
      <g className="fs-corps">
        <circle cx="50" cy="17" r="9" />
        <path d="M50 27 V54" />
        <path d="M44 32 L31 49" />
        <path d="M56 32 L69 49" />
        <path d="M46 54 L35 68 L31 85" />
        <path d="M54 54 L66 68 L70 85" />
      </g>
    </svg>
  )
}

/* Illustration, pas une donnée de l'utilisateur — même principe que
   long-terme-chart.jsx : à cet endroit du tunnel, aucune mesure de suivi
   n'existe encore. La courbe et le « +14 cm » décrivent ce que l'écran de
   suivi affichera plus tard dans l'app, pas un résultat déjà calculé. */
export function FonctionSuivi() {
  const W = 320
  const H = 170
  const M = { top: 18, right: 20, bottom: 18, left: 20 }

  const PAS = 20
  const courbe = []
  for (let i = 0; i <= PAS; i += 1) {
    const t = i / PAS
    const px = M.left + t * (W - M.left - M.right)
    const py = H - M.bottom - decelere(t) * (H - M.top - M.bottom)
    courbe.push([px, py])
  }
  const depart = courbe[0]
  const fin = courbe[courbe.length - 1]
  const aire = `${lisser(courbe)} L ${W - M.right} ${H - M.bottom} L ${M.left} ${H - M.bottom} Z`

  return (
    <div className="fonction-suivi">
      {/* Trois pastilles qui s'empilent avant la courbe : chaque semaine
         suivie nourrit la mesure suivante. Purement décoratif — aucun
         chiffre ici n'est une donnée, contrairement au reste de l'écran. */}
      <ul className="fonction-suivi-semaines" aria-hidden="true">
        <li>Semaine 1</li>
        <li>Semaine 2</li>
        <li>Semaine 3</li>
      </ul>

      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Illustration : courbe de suivi de taille au fil des mois, avec un point final mis en avant."
        style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="fs-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--funnel-accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--funnel-accent)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.3, 0.68].map((g) => (
          <line
            key={g}
            x1={M.left}
            x2={W - M.right}
            y1={M.top + g * (H - M.top - M.bottom)}
            y2={M.top + g * (H - M.top - M.bottom)}
            stroke="var(--funnel-line)"
            strokeWidth="1"
          />
        ))}

        <path className="lt-aire" d={aire} fill="url(#fs-aire)" stroke="none" />
        <path
          className="lt-ligne"
          pathLength="1"
          d={lisser(courbe)}
          fill="none"
          stroke="var(--funnel-accent-display)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle
          className="lt-point"
          cx={depart[0]}
          cy={depart[1]}
          r="4.5"
          fill="var(--funnel-text)"
          stroke="var(--funnel-accent-display)"
          strokeWidth="2"
        />
        <circle
          className="lt-point"
          cx={fin[0]}
          cy={fin[1]}
          r="5.5"
          fill="var(--funnel-accent-display)"
          stroke="var(--funnel-bg)"
          strokeWidth="2.5"
        />
      </svg>

      <div className="fonction-suivi-figure">
        <span className="fonction-suivi-chiffre">+14</span>
        <span className="fonction-suivi-legende">cm suivis</span>
      </div>

      <p className="fonction-suivi-note">
        Illustration : ta courbe personnelle apparaît une fois ton suivi commencé
        dans l’application.
      </p>
    </div>
  )
}

const ACTIONS_DU_JOUR = [
  { texte: 'Suspension à la barre', duree: '5 × 15 s', faite: true },
  { texte: 'Petit-déjeuner avec protéines', duree: 'matin', faite: true },
  { texte: 'Séance du mois : dos et hanches', duree: '10 min', faite: false },
  { texte: 'Écrans coupés 45 min avant de dormir', duree: '22 h', faite: false },
]

export function FonctionPlan() {
  return (
    <div className="fonction-plan">
      <ul>
        {ACTIONS_DU_JOUR.map(({ texte, duree, faite }) => (
          <li key={texte} className={faite ? 'est-faite' : ''}>
            <span className="fonction-plan-case" aria-hidden="true">
              {faite ? '✓' : ''}
            </span>
            <span className="fonction-plan-texte">{texte}</span>
            <span className="fonction-plan-duree">{duree}</span>
          </li>
        ))}
      </ul>
      <p className="fonction-plan-plus">+ 7 autres actions aujourd’hui</p>
    </div>
  )
}

const ETUDES = [
  {
    resultat: 'L’hormone de croissance est surtout libérée pendant le sommeil profond.',
    source: 'Takahashi, Kipnis et Daughaday — Journal of Clinical Investigation, 1968',
  },
  {
    resultat:
      'La taille adulte est héréditaire à 68–93 % selon le pays et le sexe. Le reste dépend de l’environnement.',
    source: 'Silventoinen et al. — Twin Research, 2003',
  },
  {
    resultat:
      'La taille adulte s’estime sans radiographie, à partir de ta taille, ton poids et celle de tes parents.',
    source: 'Khamis et Roche — Pediatrics, 1994',
  },
]

export function EtudesPubliees() {
  return (
    <div className="etudes">
      <ul>
        {ETUDES.map(({ resultat, source }) => (
          <li key={source}>
            <p className="etudes-resultat">{resultat}</p>
            <p className="etudes-source">{source}</p>
          </li>
        ))}
      </ul>
      <p className="etudes-note">Études publiées, citées pour leurs résultats. Aucune n’a évalué Grandimi.</p>
    </div>
  )
}
