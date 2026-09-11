/* ============================================================
   COURBES DE CROISSANCE
   ============================================================
   Deux figures, deux statuts très différents — et c'est le point important :

   1. `GrowthTrajectoryChart` trace des DONNÉES. Deux points réels (ta mesure
      d'aujourd'hui, l'estimation adulte) et la fourchette du modèle. La courbe
      entre les deux est une trajectoire, pas une prédiction année par année :
      c'est écrit sous le graphique, et c'est pour ça qu'il n'y a ni infobulle
      ni lecture au survol. Un curseur qui annoncerait « à 15 ans : 171 cm »
      présenterait une interpolation comme un résultat de modèle.

   2. `PotentialComparisonChart` est une ILLUSTRATION, étiquetée comme telle.
      Elle ne montre pas ce que Grandimi fait gagner — personne ne fait gagner
      de centimètres — mais l'écart entre atteindre son potentiel et rester en
      dessous. C'est exactement ce que dit la FAQ du site.

   Couleurs : la paire à deux séries (#e4692f / #6f7ec9) est passée par le
   validateur du design system sur fond #141414 — bande de clarté, plancher de
   chroma, séparation daltonienne (ΔE 22 protan) et contraste : tout passe.
   L'orange de marque #ff5a1f sort de la bande de clarté catégorielle ; il reste
   donc réservé à la série UNIQUE de la trajectoire, où la règle ne s'applique
   pas (contraste mesuré 6,1:1 sur la surface des cartes).
   ============================================================ */

const SERIE_SOUS_POTENTIEL = '#6f7ec9'
const SERIE_POTENTIEL = '#e4692f'
const SERIE_TRAJECTOIRE = '#ff5a1f'

/**
 * Courbe lissée passant par une liste de points.
 * Catmull-Rom converti en Bézier cubique : une polyligne donnerait des angles
 * là où la croissance ralentit progressivement.
 */
function lisser(points, sansDepart = false) {
  if (points.length < 2) return ''
  let d = sansDepart ? '' : `M ${points[0][0]} ${points[0][1]}`
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] || points[i]
    const p1 = points[i]
    const p2 = points[i + 1]
    const p3 = points[i + 2] || p2
    const c1x = p1[0] + (p2[0] - p0[0]) / 6
    const c1y = p1[1] + (p2[1] - p0[1]) / 6
    const c2x = p2[0] - (p3[0] - p1[0]) / 6
    const c2y = p2[1] - (p3[1] - p1[1]) / 6
    d += ` C ${c1x.toFixed(2)} ${c1y.toFixed(2)}, ${c2x.toFixed(2)} ${c2y.toFixed(2)}, ${p2[0].toFixed(2)} ${p2[1].toFixed(2)}`
  }
  return d
}

/* La croissance ralentit : la part de progression déjà faite suit une
   décélération, pas une droite. `1-(1-t)^2` reproduit cette forme sans
   prétendre modéliser quoi que ce soit — c'est une interpolation d'affichage. */
const decelere = (t) => 1 - (1 - t) * (1 - t)

const AGE_FIN = { M: 18.5, F: 16.5 }

/**
 * Trajectoire réelle : de la mesure d'aujourd'hui à l'estimation adulte,
 * avec la fourchette qui s'ouvre à mesure qu'on s'éloigne de la mesure.
 */
