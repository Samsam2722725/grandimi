import { useEffect, useRef, useState } from 'react'

/* Écrans spéciaux qui ne copient aucun concurrent (21/11/2026,
   PROPOSITION-ANIMATIONS.md n° 26, 28 et 33, validés par Samuel). */

const vibrer = (ms) => {
  try { if (navigator.vibrate) navigator.vibrate(ms) } catch { /* rien */ }
}
const reduit = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/* ---------- n° 28 : « Charge ton potentiel » ----------
   Une silhouette : 80 % en gris (la génétique, avec un cadenas), les 20 %
   du haut vides. Doigt appuyé : ils se remplissent d'orange, comme une
   barre qu'on charge dans un jeu. Lâché trop tôt, ça redescend doucement.
   Le bouton « Continuer » reste actif : rien n'est bloqué. */
const DUREE_CHARGE_MS = 1500
const DUREE_DECHARGE_MS = 2600
const HAUT = 6
const LIGNE = 56 // fin des 20 % du haut (sur 6 → 256)

// Dans un clipPath, pas de <g> (interdit par SVG) : on rend les formes nues.
function FormeSilhouette({ nu = false, ...props }) {
  const formes = (
    <>
      <circle cx="60" cy="28" r="22" />
      <rect x="30" y="54" width="60" height="100" rx="24" />
      <rect x="11" y="60" width="17" height="88" rx="8.5" />
      <rect x="92" y="60" width="17" height="88" rx="8.5" />
      <rect x="35" y="138" width="23" height="118" rx="11.5" />
      <rect x="62" y="138" width="23" height="118" rx="11.5" />
    </>
  )
  return nu ? formes : <g {...props}>{formes}</g>
}

export function ChargePotentiel() {
  const [charge, setCharge] = useState(0)
  const appui = useRef(false)
  const chargeRef = useRef(0)
  const image = useRef(0)
  const dernier = useRef(null)
  const plein = charge >= 1

  const boucle = (t) => {
    const dt = dernier.current == null ? 16 : t - dernier.current
    dernier.current = t
    let c = chargeRef.current
    if (appui.current) c = Math.min(1, c + dt / DUREE_CHARGE_MS)
    else if (c < 1) c = Math.max(0, c - dt / DUREE_DECHARGE_MS)
    if (c >= 1 && chargeRef.current < 1) vibrer([30, 40, 60])
    chargeRef.current = c
    setCharge(c)
    if ((appui.current && c < 1) || (!appui.current && c > 0 && c < 1)) image.current = requestAnimationFrame(boucle)
    else dernier.current = null
  }
  const lancer = () => {
    cancelAnimationFrame(image.current)
    dernier.current = null
    image.current = requestAnimationFrame(boucle)
  }
  const appuyer = (e) => {
    e.preventDefault()
    if (chargeRef.current >= 1) return
    if (reduit()) { chargeRef.current = 1; setCharge(1); return }
    appui.current = true
    vibrer(15)
    lancer()
  }
  const lacher = () => {
    if (!appui.current) return
    appui.current = false
    lancer()
  }
  useEffect(() => () => cancelAnimationFrame(image.current), [])

  const hauteurOrange = (LIGNE - HAUT) * charge
  return (
    <div className={'charge' + (plein ? ' is-plein' : '') + (appui.current ? ' is-appui' : '')}>
      <button
        type="button"
        className="charge-zone"
        onPointerDown={appuyer}
        onPointerUp={lacher}
        onPointerLeave={lacher}
        onPointerCancel={lacher}
        onContextMenu={(e) => e.preventDefault()}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { chargeRef.current = 1; setCharge(1) } }}
        aria-label="Garde le doigt appuyé pour charger tes 20 %"
      >
        <svg viewBox="0 0 120 262" className="charge-svg" aria-hidden="true">
          <defs>
            <clipPath id="charge-forme"><FormeSilhouette nu /></clipPath>
            <linearGradient id="charge-orange" x1="0" y1="1" x2="0" y2="0">
              <stop offset="0%" stopColor="#ff5a1f" />
              <stop offset="100%" stopColor="#ffb36b" />
            </linearGradient>
          </defs>
          <FormeSilhouette className="charge-contour" />
          <g clipPath="url(#charge-forme)">
            <rect x="0" y={LIGNE} width="120" height="210" className="charge-gris" />
            <rect x="0" y={LIGNE - hauteurOrange} width="120" height={hauteurOrange} fill="url(#charge-orange)" className="charge-plein" />
          </g>
          <line x1="-30" y1={LIGNE} x2="150" y2={LIGNE} className="charge-ligne" />
          {/* Cadenas sur la génétique */}
          <g transform="translate(51 92)" className="charge-cadenas">
            <path d="M4 8 V5 a5 5 0 0 1 10 0 V8" fill="none" strokeWidth="2.6" strokeLinecap="round" />
            <rect x="0" y="8" width="18" height="14" rx="3.5" />
          </g>
        </svg>
        <span className="charge-etiquette charge-etiquette--toi">20 % : toi</span>
        <span className="charge-etiquette charge-etiquette--gen">80 % : génétique</span>
      </button>
      <p className="charge-consigne" aria-live="polite">
        {plein ? 'Ton potentiel est chargé ⚡' : 'Garde le doigt appuyé pour charger tes 20 %'}
      </p>
    </div>
  )
}

