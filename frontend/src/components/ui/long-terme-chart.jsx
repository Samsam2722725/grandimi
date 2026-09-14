import { decelere, lisser } from '@/components/ui/growth-chart'

/**
 * « Ta taille finale » : deux trajectoires depuis un même point de départ.
 *
 * Illustration, PAS une donnée de l'utilisateur — et c'est écrit sous la
 * figure. Elle est posée dans le questionnaire, avant même que le calcul soit
 * lancé : il n'existe encore aucun chiffre à tracer. Elle dit une chose vraie
 * et générale (beaucoup n'atteignent pas leur potentiel faute d'habitudes),
 * pas un pronostic personnel.
 *
 * Aucune graduation, aucun nombre : ajouter un axe chiffré à une illustration
 * la ferait lire comme un résultat. La seule chose que la figure doit
 * transmettre, c'est que l'écart se creuse avec le temps et se fige à la fin.
 *
 * Les deux couleurs sont celles de la page d'accueil et de la courbe du
 * résultat, avec le même sens partout : orange = potentiel atteint, indigo =
 * resté dessous. Le visiteur ne réapprend pas un code par écran.
 */

const SERIE_OPTIMISE = '#e4692f'
const SERIE_SUBIE = '#6f7ec9'

export function LongTermeChart({ className }) {
  const W = 320
  const H = 190
  const M = { top: 16, right: 18, bottom: 16, left: 18 }

  const PAS = 24
  const haute = []
  const basse = []

  for (let i = 0; i <= PAS; i += 1) {
    const t = i / PAS
    const px = M.left + t * (W - M.left - M.right)
    const plafond = H - M.bottom - decelere(t) * (H - M.top - M.bottom)
    haute.push([px, plafond])
    /* Même départ, même forme, arrivée plus basse : l'écart n'apparaît pas
       d'un coup, il se creuse — c'est exactement ce que le produit affirme.
       Le facteur croît avec t pour que les deux courbes soient confondues au
       départ, comme elles le sont dans la vie. */
    basse.push([px, H - M.bottom - decelere(t) * (H - M.top - M.bottom) * (1 - 0.26 * t)])
  }

  const aire = (courbe) =>
    `${lisser(courbe)} L ${W - M.right} ${H - M.bottom} L ${M.left} ${H - M.bottom} Z`

  const finHaute = haute[haute.length - 1]
  const finBasse = basse[basse.length - 1]

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Illustration : deux trajectoires de croissance partant du même point, celle des habitudes optimisées finissant plus haut que celle des habitudes subies."
        style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      >
        <defs>
          <linearGradient id="lt-haute" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIE_OPTIMISE} stopOpacity="0.32" />
            <stop offset="100%" stopColor={SERIE_OPTIMISE} stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id="lt-basse" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={SERIE_SUBIE} stopOpacity="0.3" />
            <stop offset="100%" stopColor={SERIE_SUBIE} stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {[0.25, 0.55, 0.85].map((g) => (
          <line
            key={g}
            x1={M.left}
            x2={W - M.right}
            y1={M.top + g * (H - M.top - M.bottom)}
            y2={M.top + g * (H - M.top - M.bottom)}
            stroke="var(--funnel-line, #2a2a2a)"
            strokeWidth="1"
          />
        ))}

        {/* La haute d'abord : son aire passe SOUS celle de la basse, sinon la
            zone commune prend deux fois la teinte et vire au brun. */}
        <path d={aire(haute)} fill="url(#lt-haute)" stroke="none" />
        <path d={aire(basse)} fill="url(#lt-basse)" stroke="none" />

        <path
          d={lisser(haute)}
          fill="none"
          stroke={SERIE_OPTIMISE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path
          d={lisser(basse)}
          fill="none"
          stroke={SERIE_SUBIE}
          strokeWidth="2.5"
          strokeLinecap="round"
        />

        <circle
          cx={M.left}
          cy={H - M.bottom}
          r="5.5"
          fill="var(--funnel-text, #fff)"
          stroke={SERIE_SUBIE}
          strokeWidth="2.5"
        />
        <circle
          cx={finHaute[0]}
          cy={finHaute[1]}
          r="5.5"
          fill="var(--funnel-text, #fff)"
          stroke={SERIE_OPTIMISE}
          strokeWidth="2.5"
        />
        <circle cx={finBasse[0]} cy={finBasse[1]} r="4" fill={SERIE_SUBIE} />
      </svg>

      <ul className="lt-legende">
        <li>
          <span className="lt-pastille" style={{ background: SERIE_SUBIE }} aria-hidden="true" />
          Habitudes subies
        </li>
        <li>
          <span className="lt-pastille" style={{ background: SERIE_OPTIMISE }} aria-hidden="true" />
          Routine optimisée
        </li>
      </ul>

      <figcaption className="lt-note">
        Illustration, pas une prédiction. Aucune méthode ne fait dépasser son
        potentiel génétique — ce qui se joue, c’est de l’atteindre.
      </figcaption>
    </figure>
  )
}

export default LongTermeChart
