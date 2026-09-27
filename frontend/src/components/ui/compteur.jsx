import { useEffect, useState } from 'react'

const reduit = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* Monte de 0 à `cible` avec une décélération douce. Sans animation
   (prefers-reduced-motion), rend la valeur finale directement. */
export function useCompteur(cible, duree = 1400, delai = 400) {
  const [valeur, setValeur] = useState(() => (reduit() ? cible : 0))

  useEffect(() => {
    if (reduit()) {
      setValeur(cible)
      return undefined
    }
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

export function Compteur({ valeur, duree, delai }) {
  return <span className="compteur">{useCompteur(valeur, duree, delai)}</span>
}