/* ---------- n° 26 : le ciel du sommeil ----------
   Il fait glisser une lune le long d'un arc : de 4 h (soir, orange) à
   12 h (nuit noire, plein d'étoiles). L'heure est écrite au milieu. */
const S_MIN = 4
const S_MAX = 12
const ETOILES = Array.from({ length: 34 }, (_, i) => {
  const a = Math.sin(i * 12.9898) * 43758.5453
  const b = Math.sin(i * 78.233) * 12345.6789
  return { x: 6 + (a - Math.floor(a)) * 88, y: 6 + (b - Math.floor(b)) * 52, r: 0.6 + ((a * 7) % 1 + 1) % 1 * 1.1, seuil: i / 34 }
})
const melange = (c1, c2, t) => `rgb(${c1.map((v, i) => Math.round(v + (c2[i] - v) * t)).join(',')})`
const formatHeures = (h) => `${Math.floor(h)}h${h % 1 === 0 ? '' : '30'}`

export function CielSommeil({ valeur, onChange }) {
  const h = valeur ?? 8
  const t = (h - S_MIN) / (S_MAX - S_MIN)
  const ref = useRef(null)
  const glisse = useRef(false)
  const angle = Math.PI - t * Math.PI // de gauche (soir) à droite
  const lune = { x: 50 + Math.cos(angle) * 40, y: 78 - Math.sin(angle) * 52 }

  const depuisPoint = (e) => {
    const r = ref.current.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * 100 - 50
    const y = 78 - ((e.clientY - r.top) / r.height) * 100
    let a = Math.atan2(Math.max(0, y), x) // 0 (droite) → π (gauche)
    const nt = 1 - a / Math.PI
    const v = Math.round((S_MIN + nt * (S_MAX - S_MIN)) * 2) / 2
    if (v !== h) { onChange(v); vibrer(6) }
  }

  return (
    <div className="ciel-bloc">
      <div
        ref={ref}
        className="ciel"
        style={{ background: `linear-gradient(180deg, ${melange([74, 34, 66], [6, 9, 32], t)} 0%, ${melange([255, 122, 61], [22, 32, 96], t)} 100%)` }}
        onPointerDown={(e) => { glisse.current = true; e.currentTarget.setPointerCapture?.(e.pointerId); depuisPoint(e) }}
        onPointerMove={(e) => { if (glisse.current) depuisPoint(e) }}
        onPointerUp={() => { glisse.current = false }}
        onPointerCancel={() => { glisse.current = false }}
      >
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="ciel-svg" aria-hidden="true">
          {ETOILES.map((s, i) => (
            <circle key={i} cx={s.x} cy={s.y} r={s.r * 0.6} className="ciel-etoile" style={{ opacity: t > s.seuil ? 0.9 : 0, animationDelay: `${(i % 7) * 0.4}s` }} />
          ))}
          <path d="M10 78 A40 52 0 0 1 90 78" className="ciel-arc" />
        </svg>
        <span className="ciel-lune" style={{ left: `${lune.x}%`, top: `${lune.y}%` }} aria-hidden="true" />
        <span className="ciel-heures">{formatHeures(h)}</span>
        <span className="ciel-legende ciel-legende--g">4 h</span>
        <span className="ciel-legende ciel-legende--d">12 h</span>
      </div>
      <input
        type="range"
        className="ciel-curseur"
        min={S_MIN}
        max={S_MAX}
        step={0.5}
        value={h}
        onChange={(e) => onChange(Number(e.target.value))}
        aria-label="Heures de sommeil par nuit"
        aria-valuetext={`${formatHeures(h)} par nuit`}
      />
    </div>
  )
}

/* ---------- n° 33 : la carte qui se retourne ----------
   Le dos (orange, « GRANDIMI ») se retourne en 3D et révèle « Ton plan »,
   avec des confettis orange. */
const CONFETTIS = Array.from({ length: 36 }, (_, i) => {
  const a = (i / 36) * Math.PI * 2
  const d = 110 + ((i * 37) % 70)
  return { x: Math.cos(a) * d, y: Math.sin(a) * d - 40, r: (i * 47) % 360, c: ['#ff5a1f', '#ff8a4a', '#ffb36b', '#fff'][i % 4], delai: (i % 6) * 0.02 }
})

export function CartePlan({ prenom }) {
  return (
    <div className="carte-plan-scene">
      <div className="carte-plan-confettis" aria-hidden="true">
        {CONFETTIS.map((c, i) => (
          <span key={i} style={{ '--x': `${c.x}px`, '--y': `${c.y}px`, '--r': `${c.r}deg`, background: c.c, animationDelay: `${0.95 + c.delai}s` }} />
        ))}
      </div>
      <div className="carte-plan">
        <div className="carte-plan-face carte-plan-dos" aria-hidden="true">
          <span className="carte-plan-logo">GRANDIMI</span>
          <span className="carte-plan-point">?</span>
        </div>
        <div className="carte-plan-face carte-plan-avant">
          <span className="carte-plan-marque">GRANDIMI</span>
          <strong className="carte-plan-titre">Ton plan</strong>
          <span className="carte-plan-nom">{prenom || 'Personnalisé pour toi'}</span>
          <ul className="carte-plan-liste">
            <li>😴 Sommeil</li>
            <li>🥛 Alimentation</li>
            <li>🧘 Exercices</li>
          </ul>
          <span className="carte-plan-puce">Prêt ✓</span>
        </div>
      </div>
    </div>
  )
}
