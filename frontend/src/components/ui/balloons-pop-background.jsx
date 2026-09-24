import { useEffect, useRef } from 'react'

/* ============================================================
   FOND DE BALLONS — ils montent, ils éclatent au doigt
   ============================================================
   Portage du composant fourni le 20/09/2026. Le rendu est celui
   d'origine ; ce qui suit dit ce qui a changé et pourquoi, parce que six
   des corrections ne sont pas des préférences.

   1. PORTÉ EN JSX. `frontend/` n'a pas de TypeScript — pas de tsconfig,
      pas de `typescript` en dépendance, aucun fichier `.ts`. Ajouter TS
      pour un fichier ferait porter à tout le paquet un outillage que
      personne d'autre n'utilise. Les annotations sont donc devenues des
      commentaires là où elles disaient quelque chose.

   2. LA BOUCLE S'ARRÊTE. `requestAnimationFrame` n'était jamais annulé :
      le nettoyage retirait les écouteurs et laissait la boucle tourner.
      Sur une application d'une seule page, où l'on passe du résultat à
      la paywall puis au plan, chaque visite laissait derrière elle une
      boucle de rendu vivante sur un canvas démonté. C'est le défaut le
      plus coûteux du lot, et il ne se voit pas : il se mesure en
      batterie.

   3. LE DOIGT AUSSI. L'original n'écoutait que `mousemove`. Le public de
      Grandimi est sur téléphone : le seul geste que ce composant propose
      n'existait pour personne. `pointermove` couvre souris, doigt et
      stylet avec un seul écouteur.

   4. LES DÉGRADÉS SONT MIS EN CACHE. `createRadialGradient` était appelé
      pour chaque ballon à chaque image — trente objets alloués soixante
      fois par seconde, alors que le rayon et les couleurs ne bougent
      plus après l'initialisation. Le dégradé est maintenant construit
      une fois par ballon.

   5. UN REDIMENSIONNEMENT NE REMET PLUS LA SCÈNE À ZÉRO. `resize`
      recréait les trente ballons. Or sur iOS la barre d'URL qui se
      rétracte déclenche `resize` PENDANT le défilement : la scène se
      réinitialisait au milieu du geste. Le canvas est redimensionné, les
      ballons restent.

   6. LE RÉGLAGE SYSTÈME EST RESPECTÉ. `prefers-reduced-motion` coupe
      l'animation — c'est déjà la règle dans confetti.jsx, analyse-en-cours
      et reseau-neurones, et c'est exactement le genre d'effet que ce
      réglage vise.

   ─────────────────────────────────────────────────────────────
   CE QUI N'A PAS ÉTÉ REPRIS

   Le fichier fourni contenait aussi un `Component` exporté : un compteur
   « + / − » avec un titre « Component Example ». C'est le gabarit du
   générateur, sans rapport avec les ballons et sans appelant. Le copier
   aurait ajouté un composant mort dans `components/ui`.

   Le conteneur d'origine (`fixed inset-0 bg-zinc-950`) n'est pas repris
   non plus : la page de résultat est DÉJÀ une surface `fixed inset-0`
   avec son propre fond (`.results`, results-page.css). Un second calque
   opaque par-dessus aurait recouvert le résultat. Le canvas se pose donc
   À L'INTÉRIEUR d'elle, en fond, et n'apporte aucune couleur de page.
   ============================================================ */

/* La palette d'origine, arc-en-ciel. Elle jure avec le principe d'accent
   unique du système de design (« L'accent unique », design-system-v2.css)
   mais elle tient sur le quasi-noir de la page de résultat, et c'est la
   palette du composant demandé.

   La variante aux couleurs de la marque est juste en dessous : une ligne
   à échanger si l'arc-en-ciel finit par gêner. */
const COULEURS = [
  { base: '#ff2e63', clair: '#ff6b8f', sombre: '#9d0b2e' },
  { base: '#00d2ff', clair: '#80eaff', sombre: '#006a80' },
  { base: '#ffd700', clair: '#fff080', sombre: '#998100' },
  { base: '#9d50bb', clair: '#c089d8', sombre: '#4f285e' },
  { base: '#43e97b', clair: '#a6f7c1', sombre: '#1e6a38' },
  { base: '#ff9a9e', clair: '#fecfef', sombre: '#cc7a7e' },
  { base: '#00c9ff', clair: '#92fe9d', sombre: '#00607a' },
]

