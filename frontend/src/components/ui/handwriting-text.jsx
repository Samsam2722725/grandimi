import { useEffect, useRef, useState } from 'react'

/**
 * Texte qui s'écrit au stylo, puis s'encre.
 *
 * Trois choses rendent le résultat manuscrit plutôt que « fondu » :
 *
 * 1. La police est parsée depuis son TTF brut et les glyphes convertis en
 *    chemins. Une webfont s'affiche en aplats sans contour : il n'y a rien à
 *    tracer, donc rien à animer. La conversion est ce qui rend le trait possible.
 *
 * 2. Chaque contour est son propre <path>. Un motif de tirets SVG REDÉMARRE à
 *    chaque sous-chemin : un path unique portant le mot entier ne peut pas se
 *    tracer progressivement, chaque lettre apparaît d'un bloc. C'est la
 *    séparation + le décalage des délais qui produit un stylo qui traverse le mot.
 *
 * 3. La graisse vient d'UNE copie pleine du mot entier, dessous, révélée quand le
 *    trait se termine. Ce remplissage doit rester un seul path : un contre-poinçon
 *    — le trou d'un « e », d'un « a » — est un contour séparé, et il ne se lit
 *    comme un trou que si la règle de remplissage le voit avec son contour
 *    extérieur. Remplir les contours séparément transforme chaque lettre en pâté.
 *
 * Le parsing des glyphes passe par opentype.js, chargé depuis un CDN en <script>
 * au premier usage plutôt qu'importé en paquet : aucune dépendance à ajouter, et
 * la balise <script> évite les soucis d'interop ESM/CJS de cette bibliothèque.
 * Un seul fetch par page, ensuite mis en cache par le navigateur.
 *
 * Si la bibliothèque OU la police échoue, le composant rend un <span> ordinaire :
 * il dégrade vers du texte, jamais vers du vide.
 *
 * La couleur vient de `currentColor` : `className="text-brand"` le stylise.
 *
 * La police est servie depuis notre propre domaine (`public/fonts/`).
 * Elle venait d’un CDN tiers qui ne renvoie pas d’en-tête CORS : le
 * navigateur bloquait le fetch à chaque visite et l’effet ne s’est jamais
 * affiché en production. Une dépendance réseau externe dans le hero est
 * un point de panne inutile — et celle-ci était déjà en panne.
 */

const OPENTYPE_CDN = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js'

// Caveat, SIL Open Font License 1.1 (voir public/fonts/caveat-OFL.txt).
// Servie depuis notre domaine : pas de CORS, pas de tiers, pas de doute
// sur les droits.
const DEFAULT_FONT_URL = '/fonts/caveat.ttf'

// La bibliothèque, chargée une seule fois par page.
let libPromise = null

function loadOpentype() {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.opentype) return Promise.resolve(window.opentype)
  if (!libPromise) {
    libPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = OPENTYPE_CDN
      script.async = true
      script.onload = () => {
        if (window.opentype) resolve(window.opentype)
        else reject(new Error('opentype.js chargé mais rien exposé'))
      }
      script.onerror = () => reject(new Error('opentype.js n’a pas pu être chargé'))
      document.head.appendChild(script)
    })
  }
  return libPromise
}

// Un fetch et un parse par URL de police, partagés par toutes les instances.
const fontCache = new Map()

function loadFont(url) {
  let pending = fontCache.get(url)
  if (!pending) {
    pending = Promise.all([
      loadOpentype(),
      fetch(url).then((res) => {
        if (!res.ok) throw new Error(`Police indisponible : ${res.status}`)
        return res.arrayBuffer()
      }),
    ]).then(([lib, buffer]) => lib.parse(buffer))
    fontCache.set(url, pending)
  }
  return pending
}

const EM = 100 // arbitraire : le viewBox normalise la valeur choisie

