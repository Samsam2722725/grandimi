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

     LE SENS DEMANDE : REMONTER LA LISTE AUGMENTE.

     Demande du client, formulee sur telephone : « si tu scrolles de haut
     en bas, c'est plus ». Glisser le doigt VERS LE BAS fait remonter dans
     la liste. Et rouler la molette VERS LE HAUT y remonte aussi — les deux
     gestes vont dans le meme sens, contrairement a ce que j'avais conclu.

     Il suffit donc que le HAUT de la liste porte les grandes valeurs, et
     tout suit sans qu'on intercepte quoi que ce soit :

       doigt vers le bas   remonte la liste   -> valeur plus grande
       molette vers le haut remonte la liste  -> valeur plus grande
       fleche du haut      recule d'un cran   -> valeur plus grande

     L'interception de la molette qui existait ici a ete retiree : avec cet
     ordre elle inversait ce que le geste natif faisait deja correctement.
     Le navigateur garde son inertie et son accrochage, que rien ne
     remplace aussi bien.

     La construction reste croissante AVANT retournement : c'est cette
     boucle qui neutralise la derive en virgule flottante des pas
     fractionnaires (0,5 an, 0,5 cm), et l'inverser rouvrirait le
     probleme. */
  const options = useMemo(() => {
    const out = []
    // Arrondi à 4 décimales : les pas fractionnaires (0.5, 0.1) accumulent
    // sinon une dérive en virgule flottante et 16.7 devient 16.699999999999996.
    for (let v = min; v <= max + 1e-9; v += step) {
      out.push(Math.round(v * 10000) / 10000)
    }
    out.reverse()
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
  /* L'index courant, hors du cycle de rendu.

     `activeIndex` ne change qu'au rendu suivant : deux crans de molette
     arrives dans la meme frame partaient donc du MEME index perime, et le
     second ne faisait rien. Mesure sur le site : deux crans vers le bas ne
     deplacaient que d'une valeur, et la position visuelle restait sur
     l'ancienne — la molette paraissait coincee.

     Cette reference est mise a jour dans le geste lui-meme, donc chaque
     cran compte. */
  const indexRef = useRef(nearestIndex(value))
  const [activeIndex, setActiveIndex] = useState(() => nearestIndex(value))

  const height = itemHeight * visibleCount
  const pad = (height - itemHeight) / 2


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
    indexRef.current = index
    setActiveIndex(index)

    const el = scrollerRef.current
    if (!el) return undefined

    const cible = index * itemHeight
    positionnementRef.current = true

    /* PREMIERE TENTATIVE SYNCHRONE, ET NON DANS UNE FRAME D'ANIMATION.

       La version precedente confiait TOUT a requestAnimationFrame, y
       compris la liberation du drapeau. Quand la frame ne s'execute pas —
       onglet en arriere-plan, economiseur d'energie, rendu differe — le
       drapeau restait vrai indefiniment : la molette ne placait rien ET le
       lecteur de position se taisait, puisqu'il commence par verifier ce
       meme drapeau. Mesure : valeur « 14 » affichee sur une liste calee
       sur 22, et aucun geste ne la rattrapait.

       Poser la position tout de suite reussit dans le cas courant — verifie
       a la main sur le composant, l'affectation prend et tient. La frame
       d'animation ne sert plus qu'a rattraper une disposition en retard. */
    el.scrollTop = cible

    let annule = false
    let essais = 0

    const reessayer = () => {
      if (annule) return
      const courant = scrollerRef.current
      if (!courant) {
        positionnementRef.current = false
        return
      }

      /* Dix frames, soit un sixième de seconde : au-delà, ce n'est plus une
         disposition en retard, et insister ferait tourner la boucle pour
         rien. */
      if (Math.abs(courant.scrollTop - cible) > 1 && essais < 10) {
        courant.scrollTop = cible
        essais += 1
        requestAnimationFrame(reessayer)
        return
      }
      positionnementRef.current = false
    }

    requestAnimationFrame(reessayer)

    /* Filet de securite : le drapeau se libere de toute facon. Aucun etat
       du composant ne doit dependre d'une frame qui pourrait ne jamais
       venir — c'est precisement ce qui a tue le lecteur de position. */
    const filet = setTimeout(() => {
      positionnementRef.current = false
    }, 400)

    return () => {
      annule = true
      clearTimeout(filet)
      positionnementRef.current = false
    }
  }, [value, nearestIndex, itemHeight])

  /* PAS D'OBSERVATEUR DE TAILLE ICI, ET C'EST UN RETRAIT DELIBERE.

     Un ResizeObserver replacait la molette a chaque changement de taille
     du conteneur. Sur telephone, la barre d'adresse du navigateur se
     retracte PENDANT le defilement : elle redimensionne la fenetre, donc
     elle declenchait ce replacement au milieu du geste. La liste repartait
     en arriere sous le doigt, et il fallait rester appuye pour lutter
     contre elle. Signale par le client, et c est bien ce que le code
     faisait.

     Il avait ete ajoute pour rattraper une disposition arrivant en retard.
     Le placement synchrone pose juste au-dessus, avec sa reprise sur dix
     frames et son filet a 400 ms, couvre ce cas sans jamais toucher a la
     position une fois l'ecran affiche. */
  const commit = useCallback(
    (index) => {
      const next = options[index]
      /* Comparaison a la DERNIERE valeur emise, pas a la prop `value` :
         pendant une rafale de crans, la prop retarde et bloquait les
         emissions suivantes. */
      if (next === undefined || next === emittedRef.current) return
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
    [options, onChange],
  )

  const handleScroll = () => {
    if (positionnementRef.current) return
    const el = scrollerRef.current
    if (!el) return
    const index = Math.max(
      0,
      Math.min(options.length - 1, Math.round(el.scrollTop / itemHeight)),
    )
    if (index !== activeIndex) {
      indexRef.current = index
      setActiveIndex(index)
      commit(index)
    }
  }

  /* UNE SEULE SOURCE DE VERITE : LA POSITION DE DEFILEMENT.

     La version precedente faisait travailler trois mecanismes sur la meme
     molette — un defilement anime lance par nous, l'accrochage natif, et
     le lecteur de position qui validait une valeur en plein vol. Ils se
     contredisaient : mesure sur le site, trois crans vers le haut ne
     deplacaient que d'une valeur, et la pilule surlignait « 14 ans »
     pendant que la position, elle, montrait 14,5.

     Ici, un geste ne fait qu'UNE chose : deplacer `scrollTop`. C'est
     ensuite `handleScroll` — et lui seul — qui en deduit la valeur et
     l'emet. Plus personne ne se bat, et chaque cran compte puisque
     chacun lit la position reelle au moment ou il arrive, jamais un etat
     de rendu en retard.

     L'affectation est instantanee et non animee : une animation en cours
     serait a nouveau une seconde verite, et c'est precisement ce qu'on
     vient de retirer. L'accrochage natif suffit a rendre le mouvement
     propre. */
  const deplacer = useCallback(
    (delta) => {
      const el = scrollerRef.current
      if (!el) return
      const depart = Math.round(el.scrollTop / itemHeight)
      const cible = Math.max(0, Math.min(options.length - 1, depart + delta))
      if (cible === depart) return
      el.scrollTop = cible * itemHeight

      /* On n'attend PAS l'evenement de defilement pour emettre.

         Une affectation programmee de `scrollTop` n en emet pas toujours
         un — mesure : la fleche du haut deplacait bien la position, et la
         valeur ne bougeait pas. Le clavier annonce donc lui-meme.

         Sans risque de double ecriture : si l evenement finit par arriver,
         le lecteur recalcule le MEME index depuis la meme position et
         n'emet rien. Le defilement au doigt, lui, continue de passer
         uniquement par le lecteur. */
      indexRef.current = cible
      setActiveIndex(cible)
      commit(cible)
    },
    [itemHeight, options.length, commit],
  )


  const handleKeyDown = (event) => {
    /* Liste decroissante : la valeur augmente quand on RECULE dans le
       tableau. La fleche du haut doit augmenter — c'est ce qu'exige le
       role spinbutton — donc elle recule. */
    const jumps = {
      ArrowUp: -1,
      ArrowDown: 1,
      PageUp: -5,
      PageDown: 5,
    }
    if (event.key in jumps) {
      event.preventDefault()
      deplacer(jumps[event.key])
      return
    }
    /* Debut = la plus petite valeur, Fin = la plus grande, comme l'exige
       le role spinbutton — independamment du sens des fleches. */
    if (event.key === 'Home' || event.key === 'End') {
      event.preventDefault()
      const el = scrollerRef.current
      if (!el) return
      el.scrollTop = (event.key === 'Home' ? options.length - 1 : 0) * itemHeight
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
