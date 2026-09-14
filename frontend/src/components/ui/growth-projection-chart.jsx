import {
  SERIE_POTENTIEL,
  SERIE_SOUS_POTENTIEL,
  ageFinCroissance,
  decelere,
  frAge,
  lisser,
} from '@/components/ui/growth-chart'

/**
 * Projection à deux trajectoires : là où les habitudes actuelles mènent, et là
 * où elles pourraient mener.
 *
 * Cette figure n'était pas dessinable avant que l'estimateur renvoie
 * `potential_height_cm`. Une seconde courbe sans second chiffre aurait été une
 * invention graphique — exactement ce que le produit refuse ailleurs.
 *
 * TROIS CHOSES SONT MESURÉES, ET RIEN D'AUTRE :
 *   1. le point de l'an dernier, reconstruit par une soustraction depuis les
 *      centimètres qu'il a déclaré avoir pris ;
 *   2. sa mesure d'aujourd'hui ;
 *   3. les deux estimations adultes, sorties du même calcul.
 * Le tracé entre ces points est une interpolation d'affichage, et la légende
 * le dit. C'est aussi pourquoi il n'y a ni infobulle ni lecture au survol :
 * un curseur qui annoncerait « à 15 ans : 171 cm » présenterait une
 * interpolation comme un résultat de modèle.
 *
 * Les deux couleurs sont celles de l'illustration de la page d'accueil et
 * portent le même sens — orange : potentiel atteint, indigo : resté dessous.
 * Le visiteur qui a lu la landing n'a pas de nouveau code à apprendre.
 *
 * Quand les deux estimations coïncident (habitudes déjà à la cible), la
 * seconde courbe disparaît. Superposer deux traits donnerait à lire un écart
 * minuscule là où il n'y en a aucun.
 */
