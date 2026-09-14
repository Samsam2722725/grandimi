import { decelere, lisser } from '@/components/ui/growth-chart'

/**
 * Courbe « Taille / Âge » de l'écran d'analyse.
 *
 * Reprise de la figure de l'écran « Analyse prête » de Taller : une courbe
 * unique avec son aire remplie, un point lumineux sur la position du jour, un
 * filet vertical en tirets, et la fin de la courbe qui se poursuit hors du
 * point. Les graduations de l'axe des âges sont FLOUTÉES — c'est un écran de
 * teasing, il montre la forme sans livrer les valeurs.
 *
 * Ce qui est vrai ici : le point du jour est à sa vraie position dans le temps
 * (entre l'âge actuel et la fin de croissance) et à sa vraie hauteur. La
 * courbe elle-même est une interpolation d'affichage, comme partout ailleurs
 * sur le site — elle ne prétend pas donner une taille année par année.
 *
 * Le flou porte sur l'axe, jamais sur un chiffre réel : un nombre flouté donne
 * envie d'être gratté et laisse deviner sa longueur ; une graduation floutée
 * dit seulement « la lecture fine vient après ».
 */
export function AnalyseChart({ ageNow, ageFin, heightNow, predicted, className }) {
  const W = 320
  const H = 150
  const M = { top: 14, right: 10, bottom: 26, left: 10 }

  const debut = Math.max(8, Number(ageNow) - 6)
  const fin = Number(ageFin)
  const bas = Number(heightNow) - (Number(heightNow) - 100) * 0.55
  const haut = Number(predicted) + 4

  const x = (age) => M.left + ((age - debut) / (fin - debut)) * (W - M.left - M.right)
  const y = (cm) => H - M.bottom - ((cm - bas) / (haut - bas)) * (H - M.top - M.bottom)

  /* La courbe couvre TOUT l'axe, passé compris : c'est ce qui donne à l'écran
     sa silhouette de courbe de croissance. Avant le point du jour elle monte
     vers la mesure connue, après elle décélère vers l'estimation. */
  const PAS = 22
  const points = []
  for (let i = 0; i <= PAS; i += 1) {
    const t = i / PAS
    const age = debut + t * (fin - debut)
    if (age <= ageNow) {
      const u = (age - debut) / (ageNow - debut || 1)
      points.push([x(age), y(bas + (heightNow - bas) * decelere(u) * 0.92)])
    } else {
      const u = (age - ageNow) / (fin - ageNow || 1)
      points.push([x(age), y(heightNow + (predicted - heightNow) * decelere(u))])
    }
  }

  const trace = lisser(points)
  const aire = `${trace} L ${x(fin).toFixed(2)} ${H - M.bottom} L ${x(debut).toFixed(2)} ${H - M.bottom} Z`

  const xJour = x(ageNow)
  const yJour = y(heightNow)

  const graduations = [0.2, 0.45, 0.7, 0.95]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Courbe de croissance taille sur âge, position actuelle marquée."
      className={className}
      style={{ display: 'block', height: 'auto' }}
    >
      <defs>
        <linearGradient id="analyse-aire" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--funnel-accent, #ff5a1f)" stopOpacity="0.38" />
          <stop offset="100%" stopColor="var(--funnel-accent, #ff5a1f)" stopOpacity="0.02" />
        </linearGradient>
        <filter id="analyse-halo" x="-120%" y="-120%" width="340%" height="340%">
          <feGaussianBlur stdDeviation="4" result="flou" />
          <feMerge>
            <feMergeNode in="flou" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Le flou des graduations : posé en filtre plutôt qu'en opacité, pour
            qu'on voie qu'il y a QUELQUE CHOSE d'illisible et non un vide. */}
        <filter id="analyse-brouille">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {graduations.map((g) => (
        <line
          key={g}
          x1={M.left}
          x2={W - M.right}
          y1={M.top + g * (H - M.top - M.bottom)}
          y2={M.top + g * (H - M.top - M.bottom)}
          stroke="var(--funnel-line, #2a2a2a)"
          strokeWidth="1"
          strokeDasharray="3 5"
        />
      ))}

      <path d={aire} fill="url(#analyse-aire)" stroke="none" />
      <path
        d={trace}
        fill="none"
        stroke="var(--funnel-accent, #ff5a1f)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <line
        x1={xJour}
        x2={xJour}
        y1={M.top - 4}
        y2={H - M.bottom}
        stroke="var(--funnel-muted, #9a9a9a)"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.7"
      />

      <circle cx={xJour} cy={yJour} r="7" fill="var(--funnel-accent, #ff5a1f)" filter="url(#analyse-halo)" />
      <circle
        cx={xJour}
        cy={yJour}
        r="5.5"
        fill="var(--funnel-text, #fff)"
        stroke="var(--funnel-accent, #ff5a1f)"
        strokeWidth="2.5"
      />

      {/* Graduations d'âge, volontairement illisibles. */}
      <g filter="url(#analyse-brouille)" opacity="0.55">
        {[0.06, 0.24, 0.42, 0.6, 0.78, 0.94].map((p) => (
          <rect
            key={p}
            x={M.left + p * (W - M.left - M.right)}
            y={H - M.bottom + 8}
            width="18"
            height="7"
            rx="3.5"
            fill="var(--funnel-muted, #9a9a9a)"
          />
        ))}
      </g>
    </svg>
  )
}

export default AnalyseChart
