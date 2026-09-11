/* ============================================================
   CARTE DE RÉSULTAT PARTAGEABLE
   ============================================================
   Génère une image PNG du résultat, côté client, sans serveur ni
   dépendance : un canvas hors écran, quelques `fillText`, un blob.

   Pourquoi ça existe : une estimation de taille est du contenu partageable
   par nature, et le trafic vient déjà de TikTok. Sans image, chaque
   utilisateur qui veut montrer son résultat fait une capture d'écran de la
   page — verticale, illisible recadrée, sans le nom du site. Autant fournir
   le format qui marche.

   Format 1080 × 1350 : le ratio 4:5 est le plus grand format qu'un fil
   Instagram ou TikTok n'ampute pas, et il se recadre proprement en story.

   Le domaine est lu sur `window.location`, jamais écrit en dur : la carte
   affiche l'adresse réelle depuis laquelle elle a été générée.
   ============================================================ */

const L = 1080
const H = 1350

const FOND = '#0a0a0a'
const ACCENT = '#ff5a1f'
const BLANC = '#ffffff'
const ATONE = '#9a9a9a'
const FILET = '#262626'

const POLICE = "'DM Sans', ui-sans-serif, system-ui, -apple-system, sans-serif"

/** Coupe un texte pour qu'il tienne dans `largeurMax`, et renvoie les lignes. */
function decouper(ctx, texte, largeurMax) {
  const mots = texte.split(' ')
  const lignes = []
  let courante = ''
  for (const mot of mots) {
    const essai = courante ? `${courante} ${mot}` : mot
    if (ctx.measureText(essai).width > largeurMax && courante) {
      lignes.push(courante)
      courante = mot
    } else {
      courante = essai
    }
  }
  if (courante) lignes.push(courante)
  return lignes
}

const nombreFr = (valeur) => String(valeur).replace('.', ',')

/**
 * Pose une police dont la taille est réduite jusqu'à ce que `texte` tienne
 * dans `largeurMax`, et renvoie la largeur obtenue.
 *
 * Indispensable pour le grand chiffre : « +11,5 cm » tient à 190 px, mais
 * « +100,5 cm » débordait de la carte. Une taille fixe sur un texte de
 * longueur variable finit toujours par sortir du cadre.
 */
function policeAjustee(ctx, texte, largeurMax, taillePx, poids = 700) {
  let taille = taillePx
  do {
    ctx.font = `${poids} ${taille}px ${POLICE}`
    if (ctx.measureText(texte).width <= largeurMax) break
    taille -= 6
  } while (taille > 28)
  return ctx.measureText(texte).width
}

/**
 * @returns {Promise<Blob>} PNG de la carte.
 */