export function GrowthProjectionChart({
  ageNow,
  heightNow,
  predicted,
  potentiel,
  velocityCM,
  sex = 'M',
  className,
}) {
  const W = 360
  const H = 220
  const M = { top: 26, right: 66, bottom: 32, left: 38 }

  const ageFin = ageFinCroissance(ageNow, sex)

  /* Le passé n'est tracé que s'il est mesuré. `velocityCM` vient de l'écran
     « combien as-tu pris depuis l'an dernier », qui est facultatif : sans
     réponse, la courbe commence aujourd'hui plutôt que de reculer d'un an sur
     une vitesse moyenne inventée. */
  const vitesse = Number(velocityCM)
  const aPasse = Number.isFinite(vitesse) && vitesse > 0
  const agePasse = aPasse ? ageNow - 1 : ageNow
  const heightPasse = aPasse ? heightNow - vitesse : heightNow

  const cible = Math.max(Number(potentiel) || 0, predicted)
  /* Un demi-centimètre d'écart s'affiche en « 0 cm » une fois arrondi : sous ce
     seuil, deux courbes ne racontent rien que le lecteur puisse vérifier. */
  const deuxCourbes = cible - predicted >= 0.5

  const bas = Math.min(heightPasse, heightNow) - 3
  const haut = cible + 4

  const x = (age) =>
    M.left + ((age - agePasse) / (ageFin - agePasse)) * (W - M.left - M.right)
  const y = (cm) => H - M.bottom - ((cm - bas) / (haut - bas)) * (H - M.top - M.bottom)

  // Même départ, même décélération, deux arrivées.
  const PAS = 16
  const projection = (arrivee) => {
    const points = []
    for (let i = 0; i <= PAS; i += 1) {
      const t = i / PAS
      const age = ageNow + t * (ageFin - ageNow)
      points.push([x(age), y(heightNow + (arrivee - heightNow) * decelere(t))])
    }
    return points
  }

  const courbeActuelle = projection(predicted)
  const courbeOptimisee = projection(cible)

  /* Aire entre les deux trajectoires : c'est elle, et elle seule, que le plan
     vend. Fermée en redescendant sur la courbe basse inversée, dans le même
     sous-chemin (d'où le second argument de `lisser`) — sinon la forme se
     scinde et le remplissage part n'importe où. */
  const dernierBas = courbeActuelle[courbeActuelle.length - 1]
  const aireEcart = [
    lisser(courbeOptimisee),
    `L ${dernierBas[0].toFixed(2)} ${dernierBas[1].toFixed(2)}`,
    lisser([...courbeActuelle].reverse(), true),
    'Z',
  ].join(' ')

  const graduations = [bas + (haut - bas) * 0.12, bas + (haut - bas) * 0.56, haut - 2]

  /* Les deux étiquettes de droite sont posées sur la valeur de leur courbe.
     Quand l'écart est faible — un ou deux centimètres, ce qui est le cas le
     plus fréquent — leurs deux lignes de texte se superposent et on ne lit
     plus ni l'une ni l'autre.

     On sépare donc les ÉTIQUETTES sans toucher aux POINTS : les pastilles
     restent exactement sur la valeur qu'elles désignent, seul le texte
     s'écarte. L'inverse (déplacer les points) mentirait sur la figure.

     34 unités du viewBox. Mesuré, pas estimé : le couple valeur + légende
     occupe environ 28 unités (la valeur monte de ~13 au-dessus de sa ligne de
     base, la légende descend de ~14 sous elle), et 26 laissait encore deux
     pixels de recouvrement à l écran. */
  const ECART_MIN_ETIQUETTES = 34
  const yPredicted = y(predicted)
  let yCible = y(cible)
  if (deuxCourbes && yPredicted - yCible < ECART_MIN_ETIQUETTES) {
    yCible = yPredicted - ECART_MIN_ETIQUETTES
  }

  const resume = deuxCourbes
    ? `Projection de croissance : ${Math.round(heightNow)} cm a ${frAge(ageNow)} ans, environ ${Math.round(predicted)} cm a l age adulte avec les habitudes actuelles, jusqu a ${Math.round(cible)} cm avec les trois leviers a la cible.`
    : `Projection de croissance : ${Math.round(heightNow)} cm a ${frAge(ageNow)} ans, environ ${Math.round(predicted)} cm a l age adulte.`

  return (
    <figure className={className} style={{ margin: 0 }}>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        role="img"
        aria-label={resume}
        style={{ display: 'block', height: 'auto', overflow: 'visible' }}
      >
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

        {deuxCourbes && (
          <path d={aireEcart} fill={SERIE_POTENTIEL} fillOpacity="0.16" stroke="none" />
        )}

        {/* Le passé : trait sobre, sans couleur de série. Ce n'est pas une
            projection, c'est le chemin déjà parcouru — il ne doit pas disputer
            le regard à ce qui reste à jouer. */}
        {aPasse && (
          <path
            d={`M ${x(agePasse).toFixed(2)} ${y(heightPasse).toFixed(2)} L ${x(ageNow).toFixed(2)} ${y(heightNow).toFixed(2)}`}
            fill="none"
            stroke="var(--funnel-muted, #9a9a9a)"
            strokeWidth="2"
            strokeLinecap="round"
          />
        )}

        {deuxCourbes && (
          <path
            d={lisser(courbeOptimisee)}
            fill="none"
            stroke={SERIE_POTENTIEL}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        <path
          d={lisser(courbeActuelle)}
          fill="none"
          stroke={deuxCourbes ? SERIE_SOUS_POTENTIEL : SERIE_POTENTIEL}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Frontière entre ce qui est mesuré et ce qui est projeté. C'est la
            seule ligne de la figure qui porte cette information. */}
        <line
          x1={x(ageNow)}
          x2={x(ageNow)}
          y1={M.top - 6}
          y2={H - M.bottom}
          stroke="var(--funnel-line, #2a2a2a)"
          strokeWidth="1"
        />

        {aPasse && (
          <circle
            cx={x(agePasse)}
            cy={y(heightPasse)}
            r="3.5"
            fill="var(--funnel-muted, #9a9a9a)"
            stroke="var(--funnel-surface, #141414)"
            strokeWidth="2"
          />
        )}

        <circle
          cx={x(ageNow)}
          cy={y(heightNow)}
          r="4.5"
          fill="var(--funnel-text, #fff)"
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />

        <circle
          cx={x(ageFin)}
          cy={y(predicted)}
          r="4.5"
          fill={deuxCourbes ? SERIE_SOUS_POTENTIEL : SERIE_POTENTIEL}
          stroke="var(--funnel-surface, #141414)"
          strokeWidth="2"
        />

        {deuxCourbes && (
          <>
            <circle
              cx={x(ageFin)}
              cy={y(cible)}
              r="4.5"
              fill={SERIE_POTENTIEL}
              stroke="var(--funnel-surface, #141414)"
              strokeWidth="2"
            />
            <text
              x={W - M.right + 8}
              y={yCible - 1}
              fontSize="13"
              fontWeight="700"
              fill={SERIE_POTENTIEL}
            >
              {Math.round(cible)}
            </text>
            <text
              x={W - M.right + 8}
              y={yCible + 12}
              fontSize="9.5"
              fill="var(--funnel-muted, #9a9a9a)"
            >
              optimisé
            </text>
          </>
        )}

        <text
          x={W - M.right + 8}
          y={yPredicted - 1}
          fontSize="13"
          fontWeight="700"
          fill={deuxCourbes ? SERIE_SOUS_POTENTIEL : 'var(--funnel-text, #fff)'}
        >
          {Math.round(predicted)}
        </text>
        <text
          x={W - M.right + 8}
          y={yPredicted + 12}
          fontSize="9.5"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          {deuxCourbes ? 'sans changer' : 'cm'}
        </text>

        <text
          x={x(ageNow)}
          y={M.top - 12}
          textAnchor="middle"
          fontSize="10"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          aujourd’hui
        </text>

        {aPasse && (
          <text
            x={M.left}
            y={H - 10}
            textAnchor="middle"
            fontSize="10"
            fill="var(--funnel-muted, #9a9a9a)"
          >
            {frAge(agePasse)} ans
          </text>
        )}
        <text
          x={W - M.right}
          y={H - 10}
          textAnchor="middle"
          fontSize="10"
          fill="var(--funnel-muted, #9a9a9a)"
        >
          {frAge(ageFin)} ans
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
        {deuxCourbes ? (
          <>
            La zone colorée est ce que tes habitudes décident — pas ta génétique.
            Ta croissance se termine vers <strong>{frAge(ageFin)} ans</strong> :
            après, l’écart est figé.
          </>
        ) : (
          <>
            Tes habitudes sont déjà à la cible : les deux trajectoires se
            confondent. Ta croissance se termine vers{' '}
            <strong>{frAge(ageFin)} ans</strong>.
          </>
        )}
      </figcaption>
    </figure>
  )
}

export default GrowthProjectionChart
