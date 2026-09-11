/**
 * Mock API pour développement sans serveur Go
 * À remplacer par apiClient.js en production
 */

export const mockPredictHeight = async (data) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      // Même méthode que le serveur : taille mi-parentale (Tanner).
      const midParentHeight = (data.father_height_cm + data.mother_height_cm) / 2;
      const adjustment = data.sex === 'M' ? 6.5 : -6.5;
      const estimatedAdultHeight = midParentHeight + adjustment;

      // Intervalle de confiance basé sur l'âge
      const confidenceRange = 4 + (18 - data.age) * 0.3;

      resolve({
        predicted_height_cm: Math.round(estimatedAdultHeight * 10) / 10,
        confidence_range: {
          min: Math.round((estimatedAdultHeight - confidenceRange) * 10) / 10,
          max: Math.round((estimatedAdultHeight + confidenceRange) * 10) / 10,
        },
        confidence_level:
          data.age > 16
            ? 'high'
            : data.age > 14
              ? 'medium'
              : 'low',
        puberty_stage: 'moderate',
        /* Le vrai endpoint renvoie `user_id` (internal/api/handlers.go, l.171)
           et la paywall en dépend : sans lui, le bouton « faire payer par un
           parent » n'apparaît pas. Le simulacre doit le renvoyer aussi, sinon
           ce chemin est intestable en local. */
        user_id: 'mock-user-0001',
        model_used: 'Taille mi-parentale (Tanner) — mock',
        message: 'Prédiction générée en mode développement',
      });
    }, 1500); // Simule un délai réseau
  });
};

export default { mockPredictHeight };
