/**
 * Les trois choses qu'on vend : une diapositive chacune.
 *
 * Ce module ne porte que les DONNÉES et les VISUELS. Le rail qui les fait
 * glisser de gauche à droite est dans carousel-offre.jsx, porté du composant
 * fourni par le client.
 *
 * Les visuels sont du SVG dessiné ici, et non des images. Le projet n'a aucune
 * photo du produit, et une photo de banque d'images serait le seul élément
 * inventé d'une page dont tout l'argument est qu'on ne raconte rien de faux.
 * Ils pèsent quelques centaines d'octets, restent nets à toutes les tailles,
 * et suivent les jetons de couleur du tunnel.
 *
 * Les composants de visuel sont référencés par `SLIDES_OFFRE` avant leur
 * déclaration : les déclarations de fonction sont hissées, c'est valide.
 */

export const SLIDES_OFFRE = [
  {
    cle: 'optimiser',
    titre: 'Optimiser ta taille',
    texte: 'Tes trois leviers notés, et celui qui te coûte le plus, nommé en premier.',
    Visuel: VisuelOptimiser,
  },
  {
    cle: 'programme',
    titre: 'Programme optimal',
    texte: '11 actions par jour, du lever au coucher, calées sur tes horaires.',
    Visuel: VisuelProgramme,
  },
  {
    cle: 'guides',
    titre: 'Guides pour grandir',
    texte: 'Sommeil, nutrition, exercices : le pourquoi de chaque action, avec sa source.',
    Visuel: VisuelGuides,
  },
]

/* Les trois visuels sont du SVG inline plutôt que des images : ils pèsent
   quelques centaines d'octets, restent nets à toutes les tailles, suivent les
   jetons de couleur du tunnel, et surtout ils montrent le produit — pas une
   ambiance. `aria-hidden` partout : le titre et le texte de la carte portent
   déjà l'information. */

function VisuelOptimiser() {
  const barres = [
    { x: 14, h: 30, forte: false },
    { x: 42, h: 52, forte: true },
    { x: 70, h: 40, forte: false },
  ]
  return (
    <svg viewBox="0 0 108 80" className="offre-visuel" aria-hidden="true">
      {barres.map((b) => (
        <g key={b.x}>
          <rect
            x={b.x}
            y={70 - 56}
            width="24"
            height="56"
            rx="7"
            fill="var(--funnel-line, #2a2a2a)"
          />
          <rect
            x={b.x}
            y={70 - b.h}
            width="24"
            height={b.h}
            rx="7"
            fill={b.forte ? 'var(--funnel-accent, #ff5a1f)' : '#6f7ec9'}
          />
        </g>
      ))}
      <line
        x1="6"
        x2="102"
        y1="74"
        y2="74"
        stroke="var(--funnel-line, #2a2a2a)"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  )
}

function VisuelProgramme() {
  const lignes = [0, 1, 2, 3]
  return (
    <svg viewBox="0 0 108 80" className="offre-visuel" aria-hidden="true">
      {lignes.map((i) => {
        const y = 8 + i * 18
        const faite = i < 2
        return (
          <g key={i}>
            <rect
              x="8"
              y={y}
              width="13"
              height="13"
              rx="4"
              fill={faite ? 'var(--funnel-accent, #ff5a1f)' : 'none'}
              stroke={faite ? 'none' : 'var(--funnel-line, #2a2a2a)'}
              strokeWidth="2.5"
            />
            {faite && (
              <path
                d={`M 11.5 ${y + 6.5} l 2.5 2.8 l 4 -5`}
                fill="none"
                stroke="var(--funnel-on-accent, #17120e)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            <rect
              x="28"
              y={y + 3}
              width={i % 2 === 0 ? 66 : 50}
              height="7"
              rx="3.5"
              fill="var(--funnel-line, #2a2a2a)"
            />
          </g>
        )
      })}
    </svg>
  )
}

function VisuelGuides() {
  return (
    <svg viewBox="0 0 108 80" className="offre-visuel" aria-hidden="true">
      {/* Trois feuillets décalés : un guide, pas une page. */}
      <rect
        x="20"
        y="12"
        width="52"
        height="60"
        rx="6"
        fill="var(--funnel-line, #2a2a2a)"
      />
      <rect
        x="28"
        y="8"
        width="52"
        height="60"
        rx="6"
        fill="var(--funnel-surface-high, #1c1c1c)"
        stroke="var(--funnel-line, #2a2a2a)"
        strokeWidth="2"
      />
      <rect x="37" y="20" width="34" height="6" rx="3" fill="var(--funnel-accent, #ff5a1f)" />
      <rect x="37" y="32" width="28" height="5" rx="2.5" fill="var(--funnel-line, #2a2a2a)" />
      <rect x="37" y="42" width="34" height="5" rx="2.5" fill="var(--funnel-line, #2a2a2a)" />
      <rect x="37" y="52" width="22" height="5" rx="2.5" fill="var(--funnel-line, #2a2a2a)" />
    </svg>
  )
}
