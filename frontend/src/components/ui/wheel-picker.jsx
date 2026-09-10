import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { cn } from '@/lib/utils'

/**
 * Sélecteur numérique en molette, façon picker natif iOS.
 *
 * Pourquoi remplacer un `<input type="number">` par ça :
 * saisir « 172 » au clavier demande d'ouvrir le pavé numérique, de viser trois
 * touches et de refermer. Faire défiler une molette demande un geste de pouce
 * et rend l'erreur de frappe impossible — la valeur est bornée par construction.
 * Sur un questionnaire de 8 mesures, l'écart de friction est le facteur qui
 * décide de l'abandon.
 *
 * Le défilement s'appuie sur `scroll-snap` natif : le navigateur gère l'inertie
 * et l'accrochage, ce qu'aucune réimplémentation JS ne fait aussi bien. On ne
 * lit que la position pour en déduire l'index.
 *
 * Accessibilité : le composant est un `spinbutton`. Flèches, PageUp/PageDown,
 * Début/Fin fonctionnent, et `aria-valuetext` annonce la valeur formatée
 * (« 172 cm ») plutôt que le nombre nu.
 */
export function WheelPicker({
  value,
  onChange,
  min,
  max,
  step = 1,
  format = (v) => String(v),
  label,
  itemHeight = 52,
  visibleCount = 5,
  className,
}) {
  const options = useMemo(() => {
    const out = []
    // Arrondi à 4 décimales : les pas fractionnaires (0.5, 0.1) accumulent
    // sinon une dérive en virgule flottante et 16.7 devient 16.699999999999996.
    for (let v = min; v <= max + 1e-9; v += step) {
      out.push(Math.round(v * 10000) / 10000)
    }
    return out
  }, [min, max, step])

  const nearestIndex = useCallback(
    (v) => {
      if (v == null || Number.isNaN(v)) return Math.floor(options.length / 2)
      let best = 0
      let bestGap = Infinity
      for (let i = 0; i < options.length; i++) {
        const gap = Math.abs(options[i] - v)
        if (gap < bestGap) {
          bestGap = gap
          best = i
        }
      }
      return best
    },
    [options],
  )

  const scrollerRef = useRef(null)
  const emittedRef = useRef(null)
  const [activeIndex, setActiveIndex] = useState(() => nearestIndex(value))

  const height = itemHeight * visibleCount
  const pad = (height - itemHeight) / 2

  const scrollToIndex = useCallback(
    (index, behavior) => {
      const el = scrollerRef.current
      if (!el) return
      el.scrollTo({ top: index * itemHeight, behavior })
    },
    [itemHeight],
  )

  /* Positionnement initial, et resynchronisation si la valeur change depuis
     l'extérieur (retour arrière, changement d'unité). On ignore le cas où la
     valeur vient de notre propre défilement, sinon la molette se bat avec le
     doigt de l'utilisateur. */
  useEffect(() => {
    if (emittedRef.current === value) return
    const index = nearestIndex(value)
    setActiveIndex(index)
    scrollToIndex(index, 'auto')
  }, [value, nearestIndex, scrollToIndex])

  const commit = useCallback(
    (index) => {
      const next = options[index]
      if (next === undefined || next === value) return
      emittedRef.current = next
      /* Retour haptique court sur les appareils qui le supportent : c'est ce
         qui donne la sensation de cran d'un picker natif. Ignoré ailleurs. */
      try {
        navigator.vibrate?.(6)
      } catch {
        /* pas de vibration disponible — sans conséquence */
      }
      onChange(next)
    },
    [options, value, onChange],
  )

  const handleScroll = () => {
    const el = scrollerRef.current
    if (!el) return
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(el.scrollTop / itemHeight)),
    )
    if (index !== activeIndex) {
      setActiveIndex(index)
      commit(index)
    }
  }

  const move = (delta) => {
    const index = Math.max(0, Math.min(options.length - 1, activeIndex + delta))
    if (index === activeIndex) return
    setActiveIndex(index)
    commit(index)
    scrollToIndex(index, 'smooth')
  }

  const handleKeyDown = (event) => {
    const jumps = {
      ArrowUp: -1,
      ArrowDown: 1,
      PageUp: -5,
      PageDown: 5,
    }
    if (event.key in jumps) {
      event.preventDefault()
      move(jumps[event.key])
      return
    }
    if (event.key === 'Home') {
      event.preventDefault()
      setActiveIndex(0)
      commit(0)
      scrollToIndex(0, 'smooth')
    }
    if (event.key === 'End') {
      event.preventDefault()
      const last = options.length - 1
      setActiveIndex(last)
      commit(last)
      scrollToIndex(last, 'smooth')
    }
  }

  const current = options[activeIndex]

  return (
    <div className={cn('wheel', className)} style={{ '--wheel-item-h': `${itemHeight}px` }}>
      <div
        ref={scrollerRef}
        className="wheel-scroller"
        style={{ height, paddingBlock: pad }}
        onScroll={handleScroll}
        onKeyDown={handleKeyDown}
        role="spinbutton"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={current}
        aria-valuetext={current === undefined ? undefined : format(current)}
      >
        {options.map((option, index) => {
          const distance = Math.abs(index - activeIndex)
          return (
            <div
              key={option}
              className={cn('wheel-item', distance === 0 && 'is-active')}
              style={{
                height: itemHeight,
                // Au-delà de deux crans l'élément est quasi effacé : c'est ce
                // dégradé qui fait lire le cylindre plutôt qu'une simple liste.
                opacity: distance === 0 ? 1 : Math.max(0.12, 0.58 - distance * 0.18),
                transform: `scale(${distance === 0 ? 1 : Math.max(0.78, 1 - distance * 0.09)})`,
              }}
              aria-hidden="true"
            >
              {format(option)}
            </div>
          )
        })}
      </div>
      {/* La pilule de sélection est posée par-dessus, au centre fixe. */}
      <div className="wheel-selection" style={{ height: itemHeight }} aria-hidden="true" />
    </div>
  )
}

export default WheelPicker
