import { useEffect, useMemo, useRef } from 'react'

/**
 * Règle verticale façon GoTall (« Quelle est la taille de tes parents ? »,
 * « Quelle est ta taille idéale ? », 21/11/2026) : des traits qui défilent
 * sous un curseur orange fixe. Comme la molette, le HAUT porte les grandes
 * valeurs : glisser le doigt vers le bas augmente.
 *
 * Un trait par pas (0,5 cm), mais seuls les centimètres entiers sont
 * dessinés, avec un grand trait tous les 5 cm. Le défilement s'accroche à
 * chaque pas grâce à `scroll-snap`, comme WheelPicker.
 */
export function RegleVerticale({ value, onChange, min, max, step = 0.5, label, format = String, hauteur = 340, ecart = 6, className }) {
  const valeurs = useMemo(() => {
    const out = []
    for (let v = max; v >= min - 1e-9; v -= step) out.push(Math.round(v * 100) / 100)
    return out
  }, [min, max, step])
  const ref = useRef(null)
  const depuisDefilement = useRef(false)

  const indexDe = (v) => Math.max(0, Math.min(valeurs.length - 1, Math.round((max - v) / step)))

  // Place la règle sur la valeur, sauf si c'est le défilement qui vient de la changer.
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (depuisDefilement.current) {
      depuisDefilement.current = false
      return
    }
    el.scrollTop = indexDe(value) * ecart
  }, [value]) // eslint-disable-line react-hooks/exhaustive-deps

  // Lu directement à chaque événement : le calcul est trivial, et un
  // requestAnimationFrame perdait des positions quand l'image était sautée.
  const surDefilement = () => {
    const el = ref.current
    if (!el) return
    const v = valeurs[Math.max(0, Math.min(valeurs.length - 1, Math.round(el.scrollTop / ecart)))]
    if (v !== value) {
      depuisDefilement.current = true
      onChange(v)
    }
  }

  const surClavier = (e) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      onChange(Math.min(max, Math.round((value + step) * 100) / 100))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      onChange(Math.max(min, Math.round((value - step) * 100) / 100))
    }
  }

  return (
    <div className={'regle' + (className ? ' ' + className : '')} style={{ height: hauteur }}>
      <div
        ref={ref}
        className="regle-defil"
        onScroll={surDefilement}
        onKeyDown={surClavier}
        tabIndex={0}
        role="slider"
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        style={{ paddingTop: hauteur / 2 - ecart / 2, paddingBottom: hauteur / 2 - ecart / 2 }}
      >
        {valeurs.map((v) => {
          const demi = Math.round(v * 2)
          const entier = demi % 2 === 0
          const grand = demi % 10 === 0
          return (
            <span
              key={v}
              className={'regle-trait' + (grand ? ' is-grand' : entier ? '' : ' is-demi')}
              style={{ height: ecart }}
            />
          )
        })}
      </div>
      <span className="regle-curseur" aria-hidden="true" />
    </div>
  )
}

export default RegleVerticale
