/**
 * Onboarding v2 — conversions d'unités et construction du payload envoyé
 * à /api/v2/predict-height.
 *
 * Champs consommés par estimator.PredictHeightV2 (v2_enhanced.go) : le
 * moteur n'utilise plus la stadification de Tanner (pubic_hair, genitalia,
 * breast_develop) — retirée pour raison RGPD, cf. commentaire du fichier.
 * Les signaux de puberté qu'il lit sont voix_muee, pilosite_visage,
 * pilosite_aisselles, height_velocity_cm, shoe_size_eu(_1y), menarche_*.
 * C'est exactement ce que ce questionnaire collecte : aucun champ envoyé
 * ici n'est un ajout, aucun champ lu par le moteur n'est laissé de côté
 * parmi ceux que le tunnel demande.
 */

// ---------- Conversions ----------

export function cmVersPiedsPouces(cm) {
  const pouces = cm / 2.54
  const pieds = Math.floor(pouces / 12)
  const reste = Math.round(pouces - pieds * 12)
  return reste === 12 ? { pieds: pieds + 1, pouces: 0 } : { pieds, pouces: reste }
}

export function pouceTotalVersCm(pouceTotal) {
  return Math.round(pouceTotal * 2.54 * 10) / 10
}

export function cmVersPouceTotal(cm) {
  return Math.round(cm / 2.54)
}

export function formatTailleImperiale(pouceTotal) {
  const { pieds, pouces } = cmVersPiedsPouces(pouceTotal * 2.54)
  return `${pieds}' ${pouces}"`
}

export function kgVersLivres(kg) {
  return Math.round((kg * 2.20462) * 10) / 10
}

export function livresVersKg(lbs) {
  return Math.round((lbs / 2.20462) * 10) / 10
}

// Approximation unisexe courante (US ≈ EU − 33). Le tunnel ne demande
// qu'un ordre de grandeur pour choisir son unité d'affichage ; la valeur
// réellement transmise au serveur reste toujours la pointure EU.
export function euVersUs(eu) {
  return Math.round((eu - 33) * 2) / 2
}

export function usVersEu(us) {
  return Math.round((us + 33) * 2) / 2
}

/**
 * Âge exact en années, avec sa fraction — calculé depuis une date de
 * naissance plutôt que saisi directement : plus précis qu'un pas de 0,5 an,
 * et c'est ce que /api/v2/predict-height attend (age: float64).
 */
export function ageDepuisNaissance(annee, mois, jour, aujourdHui = new Date()) {
  const naissance = new Date(Date.UTC(annee, mois - 1, jour))
  const diffMs = aujourdHui.getTime() - naissance.getTime()
  return Math.round((diffMs / (1000 * 60 * 60 * 24 * 365.25)) * 100) / 100
}

/**
 * Écran 9 ne demande qu'un volume hebdomadaire par tranches (0-2h / 3-5h /
 * 6h+), alors que le moteur veut des minutes par jour. On convertit sur le
 * point médian de chaque tranche ; c'est une approximation assumée, pas une
 * donnée saisie au format natif du serveur.
 */
export function minutesExerciceParJour(tranche) {
  switch (tranche) {
    case '0-2':
      return Math.round((1 * 60) / 7)
    case '3-5':
      return Math.round((4 * 60) / 7)
    case '6+':
      return Math.round((8 * 60) / 7)
    default:
      return 0
  }
}

// Aucune des deux tailles n'est facultative côté serveur (`required,
// gt=140`) : « je ne sais pas » doit tout de même partir avec un nombre.
// Moyennes adultes françaises, dans l'attente d'une vraie réponse un jour.
export const TAILLE_PERE_INCONNUE_CM = 175
export const TAILLE_MERE_INCONNUE_CM = 162

const VOIX_MUEE_VERS_API = {
  'non': 'no',
  'un-peu': 'starting',
  'complet': 'yes',
  'ne-sais-pas': 'unknown',
}

// Le moteur ne connaît que trois niveaux ; les options « je me rase
// parfois / régulièrement » de l'écran 16 se distinguent à l'écran mais
// convergent ici sur « developed », faute d'un quatrième niveau côté API.
const PILOSITE_VISAGE_VERS_API = {
  'aucun': 'none',
  'leger': 'light',
  'rase-parfois': 'developed',
  'rase-souvent': 'developed',
  'ne-sais-pas': '',
}

const PILOSITE_AISSELLES_VERS_API = {
  'non': 'none',
  'un-peu': 'light',
  'oui': 'developed',
  'ne-sais-pas': '',
}

/**
 * Construit le corps JSON envoyé à apiClient.predictHeightV2.
 * `reponses` est l'objet plat de l'onboarding, `email` est saisi à part
 * (écran 38, cf. OnboardingFlow) car il n'existe aucun écran e-mail dans
 * les 38 du script — et le champ est pourtant obligatoire côté serveur.
 */
export function construirePayloadPrediction(reponses, email) {
  const tailleReferencePere = reponses.pere ?? TAILLE_PERE_INCONNUE_CM
  const tailleReferenceMere = reponses.mere ?? TAILLE_MERE_INCONNUE_CM

  return {
    email,
    age: reponses.age,
    sex: reponses.sexe,
    height_cm: reponses.taille,
    weight_kg: reponses.poids,
    father_height_cm: tailleReferencePere,
    mother_height_cm: tailleReferenceMere,
    height_velocity_cm: reponses.vitesseCroissance ?? 0,
    shoe_size_eu: reponses.pointure ?? 0,
    sleep_hours_per_night: reponses.sommeil ?? 0,
    exercise_min_per_day: minutesExerciceParJour(reponses.exerciceFreq),
    voix_muee: VOIX_MUEE_VERS_API[reponses.voix] ?? 'unknown',
    pilosite_visage: PILOSITE_VISAGE_VERS_API[reponses.pilositeVisage] ?? '',
    pilosite_aisselles: PILOSITE_AISSELLES_VERS_API[reponses.pilositeAisselles] ?? '',
  }
}

/**
 * Fusionne la réponse serveur avec ce que l'écran de résultat et la
 * paywall lisent directement depuis `predictionData` (cf. ResultsPage.jsx
 * et PaywallPage.jsx) : le backend ne connaît pas `taille_reve` ou
 * `profil`, ce sont des réponses du tunnel qu'il faut leur adjoindre.
 */
export function fusionnerResultatPrediction(reponses, email, resultatApi) {
  return {
    ...resultatApi,
    email,
    profil: reponses.profil,
    sex: reponses.sexe,
    age: reponses.age,
    current_height_cm: reponses.taille,
    sleep_hours_per_night: reponses.sommeil ?? 0,
    exercise_min_per_day: minutesExerciceParJour(reponses.exerciceFreq),
    taille_reve: reponses.tailleIdeale,
  }
}
