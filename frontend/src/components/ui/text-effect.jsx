import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import React from 'react'

import { cn } from '@/lib/utils'

/* Texte qui se révèle segment par segment.
   Porté depuis la version TypeScript de motion-primitives : ce projet est en
   JavaScript, donc les types sont retirés et les valeurs par défaut restent
   identiques.

   DEUX ÉCARTS ASSUMÉS AVEC L'ORIGINAL, et ils comptent tous les deux :

   1. `useReducedMotion`. L'original anime toujours. Ici, un visiteur qui a
      demandé moins d'animations reçoit le texte d'un coup, sans transition.
      Le reste du site respecte déjà cette préférence (`.rise` en CSS) ; un
      composant qui l'ignore la casserait sur la seule phrase qui porte la
      promesse.

   2. L'accessibilité du découpage. Découper une phrase en <span> par mot la
      rend illisible pour un lecteur d'écran, qui annonce alors chaque mot
      comme un fragment isolé. L'original pose `aria-hidden` sur les segments
      et `aria-label` sur le conteneur ; on garde ce mécanisme et on l'étend
      au mode `line`, que l'original laissait sans étiquette. */

const staggerParDefaut = { char: 0.03, word: 0.05, line: 0.1 }

const conteneurParDefaut = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
  exit: { transition: { staggerChildren: 0.05, staggerDirection: -1 } },
}

const elementParDefaut = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
}

const presets = {
  blur: {
    container: conteneurParDefaut,
    item: {
      hidden: { opacity: 0, filter: 'blur(12px)' },
      visible: { opacity: 1, filter: 'blur(0px)' },
      exit: { opacity: 0, filter: 'blur(12px)' },
    },
  },
  shake: {
    container: conteneurParDefaut,
    item: {
      hidden: { x: 0 },
      visible: { x: [-5, 5, -5, 5, 0], transition: { duration: 0.5 } },
      exit: { x: 0 },
    },
  },
  scale: {
    container: conteneurParDefaut,
    item: {
      hidden: { opacity: 0, scale: 0 },
      visible: { opacity: 1, scale: 1 },
      exit: { opacity: 0, scale: 0 },
    },
  },
  fade: {
    container: conteneurParDefaut,
    item: elementParDefaut,
  },
  slide: {
    container: conteneurParDefaut,
    item: {
      hidden: { opacity: 0, y: 20 },
      visible: { opacity: 1, y: 0 },
      exit: { opacity: 0, y: 20 },
    },
  },
}

/* Repère les passages à colorer, en index de caractères sur la chaîne source.
   Découper d'abord puis comparer mot à mot ne marcherait que pour des
   surlignages d'un seul mot : « optimiser ta croissance » en fait trois, et la
   virgule collée au dernier mot casserait la comparaison. On travaille donc en
   plages de caractères, et un segment est coloré dès qu'il en chevauche une. */
function plagesSurlignees(texte, surlignage) {
  if (!surlignage) return []
  const phrases = Array.isArray(surlignage) ? surlignage : [surlignage]
  const plages = []
  for (const phrase of phrases) {
    if (!phrase) continue
    let depuis = 0
    for (;;) {
      const i = texte.indexOf(phrase, depuis)
      if (i === -1) break
      plages.push([i, i + phrase.length])
      depuis = i + phrase.length
    }
  }
  return plages
}

/* Tranche la chaîne aux bornes des plages : rend une suite de morceaux
   contigus, chacun entièrement dedans ou entièrement dehors. */
function morceaux(texte, plages) {
  if (plages.length === 0) return [{ texte, surligne: false }]
  const triees = [...plages].sort((a, b) => a[0] - b[0])
  const sortie = []
  let curseur = 0
  for (const [a, b] of triees) {
    if (a > curseur) sortie.push({ texte: texte.slice(curseur, a), surligne: false })
    sortie.push({ texte: texte.slice(Math.max(a, curseur), b), surligne: true })
    curseur = Math.max(curseur, b)
  }
  if (curseur < texte.length) sortie.push({ texte: texte.slice(curseur), surligne: false })
  return sortie.filter((m) => m.texte !== '')
}