export function HandwritingText({
  text,
  words,
  interval = 3200,
  fontUrl = DEFAULT_FONT_URL,
  duration = 1.5,
  delay = 0.05,
  strokeWidth = 1.6,
  fill = true,
  height = '1.15em',
  className,
}) {
  const cycle = Boolean(words && words.length > 0)
  const [index, setIndex] = useState(0)
  const current = cycle ? words[index % words.length] : (text ?? '')

  const [font, setFont] = useState(null)
  const [geom, setGeom] = useState(null)
  const [drawn, setDrawn] = useState(false)
  const [lengths, setLengths] = useState([])
  const pathRefs = useRef([])

  /* `prefers-reduced-motion` : on rend le mot déjà encré plutôt que de le
     tracer. Une animation de 1,5 s qui se répète toutes les 3,2 s est
     exactement ce que ce réglage système demande d'éviter. */
  const [reduceMotion, setReduceMotion] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return undefined
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const sync = () => setReduceMotion(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!cycle || reduceMotion) return undefined
    const id = setInterval(() => setIndex((i) => i + 1), interval)
    return () => clearInterval(id)
  }, [cycle, interval, reduceMotion])

  /* LA POLICE ATTEND QUE LA PAGE SOIT AFFICHEE.

     caveat.ttf pèse 214 ko et opentype.js s'ajoute par-dessus, le tout
     pour animer UN mot du titre. Mesuré sur la production le 18/09/2026 :
     43 % des octets de la page d'accueil, et 769 ms de bande passante
     disputée au paquet JavaScript qui, lui, conditionne l'affichage du
     premier pixel.

     Le repli en texte brut existe déjà quelques lignes plus bas et rend
     le mot lisible tout de suite. On ne perd donc rien à charger la
     police APRÈS que le navigateur ait fini l'essentiel : le visiteur
     voit sa page, puis le mot s'encre.

     requestIdleCallback quand il existe, sinon un setTimeout — Safari ne
     l'implémente toujours pas, et s'en passer y ferait retomber le
     chargement sur le chemin critique, précisément là où on ne le veut
     plus. */
  useEffect(() => {
    let cancelled = false
    let annuler

    const demarrer = () => {
      loadFont(fontUrl)
        .then((f) => {
          if (!cancelled) setFont(f)
        })
        .catch(() => {
          /* retombe sur le texte brut plus bas */
        })
    }

    if (typeof window !== 'undefined' && window.requestIdleCallback) {
      const id = window.requestIdleCallback(demarrer, { timeout: 2500 })
      annuler = () => window.cancelIdleCallback(id)
    } else {
      const id = setTimeout(demarrer, 300)
      annuler = () => clearTimeout(id)
    }

    return () => {
      cancelled = true
      annuler()
    }
  }, [fontUrl])

  useEffect(() => {
    if (!font || !current) return
    const path = font.getPath(current, 0, EM, EM)
    const box = path.getBoundingBox()
    const pad = EM * 0.12 // marge pour le trait et les jambages
    const full = path.toPathData(2)
    setGeom({
      full,
      // Découpe sur le moveto qui ouvre chaque contour, en gardant le M.
      contours: full.split(/(?=M)/).filter((d) => d.trim().length > 1),
      x: box.x1 - pad,
      y: box.y1 - pad,
      w: box.x2 - box.x1 + pad * 2,
      h: box.y2 - box.y1 + pad * 2,
    })
    setDrawn(false)
    setLengths([])
  }, [font, current])

  useEffect(() => {
    if (!geom) return undefined
    setLengths(
      pathRefs.current
        .slice(0, geom.contours.length)
        .map((el) => (el ? el.getTotalLength() : 0)),
    )
    if (reduceMotion) {
      setDrawn(true)
      return undefined
    }
    // Deux frames : la première fige les offsets pleine longueur sans
    // transition, la seconde l'active et va à zéro. Tout dans un seul commit
    // ne laisse rien à animer.
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setDrawn(true)))
    return () => cancelAnimationFrame(id)
  }, [geom, reduceMotion])

  /* Avant que la police ne réponde — et si elle ne répond jamais — le texte
     reste lisible.

     `WebkitTextFillColor` est indispensable, pas décoratif. Ce composant sert
     un mot AU MILIEU d'un <h1 class="night-title-gradient">, et ce titre pose
     `color: transparent` pour laisser voir son dégradé à travers les lettres.
     Un repli qui n'hérite que de cette couleur est un mot invisible : le hero
     affichait « Prends [rien] les centimètres » pendant tout le temps de
     chargement d'opentype.js et de la police, soit deux bonnes secondes sur un
     visiteur qui en accorde trois. La propriété de remplissage l'emporte sur
     `color` là où le dégradé est actif ; ailleurs elle ne change rien. */
  if (!geom) {
    return (
      <span className={className} style={{ WebkitTextFillColor: 'currentColor' }}>
        {current}
      </span>
    )
  }

  const count = Math.max(1, geom.contours.length)

  /* Le mot doit exister en TEXTE, pas seulement en tracé.

     Ce composant sert un mot au milieu du <h1> de l'accueil. Tant qu'il ne
     rendait qu'un <svg aria-label="maximise">, le seul titre du seul document
     du site se lisait « Prédis et ta taille. » pour un robot d'indexation :
     le mot porteur manquait, et un `aria-label` n'est pas du contenu.

     Le doublon est donc rendu en texte masqué visuellement (`sr-only` :
     hors écran, mais présent dans le document), et le SVG passe décoratif —
     `aria-hidden`, plus de `role` ni de `aria-label`. Sans ça le mot serait
     annoncé deux fois par un lecteur d'écran.

     Ce n'est pas du texte caché au sens que Google sanctionne : le mot
     masqué est exactement celui que le tracé affiche. */
  return (
    <>
      <span className="sr-only">{current}</span>
      <svg
        key={current}
        viewBox={`${geom.x} ${geom.y} ${geom.w} ${geom.h}`}
        aria-hidden="true"
        className={['inline-block', className].filter(Boolean).join(' ')}
        style={{
          height,
          width: `calc(${height} * ${(geom.w / geom.h).toFixed(4)})`,
          overflow: 'visible',
        }}
      >
        {fill && (
          <path
            d={geom.full}
            fill="currentColor"
            stroke="none"
            style={{
              opacity: drawn ? 1 : 0,
              transition:
                drawn && !reduceMotion
                  ? `opacity 0.45s ease-out ${(delay + duration * 0.72).toFixed(3)}s`
                  : 'none',
            }}
          />
        )}
        {geom.contours.map((d, i) => {
          const length = lengths[i] || 0
          // Les contours se chevauchent légèrement pour que le trait se lise
          // comme un mouvement continu, pas comme des lettres qui s'allument.
          const each = (duration / count) * 2.4
          const start = delay + (i / count) * duration
          return (
            <path
              key={i}
              ref={(el) => {
                pathRefs.current[i] = el
              }}
              d={d}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{
                strokeDasharray: length || 1,
                strokeDashoffset: drawn ? 0 : length || 1,
                transition:
                  drawn && !reduceMotion
                    ? `stroke-dashoffset ${each.toFixed(3)}s ease-out ${start.toFixed(3)}s`
                    : 'none',
              }}
            />
          )
        })}
      </svg>
    </>
  )
}

export default HandwritingText
