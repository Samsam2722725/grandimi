import { useEffect, useRef, useState } from 'react'
import { useInView } from 'framer-motion'

/**
 * Texte qui se décode : brouillage aléatoire, puis résolution lettre à lettre.
 *
 * Deux écarts assumés avec la version publiée en ligne :
 *
 * 1. L'import vient de `framer-motion`, déjà dans les dépendances, et non de
 *    `motion/react` — c'est le même `useInView`, sans second paquet à installer.
 *
 * 2. La hauteur fixe `h-4.5 leading-5` de l'original a sauté. Elle rognait tout
 *    texte au-dessus de ~18px, or ce composant sert justement à des chiffres et
 *    des titres. La hauteur suit maintenant la ligne de base du texte.
 *
 * Le rendu est en `font-mono` et à largeur réservée : les caractères de
 * brouillage occupent la place du texte final, donc rien ne saute autour quand
 * l'animation se résout.
 */

const RANDOM_CHARS = '_!X$0-+*#'

function getRandomChar(prevChar) {
  let char
  do {
    char = RANDOM_CHARS[Math.floor(Math.random() * RANDOM_CHARS.length)]
  } while (char === prevChar)
  return char
}

export function SpecialText({
  children,
  speed = 20,
  delay = 0,
  className = '',
  inView = false,
  once = true,
}) {
  const containerRef = useRef(null)
  const isInView = useInView(containerRef, { once, margin: '-100px' })
  const shouldAnimate = inView ? isInView : true
  const text = children

  /* Respecte le réglage système : on affiche directement le texte final
     plutôt qu'un défilement de caractères pendant ~1 s. */
  const [reduceMotion] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false,
  )

  const [hasStarted, setHasStarted] = useState(() => !inView && delay <= 0)
  const [displayText, setDisplayText] = useState(() =>
    reduceMotion ? text : ' '.repeat(text.length),
  )
  const [currentPhase, setCurrentPhase] = useState('phase1')
  const [animationStep, setAnimationStep] = useState(0)
  const intervalRef = useRef(null)
  const startTimeoutRef = useRef(null)

  function clearStartTimeout() {
    if (startTimeoutRef.current === null) return
    window.clearTimeout(startTimeoutRef.current)
    startTimeoutRef.current = null
  }

  function startAnimation() {
    setHasStarted(true)
    setDisplayText(' '.repeat(text.length))
    setCurrentPhase('phase1')
    setAnimationStep(0)
  }

  // Phase 1 : le brouillage s'étend de la gauche vers la droite.
  const runPhase1 = () => {
    const maxSteps = text.length * 2
    const currentLength = Math.min(animationStep + 1, text.length)

    const chars = []
    for (let i = 0; i < currentLength; i++) {
      const prevChar = i > 0 ? chars[i - 1] : undefined
      chars.push(getRandomChar(prevChar))
    }
    for (let i = currentLength; i < text.length; i++) {
      chars.push(' ')
    }

    setDisplayText(chars.join(''))

    if (animationStep < maxSteps - 1) {
      setAnimationStep((prev) => prev + 1)
    } else {
      setCurrentPhase('phase2')
      setAnimationStep(0)
    }
  }

  // Phase 2 : le texte réel se fixe, un caractère sur deux pas, curseur en tête.
  const runPhase2 = () => {
    const revealedCount = Math.floor(animationStep / 2)
    const chars = []

    for (let i = 0; i < revealedCount && i < text.length; i++) {
      chars.push(text[i])
    }

    if (revealedCount < text.length) {
      chars.push(animationStep % 2 === 0 ? '_' : getRandomChar())
    }

    for (let i = chars.length; i < text.length; i++) {
      chars.push(getRandomChar())
    }

    setDisplayText(chars.join(''))

    if (animationStep < text.length * 2 - 1) {
      setAnimationStep((prev) => prev + 1)
    } else {
      setDisplayText(text)
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }

  useEffect(() => {
    if (reduceMotion) return undefined
    if (shouldAnimate && !hasStarted) {
      clearStartTimeout()
      if (delay <= 0) {
        startAnimation()
        return undefined
      }
      startTimeoutRef.current = window.setTimeout(() => {
        startTimeoutRef.current = null
        startAnimation()
      }, delay * 1000)
    }
    return () => clearStartTimeout()
  }, [shouldAnimate, hasStarted, delay, text.length, reduceMotion])

  useEffect(() => {
    if (!hasStarted || reduceMotion) return undefined

    if (intervalRef.current) clearInterval(intervalRef.current)

    intervalRef.current = setInterval(() => {
      if (currentPhase === 'phase1') runPhase1()
      else runPhase2()
    }, speed)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [currentPhase, animationStep, text, speed, hasStarted, reduceMotion])

  // Un nouveau texte relance le décodage depuis le début.
  useEffect(() => {
    if (reduceMotion) {
      setDisplayText(text)
      return undefined
    }
    if (hasStarted) {
      setDisplayText(' '.repeat(text.length))
      setCurrentPhase('phase1')
      setAnimationStep(0)
    }
    return () => {
      clearStartTimeout()
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [text, hasStarted, reduceMotion])

  return (
    <span
      ref={containerRef}
      /* aria-label porte le texte final : un lecteur d'écran ne doit pas
         entendre « underscore X dollar zéro ». aria-hidden sur le rendu. */
      aria-label={text}
      role="text"
      className={`inline-flex font-mono font-medium tabular-nums ${className}`}
    >
      <span aria-hidden="true">{displayText}</span>
    </span>
  )
}

export default SpecialText