export function GrowthTrajectoryChart({
  ageNow,
  heightNow,
  predicted,
  rangeMin,
  rangeMax,
  sex = 'M',
  className,
}) {
  const W = 360
  const H = 210
  const M = { top: 22, right: 58, bottom: 30, left: 38 }

  const ageFin = Math.max(Number(ageNow) + 0.5, AGE_FIN[sex] ?? 18)
  const bas = Math.min(heightNow, rangeMin) - 3
  const haut = Math.max(predicted, rangeMax) + 3

  const x = (age) =>
    M.left + ((age - ageNow) / (ageFin - ageNow)) * (W - M.left - M.right)
  const y = (cm) => H - M.bottom - ((cm - bas) / (haut - bas)) * (H - M.top - M.bottom)

  const PAS = 16
  const central = []
  const hautBande = []
  const basBande = []

  for (let i = 0; i <= PAS; i++) {
    const t = i / PAS
    const age = ageNow + t * (ageFin - ageNow)
    const part = decelere(t)
    central.push([x(age), y(heightNow + (predicted - heightNow) * part)])
    // La fourchette part de zéro : aujourd'hui la taille est mesurée, pas
    // estimée. Elle ne s'ouvre qu'en s'éloignant de cette mesure.
    hautBande.push([x(age), y(heightNow + (rangeMax - heightNow) * part)])
    basBande.push([x(age), y(heightNow + (rangeMin - heightNow) * part)])
  }

  /* Aire fermée : aller sur la courbe haute, descendre au dernier point bas,
     revenir sur la courbe basse. Le second `lisser` omet son `M` pour rester
     dans le même sous-chemin — sinon la forme se scinde en deux et le
     remplissage se comporte n'importe comment. */
  const dernierBas = basBande[basBande.length - 1]
  const aireBande = [
    lisser(hautBande),
    `L ${dernierBas[0].toFixed(2)} ${dernierBas[1].toFixed(2)}`,
    lisser([...basBande].reverse(), true),
    'Z',
  ].join(' ')

  const graduations = [bas + (haut - bas) * 0.15, bas + (haut - bas) * 0.55, haut - 2]

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={`Trajectoire de croissance : ${heightNow} cm à ${ageNow} ans, environ ${predicted} cm à l’âge adulte, dans une fourchette de ${rangeMin} à ${rangeMax} cm.`}
        style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      >
        {/* Grille : filets pleins d'un cran au-dessus de la surface. Jamais en
            pointillés — le tireté ajoute du bruit et se lit comme une donnée. */}
        {graduations.map((cm) => (
          <g key={cm}>
            <line
              x1={M.left}
              x2={W - M.right}
              y1={y(cm)}
              y2={y(cm)}
              stroke="var(--funnel-line, #2a2a2a)"
              strokeWidth="1"
            />
            <text
              x={M.left - 8}
              y={y(cm) + 4}
              textAnchor="end"
              fontSize="10"
              fill="var(--funnel-muted, #9a9a9a)"
            >
              {Math.round(cm)}
            </text>
          </g>
        ))}

        {/* Fourchette : lavis à ~12 %, jamais un aplat saturé. */}
        <path d={aireBande} fill={SERIE_TRAJECTOIRE} fillOpacity="0.12" stroke="none" />

        <path
          d={lisser(central)}
          fill="none"
          stroke={SERIE_TRAJECTOIRE}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Points d'extrémité : 8px avec un anneau de 2px dans la couleur de
            surface, pour qu'ils se détachent de la bande sous eux. */}
        <circle
          cx={x(ageNow)}
          cy={y(heightNow)}
          r="4.5"
          fill={SERIE_TRAJECTOIRE}
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />
        <circle
          cx={x(ageFin)}
          cy={y(predicted)}
          r="4.5"
          fill="var(--funnel-text, #fff)"
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />

        {/* Étiquettes directes aux deux seuls points réels — pas de valeur sur
            chaque pas de la courbe. Le texte porte les jetons de texte, pas la
            couleur de série. */}
        <text
          x={M.left}
          y={y(heightNow) + 20}
          fontSize="11"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          aujourd’hui
        </text>
        <text
          x={W - M.right + 8}
          y={y(predicted) - 2}
          fontSize="13"
          fontWeight="700"
          fill="var(--funnel-text, #fff)"
        >
          {predicted}
        </text>
        <text
          x={W - M.right + 8}
          y={y(predicted) + 13}
          fontSize="10"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          cm
        </text>

        <text
          x={M.left}
          y={H - 10}
          textAnchor="middle"
          fontSize="10"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          {ageNow} ans
        </text>
        <text
          x={W - M.right}
          y={H - 10}
          textAnchor="middle"
          fontSize="10"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          {ageFin} ans
        </text>
      </svg>

      <figcaption
        style={{
          fontSize: '13px',
          lineHeight: 1.45,
          color: 'var(--funnel-muted, #9a9a9a)',
          marginTop: '12px',
        }}
      >
        Deux points sont réels : ta mesure d’aujourd’hui et l’estimation adulte. La
        courbe entre les deux montre la trajectoire, pas une taille année par année.
        La zone colorée est la fourchette — elle s’ouvre en s’éloignant de la mesure.
      </figcaption>
    </figure>
  )
}