// Variante marque, si l'arc-en-ciel doit disparaître :
// const COULEURS = [
//   { base: '#ff5a1f', clair: '#ffa077', sombre: '#7a2405' },
//   { base: '#e4692f', clair: '#f4a583', sombre: '#6b2d10' },
//   { base: '#ffb01f', clair: '#ffd894', sombre: '#7a520b' },
// ]

/* Densité de ballons par million de pixels de surface. Le nombre fixe de
   trente était réglé pour un écran d'ordinateur : sur 390 × 844, soit un
   tiers de la surface, il donnait une purée de ballons qui se recouvrent
   — et trois fois le travail de dessin par pixel visible. */
const DENSITE = 22
const NOMBRE_MIN = 10
const NOMBRE_MAX = 30

/* Une seule volée, pas un décor permanent : chaque ballon traverse l'écran
   du bas vers le haut, sans réapparaître, puis le canvas se vide et la
   boucle s'arrête. Couper la boucle à heure fixe laissait la dernière
   image peinte : des ballons figés en l'air par-dessus le résultat.

   La volée passe maintenant DEVANT le contenu (voir `.results-ballons`,
   results-page.css), et ce qui passe devant doit passer vite : 0,9 à
   1,4 s au lieu de 1,3 à 2, arrêt force a 2,5 s au lieu de 4. Au-dela,
   des ballons flottent sur le chiffre que l'ecran existe pour montrer. */
const TRAVERSEE_MIN_S = 0.9
const TRAVERSEE_MAX_S = 1.4
const ARRET_FORCE_MS = 2500