const Segment = React.memo(function Segment({ segment, variants, per, segmentWrapperClassName }) {
  let contenu
  if (per === 'line') {
    contenu = (
      <motion.span variants={variants} className="block">
        {segment}
      </motion.span>
    )
  } else if (per === 'word') {
    contenu = (
      <motion.span aria-hidden="true" variants={variants} className="inline-block whitespace-pre">
        {segment}
      </motion.span>
    )
  } else {
    contenu = (
      <motion.span className="inline-block whitespace-pre">
        {segment.split('').map((caractere, i) => (
          <motion.span
            key={`c-${i}`}
            aria-hidden="true"
            variants={variants}
            className="inline-block whitespace-pre"
          >
            {caractere}
          </motion.span>
        ))}
      </motion.span>
    )
  }

  if (!segmentWrapperClassName) return contenu

  return (
    <span className={cn(per === 'line' ? 'block' : 'inline-block', segmentWrapperClassName)}>
      {contenu}
    </span>
  )
})

export function TextEffect({
  children,
  per = 'word',
  as = 'p',
  variants,
  className,
  preset,
  delay = 0,
  trigger = true,
  onAnimationComplete,
  segmentWrapperClassName,
  surlignage,
  classeSurlignage = 'text-[color:var(--color-brand-display)] font-semibold',
}) {
  const reduit = useReducedMotion()

  // On coupe D'ABORD aux bornes des passages surlignés, et seulement ensuite
  // en mots ou en caractères. L'ordre inverse — découper puis tester le
  // chevauchement — colorait le segment entier dès qu'il mordait sur la plage :
  // « croissance. » sortait avec son point en orange, alors que le surlignage
  // demandé s'arrête à « croissance ». Mesuré au navigateur, puis corrigé.
  // Ainsi aucun segment ne chevauche une borne, et la ponctuation reste neutre.
  const places = []
  let position = 0
  for (const { texte, surligne } of morceaux(children, plagesSurlignees(children, surlignage))) {
    let bouts
    if (per === 'line') bouts = texte.split('\n')
    else if (per === 'word') bouts = texte.split(/(\s+)/)
    else bouts = texte.split('')
    for (const bout of bouts) {
      if (bout === '') continue
      places.push({ texte: bout, surligne, cle: position })
      position += bout.length
    }
  }

  // Rendu immédiat quand le visiteur a demandé moins d'animations. Le texte
  // reste découpé pour garder la couleur, mais chaque morceau est un <span>
  // inerte : l'étiquette du conteneur porte la phrase entière, donc un lecteur
  // d'écran l'annonce d'un bloc.
  if (reduit) {
    const Balise = as
    return (
      <Balise aria-label={children} className={cn('whitespace-pre-wrap', className)}>
        {places.map((p) => (
          <span
            key={`r-${p.cle}`}
            aria-hidden="true"
            className={p.surligne ? classeSurlignage : undefined}
          >
            {p.texte}
          </span>
        ))}
      </Balise>
    )
  }

  const MotionTag = motion[as] ?? motion.p
  const choisi = preset ? presets[preset] : { container: conteneurParDefaut, item: elementParDefaut }
  const conteneur = variants?.container || choisi.container
  const element = variants?.item || choisi.item

  const conteneurRetarde = {
    hidden: conteneur.hidden,
    visible: {
      ...conteneur.visible,
      transition: {
        ...conteneur.visible?.transition,
        staggerChildren: conteneur.visible?.transition?.staggerChildren || staggerParDefaut[per],
        delayChildren: delay,
      },
    },
    exit: conteneur.exit,
  }

  return (
    <AnimatePresence mode="popLayout">
      {trigger && (
        <MotionTag
          initial="hidden"
          animate="visible"
          exit="exit"
          aria-label={children}
          variants={conteneurRetarde}
          className={cn('whitespace-pre-wrap', className)}
          onAnimationComplete={onAnimationComplete}
        >
          {places.map((p) => (
            <Segment
              key={`${per}-${p.cle}`}
              segment={p.texte}
              variants={element}
              per={per}
              segmentWrapperClassName={cn(
                segmentWrapperClassName,
                p.surligne && classeSurlignage
              )}
            />
          ))}
        </MotionTag>
      )}
    </AnimatePresence>
  )
}

export default TextEffect
