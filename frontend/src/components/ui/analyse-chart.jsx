import { decelere, lisser } from '@/components/ui/growth-chart'

/**
 * Aperçu VERROUILLÉ de la courbe « Taille / Âge ».
 *
 * Cette figure ne trace AUCUNE donnée de l'utilisateur, et c'est délibéré.
 *
 * Elle vit sur un écran dont tout le principe est de montrer ce qu'on n'a pas
 * encore : la ligne « Optimise jusqu'à 🔒 cm », le frein principal, les onze
 * actions. Y dessiner la vraie trajectoire reviendrait à livrer en image ce
 * que les cadenas juste au-dessus disent garder — on lirait la forme, la
 * position du point, l'écart qui reste, sans jamais avoir payé.
 *
 * Le cadenas posé à côté du titre porte donc sur la figure entière : ce n'est
 * pas ta courbe, c'est la courbe que tu auras. Même statut qu'une capture
 * d'écran de démonstration.
 *
 * Les graduations de l'axe des âges sont floutées, jamais un chiffre réel : un
 * nombre flouté donne envie d'être gratté et laisse deviner sa longueur ; une
 * graduation floutée dit seulement que la lecture fine vient après.
 *
 * La géométrie est fixe — mêmes proportions pour tout le monde. Aucune
 * propriété à passer : le jour où quelqu'un voudra y brancher des données, il
 * devra le faire exprès plutôt que par inadvertance.
 */

const W = 320
const H = 150
const M = { top: 14, right: 10, bottom: 26, left: 10 }

/* Position du repère sur la courbe, en fraction de l'axe. Volontairement au
   tiers : assez avancé pour qu'on lise une progression déjà faite, assez tôt
   pour qu'il reste visiblement du chemin — ce que l'écran vend. */
const REPERE = 0.34

const x = (t) => M.left + t * (W - M.left - M.right)
const y = (v) => H - M.bottom - v * (H - M.top - M.bottom)

const PAS = 24
const points = []
for (let i = 0; i <= PAS; i += 1) {
  const t = i / PAS
  // Décélération douce : la silhouette d'une courbe de croissance, rien de plus.
  points.push([x(t), y(0.08 + decelere(t) * 0.84)])
}

const TRACE = lisser(points)
const AIRE = `${TRACE} L ${x(1).toFixed(2)} ${H - M.bottom} L ${x(0).toFixed(2)} ${H - M.bottom} Z`
const X_REPERE = x(REPERE)
const Y_REPERE = y(0.08 + decelere(REPERE) * 0.84)

export function AnalyseChart({ className }) {
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      role="img"
      aria-label="Aperçu verrouillé de la courbe taille sur âge. Les valeurs s’affichent avec le plan."
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
        {/* Flou posé en filtre plutôt qu'en opacité : on doit voir qu'il y a
            QUELQUE CHOSE d'illisible, et non un vide. */}
        <filter id="analyse-brouille">
          <feGaussianBlur stdDeviation="3.2" />
        </filter>
      </defs>

      {[0.2, 0.45, 0.7, 0.95].map((g) => (
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

      <path d={AIRE} fill="url(#analyse-aire)" stroke="none" />
      <path
        d={TRACE}
        fill="none"
        stroke="var(--funnel-accent, #ff5a1f)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      <line
        x1={X_REPERE}
        x2={X_REPERE}
        y1={M.top - 4}
        y2={H - M.bottom}
        stroke="var(--funnel-muted, #9a9a9a)"
        strokeWidth="1"
        strokeDasharray="3 4"
        opacity="0.7"
      />

      <circle
        cx={X_REPERE}
        cy={Y_REPERE}
        r="7"
        fill="var(--funnel-accent, #ff5a1f)"
        filter="url(#analyse-halo)"
      />
      <circle
        cx={X_REPERE}
        cy={Y_REPERE}
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
