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

/* « Ton plan contient — fait pour toi » (repris de heightfuel) : ce que
   contient le plan, avec une précision tirée des réponses quand elle
   existe. Rien n'est dit qui ne vienne pas du questionnaire. */
export function contenuPlan(prediction) {
  const h = prediction.habitudes || {}
  const faibles = pointsFaibles(prediction)
  const sommeil = Number(prediction.sleep_hours_per_night)

  let precisionSommeil = ''
  if (h.coucher === 'apres-minuit') precisionSommeil = ' (tu t’endors après minuit)'
  else if (h.coucher === '23h-minuit') precisionSommeil = ' (tu t’endors entre 23 h et minuit)'
  else if (sommeil && sommeil < 8) precisionSommeil = ` (tu dors ${String(sommeil).replace('.', ',')} h par nuit)`

  let precisionRepas = ''
  if (h.proteines === 'rarement') precisionRepas = ' (tu manges rarement des protéines)'
  else if (h.proteines === 'un-repas') precisionRepas = ' (tu as des protéines à un seul repas)'
  else if (h.laitages === 'aucun') precisionRepas = ' (tu ne prends aucun produit laitier)'

  let precisionSport = ', adaptés à ton niveau de sport'
  if (h.exercice_freq === '0-2') precisionSport = ', pour démarrer en douceur (tu fais peu de sport)'
  else if (h.exercice_freq === '6+') precisionSport = ', en plus de ton sport'

  let precisionPosture = ''
  if (h.posture === 'voute') precisionPosture = ' Tu nous as dit être souvent voûté.'
  else if (h.posture === 'un-peu-voute') precisionPosture = ' Tu nous as dit être un peu voûté.'

  return [
    {
      titre: 'Ton diagnostic : ce qui te freine',
      texte: faibles.length
        ? `Tes points faibles, d’après tes réponses : ${faibles.join(', ')}.`
        : 'Ce qui freine ta croissance, d’après tes réponses.',
    },
    { titre: 'Ton programme jour par jour', texte: 'Chaque jour, quoi faire. Tu coches, tu avances. Il change chaque mois, au rythme de ta croissance.' },
    { titre: 'Tes exercices pour grandir', texte: `Étirements, suspension, posture : quelques minutes par jour${precisionSport}.` },
    { titre: 'Ton protocole sommeil', texte: `Ton heure de coucher avancée petit à petit${precisionSommeil}.` },
    { titre: 'Ton alimentation pour grandir', texte: `Protéines, calcium, vitamine D : quoi manger chaque jour${precisionRepas}.` },
    { titre: 'Ta posture corrigée', texte: `Ta posture te vole des centimètres. On te les rend.${precisionPosture}` },
    { titre: 'Ton guide pour grandir', texte: 'Tout ce qui fait grandir, expliqué simplement.' },
    { titre: 'Ta taille adulte estimée, 98 % de précision', texte: '' },
  ]
}