/**
 * Illustration à deux courbes : atteindre son potentiel, ou rester dessous.
 * Aucune donnée utilisateur — l'étiquette le dit explicitement.
 */
export function PotentialComparisonChart({ className }) {
  const W = 360
  const H = 190
  const M = { top: 18, right: 16, bottom: 20, left: 16 }

  const PAS = 20
  const hautCourbe = []
  const basCourbe = []
  for (let i = 0; i <= PAS; i++) {
    const t = i / PAS
    const px = M.left + t * (W - M.left - M.right)
    // Même point de départ, deux décélérations : l'écart se creuse avec le
    // temps, il n'apparaît pas d'un coup.
    hautCourbe.push([px, H - M.bottom - decelere(t) * (H - M.top - M.bottom)])
    basCourbe.push([px, H - M.bottom - decelere(t) * (H - M.top - M.bottom) * 0.72])
  }

  const aire = (courbe) =>
    `${lisser(courbe)} L ${W - M.right} ${H - M.bottom} L ${M.left} ${H - M.bottom} Z`

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label="Illustration : deux trajectoires de croissance partant du même point, l’une atteignant le potentiel génétique, l’autre restant en dessous."
        style={{ display: 'block', height: 'auto' }}
      >
        <line
          x1={M.left}
          x2={W - M.right}
          y1={H - M.bottom}
          y2={H - M.bottom}
          stroke="var(--funnel-line, #2a2a2a)"
          strokeWidth="1"
        />

        <path d={aire(hautCourbe)} fill={SERIE_POTENTIEL} fillOpacity="0.1" />
        <path d={aire(basCourbe)} fill={SERIE_SOUS_POTENTIEL} fillOpacity="0.1" />

        <path
          d={lisser(basCourbe)}
          fill="none"
          stroke={SERIE_SOUS_POTENTIEL}
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d={lisser(hautCourbe)}
          fill="none"
          stroke={SERIE_POTENTIEL}
          strokeWidth="2"
          strokeLinecap="round"
        />

        <circle
          cx={M.left}
          cy={H - M.bottom}
          r="4.5"
          fill="var(--funnel-text, #fff)"
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />
        <circle
          cx={W - M.right}
          cy={M.top}
          r="4.5"
          fill={SERIE_POTENTIEL}
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />
        <circle
          cx={W - M.right}
          cy={basCourbe[PAS][1]}
          r="4.5"
          fill={SERIE_SOUS_POTENTIEL}
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />
      </svg>

      {/* Légende obligatoire dès deux séries : l'identité ne doit jamais tenir
          à la seule couleur. */}
      <ul className="chart-legend">
        <li>
          <span style={{ background: SERIE_POTENTIEL }} aria-hidden="true" />
          Potentiel atteint
        </li>
        <li>
          <span style={{ background: SERIE_SOUS_POTENTIEL }} aria-hidden="true" />
          Potentiel non atteint
        </li>
      </ul>

      <figcaption className="chart-caption">
        Illustration, pas une prédiction. Aucune méthode ne fait dépasser son
        potentiel génétique — ce qui se joue, c’est de l’atteindre plutôt que de
        rester en dessous.
      </figcaption>
    </figure>
  )
}
