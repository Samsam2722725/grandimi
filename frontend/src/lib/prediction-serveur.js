/* Reconstruire la prédiction d'un abonné qui se reconnecte.

   La connexion relisait la dernière prédiction en base mais n'en gardait
   que quatre champs (taille prédite, fourchette, confiance, taille
   actuelle). Le plan, lui, exige l'âge, le sexe et le poids : un abonné
   qui se reconnectait — autre téléphone, ou simplement après « Accueil »
   — tombait sur « l'âge est obligatoire » à la place du plan qu'il paie.

   Tout est pourtant en base (table predictions) : on le recopie, et on
   reconstruit la requête d'origine pour que « Ma taille » puisse
   recalculer l'estimation. Les signes de puberté, eux, ne sont pas
   stockés : la requête reconstruite s'en passe. */

function versNombre(v) {
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export function predictionDepuisServeur(p, email) {
  const age = versNombre(p.age)
  const sex = p.sex === 'F' ? 'F' : 'M'
  const taille = versNombre(p.height_cm)
  const poids = versNombre(p.weight_kg)
  const pere = versNombre(p.father_height_cm)
  const mere = versNombre(p.mother_height_cm)

  return {
    predicted_height_cm: versNombre(p.predicted_height),
    confidence_range: { min: versNombre(p.confidence_min), max: versNombre(p.confidence_max) },
    confidence_level: p.confidence_level,
    current_height_cm: taille,
    age,
    sex,
    weight_kg: poids,
    father_height_cm: pere,
    mother_height_cm: mere,
    user_id: p.user_id,
    email,
    date_prediction: String(p.created_at || '').slice(0, 10) || undefined,
    payload_prediction: {
      email,
      age,
      sex,
      height_cm: taille,
      weight_kg: poids,
      father_height_cm: pere,
      mother_height_cm: mere,
      height_velocity_cm: 0,
      shoe_size_eu: 0,
      sleep_hours_per_night: 8,
      exercise_min_per_day: 30,
      voix_muee: 'unknown',
      pilosite_visage: '',
      pilosite_aisselles: '',
      menarche_declaree: false,
      menarche_survenue: false,
      age_menarche_annees: 0,
    },
  }
}

/* Écrit la prédiction reconstruite, SAUF si le navigateur garde déjà la
   prédiction complète de cette même adresse (celle du questionnaire, avec
   les réponses sur le sommeil, le sport, la puberté) : elle est plus riche
   que ce que la base peut rendre, on ne l'écrase pas. */
export function enregistrerPredictionServeur(predictions, email) {
  if (!Array.isArray(predictions) || predictions.length === 0) return null

  let existante = null
  try {
    existante = JSON.parse(localStorage.getItem('predictionData') || 'null')
  } catch {
    existante = null
  }
  const memeAdresse =
    existante &&
    existante.email &&
    String(existante.email).trim().toLowerCase() === String(email).trim().toLowerCase()
  if (memeAdresse && existante.age && existante.sex && existante.predicted_height_cm) {
    return existante
  }

  const reconstruite = predictionDepuisServeur(predictions[0], email)
  localStorage.setItem('predictionData', JSON.stringify(reconstruite))
  localStorage.setItem('userEmail', email)
  return reconstruite
}
