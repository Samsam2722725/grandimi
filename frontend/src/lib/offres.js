/* Les offres du paywall « comment grandir ».

   Chaque durée existe à deux prix, deux vrais plans Whop :
   - le prix réduit (clé `m1`, `m3`, `m12`), proposé pendant les 15 minutes
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
    avantages: ['Ce qui te freine et comment le corriger', 'Ton plan du jour : exercices, posture, sommeil, alimentation', 'Ton guide pour grandir'],
  },
  {
    duree: 'm3',
    nom: '3 mois',
    jours: 91,
    reduit: 29.99,
    normal: 39.99,
    facture: 'tous les 3 mois',
    avantages: ['Tout le 1 mois', '+ Ta taille adulte estimée'],
    populaire: true,
  },
  {
    duree: 'm12',
    nom: '12 mois',
    jours: 365,
    reduit: 69.99,
    normal: 99.99,
    facture: 'par an',
    avantages: ['Tout le 3 mois', '+ Ton coach perso 24 h/24'],
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
