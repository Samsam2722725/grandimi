import { useEffect, useRef } from 'react'

import { cn } from '@/lib/utils'

/* ============================================================
   FOND DE PARTICULES FLUIDES
   ============================================================
   Champ de bruit de Perlin qui oriente quelques milliers de points. Sert de
   texture de fond au hero : assez présent pour que le noir ne soit pas plat,
   assez discret pour ne jamais concurrencer le titre.

   Quatre écarts avec la version publiée, tous nécessaires :

   1. La boucle d'animation est ANNULÉE au démontage. L'original appelle
      `requestAnimationFrame` sans jamais garder l'identifiant : en SPA, quitter
      la page laissait la boucle tourner pour toujours, et chaque retour sur
      l'accueil en démarrait une seconde. Trois allers-retours = trois boucles
      à 60 fps sur un canvas invisible.

   2. Le canvas suit son CONTENEUR, pas `window`. Ici le fond habille une
      bande de hero, pas un écran entier ; se dimensionner sur la fenêtre
      débordait sous le reste de la page.

   3. `prefers-reduced-motion` coupe l'animation : une image fixe est rendue,
      puis plus rien ne bouge.

   4. Le nombre de points s'adapte à la surface réelle. 2000 points sur un
      téléphone, c'est du budget batterie dépensé pour une texture que
      personne ne regarde.

   Le bruit est réimplémenté ici (≈40 lignes) plutôt qu'importé : aucune
   dépendance à ajouter pour un effet décoratif.
   ============================================================ */

function creerBruit() {
  const permutation = [
    151, 160, 137, 91, 90, 15, 131, 13, 201, 95, 96, 53, 194, 233, 7, 225, 140, 36,
    103, 30, 69, 142, 8, 99, 37, 240, 21, 10, 23, 190, 6, 148, 247, 120, 234, 75, 0,
    26, 197, 62, 94, 252, 219, 203, 117, 35, 11, 32, 57, 177, 33, 88, 237, 149, 56,
    87, 174, 20, 125, 136, 171, 168, 68, 175, 74, 165, 71, 134, 139, 48, 27, 166, 77,
    146, 158, 231, 83, 111, 229, 122, 60, 211, 133, 230, 220, 105, 92, 41, 55, 46,
    245, 40, 244, 102, 143, 54, 65, 25, 63, 161, 1, 216, 80, 73, 209, 76, 132, 187,
    208, 89, 18, 169, 200, 196, 135, 130, 116, 188, 159, 86, 164, 100, 109, 198, 173,
    186, 3, 64, 52, 217, 226, 250, 124, 123, 5, 202, 38, 147, 118, 126, 255, 82, 85,
    212, 207, 206, 59, 227, 47, 16, 58, 17, 182, 189, 28, 42, 223, 183, 170, 213, 119,
    248, 152, 2, 44, 154, 163, 70, 221, 153, 101, 155, 167, 43, 172, 9, 129, 22, 39,
    253, 19, 98, 108, 110, 79, 113, 224, 232, 178, 185, 112, 104, 218, 246, 97, 228,
    251, 34, 242, 193, 238, 210, 144, 12, 191, 179, 162, 241, 81, 51, 145, 235, 249,
    14, 239, 107, 49, 192, 214, 31, 181, 199, 106, 157, 184, 84, 204, 176, 115, 121,
    50, 45, 127, 4, 150, 254, 138, 236, 205, 93, 222, 114, 67, 29, 24, 72, 243, 141,
    128, 195, 78, 66, 215, 61, 156, 180,
  ]

  const p = new Array(512)
  for (let i = 0; i < 256; i++) p[256 + i] = p[i] = permutation[i]

  const attenue = (t) => t * t * t * (t * (t * 6 - 15) + 10)
  const interpole = (t, a, b) => a + t * (b - a)

  function gradient(hash, x, y, z) {
    const h = hash & 15
    const u = h < 8 ? x : y
    const v = h < 4 ? y : h === 12 || h === 14 ? x : z
    return ((h & 1) === 0 ? u : -u) + ((h & 2) === 0 ? v : -v)
  }

  return (x, y, z) => {
    const X = Math.floor(x) & 255
    const Y = Math.floor(y) & 255
    const Z = Math.floor(z) & 255

    x -= Math.floor(x)
    y -= Math.floor(y)
    z -= Math.floor(z)

    const u = attenue(x)
    const v = attenue(y)
    const w = attenue(z)

    const A = p[X] + Y
    const AA = p[A] + Z
    const AB = p[A + 1] + Z
    const B = p[X + 1] + Y
    const BA = p[B] + Z
    const BB = p[B + 1] + Z

    return interpole(
      w,
      interpole(
        v,
        interpole(u, gradient(p[AA], x, y, z), gradient(p[BA], x - 1, y, z)),
        interpole(u, gradient(p[AB], x, y - 1, z), gradient(p[BB], x - 1, y - 1, z)),
      ),
      interpole(
        v,
        interpole(u, gradient(p[AA + 1], x, y, z - 1), gradient(p[BA + 1], x - 1, y, z - 1)),
        interpole(
          u,
          gradient(p[AB + 1], x, y - 1, z - 1),
          gradient(p[BB + 1], x - 1, y - 1, z - 1),
        ),
      ),
    )
  }
}

