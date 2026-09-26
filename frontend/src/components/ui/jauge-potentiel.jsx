import { useEffect, useState } from 'react'

/* Jauge « 20 % de ta taille adulte dépend de toi », reconstruite en SVG
   d'après le visuel du client. Le segment orange couvre exactement 20 %
   de l'arc : la figure dit ce que dit le texte, sans exagérer.

   Animation : le segment se trace et le nombre monte de 0 à 20. Coupé
   par prefers-reduced-motion (le nombre s'affiche directement). */

const C = { x: 130, y: 130 }
const R = 100
const DEBUT = 150 // degrés, sens horaire depuis l'est
const FIN = 390
const VALEUR = 20

function point(angle, rayon = R) {
  const a = (angle * Math.PI) / 180
  return { x: C.x + rayon * Math.cos(a), y: C.y + rayon * Math.sin(a) }
}

function arc(a1, a2, rayon = R) {
  const p1 = point(a1, rayon)
  const p2 = point(a2, rayon)
  const grand = a2 - a1 > 180 ? 1 : 0
  return `M ${p1.x} ${p1.y} A ${rayon} ${rayon} 0 ${grand} 1 ${p2.x} ${p2.y}`
}

const DEBUT_SEGMENT = FIN - ((FIN - DEBUT) * VALEUR) / 100
const GRADUATIONS = Array.from({ length: 11 }, (_, i) => DEBUT + ((FIN - DEBUT) * i) / 10)

function useCompteur(cible, duree = 1400, delai = 400) {
  const [valeur, setValeur] = useState(() =>
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? cible : 0,
  )
  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return undefined
    let raf
    const t0 = performance.now() + delai
    const tick = (t) => {
      const p = Math.min(1, Math.max(0, (t - t0) / duree))
      setValeur(Math.round(cible * (1 - (1 - p) ** 3)))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [cible, duree, delai])
  return valeur
}

export function JaugePotentiel() {
  const valeur = useCompteur(VALEUR)
  const bouton = point(DEBUT_SEGMENT)
  const zero = point(DEBUT, R + 30)
  const cent = point(FIN, R + 30)

  return (
    <div className="jauge" role="img" aria-label="Environ 20 % de ta taille adulte dépend de tes habitudes">
      <svg viewBox="0 0 260 250" className="jauge-svg" aria-hidden="true">
        <defs>
          <linearGradient id="jauge-segment" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#ff5a1f" />
            <stop offset="100%" stopColor="#ffc233" />
          </linearGradient>
          <pattern id="jauge-trame" width="7" height="7" patternUnits="userSpaceOnUse">
            <circle cx="3.5" cy="3.5" r="1.6" fill="#ff6a2a" />
          </pattern>
          <radialGradient id="jauge-fondu">
            <stop offset="30%" stopColor="#fff" stopOpacity="0" />
            <stop offset="100%" stopColor="#fff" stopOpacity="1" />
          </radialGradient>
          <mask id="jauge-masque">
            <circle cx={C.x} cy={C.y} r="62" fill="url(#jauge-fondu)" />
          </mask>
          <filter id="jauge-halo" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <path d={arc(DEBUT, FIN)} className="jauge-piste" />
        <path
          d={arc(DEBUT_SEGMENT, FIN)}
          className="jauge-segment"
          stroke="url(#jauge-segment)"
          pathLength="1"
          filter="url(#jauge-halo)"
        />

        {GRADUATIONS.map((a) => {
          const p1 = point(a, R - 22)
          const p2 = point(a, R - 14)
          return (
            <line
              key={a}
              x1={p1.x}
              y1={p1.y}
              x2={p2.x}
              y2={p2.y}
              className={a >= DEBUT_SEGMENT ? 'jauge-graduation is-active' : 'jauge-graduation'}
            />
          )
        })}

        <circle cx={C.x} cy={C.y} r="64" className="jauge-disque" filter="url(#jauge-halo)" />
        <circle cx={C.x} cy={C.y} r="62" fill="url(#jauge-trame)" mask="url(#jauge-masque)" className="jauge-trame" />

        <circle cx={bouton.x} cy={bouton.y} r="10" className="jauge-bouton" />

        <text x={C.x} y={C.y + 13} textAnchor="middle" className="jauge-valeur">
          {valeur}%
        </text>
        <text x={zero.x} y={zero.y} textAnchor="middle" className="jauge-borne">0%</text>
        <text x={cent.x} y={cent.y} textAnchor="middle" className="jauge-borne">100%</text>
      </svg>
    </div>
  )
}
