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
  /* MONTER AUGMENTE, DESCENDRE DIMINUE — QUEL QUE SOIT LE GESTE.

     Le piège : la molette et le doigt vont dans des sens OPPOSÉS sur un
     même conteneur. Rouler la molette vers le haut fait descendre le
     contenu, alors que glisser le doigt vers le haut le fait monter. Aucun
     ordre de liste ne peut donc satisfaire les deux — inverser l'ordre
     corrige l'ordinateur et casse le téléphone, ce qui est exactement ce
     qui s'est passé.

     La seule sortie est de traiter les deux gestes séparément :

       doigt     l'ordre croissant suffit. Glisser vers le haut fait défiler
                 vers le bas de la liste, donc vers les grandes valeurs.
       molette   interceptée plus bas, parce que son sens naturel donnerait
                 l'inverse.
       clavier   flèche du haut = +1 cran. Le conteneur s'annonce
                 `spinbutton`, une norme où la flèche du haut DOIT
                 augmenter ; elle diminuait jusqu'ici.

     La liste reste donc croissante, et c'est aussi cette boucle-là qui
     neutralise la dérive en virgule flottante des pas fractionnaires. */
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
  /* Vrai pendant qu'on place la molette nous-mêmes : le défilement
     déclenché par ce placement ne doit pas être pris pour un geste. */
  const positionnementRef = useRef(false)
  /* Passe à vrai au premier geste réel. Tant qu'il est faux, la molette
     n'appartient encore à personne et on peut la replacer librement. */
  const gesteRef = useRef(false)
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
     doigt de l'utilisateur.

     LA COURSE QUI FAISAIT BASCULER LA VALEUR SUR LE MINIMUM

     `scrollTop` ne peut pas dépasser la hauteur réellement disposée. Tant que
     le conteneur n'a pas la sienne — première frame, police encore en
     chargement, onglet restauré en arrière-plan — l'affectation est ramenée à
     zéro en silence. L'événement de défilement qui suit lit alors l'index 0 et
     le COMMET : le questionnaire s'ouvrait sur « 8 ans » au lieu de « 14 »,
     et la valeur partait vraiment à 8, pas seulement l'affichage.

     Constaté sur capture le 17/09/2026. Le défaut est intermittent par
     nature : au même moment, la même page se plaçait correctement sur un
     autre poste.

     Deux garde-fous :
       - le défilement est ignoré pendant qu'on se place, donc une position
         transitoire ne peut plus écrire de valeur ;
       - on vérifie que la position a PRIS, et on réessaie à la frame suivante
         sinon. Poser la valeur et espérer ne suffisait pas. */
  useEffect(() => {
    if (emittedRef.current === value) return

    const index = nearestIndex(value)
    setActiveIndex(index)

    positionnementRef.current = true
    let annule = false
    let essais = 0

    const placer = () => {
      if (annule) return
      const el = scrollerRef.current
      if (!el) {
        positionnementRef.current = false
        return
      }

      const cible = index * itemHeight
      el.scrollTop = cible
      essais += 1

      /* Dix frames, soit un sixième de seconde : au-delà, ce n'est plus une
         disposition en retard, et insister ferait tourner la boucle pour
         rien. */
      if (Math.abs(el.scrollTop - cible) > 1 && essais < 10) {
        requestAnimationFrame(placer)
        return
      }
      positionnementRef.current = false
    }

    requestAnimationFrame(placer)

    return () => {
      annule = true
      positionnementRef.current = false
    }
  }, [value, nearestIndex, itemHeight])

  /* La disposition peut arriver APRÈS le placement initial.

     Le retour de la police, un onglet restauré en arrière-plan, une
     fenêtre redimensionnée : le conteneur prend sa hauteur plus tard, et
     le `scrollTop` posé avant ne valait rien — il avait été ramené à
     zéro. Réessayer pendant dix frames ne suffit pas quand le retard
     dépasse ce délai ; mesuré en local, la molette affichait encore le
     minimum une seconde et demie après l'ouverture de l'écran.

     On écoute donc le moment où la taille change vraiment, plutôt que de
     parier sur un délai. Le replacement cesse dès le premier geste :
     repositionner sous le doigt de quelqu'un serait pire que le défaut
     qu'on corrige. */
  useEffect(() => {
    const el = scrollerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return undefined

    const observateur = new ResizeObserver(() => {
      if (gesteRef.current) return
      positionnementRef.current = true
      el.scrollTop = activeIndex * itemHeight
      requestAnimationFrame(() => {
        positionnementRef.current = false
      })
    })

    observateur.observe(el)
    return () => observateur.disconnect()
  }, [activeIndex, itemHeight])

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
    if (positionnementRef.current) return
    gesteRef.current = true
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

  const move = useCallback(
    (delta) => {
      const index = Math.max(0, Math.min(options.length - 1, activeIndex + delta))
      if (index === activeIndex) return
      setActiveIndex(index)
      commit(index)
      scrollToIndex(index, 'smooth')
    },
    [options.length, activeIndex, commit, scrollToIndex],
  )

  /* Molette : un cran vers le haut = une valeur de plus.

     Son sens naturel donnerait l'inverse — rouler vers le haut fait
     descendre le contenu, donc reculer dans une liste croissante. On
     l'intercepte et on avance nous-mêmes.

     Écouteur posé à la main plutôt que par onWheel : React attache
     `wheel` en passif, où preventDefault() est ignoré. Sans lui, le
     défilement natif s'ajouterait au nôtre et la valeur sauterait de
     deux crans.

     Un cran de molette = une valeur, jamais plus : sur un sélecteur de
     mesure, dépasser sa taille et revenir coûte plus cher que monter
     d'un cran de trop. */
  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return undefined

    const surMolette = (evenement) => {
      if (Math.abs(evenement.deltaY) < 1) return
      evenement.preventDefault()
      move(evenement.deltaY < 0 ? 1 : -1)
    }

    el.addEventListener('wheel', surMolette, { passive: false })
    return () => el.removeEventListener('wheel', surMolette)
  }, [move])

  const handleKeyDown = (event) => {
    const jumps = {
      ArrowUp: 1,
      ArrowDown: -1,
      PageUp: 5,
      PageDown: -5,
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