export function FluidParticlesBackground({
  children,
  /* Densité, pas quantité fixe : un point pour ~1100 px² de surface CSS.
     Un téléphone en reçoit ~300, un grand écran ~1800, la texture est la même. */
  density = 1 / 1100,
  maxParticles = 1800,
  noiseIntensity = 0.003,
  particleSize = { min: 0.5, max: 2 },
  /* rgba, pas hex : l'opacité est modulée par point pendant l'animation. */
  particleColor = '255, 255, 255',
  trail = 'rgba(10, 10, 10, 0.12)',
  className,
}) {
  const conteneurRef = useRef(null)
  const canvasRef = useRef(null)

  useEffect(() => {
    const conteneur = conteneurRef.current
    const canvas = canvasRef.current
    if (!conteneur || !canvas) return undefined

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return undefined

    const bruit = creerBruit()
    const mouvementReduit =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    let particules = []
    let largeur = 0
    let hauteur = 0
    let frame = null

    const redimensionner = () => {
      const rect = conteneur.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      largeur = rect.width
      hauteur = rect.height

      /* Plafonné à 2 : au-delà, le canvas quadruple en pixels pour une
         texture floue par nature — on paie la mémoire sans rien voir. */
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      canvas.width = Math.round(largeur * dpr)
      canvas.height = Math.round(hauteur * dpr)
      canvas.style.width = `${largeur}px`
      canvas.style.height = `${hauteur}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      const nombre = Math.min(maxParticles, Math.round(largeur * hauteur * density))
      particules = Array.from({ length: nombre }, () => ({
        x: Math.random() * largeur,
        y: Math.random() * hauteur,
        taille: Math.random() * (particleSize.max - particleSize.min) + particleSize.min,
        vie: Math.random() * 100,
        vieMax: 100 + Math.random() * 50,
      }))
    }

    const dessiner = (animer) => {
      ctx.fillStyle = trail
      ctx.fillRect(0, 0, largeur, hauteur)

      const temps = animer ? Date.now() * 0.0001 : 0

      for (const particule of particules) {
        if (animer) {
          particule.vie += 1
          if (particule.vie > particule.vieMax) {
            particule.vie = 0
            particule.x = Math.random() * largeur
            particule.y = Math.random() * hauteur
          }
        }

        const opacite = Math.sin((particule.vie / particule.vieMax) * Math.PI) * 0.15

        if (animer) {
          const n = bruit(
            particule.x * noiseIntensity,
            particule.y * noiseIntensity,
            temps,
          )
          const angle = n * Math.PI * 4
          particule.x += Math.cos(angle) * 2
          particule.y += Math.sin(angle) * 2

          if (particule.x < 0) particule.x = largeur
          if (particule.x > largeur) particule.x = 0
          if (particule.y < 0) particule.y = hauteur
          if (particule.y > hauteur) particule.y = 0
        }

        ctx.fillStyle = `rgba(${particleColor}, ${opacite})`
        ctx.beginPath()
        ctx.arc(particule.x, particule.y, particule.taille, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const boucle = () => {
      dessiner(true)
      frame = requestAnimationFrame(boucle)
    }

    redimensionner()

    if (mouvementReduit) {
      // Une seule passe : la texture existe, rien ne bouge.
      dessiner(false)
    } else {
      boucle()
    }

    /* ResizeObserver plutôt qu'un écouteur `resize` : le hero change aussi de
       hauteur quand la police web arrive ou qu'un bloc se replie, sans que la
       fenêtre bouge. */
    const observateur = new ResizeObserver(redimensionner)
    observateur.observe(conteneur)

    return () => {
      if (frame !== null) cancelAnimationFrame(frame)
      observateur.disconnect()
    }
  }, [density, maxParticles, noiseIntensity, particleSize, particleColor, trail])

  return (
    <div ref={conteneurRef} className={cn('relative overflow-hidden', className)}>
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
      />
      <div className="relative z-10">{children}</div>
    </div>
  )
}

export default FluidParticlesBackground
