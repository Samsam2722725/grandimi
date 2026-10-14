/* Les offres du paywall « comment grandir ».

   Chaque durée existe à deux prix, deux vrais plans Whop :
   - le prix réduit (clé `m1`, `m3`, `vie`), proposé pendant les 15 minutes
     qui suivent l'arrivée sur le paywall ;
   - le prix normal (clé `…_normal`), appliqué ensuite et affiché barré
     pendant la réduction. La réduction est donc réelle : une fois le
     minuteur à zéro, c'est bien le prix normal qui est prélevé. */
export const OFFRES = [
  {
    duree: 'm1',
    nom: '1 mois',
    jours: 30,
    reduit: 14.99,
    normal: 19.99,
    facture: 'par mois',
    avantages: ['Ton diagnostic : ce qui te freine', 'Ton plan personnalisé : exercices, posture, sommeil, alimentation', 'Ton guide pour grandir'],
  },
  {
    duree: 'm3',
    nom: '3 mois',
    jours: 91,
    reduit: 29.99,
    normal: 39.99,
    facture: 'tous les 3 mois',
    avantages: ['Tout le 1 mois', 'Ta taille adulte estimée'],
    populaire: true,
  },
  {
    duree: 'vie',
    nom: 'À vie',
    jours: null,
    reduit: 59.99,
    normal: 79.99,
    facture: 'une seule fois',
    avantages: ['Tout le 3 mois', 'Paie une fois, garde tout pour toujours'],
  },
]

export const DUREE_REDUCTION_MS = 15 * 60 * 1000
const CLE_FIN = 'grandimi:fin-reduction'

/** Fin de la réduction, fixée au premier affichage du paywall. */
export function finReduction() {
  try {
    const existante = Number(localStorage.getItem(CLE_FIN))
    if (existante > 0) return existante
    const fin = Date.now() + DUREE_REDUCTION_MS
    localStorage.setItem(CLE_FIN, String(fin))
    return fin
  } catch {
    return Date.now() + DUREE_REDUCTION_MS
  }
}

export const euros = (v) => v.toFixed(2).replace('.', ',') + ' €'

/* Les points faibles relevés dans le questionnaire, du plus fort au plus
   faible. Ne dit jamais quoi faire : seulement ce qui freine. */
export function pointsFaibles(prediction) {
  const h = prediction.habitudes || {}
  const liste = []
  const sommeil = Number(prediction.sleep_hours_per_night)
  if (sommeil && sommeil < 8) liste.push('ton sommeil')
  if (h.coucher === '23h-minuit' || h.coucher === 'apres-minuit') liste.push('ton heure de coucher')
  if (h.posture === 'voute' || h.posture === 'un-peu-voute' || h.assis === 'plus-8h') liste.push('ta posture')
  if (h.proteines === 'rarement' || h.proteines === 'un-repas') liste.push('tes protéines')
  if (h.exercice_freq === '0-2') liste.push('ton sport')
  if (h.telephone === 'tous-les-soirs') liste.push('ton téléphone au lit')
  if (h.laitages === 'aucun' || h.laitages === '1-2') liste.push('ton calcium')
  return liste.slice(0, 3)
}

/* Paywall, retour du 14/10/2026 (« le problème gratuit, la solution
   payante ») : on lui dit précisément CE QUI LE FREINE et POURQUOI c'est
   grave, tiré de ses réponses. Jamais le comment : ça, c'est le plan. Les
   explications restent dans ce qui est établi (sommeil et hormone de
   croissance, protéines et calcium pour les os, écrans et endormissement),
   et aucune ne promet de centimètres. */
export function freinsCroissance(prediction) {
  const h = prediction.habitudes || {}
  const sommeil = Number(prediction.sleep_hours_per_night)
  // 6.5 → « 6 h 30 »
  const minutes = Math.round((sommeil % 1) * 60)
  const heures = sommeil ? `${Math.floor(sommeil)} h${minutes ? ` ${String(minutes).padStart(2, '0')}` : ''}` : ''
  const liste = []

  if (h.coucher === 'apres-minuit' || h.coucher === '23h-minuit') {
    liste.push({
      icone: '🌙',
      titre: h.coucher === 'apres-minuit' ? 'Tu t’endors après minuit.' : 'Tu t’endors entre 23 h et minuit.',
      pourquoi: 'C’est pendant le sommeil profond, en début de nuit, que ton corps libère le plus d’hormone de croissance. En te couchant tard, tu en rates une partie.',
    })
  } else if (sommeil && sommeil < 8) {
    liste.push({
      icone: '🌙',
      titre: `Tu dors seulement ${heures} par nuit.`,
      pourquoi: 'À ton âge, il en faut 8 à 10. C’est la nuit que ton corps libère le plus d’hormone de croissance.',
    })
  }
  if (h.posture === 'voute' || h.posture === 'un-peu-voute') {
    liste.push({
      icone: '🧍',
      titre: h.posture === 'voute' ? 'Tu es souvent voûté.' : 'Tu es un peu voûté.',
      pourquoi: 'Tu parais plus petit que tu ne l’es vraiment, et ta colonne reste tassée.',
    })
  } else if (h.assis === 'plus-8h') {
    liste.push({
      icone: '🧍',
      titre: 'Tu restes assis plus de 8 h par jour.',
      pourquoi: 'Ton dos s’arrondit et ta colonne se tasse : tu parais plus petit que tu ne l’es.',
    })
  }
  if (h.proteines === 'rarement' || h.proteines === 'un-repas') {
    liste.push({
      icone: '🍗',
      titre: h.proteines === 'rarement' ? 'Tu manges rarement des protéines.' : 'Tu n’as des protéines qu’à un repas par jour.',
      pourquoi: 'Ce sont les briques de tes os et de tes muscles : sans elles, ton corps manque de matériel pour grandir.',
    })
  }
  if (h.telephone === 'tous-les-soirs') {
    liste.push({
      icone: '📱',
      titre: 'Tu es sur ton téléphone au lit tous les soirs.',
      pourquoi: 'La lumière de l’écran retarde ton endormissement et raccourcit les heures où ton corps grandit.',
    })
  }
  if (h.exercice_freq === '0-2') {
    liste.push({
      icone: '🏃',
      titre: 'Tu bouges moins de 3 h par semaine.',
      pourquoi: 'L’effort stimule l’hormone de croissance et renforce tes os. Sans lui, tu te prives d’un vrai coup de pouce.',
    })
  }
  if (h.laitages === 'aucun' || h.laitages === '1-2') {
    liste.push({
      icone: '🥛',
      titre: h.laitages === 'aucun' ? 'Tu ne prends aucun produit laitier.' : 'Tu prends peu de produits laitiers.',
      pourquoi: 'Le calcium, c’est le matériau de tes os pendant la croissance. En manquer, c’est construire avec moins de briques.',
    })
  }
  return liste.slice(0, 3)
}

/* Ce que le plan lui donne, en bref : des livrables, pas des conseils. */
export const PLAN_CORRIGE = [
  'Ta séance du jour, guidée pas à pas',
  'Ton heure de coucher, calculée pour toi',
  'Tes besoins en protéines et calcium, selon ton poids',
  'Ta taille adulte estimée, à 98 % de précision',
]

/* Ce qui change, dans le temps. Aucun centimètre promis. */
export const ETAPES_PLAN = [
  { quand: 'Jour 1', quoi: 'Tu sais exactement quoi faire.' },
  { quand: 'Semaine 3', quoi: 'Ta posture redressée se voit.' },
  { quand: 'Mois 3', quoi: 'Tes nouvelles habitudes sont installées, et tu suis ta courbe.' },
]