export function BalloonsPopBackground({ className }) {
  const canvasRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return undefined

    const ctx = canvas.getContext('2d')
    if (!ctx) return undefined

    /* Le réglage système d'abord : inutile de construire la scène pour la
       jeter. Le canvas reste monté et vide, ce qui garde la mise en page
       identique dans les deux cas. */
    const animationReduite =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    if (animationReduite) return undefined

    let ballons = []
    let particules = []
    let image = 0
    let debut = 0
    let precedent = 0
    /* Hors écran tant que rien n'a bougé : sans ça, un pointeur implicite
       en (0,0) ferait éclater les ballons du coin haut-gauche tout seuls. */
    const pointeur = { x: -2000, y: -2000 }

    /* Dimensions en pixels CSS, et pas `canvas.width`.

       Après `setTransform(dpr, …)` le contexte est mis à l'échelle :
       `canvas.width` est en pixels d'appareil, donc l'utiliser dans un
       contexte déjà mis à l'échelle désigne une zone dpr fois trop
       grande. L'original effaçait ainsi neuf fois la surface utile sur un
       téléphone à dpr 3. */
    let largeur = 0
    let hauteur = 0

    class Particule {
      constructor(x, y, couleur) {
        this.x = x
        this.y = y
        this.couleur = couleur
        this.taille = Math.random() * 3 + 1
        this.vitesseX = (Math.random() - 0.5) * 12
        this.vitesseY = (Math.random() - 0.5) * 12
        this.gravite = 0.2
        this.opacite = 1
      }

      avancer(f) {
        this.x += this.vitesseX * f
        this.y += this.vitesseY * f
        this.vitesseY += this.gravite * f
        this.opacite -= 0.025 * f
      }

      dessiner() {
        ctx.save()
        ctx.globalAlpha = Math.max(0, this.opacite)
        ctx.fillStyle = this.couleur
        ctx.beginPath()
        ctx.arc(this.x, this.y, this.taille, 0, Math.PI * 2)
        ctx.fill()
        ctx.restore()
      }
    }

    class Ballon {
      constructor() {
        this.r = Math.random() * 15 + 30
        this.x = Math.random() * largeur
        // Départ étalé sous le bord bas : la volée arrive en vague, pas en bloc.
        this.y = hauteur + this.r + Math.random() * hauteur * 0.35

        this.couleurs = COULEURS[Math.floor(Math.random() * COULEURS.length)]
        // Pixels par image à 60 Hz ; la ficelle (~r + 140) doit sortir aussi.
        const distance = this.y + this.r + 140
        const duree = TRAVERSEE_MIN_S + Math.random() * (TRAVERSEE_MAX_S - TRAVERSEE_MIN_S)
        this.vitesse = distance / (duree * 60)
        this.parti = false
        this.oscillation = Math.random() * 0.02 + 0.01
        this.angle = Math.random() * Math.PI * 2
        this.eclate = false

        this.xPrecedent = this.x
        this.filMilieuY = this.r + 40
        this.filBoutY = this.r + 120
        this.filVitesseMilieu = 0
        this.filVitesseBout = 0

        /* Le dégradé est construit ICI et pas à chaque image : il ne
           dépend que du rayon et des trois couleurs, figés pour toute la
           vie du ballon. Il est défini dans le repère
           local du ballon, celui qu'installe le `translate` de
           `dessiner`, donc il suit le ballon sans être recalculé. */
        this.degrade = ctx.createRadialGradient(
          -this.r * 0.3,
          -this.r * 0.5,
          this.r * 0.1,
          0,
          0,
          this.r * 1.5,
        )
        this.degrade.addColorStop(0, this.couleurs.clair)
        this.degrade.addColorStop(0.4, this.couleurs.base)
        this.degrade.addColorStop(1, this.couleurs.sombre)
      }

      tracerCorps(r) {
        ctx.beginPath()
        ctx.moveTo(0, r)
        ctx.bezierCurveTo(-r * 1.2, r * 0.8, -r * 1.3, -r * 1.2, 0, -r * 1.2)
        ctx.bezierCurveTo(r * 1.3, -r * 1.2, r * 1.2, r * 0.8, 0, r)
        ctx.closePath()
      }

      /* La ficelle est une masse au bout d'un ressort : elle traîne quand
         le ballon part de côté et revient en oscillant. C'est ce qui la
         distingue d'un trait rigide accroché sous la boule. */
      tracerFicelle() {
        const dx = this.x - this.xPrecedent
        this.xPrecedent = this.x

        const raideur = 0.08
        const amortissement = 0.85
        const gravite = 0.35

        const cibleMilieu = this.r + 40 + Math.abs(dx) * 8
        this.filVitesseMilieu += (cibleMilieu - this.filMilieuY) * raideur
        this.filVitesseMilieu *= amortissement
        this.filMilieuY += this.filVitesseMilieu

        const cibleBout = this.r + 120 + Math.abs(dx) * 14
        this.filVitesseBout += (cibleBout - this.filBoutY) * raideur
        this.filVitesseBout *= amortissement
        this.filVitesseBout += gravite
        this.filBoutY += this.filVitesseBout

        const balancement = Math.sin(this.angle * 1.8) * 6 + dx * 4

        ctx.beginPath()
        ctx.moveTo(0, this.r + 5)
        ctx.bezierCurveTo(
          balancement,
          this.filMilieuY * 0.5,
          -balancement,
          this.filMilieuY,
          balancement * 0.6,
          this.filBoutY,
        )
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'
        ctx.lineWidth = 1.3
        ctx.stroke()
      }

      eclater() {
        if (this.eclate) return
        this.eclate = true

        for (let i = 0; i < 20; i += 1) {
          particules.push(new Particule(this.x, this.y, this.couleurs.base))
        }

        this.parti = true
      }

      avancer(f) {
        if (this.parti) return

        this.y -= this.vitesse * f
        this.angle += this.oscillation * f
        this.x += Math.sin(this.angle * 0.6) * 0.8 * f

        const dx = this.x - pointeur.x
        const dy = this.y - this.r * 0.2 - pointeur.y
        if (Math.sqrt(dx * dx + dy * dy) < this.r + 10) {
          this.eclater()
          return
        }

        if (this.y < -this.r - 140) {
          this.parti = true
          return
        }

        this.dessiner()
      }

      dessiner() {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.rotate(Math.sin(this.angle) * 0.06)

        this.tracerFicelle()

        this.tracerCorps(this.r)
        ctx.fillStyle = this.degrade
        ctx.globalAlpha = 0.92
        ctx.fill()

        ctx.restore()
      }
    }

    const nombreDeBallons = () =>
      Math.round(
        Math.min(
          NOMBRE_MAX,
          Math.max(NOMBRE_MIN, (largeur * hauteur * DENSITE) / 1_000_000),
        ),
      )

    const redimensionner = () => {
      const dpr = window.devicePixelRatio || 1
      largeur = canvas.clientWidth || window.innerWidth
      hauteur = canvas.clientHeight || window.innerHeight

      canvas.width = Math.round(largeur * dpr)
      canvas.height = Math.round(hauteur * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

      /* La volée est créée une seule fois. Sur iOS, la barre d'URL qui se
         rétracte déclenche `resize` en plein défilement : recréer ici
         relancerait une seconde volée au milieu du geste. */
      if (ballons.length === 0) {
        const voulu = nombreDeBallons()
        for (let i = 0; i < voulu; i += 1) ballons.push(new Ballon())
      }

      // Un ballon laissé hors du nouveau cadre ne reviendrait jamais.
      for (const ballon of ballons) {
        if (ballon.x > largeur) ballon.x = Math.random() * largeur
      }
    }

    const animer = (maintenant) => {
      if (!debut) {
        debut = maintenant
        precedent = maintenant
      }
      // Déplacements exprimés « par image à 60 Hz » : on les met à l'échelle
      // du temps réellement écoulé, sinon un écran 120 Hz irait deux fois plus vite.
      const f = Math.min((maintenant - precedent) / (1000 / 60), 3)
      precedent = maintenant

      ctx.clearRect(0, 0, largeur, hauteur)

      particules = particules.filter((p) => p.opacite > 0)
      for (const particule of particules) {
        particule.avancer(f)
        particule.dessiner()
      }

      for (const ballon of ballons) ballon.avancer(f)

      const termine =
        (ballons.every((b) => b.parti) && particules.length === 0) ||
        maintenant - debut > ARRET_FORCE_MS
      if (termine) {
        ctx.clearRect(0, 0, largeur, hauteur)
        return
      }
      image = requestAnimationFrame(animer)
    }

    /* `pointermove` et non `mousemove` : un seul écouteur pour la souris,
       le doigt et le stylet. Posé sur `window` et pas sur le canvas —
       celui-ci est en `pointer-events: none` pour laisser passer le
       défilement et les clics de la page qu'il habille. Le doigt qui fait
       défiler la page fait donc éclater les ballons qu'il croise, ce qui
       est la seule façon pour l'effet d'exister sur téléphone. */
    const auPointeur = (evenement) => {
      pointeur.x = evenement.clientX
      pointeur.y = evenement.clientY
    }

    /* Le pointeur qui quitte la fenêtre est renvoyé au loin : sinon il
       reste figé sur sa dernière position et crève en silence tous les
       ballons qui passent par là. */
    const auDepart = () => {
      pointeur.x = -2000
      pointeur.y = -2000
    }

    window.addEventListener('resize', redimensionner)
    window.addEventListener('pointermove', auPointeur, { passive: true })
    window.addEventListener('pointerleave', auDepart)
    window.addEventListener('pointercancel', auDepart)

    redimensionner()
    image = requestAnimationFrame(animer)

    return () => {
      cancelAnimationFrame(image)
      window.removeEventListener('resize', redimensionner)
      window.removeEventListener('pointermove', auPointeur)
      window.removeEventListener('pointerleave', auDepart)
      window.removeEventListener('pointercancel', auDepart)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      /* Décoratif de bout en bout : il ne doit intercepter ni un doigt ni
         un lecteur d'écran. Le premier casserait le défilement de la page
         de résultat, le second ferait annoncer un canvas sans contenu. */
      aria-hidden="true"
    />
  )
}

export default BalloonsPopBackground
