/**
 * La mascotte Grandimi (21/11/2026, PROPOSITION-ANIMATIONS.md n° 14) : un
 * petit bonhomme orange qui revient dans le parcours. Il grandit dans la
 * barre du haut, suit la taille de rêve, saute à la fin d'une partie et
 * fait la fête quand le plan est prêt.
 *
 * humeur : 'normal' | 'saut' | 'fete' | 'etire'
 * La hauteur se règle avec `hauteur` (en px) ; la largeur suit.
 */
export function Mascotte({ hauteur = 80, humeur = 'normal', className = '', style }) {
  const brasLeves = humeur === 'fete' || humeur === 'etire'
  return (
    <svg
      viewBox="0 0 40 80"
      width={hauteur / 2}
      height={hauteur}
      className={`mascotte mascotte--${humeur} ${className}`}
      style={style}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="mascotte-corps" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ff8a4a" />
          <stop offset="100%" stopColor="#ff5a1f" />
        </linearGradient>
      </defs>
      <g className="mascotte-tout">
        {/* bras */}
        <g className="mascotte-bras mascotte-bras--g">
          <rect x={brasLeves ? 8 : 5} y={brasLeves ? 8 : 22} width="6" height="22" rx="3" fill="url(#mascotte-corps)" transform={brasLeves ? 'rotate(-20 11 30)' : 'rotate(12 8 24)'} />
        </g>
        <g className="mascotte-bras mascotte-bras--d">
          <rect x={brasLeves ? 26 : 29} y={brasLeves ? 8 : 22} width="6" height="22" rx="3" fill="url(#mascotte-corps)" transform={brasLeves ? 'rotate(20 29 30)' : 'rotate(-12 32 24)'} />
        </g>
        {/* jambes */}
        <rect x="12" y="46" width="7" height="30" rx="3.5" fill="#e04e18" />
        <rect x="21" y="46" width="7" height="30" rx="3.5" fill="#e04e18" />
        {/* corps */}
        <rect x="9" y="19" width="22" height="32" rx="11" fill="url(#mascotte-corps)" />
        {/* tête */}
        <circle cx="20" cy="10" r="9" fill="url(#mascotte-corps)" />
        <circle cx="16.8" cy="9.2" r="1.5" fill="#1a0f0a" />
        <circle cx="23.2" cy="9.2" r="1.5" fill="#1a0f0a" />
        <path d={humeur === 'normal' ? 'M16.5 13 Q20 15.4 23.5 13' : 'M16 12.4 Q20 17 24 12.4'} fill="none" stroke="#1a0f0a" strokeWidth="1.5" strokeLinecap="round" />
      </g>
    </svg>
  )
}

export default Mascotte
