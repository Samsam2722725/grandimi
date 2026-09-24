import { useEffect, useMemo, useState } from 'react'

/* Adapté d'un composant shadcn fourni tel quel (words[], type puis efface en
   boucle). Deux écarts délibérés par rapport à l'original, les deux mesurés
   sur l'usage réel — le sous-titre du hero, une seule phrase de 127
   caractères, pas une liste de mots courts qui tournent :

   1. `loop` par défaut à `false`. L'original tape, attend, efface, retape
      la même entrée pour toujours. Sur une phrase de cette longueur à
      speed=100 (la valeur par défaut de l'original), un cycle complet vaut
      ~19 s — la moitié en train de s'effacer. C'est le seul texte du fold
      qui dit ce que fait le produit ; le faire disparaître pour le retaper
      à l'identique ne sert personne. `loop=false` tape une fois et s'arrête,
      curseur clignotant.

   2. `respectReducedMotion`, actif par défaut : sous
      `prefers-reduced-motion`, le texte s'affiche entier immédiatement, pas
      de curseur qui clignote sans fin — la préférence existe pour ça.

   `highlight` est un ajout : une sous-chaîne de `words[0]` à mettre en
   couleur de marque une fois révélée, pour ne pas perdre la mise en valeur
   qu'avait la version précédente du sous-titre. */

export function Typewriter({
  as: Tag = 'span',
  words,
  speed = 22,
  deleteSpeed,
  delayBetweenWords = 2000,
  loop = false,
  cursor = true,
  cursorChar = '|',
  highlight,
  respectReducedMotion = true,
  className,
}) {
  const [displayLength, setDisplayLength] = useState(0)
  const [isDeleting, setIsDeleting] = useState(false)
  const [wordIndex, setWordIndex] = useState(0)
  const [showCursor, setShowCursor] = useState(true)
  const [skipAnimation, setSkipAnimation] = useState(false)

  const currentWord = words[wordIndex] ?? ''
  const finished = !loop && wordIndex === words.length - 1 && displayLength === currentWord.length

  useEffect(() => {
    if (!respectReducedMotion) return
    setSkipAnimation(window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  }, [respectReducedMotion])

  const wordComplete = !isDeleting && displayLength === currentWord.length

  // Frappe et effacement caractère par caractère.
  useEffect(() => {
    if (skipAnimation || finished || wordComplete) return undefined
    const timeout = setTimeout(
      () => setDisplayLength((n) => n + (isDeleting ? -1 : 1)),
      isDeleting ? (deleteSpeed ?? speed / 2) : speed,
    )
    return () => clearTimeout(timeout)
  }, [displayLength, isDeleting, speed, deleteSpeed, skipAnimation, finished, wordComplete])

  // Pause avant d'effacer, une fois le mot entier tapé.
  useEffect(() => {
    if (skipAnimation || finished || !wordComplete) return undefined
    if (!loop && wordIndex === words.length - 1) return undefined
    const pause = setTimeout(() => setIsDeleting(true), delayBetweenWords)
    return () => clearTimeout(pause)
  }, [wordComplete, skipAnimation, finished, loop, wordIndex, words.length, delayBetweenWords])

  // Mot effacé : passer au suivant (ou reboucler).
  useEffect(() => {
    if (!isDeleting || displayLength > 0) return undefined
    setIsDeleting(false)
    setWordIndex((i) => (i + 1) % words.length)
  }, [isDeleting, displayLength, words.length])

  useEffect(() => {
    if (!cursor || skipAnimation) return undefined
    const blink = setInterval(() => setShowCursor((v) => !v), 500)
    return () => clearInterval(blink)
  }, [cursor, skipAnimation])

  const text = skipAnimation ? currentWord : currentWord.slice(0, displayLength)

  const segments = useMemo(() => {
    if (!highlight) return [{ text, on: false }]
    const start = currentWord.indexOf(highlight)
    if (start === -1) return [{ text, on: false }]
    const end = start + highlight.length
    return [
      { text: text.slice(0, Math.min(text.length, start)), on: false },
      { text: text.slice(Math.min(text.length, start), Math.min(text.length, end)), on: true },
      { text: text.slice(Math.min(text.length, end)), on: false },
    ].filter((s) => s.text.length > 0)
  }, [text, highlight, currentWord])

  return (
    <Tag className={className}>
      {segments.map((s, i) => (
        <span key={i} className={s.on ? 'font-semibold text-[color:var(--color-brand-display)]' : undefined}>
          {s.text}
        </span>
      ))}
      {cursor && !skipAnimation && (
        <span
          aria-hidden="true"
          className="ml-0.5 transition-opacity duration-75"
          style={{ opacity: showCursor ? 1 : 0 }}
        >
          {cursorChar}
        </span>
      )}
    </Tag>
  )
}
