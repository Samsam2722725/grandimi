import { useEffect, useState } from 'react'

import { cn } from '@/lib/utils'

/* Titre qui s'écrit lettre par lettre.
   Adapté de la version TypeScript fournie. Le projet est en JavaScript :
   le fichier est en .jsx, les types sont simplement retirés. Aucune
   dépendance à installer — `cn` existe déjà dans @/lib/utils.

   TROIS DÉFAUTS DE LA VERSION D'ORIGINE, CORRIGÉS ICI.

   1. `{displayedText ? displayedText : text}` affichait la phrase
      ENTIÈRE au premier rendu, avant que la première lettre ne la
      remplace. Sur un écran de tunnel, le visiteur voyait donc le texte
      complet, puis une lettre. Ici le texte complet est rendu invisible
      pour réserver sa place, et la portion tapée se superpose : plus de
      flash, et aucun décalage de mise en page quand la phrase grandit.

   2. Le tableau de dépendances `[duration, i]` recréait l'intervalle à
      chaque lettre, et oubliait `text` : changer le texte ne relançait
      pas l'animation, elle reprenait au compteur précédent. Un seul
      intervalle ici, relancé quand le texte ou la vitesse changent.

   3. Aucune prise en compte de `prefers-reduced-motion`. Un visiteur
      qui a désactivé les animations — réglage souvent posé pour cause
      de vertiges ou de migraines — recevait quand même le texte au
      compte-gouttes. Il obtient désormais la phrase entière tout de
      suite.

   L'attribut aria-label porte la phrase complète : un lecteur d'écran
   la lit une fois, au lieu d'annoncer chaque lettre. */
export function TypingAnimation({
  text,
  duration = 200,
  className,
  as: Balise = 'h1',
}) {
  const [longueur, setLongueur] = useState(0)

  useEffect(() => {
    if (!text) return undefined

    const animationsReduites =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (animationsReduites) {
      setLongueur(text.length)
      return undefined
    }

    setLongueur(0)
    const minuterie = setInterval(() => {
      setLongueur((precedent) => {
        if (precedent >= text.length) {
          clearInterval(minuterie)
          return precedent
        }
        return precedent + 1
      })
    }, duration)

    return () => clearInterval(minuterie)
  }, [text, duration])

  return (
    <Balise
      aria-label={text}
      className={cn(
        'relative text-center text-4xl font-bold tracking-[-0.02em] drop-shadow-sm',
        className,
      )}
    >
      {/* Réserve la place de la phrase entière : sans ça, le bloc grandit
          lettre après lettre et pousse tout ce qui suit. */}
      <span aria-hidden="true" className="invisible">
        {text}
      </span>
      <span aria-hidden="true" className="absolute inset-0">
        {text.slice(0, longueur)}
      </span>
    </Balise>
  )
}

export default TypingAnimation
