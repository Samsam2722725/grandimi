import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import React, { useEffect, useMemo, useRef, useState } from 'react'

gsap.registerPlugin(ScrollTrigger)

const DESKTOP_WIDTH = 1200
const TABLET_MIN_WIDTH = 768
const DEPTH_MIN = -1
const DEPTH_MAX = 1
const Z_INDEX_MIN = 1

function usePrefersReducedMotion() {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setPrefersReducedMotion(mediaQuery.matches)
    update()
    mediaQuery.addEventListener('change', update)
    return () => mediaQuery.removeEventListener('change', update)
  }, [])

  return prefersReducedMotion
}

function wrapProgress(value) {
  const wrapped = value % 1
  return wrapped < 0 ? wrapped + 1 : wrapped
}

/** Position sur le cercle. `angleOffset` décale l'arc de mise au point. */
function getCircularPosition(progress, radiusX, radiusY, angleOffset = 0) {
  const angle = progress * Math.PI * 2 + angleOffset
  return {
    x: Math.sin(angle) * radiusX,
    y: Math.cos(angle) * radiusY,
    horizontalDepth: Math.sin(angle),
  }
}

function getStrength(value) {
  return gsap.utils.clamp(0, 1, gsap.utils.mapRange(DEPTH_MIN, DEPTH_MAX, 0, 1, value))
}

/** Resserre la mise au point : un seul élément net à la fois. */
function shapeFocus(strength, start = 0.42, power = 2.8) {
  const normalized = gsap.utils.clamp(0, 1, (strength - start) / (1 - start))
  return Math.pow(normalized, power)
}

/**
 * Deux colonnes tournent en sens inverse sur un cercle : les titres à
 * gauche, les visuels à droite. L'élément qui passe devant devient net,
 * les autres reculent en échelle et en opacité.
 *
 * Sous 1025px (et en `prefers-reduced-motion`), on retombe sur une
 * grille statique : le carrousel n'est pas pilotable au doigt.
 */
