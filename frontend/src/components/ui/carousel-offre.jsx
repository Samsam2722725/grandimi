import { useEffect, useId, useRef, useState } from 'react'
import { ArrowRight } from 'lucide-react'

/**
 * Carrousel de l'offre : les diapositives glissent de gauche à droite, une
 * seule est nette, les voisines restent visibles et en retrait.
 *
 * Porté du composant fourni. Ce qui est conservé : la translation du rail
 * calculée sur `current * (100 / nombre)`, l'inclinaison et la mise à
 * l'échelle des diapositives inactives, le suivi du curseur qui décale
 * légèrement le fond de la diapositive active, et les deux boutons ronds
 * dessous.
 *
 * TROIS ADAPTATIONS, toutes forcées par ce projet :
 *
 * 1. JSX et non TSX — le projet n'a pas TypeScript. Les interfaces du
 *    composant d'origine deviennent des propriétés ordinaires.
 *
 * 2. `lucide-react` au lieu de `@tabler/icons-react`. Lucide est déjà dans les
 *    dépendances et sert partout ailleurs ; ajouter un second jeu d'icônes
 *    pour une flèche ferait entrer un paquet entier dans le bundle.
 *
 * 3. Les diapositives portent un VISUEL DESSINÉ, pas une `<img>`. Le projet
 *    n'a aucune photo du produit, et une photo de banque d'images sur un site
 *    vendu à des mineurs dont l'argument est qu'on ne raconte rien de faux
 *    serait le seul élément inventé de la page. Le reste du composant — la
 *    mécanique, les transitions, la géométrie — est repris tel quel.
 */

function Diapositive({ slide, index, courant, onChoisir }) {
  const ref = useRef(null)
  const xRef = useRef(0)
  const yRef = useRef(0)
  const frameRef = useRef(null)

  /* Boucle d'animation permanente du composant d'origine : elle reporte la
     position du curseur dans deux variables CSS. Sur téléphone il n'y a pas de
     curseur, les deux valeurs restent à zéro et la boucle ne coûte qu'une
     écriture de propriété par frame. */
  useEffect(() => {
    const animer = () => {
      if (ref.current) {
        ref.current.style.setProperty('--x', `${xRef.current}px`)
        ref.current.style.setProperty('--y', `${yRef.current}px`)
      }
      frameRef.current = requestAnimationFrame(animer)
    }
    frameRef.current = requestAnimationFrame(animer)
    return () => {
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
    }
  }, [])

  const auMouvement = (evenement) => {
    const el = ref.current
    if (!el) return
    const r = el.getBoundingClientRect()
    xRef.current = evenement.clientX - (r.left + Math.floor(r.width / 2))
    yRef.current = evenement.clientY - (r.top + Math.floor(r.height / 2))
  }

  const auDepart = () => {
    xRef.current = 0
    yRef.current = 0
  }

  const actif = courant === index
  const { titre, texte, Visuel } = slide

  return (
    <div className="diapo-perspective">
      <li
        ref={ref}
        className="diapo"
        onClick={() => onChoisir(index)}
        onMouseMove={auMouvement}
        onMouseLeave={auDepart}
        style={{
          transform: actif ? 'scale(1) rotateX(0deg)' : 'scale(0.96) rotateX(8deg)',
          transformOrigin: 'bottom',
          transition: 'transform 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          className="diapo-fond"
          style={{
            transform: actif
              ? 'translate3d(calc(var(--x) / 30), calc(var(--y) / 30), 0)'
              : 'none',
          }}
        >
          <div className="diapo-visuel" style={{ opacity: actif ? 1 : 0.45 }}>
            <Visuel />
          </div>
        </div>

        <article className={`diapo-texte ${actif ? 'est-actif' : ''}`}>
          <h3>{titre}</h3>
          <p>{texte}</p>
        </article>
      </li>
    </div>
  )
}

function Commande({ sens, titre, onClick }) {
  return (
    <button
      type="button"
      className={`diapo-commande ${sens === 'precedent' ? 'est-inversee' : ''}`}
      title={titre}
      aria-label={titre}
      onClick={onClick}
    >
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  )
}

export function CarouselOffre({ slides }) {
  const [courant, setCourant] = useState(0)
  const id = useId()

  const precedent = () => setCourant((c) => (c - 1 < 0 ? slides.length - 1 : c - 1))
  const suivant = () => setCourant((c) => (c + 1 === slides.length ? 0 : c + 1))

  return (
    <div className="diapo-cadre" aria-labelledby={`carousel-${id}`}>
      <ul
        className="diapo-rail"
        style={{ transform: `translateX(-${courant * (100 / slides.length)}%)` }}
      >
        {slides.map((slide, index) => (
          <Diapositive
            key={slide.cle}
            slide={slide}
            index={index}
            courant={courant}
            onChoisir={setCourant}
          />
        ))}
      </ul>

      <div className="diapo-commandes">
        <Commande sens="precedent" titre="Diapositive précédente" onClick={precedent} />
        <Commande sens="suivant" titre="Diapositive suivante" onClick={suivant} />
      </div>
    </div>
  )
}

export default CarouselOffre
