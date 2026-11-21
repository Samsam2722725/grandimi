/* La courbe de Taller (« Predict your future height ») : la taille qui
   monte de 15 à 21 ans et se tasse, un point à 18 ans. Une illustration,
   pas la taille de quelqu'un : le chiffre est un exemple. Sert sur la
   page d'accueil et dans les cartes du paywall (21/11/2026). */
export function CourbeTaille({ cadenas = false } = {}) {
  const ages = [15, 16, 17, 18, 19, 20, 21]
  const x = (age) => 20 + ((age - 15) / 6) * 280
  const courbe = 'M20,150 C90,104 150,72 180,63 S260,40 300,36'
  return (
    <div>
      <svg viewBox="0 0 320 170" className="w-full" role="img" aria-label="Exemple de courbe de taille de 15 à 21 ans">
        <defs>
          <linearGradient id="courbe-aire" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#ff6a2b" stopOpacity="0.32" />
            <stop offset="1" stopColor="#ff6a2b" stopOpacity="0.04" />
          </linearGradient>
        </defs>
        {[36, 74, 112, 150].map((y) => (
          <line key={y} x1="20" x2="300" y1={y} y2={y} stroke="rgba(255,255,255,0.08)" strokeDasharray="3 4" />
        ))}
        <path d={`${courbe} L300,150 L20,150 Z`} fill="url(#courbe-aire)" />
        <path d={courbe} fill="none" stroke="#ff6a2b" strokeWidth="3" strokeLinecap="round" />
        <line x1={x(18)} x2={x(18)} y1="30" y2="150" stroke="rgba(255,255,255,0.18)" strokeDasharray="3 4" />
        <circle cx={x(18)} cy="63" r="9" fill="#ff6a2b" stroke="#f4efe9" strokeWidth="4" />
        <rect x={x(18) - 32} y="2" width="64" height="24" rx="7" fill="#ff6a2b" />
        {/* Sur le paywall : un cadenas à la place du chiffre (Samuel, 21/11/2026). */}
        {cadenas ? (
          <g transform={`translate(${x(18) - 7} 5)`} fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 8 V5 a4 4 0 0 1 8 0 V8" />
            <rect x="0.5" y="8" width="13" height="10" rx="2.5" fill="#fff" stroke="none" />
          </g>
        ) : (
          <text x={x(18)} y="18.5" textAnchor="middle" fontSize="13" fontWeight="700" fill="#fff">178 cm</text>
        )}
      </svg>
      <div className="mt-2 flex justify-between px-[4%] text-[13px] text-[#8a847e]">
        {ages.map((age) => <span key={age}>{age}</span>)}
      </div>
    </div>
  )
}
