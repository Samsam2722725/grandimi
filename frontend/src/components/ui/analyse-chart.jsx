import { decelere, lisser } from '@/components/ui/growth-chart'

/**
 * Aperçu VERROUILLÉ de la courbe « Taille / Âge ».
 *
 * Cette figure ne trace AUCUNE donnée calculée par le modèle, et c'est
 * délibéré.
 *
 * Elle vit sur un écran dont tout le principe est de montrer ce qu'on n'a pas
 * encore : la taille potentielle, la ligne « Optimise jusqu'à 🔒 cm », ce qui
 * freine, la chance d'atteindre la taille rêvée. Y dessiner la vraie
 * trajectoire reviendrait à livrer en image ce que les cadenas juste au-dessus
 * disent garder — on lirait la forme, la position du point, l'écart qui reste,
 * sans jamais avoir payé.
 *
 * Le cadenas posé à côté du titre porte donc sur la figure entière : ce n'est
 * pas ta courbe, c'est la courbe que tu auras. Même statut qu'une capture
 * d'écran de démonstration.
 *
 * LA SEULE DONNÉE ACCEPTÉE EST L'ÂGE SAISI. La capture GoTall pose une
 * pastille d'âge sous le repère ; c'est SA réponse, au même titre que la
 * taille du jour affichée en clair deux blocs plus haut, et elle ne laisse
 * rien reconstituer. L'axe vertical, lui, est gradué « 100 % / 🔒 % / 0 % » :
 * la valeur qui compte est la seule à manquer.
 *
 * Les graduations de l'axe des âges sont floutées, jamais un chiffre réel : un
 * nombre flouté donne envie d'être gratté et laisse deviner sa longueur ; une
 * graduation floutée dit seulement que la lecture fine vient après.
 *
 * La géométrie est fixe — mêmes proportions pour tout le monde.
 */

const W = 320
/* La hauteur du viewBox EST la hauteur rendue, au rapport près : le SVG fait
   la largeur de sa carte et le navigateur en déduit le reste. C'est donc ici
   que se règle le poste le plus cher de l'écran, qui doit tenir sans
   défilement — 168 laissait le bas de la page sous le pli sur un téléphone
   de 667 px de haut. 94 garde la courbe lisible — c'est la hauteur sous
   laquelle l'axe vertical, la courbe et la pastille d'âge cessent de tenir
   sans se toucher — et rend soixante-dix pixels à la page. */
const H = 94
/* Marge gauche large : elle loge « 100 % » et le cadenas de l'axe vertical.
   Marge basse : la pastille d'âge passe SOUS les graduations floutées.
   Marge haute réduite à 8 : le sommet de la courbe n'a besoin que de la
   place de son trait. */
const M = { top: 6, right: 12, bottom: 28, left: 42 }

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

/* Graduations d'âge. Celles qui tomberaient sous la pastille sont retirées :
   deux formes superposées se lisent comme un défaut d'affichage, pas comme un
   masquage volontaire. */
const GRADUATIONS = [0.06, 0.24, 0.42, 0.6, 0.78, 0.94].filter(
  (p) => Math.abs(p - REPERE) > 0.12,
)

export function AnalyseChart({ className, age = null }) {
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

      {/* Axe vertical : les deux bornes sont lisibles, la valeur du repère
          est la seule sous cadenas. */}
      <text
        x={M.left - 8}
        y={M.top + 4}
        textAnchor="end"
        fontSize="10.5"
        fontWeight="600"
        fill="var(--funnel-muted, #9a9a9a)"
      >
        100 %
      </text>
      <text
        x={M.left - 8}
        y={Y_REPERE + 4}
        textAnchor="end"
        fontSize="10.5"
        fontWeight="700"
        fill="var(--funnel-accent, #ff5a1f)"
      >
        🔒 %
      </text>
      <text
        x={M.left - 8}
        y={H - M.bottom + 4}
        textAnchor="end"
        fontSize="10.5"
        fontWeight="600"
        fill="var(--funnel-muted, #9a9a9a)"
      >
        0 %
      </text>

      <path d={AIRE} fill="url(#analyse-aire)" stroke="none" />
      <path
        d={TRACE}
        fill="none"
        stroke="var(--funnel-accent, #ff5a1f)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />

      {/* Conduite du cadenas de l'axe jusqu'au repère : sans elle, le « 🔒 % »
          flotte à gauche sans désigner quoi que ce soit. */}
      <line
        x1={M.left}
        x2={X_REPERE}
        y1={Y_REPERE}
        y2={Y_REPERE}
        stroke="var(--funnel-accent, #ff5a1f)"
        strokeWidth="1"
        strokeDasharray="4 4"
        opacity="0.75"
      />

      <line
        x1={X_REPERE}
        x2={X_REPERE}
        y1={Y_REPERE}
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
        {GRADUATIONS.map((p) => (
          <rect
            key={p}
            x={M.left + p * (W - M.left - M.right)}
            y={H - M.bottom + 10}
            width="18"
            height="7"
            rx="3.5"
            fill="var(--funnel-muted, #9a9a9a)"
          />
        ))}
      </g>

      {/* Pastille d'âge — l'âge saisi, seule graduation lisible de l'axe. */}
      {age !== null && (
        <g>
          <rect
            x={X_REPERE - 15}
            y={H - M.bottom + 7}
            width="30"
            height="19"
            rx="7"
            fill="var(--funnel-accent, #ff5a1f)"
          />
          <text
            x={X_REPERE}
            y={H - M.bottom + 20}
            textAnchor="middle"
            fontSize="11.5"
            fontWeight="700"
            fill="var(--funnel-on-accent, #17120e)"
          >
            {age}
          </text>
        </g>
      )}
    </svg>
  )
}

export default AnalyseChart
