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
 * NOTE PROD : `DEFAULT_FONT_URL` pointe sur un CDN tiers. Pour de la production,
 * déposer le .ttf dans `public/fonts/` et passer `fontUrl="/fonts/…"` — une
 * dépendance réseau externe dans le hero est un point de panne inutile.
 */

const OPENTYPE_CDN = 'https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js'

const DEFAULT_FONT_URL =
  'https://cdn.21st.dev/assets/mirror/13/1347863151acdc00fa281daaba1a3543dbce5870b55f9cf7479a15bb84007681.ttf'

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
      /* `crossorigin` est un prerequis de `integrity` : sans lui, le
         navigateur ignore le controle et charge le script quand meme.

         SECURITE — A COMPLETER. Ce script tiers s execute sur l origine qui
         detient le jeton de session en localStorage, et le site n a pas de CSP.
         La version est epinglee sur une release npm immuable, donc l attaque
         suppose la compromission de jsDelivr lui-meme : risque faible, mais
         non nul et facile a fermer.

         Pour poser l empreinte (impossible depuis l environnement de
         developpement actuel, le proxy sortant bloque le CDN) :

           curl -sL https://cdn.jsdelivr.net/npm/opentype.js@1.3.4/dist/opentype.min.js \
             | openssl dgst -sha384 -binary | openssl base64 -A

         puis decommenter la ligne ci-dessous avec la valeur obtenue :
         script.integrity = 'sha384-<empreinte>'

         Ne pas inventer la valeur : une empreinte fausse fait echouer le
         chargement en silence, et le composant retombe sur du texte simple. */
      script.crossOrigin = 'anonymous'
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

  useEffect(() => {
    let cancelled = false
    loadFont(fontUrl)
      .then((f) => {
        if (!cancelled) setFont(f)
      })
      .catch(() => {
        /* retombe sur le texte brut plus bas */
      })
    return () => {
      cancelled = true
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

  // Avant que la police ne réponde — et si elle ne répond jamais — le texte
  // reste lisible.
  if (!geom) {
    return <span className={className}>{current}</span>
  }

  const count = Math.max(1, geom.contours.length)

  return (
    <svg
      key={current}
      viewBox={`${geom.x} ${geom.y} ${geom.w} ${geom.h}`}
      role="img"
      aria-label={current}
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
  )
}

export default HandwritingText