export async function genererCarteResultat({
  predicted,
  rangeMin,
  rangeMax,
  margeCm,
  croissanceRestante,
  ageFin,
}) {
  /* Sans cette attente, le premier rendu tombe sur la police de repli et la
     carte sort dans une autre typographie que le site. `document.fonts` peut
     manquer sur de vieux navigateurs : on continue sans bloquer. */
  try {
    await document.fonts?.ready
  } catch {
    /* police de repli — la carte reste correcte */
  }

  const canvas = document.createElement('canvas')
  canvas.width = L
  canvas.height = H
  const ctx = canvas.getContext('2d')

  ctx.fillStyle = FOND
  ctx.fillRect(0, 0, L, H)

  // Halo orange en haut à droite : le même que le hero du site.
  const halo = ctx.createRadialGradient(L * 0.86, H * 0.1, 0, L * 0.86, H * 0.1, 620)
  halo.addColorStop(0, 'rgba(255, 90, 31, 0.22)')
  halo.addColorStop(1, 'rgba(255, 90, 31, 0)')
  ctx.fillStyle = halo
  ctx.fillRect(0, 0, L, H)

  const marge = 88
  let y = 150

  // --- Signature ---
  ctx.fillStyle = ATONE
  ctx.font = `600 30px ${POLICE}`
  ctx.letterSpacing = '6px'
  ctx.fillText('GRANDIMI', marge, y)
  ctx.letterSpacing = '0px'

  // --- Le chiffre qui donne envie de partager ---
  const aDeLaMarge = Number.isFinite(croissanceRestante) && croissanceRestante > 0

  if (aDeLaMarge) {
    y += 130
    ctx.fillStyle = ATONE
    ctx.font = `500 38px ${POLICE}`
    ctx.fillText('Il me reste encore', marge, y)

    y += 170
    ctx.fillStyle = ACCENT
    const gain = `+${nombreFr(Math.round(croissanceRestante * 10) / 10)} cm`
    policeAjustee(ctx, gain, L - marge * 2, 190)
    ctx.fillText(gain, marge, y)

    y += 66
    ctx.fillStyle = ATONE
    ctx.font = `400 34px ${POLICE}`
    const sousTitre = ageFin
      ? `à prendre d’ici mes ${nombreFr(ageFin)} ans`
      : 'à prendre avant la fin de ma croissance'
    ctx.fillText(sousTitre, marge, y)
  } else {
    // Croissance terminée ou estimation sous la taille actuelle : on ne
    // fabrique pas un chiffre de progression qui n'existe pas.
    y += 130
    ctx.fillStyle = ATONE
    ctx.font = `500 38px ${POLICE}`
    ctx.fillText('Ma taille adulte estimée', marge, y)

    y += 180
    ctx.fillStyle = BLANC
    const taille = nombreFr(predicted)
    // Largeur mesurée AVANT de changer de police, sinon l'unité se pose sur
    // le nombre.
    const largeurNombre = policeAjustee(ctx, taille, L - marge * 2 - 120, 200)
    ctx.fillText(taille, marge, y)

    ctx.fillStyle = ATONE
    ctx.font = `600 60px ${POLICE}`
    ctx.fillText('cm', marge + largeurNombre + 18, y)
  }

  // --- Filet ---
  y += 120
  ctx.strokeStyle = FILET
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(marge, y)
  ctx.lineTo(L - marge, y)
  ctx.stroke()

  // --- Bloc estimation ---
  y += 82
  if (aDeLaMarge) {
    ctx.fillStyle = ATONE
    ctx.font = `400 34px ${POLICE}`
    ctx.fillText('Taille adulte estimée', marge, y)

    y += 96
    ctx.fillStyle = BLANC
    const texteTaille = `${nombreFr(predicted)} cm`
    ctx.font = `700 96px ${POLICE}`
    /* La largeur se mesure avec la police du texte mesuré. Mesurée après le
       passage en 44px, elle valait la moitié de la vraie : la marge venait se
       poser par-dessus le nombre. */
    const largeurTaille = ctx.measureText(texteTaille).width
    ctx.fillText(texteTaille, marge, y)

    ctx.fillStyle = ACCENT
    ctx.font = `600 44px ${POLICE}`
    ctx.fillText(`± ${nombreFr(margeCm)} cm`, marge + largeurTaille + 26, y)
  }

  y += aDeLaMarge ? 62 : 0
  ctx.fillStyle = ATONE
  ctx.font = `400 32px ${POLICE}`
  ctx.fillText(
    `Fourchette : ${nombreFr(rangeMin)} – ${nombreFr(rangeMax)} cm`,
    marge,
    y,
  )

  // --- Mention de méthode ----
  // Elle part avec l'image : sans elle, la carte circule comme une promesse
  // de taille garantie, ce qu'elle n'est pas.
  y += 78
  ctx.fillStyle = '#6f6f6f'
  ctx.font = `400 28px ${POLICE}`
  const mention = decouper(
    ctx,
    'Estimation statistique (taille cible mi-parentale), pas une garantie. La marge est affichée.',
    L - marge * 2,
  )
  for (const ligne of mention) {
    ctx.fillText(ligne, marge, y)
    y += 40
  }

  // --- Pied ---
  const domaine =
    typeof window !== 'undefined' && window.location?.host
      ? window.location.host.replace(/^www\./, '')
      : 'grandimi'

  ctx.fillStyle = ACCENT
  ctx.font = `700 40px ${POLICE}`
  ctx.fillText('Fais la tienne, gratuitement', marge, H - 150)

  ctx.fillStyle = BLANC
  ctx.font = `600 44px ${POLICE}`
  ctx.fillText(domaine, marge, H - 92)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Canvas vide'))),
      'image/png',
    )
  })
}

/**
 * Ouvre le partage natif si l'appareil le propose, sinon télécharge l'image.
 *
 * `navigator.share` avec fichiers n'existe en pratique que sur mobile, et
 * c'est là que le partage a lieu. Sur ordinateur, un téléchargement est plus
 * utile qu'un bouton qui échoue en silence.
 *
 * @returns {Promise<'partage'|'telechargement'|'annule'>}
 */
export async function partagerCarte(blob, texte) {
  const fichier = new File([blob], 'ma-taille-grandimi.png', { type: 'image/png' })

  if (navigator.canShare?.({ files: [fichier] })) {
    try {
      await navigator.share({ files: [fichier], text: texte })
      return 'partage'
    } catch (erreur) {
      // L'utilisateur a fermé la feuille de partage : ce n'est pas une erreur,
      // et surtout il ne faut pas enchaîner sur un téléchargement qu'il n'a
      // pas demandé.
      if (erreur?.name === 'AbortError') return 'annule'
    }
  }

  const url = URL.createObjectURL(blob)
  const lien = document.createElement('a')
  lien.href = url
  lien.download = fichier.name
  document.body.appendChild(lien)
  lien.click()
  lien.remove()
  // Révocation différée : Safari lit l'URL après le clic, la libérer tout de
  // suite produit un fichier vide.
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  return 'telechargement'
}
