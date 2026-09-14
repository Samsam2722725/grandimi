import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Les trois choses qu'on vend, une carte chacune, qui défilent.
 *
 * POURQUOI PAS L'ANNEAU 3D DE RÉFÉRENCE. Le composant proposé fait tourner dix
 * vignettes sur un anneau en perspective, en rotation automatique toutes les
 * 2,4 s. C'est une vitrine de galerie : il est construit pour faire regarder
 * les images, et il le fait bien. Ici il travaillerait contre l'écran — sur un
 * paywall, tout ce qui bouge en permanence prend l'attention qui devait aller
 * au bouton, et une rotation automatique déplace la carte qu'on était en train
 * de lire. Il supposait aussi `next/image` et `react-icons`, qui n'existent
 * pas dans ce projet (Vite, pas Next).
 *
 * Ce qui est gardé de l'idée : trois cartes, une par promesse, qui défilent, et
 * une progression visible. Ce qui change : un rail horizontal qu'on fait
 * glisser au pouce, pas un anneau ; et surtout des VISUELS DE PRODUIT dessinés
 * ici, pas des photos d'inconnus. Sur un site vendu à des mineurs dont
 * l'argument est qu'on ne raconte rien de faux, une photo d'ado souriant prise
 * sur une banque d'images est exactement le signal qu'on évite partout
 * ailleurs.
 *
 * L'avance automatique s'arrête définitivement au premier geste : si
 * l'utilisateur prend la main, la lui reprendre est une faute.
 */

const CARTES = [
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

const AVANCE_MS = 4200

export function OffreCarousel({ className }) {
  const railRef = useRef(null)
  const [actif, setActif] = useState(0)
  const [mainPrise, setMainPrise] = useState(false)

  const allerA = useCallback((index) => {
    const rail = railRef.current
    if (!rail) return
    const carte = rail.children[index]
    if (!carte) return
    /* `scrollTo` sur le rail plutôt que `scrollIntoView` sur la carte :
       scrollIntoView remonte la page entière jusqu'au carrousel, ce qui
       arrache le lecteur à l'endroit où il était. */
    rail.scrollTo({ left: carte.offsetLeft - rail.offsetLeft, behavior: 'smooth' })
  }, [])

  /* L'index actif se lit sur la position réelle du rail, pas sur un compteur
     interne : l'utilisateur peut faire glisser au doigt, et un compteur
     désynchronisé allumerait la mauvaise pastille. */
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return undefined

    const auDefilement = () => {
      const largeur = rail.children[0]?.offsetWidth || 1
      setActif(Math.round(rail.scrollLeft / largeur))
    }
    rail.addEventListener('scroll', auDefilement, { passive: true })
    return () => rail.removeEventListener('scroll', auDefilement)
  }, [])

  useEffect(() => {
    if (mainPrise) return undefined
    const id = setInterval(() => {
      setActif((precedent) => {
        const suivant = (precedent + 1) % CARTES.length
        allerA(suivant)
        return suivant
      })
    }, AVANCE_MS)
    return () => clearInterval(id)
  }, [mainPrise, allerA])

  /* Respecte le réglage système : plus d'avance automatique du tout si
     l'utilisateur a demandé moins d'animation. */
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setMainPrise(true)
  }, [])

  return (
    <div className={`offre-carousel ${className || ''}`}>
      <div
        className="offre-rail"
        ref={railRef}
        onPointerDown={() => setMainPrise(true)}
      >
        {CARTES.map(({ cle, titre, texte, Visuel }) => (
          <article className="offre-carte" key={cle}>
            <div className="offre-visuel-cadre">
              <Visuel />
            </div>
            <h3 className="offre-carte-titre">{titre}</h3>
            <p className="offre-carte-texte">{texte}</p>
          </article>
        ))}
      </div>

      <div className="offre-pastilles" role="tablist" aria-label="Choisir la carte">
        {CARTES.map((carte, index) => (
          <button
            key={carte.cle}
            type="button"
            role="tab"
            aria-selected={index === actif}
            aria-label={carte.titre}
            className={`offre-pastille ${index === actif ? 'est-active' : ''}`}
            onClick={() => {
              setMainPrise(true)
              setActif(index)
              allerA(index)
            }}
          />
        ))}
      </div>
    </div>
  )
}

export default OffreCarousel
