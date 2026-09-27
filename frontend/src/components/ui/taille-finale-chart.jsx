/* Graphique « Votre taille finale », reconstruit en SVG d'après le visuel
   du client (au lieu de coller l'image, qui portait un fond noir
   incrusté). Aucune valeur : c'est une illustration de la mécanique —
   les trajectoires divergent avec la régularité —, pas une prédiction
   pour cet utilisateur.

   Animation : les courbes se tracent (pathLength=1 + dashoffset), la
   zone se remplit, puis les points d'arrivée apparaissent. Tout est en
   CSS (funnel.css, .tfc-*) et coupé par prefers-reduced-motion. */
export function TailleFinaleChart() {
  return (
    <figure className="tfc" aria-label="Deux trajectoires de croissance : avec la routine Grandimi, la courbe monte plus haut qu'avec les habitudes actuelles">
      <figcaption className="tfc-titre">
        <span className="tfc-icone" aria-hidden="true">
          <svg viewBox="0 0 16 16" width="14" height="14">
            <rect x="2" y="9" width="3" height="5" rx="1" />
            <rect x="6.5" y="6" width="3" height="8" rx="1" />
            <rect x="11" y="2" width="3" height="12" rx="1" />
          </svg>
        </span>
        Votre <em>taille finale</em>
      </figcaption>

      <svg viewBox="0 0 340 210" className="tfc-svg" aria-hidden="true">
        <defs>
          <linearGradient id="tfc-zone" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ff5a1f" stopOpacity="0.35" />
            <stop offset="100%" stopColor="#ff5a1f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="tfc-trait" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#ff5a1f" />
            <stop offset="100%" stopColor="#ffb020" />
          </linearGradient>
          <filter id="tfc-halo" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="4" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {[40, 80, 120, 160].map((y) => (
          <line key={y} x1="24" x2="316" y1={y} y2={y} className="tfc-grille" />
        ))}

        <path
          className="tfc-zone"
          d="M24 190 C 110 160, 200 60, 316 38 L 316 190 Z"
          fill="url(#tfc-zone)"
        />
        <path
          className="tfc-courbe tfc-courbe--habitudes"
          d="M24 190 C 120 175, 220 118, 316 108"
          pathLength="1"
        />
        <path
          className="tfc-courbe tfc-courbe--routine"
          d="M24 190 C 110 160, 200 60, 316 38"
          pathLength="1"
          stroke="url(#tfc-trait)"
          filter="url(#tfc-halo)"
        />

        <circle className="tfc-point tfc-point--depart" cx="24" cy="190" r="6" />
        <circle className="tfc-point tfc-point--habitudes" cx="316" cy="108" r="6" />
        <circle className="tfc-point tfc-point--routine" cx="316" cy="38" r="8" filter="url(#tfc-halo)" />
      </svg>

      <ul className="tfc-legende">
        <li><span className="tfc-pastille tfc-pastille--habitudes" />Habitudes actuelles</li>
        <li><span className="tfc-pastille tfc-pastille--routine" />Routine Grandimi</li>
      </ul>
    </figure>
  )
}
