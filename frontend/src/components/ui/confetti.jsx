import { useEffect, useRef } from 'react'

/**
 * Salve de confettis, une seule fois, au montage.
 *
 * Canvas et non DOM : deux cents éléments animés en CSS font tomber le taux de
 * rafraîchissement sur un téléphone d'entrée de gamme, au moment précis où
 * l'écran doit paraître soigné. Un canvas les dessine tous en une passe.
 *
 * Elle S'ARRÊTE. Les particules tombent hors champ et la boucle se coupe
 * d'elle-même — pas d'animation qui tourne en fond pendant que l'utilisateur
 * lit son résultat, et pas de compteur qui continue à consommer la batterie
 * sur un onglet laissé ouvert.
 *
 * `pointer-events: none` et `aria-hidden` : c'est une décoration posée
 * par-dessus l'écran, elle ne doit intercepter ni un doigt ni un lecteur
 * d'écran.
 */

const COULEURS = ['#ff5a1f', '#e4692f', '#6f7ec9', '#ffffff', '#4ed473']
const NOMBRE = 90
const GRAVITE = 0.14

export function Confetti({ actif = true }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    if (!actif) return undefined

    /* Respecte le réglage système. Une salve de confettis est exactement le
       genre d'effet que `prefers-reduced-motion` demande de supprimer. */
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined
    }

    const canvas = canvasRef.current
    if (!canvas) return undefined
    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const largeur = canvas.offsetWidth
    const hauteur = canvas.offsetHeight
    canvas.width = largeur * dpr
    canvas.height = hauteur * dpr
    ctx.scale(dpr, dpr)

    /* Départ en éventail depuis le haut de l'écran, pas depuis un point :
       une gerbe partant d'une seule origine se lit comme une explosion, ce
       qui n'est pas le registre — ici c'est une pluie brève. */
    const particules = Array.from({ length: NOMBRE }, () => ({
      x: Math.random() * largeur,
      y: -20 - Math.random() * hauteur * 0.5,
      vx: (Math.random() - 0.5) * 1.6,
      vy: 1 + Math.random() * 2.4,
      taille: 4 + Math.random() * 5,
      allonge: 0.35 + Math.random() * 0.9,
      rotation: Math.random() * Math.PI,
      vitesseRotation: (Math.random() - 0.5) * 0.18,
      couleur: COULEURS[Math.floor(Math.random() * COULEURS.length)],
    }))

    let frame

    const dessiner = () => {
      ctx.clearRect(0, 0, largeur, hauteur)
      let vivantes = 0

      for (const p of particules) {
        p.vy += GRAVITE
        p.x += p.vx
        p.y += p.vy
        p.rotation += p.vitesseRotation

        if (p.y < hauteur + 30) vivantes += 1

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate(p.rotation)
        ctx.fillStyle = p.couleur
        ctx.fillRect(-p.taille / 2, -p.taille / 2, p.taille, p.taille * p.allonge)
        ctx.restore()
      }

      // Toutes sorties par le bas : la boucle s'arrête, définitivement.
      if (vivantes === 0) {
        ctx.clearRect(0, 0, largeur, hauteur)
        return
      }
      frame = requestAnimationFrame(dessiner)
    }

    frame = requestAnimationFrame(dessiner)
    return () => cancelAnimationFrame(frame)
  }, [actif])

  return <canvas ref={canvasRef} className="confetti" aria-hidden="true" />
}

export default Confetti
