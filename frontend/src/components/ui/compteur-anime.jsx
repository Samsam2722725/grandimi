import { useEffect, useState } from 'react'
import { animate, useReducedMotion } from 'framer-motion'

/* Compteur chiffré.
   ------------------------------------------------------------------
   Le nombre monte de zéro jusqu'à sa valeur au lieu d'apparaître d'un
   coup. C'est la seule animation de cet écran, et elle porte le chiffre
   qui décide de la suite : ce que ses habitudes lui coûtent.

   Pourquoi celle-ci plutôt qu'un texte qui s'écrit — un effet du même
   catalogue que le fond à particules retiré de l'accueil : ici le
   mouvement vient de la DONNÉE. Il dure le temps qu'il faut pour que
   l'œil suive le nombre grimper, puis s'arrête sur la valeur réelle.
   Un texte qui se tape se joue à l'identique sur n'importe quel site.

   ÉTAT REACT ET NON MotionValue. Une première version passait la valeur
   par `useMotionValue` + `useTransform` dans un `motion.span`. Mesuré :
   le texte restait figé à « −0 cm », y compris en mouvement réduit où
   le code pose pourtant la valeur finale sans animer. La valeur d'un
   compteur EST le contenu ; elle doit passer par le rendu React, pas
   par le canal hors-React des MotionValue prévu pour les styles.

   `useReducedMotion` : qui a désactivé les animations voit la valeur
   finale immédiatement. Le chiffre est une information, pas une
   décoration — il doit être lisible dans tous les cas. */
export function CompteurAnime({
  valeur,
  decimales = 1,
  duree = 0.9,
  prefixe = '',
  suffixe = '',
  className,
}) {
  const cible = Number(valeur)
  const reduit = useReducedMotion()
  const [courant, setCourant] = useState(() => (Number.isFinite(cible) ? cible : 0))

  /* L'état PART de la valeur finale, et l'animation seule le fait
     varier. Une version précédente le remettait à zéro au début de
     l'effet : deux `setState` synchrones dans un effet, signalés par
     le linter, et pour rien — `animate(0, cible)` émet déjà sa
     première valeur près de zéro. En mouvement réduit, il n'y a donc
     rien à faire du tout : l'état est déjà juste. */
  useEffect(() => {
    if (!Number.isFinite(cible) || reduit) return undefined
    /* easeOut marqué : le chiffre part vite et se pose doucement. Une
       courbe linéaire donne l'impression d'un compteur de pompe à
       essence. */
    const commande = animate(0, cible, {
      duration: duree,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: setCourant,
      /* La valeur finale est posée explicitement. `onUpdate` la fournit
         déjà en théorie — vérifié isolément, l'animation se termine bien
         sur 2,2 — mais elle dépend d'une dernière image de rAF, et un
         compteur qui s'arrête sur un chiffre faux dit le contraire de ce
         que cet écran affirme. Une ligne pour supprimer le cas. */
      onComplete: () => setCourant(cible),
    })
    return () => commande.stop()
  }, [cible, reduit, duree])

  if (!Number.isFinite(cible)) return null

  /* Séparateur décimal français, et zéro décimale quand le nombre est
     rond : « −5 cm » se lit mieux que « −5,0 cm ». */
  const arrondi = courant.toFixed(decimales)
  const net =
    decimales > 0 && arrondi.endsWith('0') ? String(Number(arrondi)) : arrondi

  return (
    <span className={className}>
      {prefixe}
      {net.replace('.', ',')}
      {suffixe}
    </span>
  )
}

export default CompteurAnime
