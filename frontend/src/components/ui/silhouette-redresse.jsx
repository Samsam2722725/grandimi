/* Silhouette néon qui se redresse et grandit — accueil.
   Deux silhouettes superposées : voûtée, puis droite et plus haute. La
   seconde apparaît pendant que la première s'efface, et un trait de hauteur
   monte à côté. Purement décoratif (aria-hidden). */
export function SilhouetteRedresse() {
  return (
    <div className="silhouette-redresse" aria-hidden="true">
      <svg viewBox="0 0 160 200" className="silhouette-svg">
        {/* sol */}
        <line x1="20" y1="190" x2="140" y2="190" className="sil-sol" />

        {/* trait de hauteur qui monte */}
        <line x1="128" y1="190" x2="128" y2="30" className="sil-mesure" />
        <line x1="120" y1="30" x2="136" y2="30" className="sil-mesure-haut" />

        {/* 1. voûtée */}
        <g className="sil sil-voute">
          <circle cx="62" cy="62" r="11" />
          <path d="M66 74 C 72 92, 70 108, 66 128" />
          <path d="M68 86 L 52 112 M68 86 L 82 110" />
          <path d="M66 128 L 58 188 M66 128 L 76 188" />
        </g>

        {/* 2. droite, plus haute */}
        <g className="sil sil-droite">
          <circle cx="72" cy="38" r="11" />
          <path d="M72 50 L 72 118" />
          <path d="M72 64 L 56 98 M72 64 L 88 98" />
          <path d="M72 118 L 62 188 M72 118 L 82 188" />
        </g>
      </svg>
    </div>
  )
}