export default function CircularSplitRoll({
  items = [],
  className = '',
  radius = 500,
  cardSize = 205,
  sectionHeight = 100,
  titleSize = 'clamp(28px, 3vw, 56px)',
  pinSpacing = true,
  scrub = 1.2,
  textCenterScale = 1,
  textSideScale = 0.68,
  textCenterOpacity = 1,
  textSideOpacity = 0.18,
  imageCenterScale = 1,
  imageSideScale = 0.58,
  imageCenterOpacity = 1,
  imageSideOpacity = 0.14,
  textFocusStart = 0.42,
  textFocusPower = 2.6,
  imageFocusStart = 0.45,
  imageFocusPower = 3.2,
  leftAngleOffset = Math.PI,
  rightAngleOffset = 0,
  focusPhase = 0.5,
  leftDepthMax = 30,
  rightDepthMax = 40,
  columnSpreadVw = 5,
  columnOffsetPx = 500,
}) {
  const rootRef = useRef(null)
  const stickyRef = useRef(null)
  const progressRef = useRef(0)
  const reducedMotion = usePrefersReducedMotion()

  const safeItems = useMemo(
    () =>
      items.map((item, index) => ({
        id: item.id ?? index,
        title: item.title ?? `Élément ${index + 1}`,
        image: item.image ?? '',
        alt: item.alt ?? item.title ?? `Élément ${index + 1}`,
        tint: item.tint ?? 'var(--color-sand)',
      })),
    [items],
  )

  useEffect(() => {
    if (!rootRef.current || !stickyRef.current) return
    if (!safeItems.length) return

    const mm = gsap.matchMedia()

    mm.add('(min-width: 1026px) and (prefers-reduced-motion: no-preference)', () => {
      const ctx = gsap.context(() => {
        const leftNodes = gsap.utils.toArray('.csr__title')
        const rightNodes = gsap.utils.toArray('.csr__card')
        const total = safeItems.length

        const render = (scrollProgress) => {
          progressRef.current = scrollProgress

          const width = window.innerWidth
          const factor =
            width < DESKTOP_WIDTH && width >= TABLET_MIN_WIDTH ? width / DESKTOP_WIDTH : 1

          const r = radius * factor

          rootRef.current?.style.setProperty('--csr-card', `${cardSize * factor}px`)

          leftNodes.forEach((node, index) => {
            const p = wrapProgress(index / total - scrollProgress + focusPhase / total)
            const pos = getCircularPosition(p, r, r, leftAngleOffset)
            const focus = shapeFocus(
              getStrength(pos.horizontalDepth),
              textFocusStart,
              textFocusPower,
            )

            gsap.set(node, {
              x: pos.x,
              y: pos.y,
              scale: gsap.utils.interpolate(textSideScale, textCenterScale, focus),
              opacity: gsap.utils.interpolate(textSideOpacity, textCenterOpacity, focus),
              zIndex: Math.round(gsap.utils.interpolate(Z_INDEX_MIN, leftDepthMax, focus)),
              transformOrigin: '50% 50%',
            })
          })

          rightNodes.forEach((node, index) => {
            const p = wrapProgress(index / total - scrollProgress + focusPhase / total)
            const pos = getCircularPosition(p, r, r, rightAngleOffset)
            const focus = shapeFocus(
              getStrength(-pos.horizontalDepth),
              imageFocusStart,
              imageFocusPower,
            )

            gsap.set(node, {
              x: pos.x,
              y: pos.y,
              scale: gsap.utils.interpolate(imageSideScale, imageCenterScale, focus),
              opacity: gsap.utils.interpolate(imageSideOpacity, imageCenterOpacity, focus),
              zIndex: Math.round(gsap.utils.interpolate(Z_INDEX_MIN, rightDepthMax, focus)),
              transformOrigin: '50% 50%',
            })
          })
        }

        render(0)

        const st = ScrollTrigger.create({
          trigger: rootRef.current,
          start: 'top top',
          end: `+=${sectionHeight * total}%`,
          pin: stickyRef.current,
          scrub,
          pinSpacing,
          invalidateOnRefresh: true,
          onUpdate: (self) => render(self.progress),
        })

        const onResize = () => {
          render(progressRef.current)
          st.refresh()
        }

        window.addEventListener('resize', onResize)
        return () => {
          window.removeEventListener('resize', onResize)
          st.kill()
        }
      }, rootRef)

      return () => ctx.revert()
    })

    return () => mm.revert()
  }, [
    safeItems,
    radius,
    cardSize,
    sectionHeight,
    scrub,
    pinSpacing,
    textCenterScale,
    textSideScale,
    textCenterOpacity,
    textSideOpacity,
    imageCenterScale,
    imageSideScale,
    imageCenterOpacity,
    imageSideOpacity,
    textFocusStart,
    textFocusPower,
    imageFocusStart,
    imageFocusPower,
    leftAngleOffset,
    rightAngleOffset,
    focusPhase,
    leftDepthMax,
    rightDepthMax,
  ])

  return (
    <section
      ref={rootRef}
      className={`relative w-full overflow-clip bg-[color:var(--surface-page-canvas)] text-ink ${className}`}
      style={{ '--csr-title': titleSize, '--csr-card': `${cardSize}px` }}
    >
      {/* Piste animée — desktop uniquement.
          NB : on n'utilise que des variantes `min-*`. Tailwind trie les
          variantes `max-*` AVANT l'utilitaire de base, donc un
          `max-[1025px]:not-sr-only` se fait écraser par `sr-only` et la
          section retombe à 0px de haut. */}
      <div
        ref={stickyRef}
        aria-hidden="true"
        className={`relative h-screen w-full overflow-hidden ${
          reducedMotion ? 'hidden' : 'hidden min-[1026px]:block'
        }`}
      >
        <div className="relative mx-auto flex h-full w-full">
          <div
            className="relative flex h-full w-1/2 items-center justify-center"
            style={{ transform: `translateX(calc(${columnSpreadVw}vw - ${columnOffsetPx}px))` }}
          >
            <div className="relative h-[78vh]">
              {safeItems.map((item) => (
                <div
                  key={item.id}
                  className="csr__title pointer-events-none absolute top-1/2 left-1/2 w-full origin-center text-center font-display text-[length:var(--csr-title)] leading-none font-medium tracking-[-0.03em] whitespace-nowrap opacity-0 will-change-[transform,opacity]"
                >
                  {item.title}
                </div>
              ))}
            </div>
          </div>

          <div
            className="relative flex h-full w-1/2 items-center justify-center"
            style={{ transform: `translateX(calc(${columnOffsetPx}px - ${columnSpreadVw}vw))` }}
          >
            <div className="relative h-[78vh]">
              {safeItems.map((item) => (
                <div
                  key={item.id}
                  className="csr__card absolute top-1/2 left-1/2 size-[var(--csr-card)] origin-center opacity-0 will-change-[transform,opacity]"
                  style={{ marginLeft: 'calc(var(--csr-card) / -2)', marginTop: 'calc(var(--csr-card) / -2)' }}
                >
                  <Visuel item={item} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Repli statique — mobile / tablette / mouvement réduit.
          Sur desktop il reste dans le DOM en `sr-only` : la piste animée
          est `aria-hidden`, c'est donc cette grille qui porte le contenu
          pour les lecteurs d'écran. Ne pas la passer en `hidden`. */}
      <div
        className={`w-full px-5 py-12 ${
          reducedMotion ? 'block' : 'block min-[1026px]:sr-only'
        }`}
      >
        <div className="mx-auto grid w-full max-w-5xl grid-cols-2 gap-5 md:grid-cols-3">
          {safeItems.map((item) => (
            <article key={item.id}>
              <div className="relative aspect-square w-full overflow-hidden rounded-[18px]">
                <Visuel item={item} />
              </div>
              <h3 className="mt-3 text-center font-display text-[clamp(16px,4vw,24px)] leading-tight font-medium tracking-[-0.02em] text-ink">
                {item.title}
              </h3>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/**
 * Visuel avec repli : si la photo ne charge pas, on garde un aplat de
 * teinte à la place d'une image cassée.
 */
function Visuel({ item }) {
  const [failed, setFailed] = useState(false)

  return (
    <div
      className="relative size-full overflow-hidden rounded-[18px] border border-[color:var(--color-frost-gray)]"
      style={{ backgroundColor: item.tint }}
    >
      {item.image && !failed && (
        <img
          src={item.image}
          alt={item.alt}
          loading="lazy"
          onError={() => setFailed(true)}
          className="absolute inset-0 block size-full select-none object-cover"
          draggable="false"
        />
      )}
    </div>
  )
}
